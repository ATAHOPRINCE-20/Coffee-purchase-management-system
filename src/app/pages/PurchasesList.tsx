import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { Layout } from "../components/Layout";
import { Search, Plus, Pencil, Loader2, ChevronDown, Users, Trash2, AlertCircle } from "lucide-react";
import { purchasesService } from "../services/purchasesService";
import { farmerPaymentsService } from "../services/farmerPaymentsService";
import { useAuth, getEffectiveAdminId } from "../hooks/useAuth";
import { ErrorState } from "../components/ErrorState";
import { PurchaseReceiptModal } from "../components/PurchaseReceiptModal";
import { Printer } from "lucide-react";
import { usePurchases } from "../hooks/queries/usePurchases";
import { useDebtSummary } from "../hooks/queries/useDebtSummary";
import { useQueryClient } from "@tanstack/react-query";

function formatUGX(v: number) { return `UGX ${Math.round(v).toLocaleString()}`; }

export default function PurchasesList() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const adminId = getEffectiveAdminId(profile);

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedForReceipt, setSelectedForReceipt] = useState<any>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: purchases = [], isLoading: purchasesLoading, error: purchasesError, refetch: refetchPurchases } = usePurchases(adminId);
  const { data: debtSummaries = [], isLoading: debtLoading } = useDebtSummary(adminId);

  const handleDeletePurchase = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this purchase? This will also REVERT any advance deductions associated with it.")) return;
    
    try {
      setDeletingId(id);
      await purchasesService.delete(id);
      
      // Invalidate ALL relevant queries
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['advances'] });
      queryClient.invalidateQueries({ queryKey: ['debt-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      
    } catch (err: any) {
      alert("Failed to delete purchase: " + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const loading = (purchasesLoading || debtLoading) && purchases.length === 0;
  const error = (purchasesError as any)?.message || null;

  // Data is now managed by hooks

  const filtered = purchases.filter(p => {
    const matchType = filterType === "All" || p.coffee_type === filterType;
    const farmerName = p.farmers?.name || "Unknown";
    const serialStr = p.serial_number ? String(p.serial_number).padStart(4, '0') : "";
    const matchSearch = 
      farmerName.toLowerCase().includes(search.toLowerCase()) || 
      p.id.toLowerCase().includes(search.toLowerCase()) ||
      serialStr.includes(search);
    return matchType && matchSearch;
  });

  const groupedByFarmer = useMemo(() => {
    const groups: Record<string, any> = {};
    filtered.forEach(p => {
      const fId = p.farmer_id || p.farmers?.id || p.farmers?.name || 'unknown';
      if (!groups[fId]) {
        groups[fId] = {
          farmerId: fId,
          farmerName: p.farmers?.name || "Unknown",
          purchases: [],
          totalPayableWeight: 0,
          totalAmount: 0,
          totalAdvanceDeducted: 0,
          totalCashPaid: 0
        };
      }
      groups[fId].purchases.push(p);
      groups[fId].totalPayableWeight += (p.payable_weight || 0);
      groups[fId].totalAmount += (p.total_amount || 0);
      groups[fId].totalAdvanceDeducted += (p.advance_deducted || 0);
      groups[fId].totalCashPaid += (p.cash_paid || 0);
    });
    return Object.values(groups).sort((a: any, b: any) => b.purchases.length - a.purchases.length);
  }, [filtered]);

  if (loading) {
    return (
      <Layout breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Purchases" }]}>
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-green-700 animate-spin mb-4" />
          <p className="text-gray-500 font-medium">Loading purchase records...</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Purchases" }]}>
        <ErrorState 
          title="Couldn't Load Purchases" 
          message={error} 
          onRetry={() => refetchPurchases()} 
        />
      </Layout>
    );
  }

  return (
    <Layout breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Purchases" }]}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ fontFamily: "Inter, sans-serif", fontSize: "22px", fontWeight: 700, color: "#111827" }}>Purchase Records</h1>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#6B7280", marginTop: "2px" }}>All coffee purchase transactions this season</p>
        </div>
        <button
          onClick={() => navigate("/purchases/new")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl hover:opacity-90 transition-all"
          style={{ backgroundColor: "#14532D", color: "#fff", fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600 }}
        >
          <Plus size={15} />
          New Purchase
        </button>
      </div>

      <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.05)", border: "1px solid #F1F5F9" }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-4 border-b border-gray-100 gap-4">
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 600, color: "#111827" }}>All Purchases</div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:flex-initial min-w-[140px]">
              <Search size={13} color="#9CA3AF" className="absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-[#14532D]"
                style={{ fontFamily: "Inter, sans-serif", fontSize: "12px" }}
              />
            </div>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="flex-1 sm:flex-initial px-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-[#14532D]"
              style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", cursor: "pointer" }}
            >
              <option value="All">All Types</option>
              <option value="Kiboko">Kiboko</option>
              <option value="Red">Red</option>
              <option value="Kase">Kase / Clean</option>
            </select>
          </div>
        </div>

        {/* Desktop View Table */}
        <div className="hidden lg:block w-full overflow-hidden">
          <div className="overflow-x-auto max-h-[600px]">
            <table className="w-full relative">
              <thead className="sticky top-0 z-10" style={{ backgroundColor: "#F8FAFC", borderBottom: "1px solid #F1F5F9" }}>
                <tr>
                  <th className="px-2 py-3 w-8"></th>
                  <th className="px-2 py-3 text-left" style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.04em" }}>Client</th>
                  <th className="px-2 py-3 text-left" style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.04em" }}>Purchases Count</th>
                  <th className="px-2 py-3 text-left" style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.04em" }}>Total Payable Wt</th>
                  {profile?.role !== 'Super Admin' && (
                    <>
                      <th className="px-2 py-3 text-left" style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.04em" }}>Total Amount</th>
                      <th className="px-2 py-3 text-left" style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.04em" }}>Total Adv Ded.</th>
                      <th className="px-2 py-3 text-left" style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.04em" }}>Total Cash Paid</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {groupedByFarmer.map(group => {
                  const isExpanded = expandedId === group.farmerId;
                  return (
                    <React.Fragment key={group.farmerId}>
                      <tr onClick={() => setExpandedId(isExpanded ? null : group.farmerId)} className="border-t border-gray-50 hover:bg-[#f0fdf4] transition-colors cursor-pointer">
                        <td className="px-3 py-4 text-center">
                          <ChevronDown size={14} color="#6B7280" className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                        </td>
                        <td className="px-2 py-4">
                          <div style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 600, color: "#111827" }}>{group.farmerName}</div>
                        </td>
                        <td className="px-2 py-4">
                          <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 500, color: "#4B5563", backgroundColor: "#F3F4F6", padding: "2px 8px", borderRadius: "12px" }}>
                            {group.purchases.length} Order(s)
                          </span>
                        </td>
                        <td className="px-2 py-4">
                          <div style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600, color: "#14532D" }}>{group.totalPayableWeight.toFixed(1)} kg</div>
                        </td>
                        {profile?.role !== 'Super Admin' && (
                          <>
                            <td className="px-2 py-4 whitespace-nowrap" style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#111827" }}>{formatUGX(group.totalAmount)}</td>
                            <td className="px-2 py-4 whitespace-nowrap" style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: group.totalAdvanceDeducted > 0 ? "#DC2626" : "#9CA3AF" }}>
                              {group.totalAdvanceDeducted > 0 ? `−${formatUGX(group.totalAdvanceDeducted)}` : "—"}
                            </td>
                            <td className="px-2 py-4 whitespace-nowrap" style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 700, color: "#14532D" }}>{formatUGX(group.totalCashPaid)}</td>
                          </>
                        )}
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={10} className="p-0 border-b border-gray-50 bg-[#F8FAFC]">
                            <div className="p-4 pl-12">
                              <table className="w-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                                <thead className="bg-[#F1F5F9]">
                                  <tr>
                                    {["Serial", "Agent", "Date", "Type", "Gross Wt", "Moist.", "Payable Wt", ...(profile?.role === 'Super Admin' ? [] : ["Amt", "Adv Ded.", "Cash", "Status", "Actions"]), ...(profile?.role === 'Super Admin' ? ["Admin"] : [])].map(h => (
                                      <th key={h} className="px-3 py-2.5 text-left" style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase" }}>{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {(() => {
                                    // Calculate running totals for FIFO debt clearing
                                    const summary = debtSummaries.find(s => 
                                      String(s.farmer_id).trim() === String(group.farmerId).trim() ||
                                      String(s.farmer_name).toLowerCase().trim() === String(group.farmerName).toLowerCase().trim()
                                    );
                                    let availablePayment = summary?.total_subsequent_payments || 0;
                                    
                                    // Sort by date (oldest first) for FIFO
                                    const sortedPurchases = [...group.purchases].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                                    
                                    // Map back to display order (usually newest first in UI, so we keep a map)
                                    const settlementMap: Record<string, number> = {};
                                    sortedPurchases.forEach(p => {
                                      const debtAmount = (p.total_amount || 0) - (p.advance_deducted || 0) - (p.cash_paid || 0);
                                      if (debtAmount <= 0) {
                                        settlementMap[p.id] = 0;
                                      } else {
                                        const paymentForThis = Math.min(availablePayment, debtAmount);
                                        settlementMap[p.id] = paymentForThis;
                                        availablePayment -= paymentForThis;
                                      }
                                    });

                                    return group.purchases.map((p: any) => {
                                      const debtAmount = (p.total_amount || 0) - (p.advance_deducted || 0) - (p.cash_paid || 0);
                                      const subsequentPaid = settlementMap[p.id] || 0;
                                      const remainingToPay = Math.max(0, debtAmount - subsequentPaid);
                                      const isCleared = debtAmount <= 0 || remainingToPay <= 0;

                                      return (
                                        <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                      <td className="px-3 py-2.5">
                                        <span style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600, color: "#14532D", backgroundColor: "#f0fdf4", padding: "2px 6px", borderRadius: "4px" }}>
                                          {p.serial_number ? String(p.serial_number).padStart(4, '0') : p.id.slice(0, 6).toUpperCase()}
                                        </span>
                                      </td>
                                      <td className="px-3 py-2.5">
                                        <div className="flex items-center gap-1.5">
                                          <div className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center text-[10px] font-bold text-blue-600">
                                            {p.field_agent?.full_name?.charAt(0) || "U"}
                                          </div>
                                          <span style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#4B5563" }} className="truncate max-w-[80px]">
                                            {p.field_agent?.full_name || "Unknown"}
                                          </span>
                                        </div>
                                      </td>
                                      <td className="px-3 py-2.5 whitespace-nowrap" style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#6B7280" }}>{p.date}</td>
                                      <td className="px-3 py-2.5">
                                        <span className="px-2 py-0.5 rounded-full whitespace-nowrap" style={{
                                          fontFamily: "Inter, sans-serif", fontSize: "10px", fontWeight: 500,
                                          backgroundColor: p.coffee_type === "Kiboko" ? "#ecfdf5" : p.coffee_type === "Red" ? "#fef2f2" : "#fdf4ff",
                                          color: p.coffee_type === "Kiboko" ? "#065f46" : p.coffee_type === "Red" ? "#991b1b" : "#701a75"
                                        }}>{p.coffee_type === 'Kase' ? 'Kase / Clean' : p.coffee_type}</span>
                                      </td>
                                      <td className="px-3 py-2.5 whitespace-nowrap" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#374151" }}>{p.gross_weight} kg</td>
                                      <td className="px-3 py-2.5 whitespace-nowrap">
                                        <span style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: p.moisture_content > (p.standard_moisture || 12) ? "#DC2626" : "#16A34A", fontWeight: 500 }}>{p.moisture_content}%</span>
                                      </td>
                                      <td className="px-3 py-2.5 whitespace-nowrap" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#14532D" }}>{(p.payable_weight || 0).toFixed(1)} kg</td>
                                      {profile?.role !== 'Super Admin' && (
                                        <>
                                          <td className="px-3 py-2.5 whitespace-nowrap" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#111827" }}>{formatUGX(p.total_amount || 0)}</td>
                                          <td className="px-3 py-2.5 whitespace-nowrap" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: (p.advance_deducted || 0) > 0 ? "#DC2626" : "#9CA3AF" }}>
                                            {(p.advance_deducted || 0) > 0 ? `−${formatUGX(p.advance_deducted)}` : "—"}
                                          </td>
                                          <td className="px-3 py-2.5 whitespace-nowrap" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 700, color: "#14532D" }}>{formatUGX(p.cash_paid || 0)}</td>
                                          <td className="px-3 py-2.5 whitespace-nowrap">
                                            {!isCleared ? (
                                              <span className="text-[9px] font-black text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                                                OWED: {formatUGX(remainingToPay)}
                                              </span>
                                            ) : (
                                              <span className="text-[9px] font-black text-green-700 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                                                {debtAmount > 0 ? "SETTLED" : "PAID"}
                                              </span>
                                            )}
                                          </td>
                                        </>
                                      )}
                                      {profile?.role === 'Admin' && (
                                        <td className="px-3 py-2.5 whitespace-nowrap">
                                          <div className="flex items-center gap-1.5">
                                            <button
                                              onClick={(e) => { e.stopPropagation(); navigate(`/purchases/${p.id}/edit`); }}
                                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-blue-50 transition-colors"
                                              style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 500, color: "#1D4ED8", backgroundColor: "#EFF6FF" }}
                                            >
                                              <Pencil size={11} /> Edit
                                            </button>
                                            <button
                                              onClick={(e) => { e.stopPropagation(); handleDeletePurchase(p.id); }}
                                              disabled={deletingId === p.id}
                                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50"
                                              style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 500, color: "#DC2626", backgroundColor: "#FEF2F2" }}
                                            >
                                              {deletingId === p.id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                                              Delete
                                            </button>
                                            <button
                                              onClick={(e) => { e.stopPropagation(); setSelectedForReceipt(p); setShowReceipt(true); }}
                                              className="p-1.5 rounded-md hover:bg-green-50 text-green-700 transition-colors"
                                              title="Print Receipt"
                                            >
                                              <Printer size={13} />
                                            </button>
                                          </div>
                                        </td>
                                      )}
                                      {['Manager', 'Field Agent'].includes(profile?.role || '') && (
                                        <td className="px-3 py-2.5 whitespace-nowrap">
                                          <button
                                            onClick={(e) => { e.stopPropagation(); setSelectedForReceipt(p); setShowReceipt(true); }}
                                            className="p-1.5 rounded-md hover:bg-green-50 text-green-700 transition-colors"
                                            title="Print Receipt"
                                          >
                                            <Printer size={13} />
                                          </button>
                                        </td>
                                      )}
                                      {profile?.role === 'Super Admin' && (
                                        <td className="px-3 py-2.5 whitespace-nowrap">
                                          <span className="px-2 py-0.5 rounded-md" style={{ backgroundColor: "#f3f4f6", color: "#4b5563", fontFamily: "Inter, sans-serif", fontSize: "10px", fontWeight: 600 }}>
                                            {p.admin?.full_name || 'System'}
                                          </span>
                                        </td>
                                      )}
                                    </tr>
                                      );
                                    });
                                  })()}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile View Card List */}
        <div className="lg:hidden flex flex-col divide-y divide-gray-50">
          {groupedByFarmer.map(group => {
            const isExpanded = expandedId === group.farmerId;
            return (
              <div key={group.farmerId} className="flex flex-col bg-white">
                <div 
                  className={`p-4 flex justify-between items-center w-full cursor-pointer transition-colors ${isExpanded ? 'bg-[#F8FAFC]' : ''}`}
                  onClick={() => setExpandedId(isExpanded ? null : group.farmerId)}
                >
                  <div className="flex flex-col min-w-0 pr-3">
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: "15px", fontWeight: 600, color: "#111827" }} className="truncate">
                      {group.farmerName}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#4B5563", backgroundColor: "#F3F4F6", padding: "2px 8px", borderRadius: "12px", fontWeight: 500 }}>
                        {group.purchases.length} Purchase(s)
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right border-r border-gray-200 pr-3">
                      {profile?.role !== 'Super Admin' && (
                        <div style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 700, color: "#14532D" }}>
                          {formatUGX(group.totalCashPaid)}
                        </div>
                      )}
                      <div style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#6B7280" }}>
                        {group.totalPayableWeight.toFixed(1)} kg
                      </div>
                    </div>
                    <div className={`p-1.5 rounded-full ${isExpanded ? 'bg-gray-200/50' : 'bg-gray-50'}`}>
                      <ChevronDown size={16} color="#6B7280" className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                    </div>
                  </div>
                </div>
                
                {isExpanded && (
                  <div className="bg-[#F8FAFC] pb-4 px-3 flex flex-col gap-3 border-t border-gray-100 shadow-inner">
                    {group.purchases.map((p: any) => (
                      <div key={p.id} className="mt-3 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                           <div className="flex items-center gap-2">
                              <span style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", fontWeight: 600, color: "#14532D", backgroundColor: "#f0fdf4", padding: "2px 6px", borderRadius: "4px" }}>
                                {p.serial_number ? String(p.serial_number).padStart(4, '0') : p.id.slice(0, 6).toUpperCase()}
                              </span>
                              <span className="px-2 py-0.5 rounded-full" style={{
                                fontFamily: "Inter, sans-serif", fontSize: "10px", fontWeight: 500,
                                backgroundColor: p.coffee_type === "Kiboko" ? "#ecfdf5" : p.coffee_type === "Red" ? "#fef2f2" : "#fdf4ff",
                                color: p.coffee_type === "Kiboko" ? "#065f46" : p.coffee_type === "Red" ? "#991b1b" : "#701a75"
                              }}>{p.coffee_type === 'Kase' ? 'Kase / Clean' : p.coffee_type}</span>
                           </div>
                           <span style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", color: "#6B7280" }}>{p.date}</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-y-3 gap-x-2 bg-gray-50/50 p-2.5 rounded-lg border border-gray-100">
                          <div>
                            <div style={{ fontFamily: "Inter", fontSize: "10px", color: "#9CA3AF", textTransform: "uppercase", fontWeight: 600 }}>Weight & Moist</div>
                            <div style={{ fontFamily: "Inter", fontSize: "12px", fontWeight: 600, color: "#374151" }}>
                              {p.payable_weight?.toFixed(1)}kg • <span style={{ color: p.moisture_content > (p.standard_moisture || 12) ? "#DC2626" : "#16A34A" }}>{p.moisture_content}%</span>
                            </div>
                          </div>
                          {profile?.role !== 'Super Admin' && (
                            <div>
                              <div style={{ fontFamily: "Inter", fontSize: "10px", color: "#9CA3AF", textTransform: "uppercase", fontWeight: 600 }}>Amount Paid</div>
                              <div style={{ fontFamily: "Inter", fontSize: "12px", fontWeight: 600, color: "#111827" }}>
                                {formatUGX(p.cash_paid || 0)}
                                {(p.advance_deducted || 0) > 0 && <span className="text-red-600 block text-[10px]">−{formatUGX(p.advance_deducted)} Adv</span>}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100">
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedForReceipt(p); setShowReceipt(true); }}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                            style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 500 }}
                          >
                            <Printer size={13} /> View Receipt
                          </button>
                          {(profile?.role === 'Admin' || profile?.role === 'Super Admin') && (
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); navigate(`/purchases/${p.id}/edit`); }}
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                                style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 500, color: "#1D4ED8", backgroundColor: "#EFF6FF" }}
                              >
                                <Pencil size={11} /> Edit
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeletePurchase(p.id); }}
                                disabled={deletingId === p.id}
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                                style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 500, color: "#DC2626", backgroundColor: "#FEF2F2" }}
                              >
                                {deletingId === p.id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Empty State */}
        {groupedByFarmer.length === 0 && (
          <div className="py-16 text-center">
            <div className="text-5xl mb-3">📦</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 500, color: "#374151" }}>No purchases found</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#9CA3AF", marginTop: "4px" }}>Try a different search term</div>
          </div>
        )}

        {/* Footer info */}
        <div className="px-5 py-3 border-t border-gray-100 flex justify-between" style={{ backgroundColor: "#F8FAFC" }}>
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#6B7280" }}>
            Showing {groupedByFarmer.length} distinct farmer(s) for {filtered.length} matching purchases
          </span>
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#6B7280" }}>
            Total Database Records: {purchases.length}
          </span>
        </div>
      </div>
      <PurchaseReceiptModal 
        isOpen={showReceipt} 
        onClose={() => setShowReceipt(false)} 
        purchase={selectedForReceipt} 
      />
    </Layout>
  );
}

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Layout } from "../components/Layout";
import { Search, Plus, Pencil, Loader2, ChevronDown, Users } from "lucide-react";
import { purchasesService } from "../services/purchasesService";
import { useAuth, getEffectiveAdminId } from "../hooks/useAuth";
import { ErrorState } from "../components/ErrorState";
import { PurchaseReceiptModal } from "../components/PurchaseReceiptModal";
import { Printer } from "lucide-react";

function formatUGX(v: number) { return `UGX ${Math.round(v).toLocaleString()}`; }

export default function PurchasesList() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedForReceipt, setSelectedForReceipt] = useState<any>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      setError(null);
      const adminId = getEffectiveAdminId(profile);
      if (!adminId) return;
      const data = await purchasesService.getAll(adminId);
      setPurchases(data || []);
    } catch (err: any) {
      console.error("Error fetching purchases:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, []);

  const filtered = purchases.filter(p => {
    const matchType = filterType === "All" || p.coffee_type === filterType;
    const farmerName = p.farmers?.name || "Unknown";
    const matchSearch = farmerName.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const totalWeight = filtered.reduce((s, p) => s + (p.payable_weight || 0), 0);
  const totalValue = filtered.reduce((s, p) => s + (p.total_amount || 0), 0);

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
          onRetry={fetchPurchases} 
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

      {/* Table Container */}
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
              <option value="Kase">Kase</option>
            </select>
          </div>
        </div>

        {/* Desktop View Table */}
        <div className="hidden lg:block w-full overflow-hidden">
          <div className="overflow-x-auto max-h-[600px]">
            <table className="w-full relative">
              <thead className="sticky top-0 z-10" style={{ backgroundColor: "#F8FAFC", borderBottom: "1px solid #F1F5F9" }}>
                <tr>
                  {["ID", "Client", "Agent", "Date", "Type", "Gross Wt", "Moist.", "Payable Wt", ...(profile?.role === 'Super Admin' ? [] : ["Total Amt", "Adv Ded.", "Cash Paid", "Actions"]), ...(profile?.role === 'Super Admin' ? ["Admin"] : [])].map(h => (
                    <th key={h} className="px-2 py-3 text-left" style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                  ))}
                  {profile?.role === 'Super Admin' && (
                    <th className="px-2 py-3 text-left" style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.04em" }}>Admin</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="border-t border-gray-50 hover:bg-[#f0fdf4] transition-colors cursor-pointer">
                    <td className="px-2 py-3.5">
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600, color: "#14532D", backgroundColor: "#f0fdf4", padding: "2px 6px", borderRadius: "4px" }}>{p.id.slice(0,6)}...</span>
                    </td>
                    <td className="px-2 py-3.5">
                      <div style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 500, color: "#111827" }} className="line-clamp-1 break-words max-w-[120px]">{p.farmers?.name || "Unknown"}</div>
                    </td>
                    <td className="px-2 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center text-[10px] font-bold text-blue-600">
                          {p.field_agent?.full_name?.charAt(0) || "U"}
                        </div>
                        <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#4B5563" }} className="truncate max-w-[80px]">
                          {p.field_agent?.full_name || "Unknown"}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-3.5 whitespace-nowrap" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#6B7280" }}>{p.date}</td>
                    <td className="px-2 py-3.5">
                      <span className="px-2 py-0.5 rounded-full whitespace-nowrap" style={{
                        fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 500,
                        backgroundColor: p.coffee_type === "Kiboko" ? "#f0fdf4" : p.coffee_type === "Red" ? "#fef2f2" : "#fdf4ff",
                        color: p.coffee_type === "Kiboko" ? "#14532D" : p.coffee_type === "Red" ? "#991b1b" : "#701a75"
                      }}>{p.coffee_type}</span>
                    </td>
                    <td className="px-2 py-3.5 whitespace-nowrap" style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#374151" }}>{p.gross_weight} kg</td>
                    <td className="px-2 py-3.5 whitespace-nowrap">
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: p.moisture_content > (p.standard_moisture || 12) ? "#DC2626" : "#16A34A", fontWeight: 500 }}>{p.moisture_content}%</span>
                    </td>
                    <td className="px-2 py-3.5 whitespace-nowrap" style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600, color: "#14532D" }}>{(p.payable_weight || 0).toFixed(1)} kg</td>
                    {profile?.role !== 'Super Admin' && (
                      <>
                        <td className="px-2 py-3.5 whitespace-nowrap" style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#111827" }}>{formatUGX(p.total_amount || 0)}</td>
                        <td className="px-2 py-3.5 whitespace-nowrap" style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: (p.advance_deducted || 0) > 0 ? "#DC2626" : "#9CA3AF" }}>
                          {(p.advance_deducted || 0) > 0 ? `−${formatUGX(p.advance_deducted)}` : "—"}
                        </td>
                        <td className="px-2 py-3.5 whitespace-nowrap" style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 700, color: "#14532D" }}>{formatUGX(p.cash_paid || 0)}</td>
                      </>
                    )}
                      {profile?.role === 'Admin' && (
                        <td className="px-2 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate(`/purchases/${p.id}/edit`); }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                              style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 500, color: "#1D4ED8", backgroundColor: "#EFF6FF" }}
                            >
                              <Pencil size={12} /> Edit
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedForReceipt(p); setShowReceipt(true); }}
                              className="p-1.5 rounded-lg hover:bg-green-50 text-green-700 transition-colors"
                              title="Print Receipt"
                            >
                              <Printer size={16} />
                            </button>
                          </div>
                        </td>
                      )}
                      {['Manager', 'Field Agent'].includes(profile?.role || '') && (
                        <td className="px-2 py-3.5 whitespace-nowrap">
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedForReceipt(p); setShowReceipt(true); }}
                            className="p-1.5 rounded-lg hover:bg-green-50 text-green-700 transition-colors"
                            title="Print Receipt"
                          >
                            <Printer size={16} />
                          </button>
                        </td>
                      )}
                    {profile?.role === 'Super Admin' && (
                      <td className="px-2 py-3.5 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-lg" style={{ backgroundColor: "#f3f4f6", color: "#4b5563", fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600 }}>
                          {p.admin?.full_name || 'System'}
                        </span>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile View Card List */}
        <div className="lg:hidden flex flex-col divide-y divide-gray-50">
          {filtered.map(p => {
            const isExpanded = expandedId === p.id;
            return (
              <div key={p.id} className="p-4 flex flex-col bg-white">
                <div 
                  className="flex justify-between items-center w-full cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : p.id)}
                >
                  <div className="flex flex-col min-w-0 pr-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded-full" style={{
                        fontFamily: "Inter, sans-serif", fontSize: "10px", fontWeight: 600,
                        backgroundColor: p.coffee_type === "Kiboko" ? "#f0fdf4" : p.coffee_type === "Red" ? "#fef2f2" : "#fdf4ff",
                        color: p.coffee_type === "Kiboko" ? "#14532D" : p.coffee_type === "Red" ? "#991b1b" : "#701a75"
                      }}>{p.coffee_type}</span>
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#6B7280" }}>{p.date}</span>
                    </div>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: "15px", fontWeight: 600, color: "#111827" }} className="truncate">
                      {p.farmers?.name || "Unknown"}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Users size={10} className="text-gray-400" />
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#6B7280" }}>Agent: {p.field_agent?.full_name || "Unknown"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      {profile?.role !== 'Super Admin' && (
                        <div style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 700, color: "#14532D" }}>
                          {formatUGX(p.cash_paid || 0)}
                        </div>
                      )}
                      <div style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#6B7280" }}>
                        {(p.payable_weight || 0).toFixed(1)} kg
                      </div>
                    </div>
                    <ChevronDown size={18} color="#9CA3AF" className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                  </div>
                </div>
                
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-3 animate-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-2 gap-y-3 gap-x-2 bg-gray-50 p-3 rounded-xl border border-gray-100/60">
                      <div>
                        <div style={{ fontFamily: "Inter", fontSize: "10px", color: "#9CA3AF", textTransform: "uppercase", fontWeight: 600 }}>Gross & Moist</div>
                        <div style={{ fontFamily: "Inter", fontSize: "13px", fontWeight: 600, color: "#374151" }}>
                          {p.gross_weight}kg • <span style={{ color: p.moisture_content > (p.standard_moisture || 12) ? "#DC2626" : "#16A34A" }}>{p.moisture_content}%</span>
                        </div>
                      </div>
                      {profile?.role !== 'Super Admin' && (
                        <div>
                          <div style={{ fontFamily: "Inter", fontSize: "10px", color: "#9CA3AF", textTransform: "uppercase", fontWeight: 600 }}>Total Value</div>
                          <div style={{ fontFamily: "Inter", fontSize: "13px", fontWeight: 600, color: "#111827" }}>
                            {formatUGX(p.total_amount || 0)}
                          </div>
                        </div>
                      )}
                      <div className="col-span-2 flex justify-between items-center mt-1">
                        <div>
                          {profile?.role !== 'Super Admin' && (
                            <>
                              <div style={{ fontFamily: "Inter", fontSize: "10px", color: "#9CA3AF", textTransform: "uppercase", fontWeight: 600 }}>Deduction</div>
                              <div style={{ fontFamily: "Inter", fontSize: "12px", fontWeight: 500, color: "#DC2626" }}>
                                {(p.advance_deducted || 0) > 0 ? `−${formatUGX(p.advance_deducted)}` : "None"}
                              </div>
                            </>
                          )}
                        </div>
                        <div className="flex gap-2 mt-1">
                          {(profile?.role === 'Admin' || profile?.role === 'Super Admin') && (
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate(`/purchases/${p.id}/edit`); }}
                              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg"
                              style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 500, color: "#1D4ED8", backgroundColor: "#EFF6FF" }}
                            >
                              <Pencil size={12} /> Edit
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedForReceipt(p); setShowReceipt(true); }}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-green-50 text-green-700"
                            style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 500 }}
                          >
                            <Printer size={14} /> Receipt
                          </button>
                        </div>
                      </div>
                      {profile?.role === 'Super Admin' && (
                        <div className="col-span-2 flex items-center justify-between pt-1 border-t border-gray-100 mt-1">
                          <span style={{ fontFamily: "Inter", fontSize: "10px", color: "#9CA3AF", textTransform: "uppercase", fontWeight: 600 }}>Admin Branch:</span>
                          <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>
                            {p.admin?.full_name || 'System'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Empty State */}
        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <div className="text-5xl mb-3">📦</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 500, color: "#374151" }}>No purchases found</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#9CA3AF", marginTop: "4px" }}>Try a different search term</div>
          </div>
        )}

        {/* Footer info */}
        <div className="px-5 py-3 border-t border-gray-100" style={{ backgroundColor: "#F8FAFC" }}>
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#6B7280" }}>
            Showing {filtered.length} of {purchases.length} records
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

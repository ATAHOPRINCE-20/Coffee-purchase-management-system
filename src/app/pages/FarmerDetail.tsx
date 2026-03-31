import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { Layout } from "../components/Layout";
import { farmersService, Farmer } from "../services/farmersService";
import { purchasesService, Purchase } from "../services/purchasesService";
import { advancesService, Advance } from "../services/advancesService";
import { ErrorState } from "../components/ErrorState";
import { ArrowLeft, Phone, MapPin, Package, TrendingUp, CreditCard, ShoppingCart, Loader2, Trash2 } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

function formatUGX(v: number) { return `UGX ${Math.round(v).toLocaleString()}`; }

function Badge({ status }: { status: string }) {
  const config = {
    Active: { bg: "#fff7ed", color: "#9a3412", border: "#fed7aa" },
    Cleared: { bg: "#f0fdf4", color: "#14532D", border: "#bbf7d0" },
  }[status] || { bg: "#F3F4F6", color: "#374151", border: "#E5E7EB" };
  return (
    <span className="px-2.5 py-1 rounded-full" style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600, backgroundColor: config.bg, color: config.color, border: `1px solid ${config.border}` }}>
      {status}
    </span>
  );
}

export default function FarmerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState("purchases");

  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [farmerPurchases, setFarmerPurchases] = useState<Purchase[]>([]);
  const [farmerAdvances, setFarmerAdvances] = useState<Advance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!profile || (profile.role !== 'Admin' && profile.role !== 'Super Admin')) return;
    if (window.confirm("Are you sure you want to deactivate this client? They will no longer appear in your active lists, but their historical records will be preserved. This action can be undone by an administrator later.")) {
      try {
        setIsDeleting(true);
        await farmersService.delete(id!);
        navigate("/farmers");
      } catch (err: any) {
        alert("Failed to delete client: " + err.message);
        setIsDeleting(false);
      }
    }
  };

  const fetchData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const [farmerData, purchasesData, advancesData] = await Promise.all([
        farmersService.getById(id),
        purchasesService.getByFarmerId(id),
        advancesService.getByFarmerId(id),
      ]);
      setFarmer(farmerData);
      setFarmerPurchases(purchasesData);
      setFarmerAdvances(advancesData);
    } catch (err: any) {
      setError(err.message || "Failed to load farmer data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <Layout breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Clients", href: "/farmers" }, { label: "Loading..." }]}>
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-green-700 animate-spin mb-4" />
          <p className="text-gray-500 font-medium">Loading client details...</p>
        </div>
      </Layout>
    );
  }

  if (error || !farmer) {
    return (
      <Layout breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Clients", href: "/farmers" }, { label: "Error" }]}>
        <ErrorState
          title="Couldn't Load Client"
          message={error || "Client not found"}
          onRetry={fetchData}
        />
      </Layout>
    );
  }

  const activeAdvance = farmerAdvances.find(a => a.status === "Active");
  const totalWeight = farmerPurchases.reduce((sum, p) => sum + (p.payable_weight || 0), 0);
  const totalValue = farmerPurchases.reduce((sum, p) => sum + (p.total_amount || 0), 0);
  const totalAdvances = farmerAdvances.reduce((sum, a) => sum + (a.amount || 0), 0);

  // Build monthly trend from real purchases
  const monthlyTrend = farmerPurchases.reduce((acc: Record<string, number>, p) => {
    const month = new Date(p.date).toLocaleString("default", { month: "short" });
    acc[month] = (acc[month] || 0) + (p.payable_weight || 0);
    return acc;
  }, {});
  const trendData = Object.entries(monthlyTrend).map(([month, weight]) => ({ month, weight }));

  const tabs = [
    { id: "purchases", label: "Purchase History", icon: ShoppingCart },
    { id: "advances", label: "Advance History", icon: CreditCard },
    { id: "summary", label: "Seasonal Summary", icon: TrendingUp },
  ];

  return (
    <Layout breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Clients", href: "/farmers" }, { label: farmer.name }]}>
      {/* Back + Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate("/farmers")}
          className="flex items-center gap-2 px-3 py-2 rounded-xl transition-colors hover:bg-gray-100"
          style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 500, color: "#6B7280", border: "1px solid #E5E7EB", backgroundColor: "#fff" }}
        >
          <ArrowLeft size={15} />
          Back
        </button>
        <div>
          <h1 style={{ fontFamily: "Inter, sans-serif", fontSize: "22px", fontWeight: 700, color: "#111827" }}>{farmer.name}</h1>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#6B7280", marginTop: "2px" }}>Client ID: {farmer.id} · Season 2024/2025</p>
        </div>
        <div className="ml-auto flex gap-2">
          {(profile?.role === 'Admin' || profile?.role === 'Super Admin') && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
              style={{ backgroundColor: "#DC2626", color: "#fff", fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600 }}
            >
              {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              Delete Client
            </button>
          )}
          <button
            onClick={() => navigate(`/purchases/new?farmerId=${farmer.id}`)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl hover:opacity-90 transition-all"
            style={{ backgroundColor: "#14532D", color: "#fff", fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600 }}
          >
            <ShoppingCart size={14} />
            New Purchase
          </button>
        </div>
      </div>

      {/* Farmer Summary Card */}
      <div className="bg-white rounded-xl p-6 mb-5" style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.05)", border: "1px solid #F1F5F9" }}>
        <div className="flex flex-col md:flex-row gap-6">
          {/* Avatar & Info */}
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "#14532D", color: "#fff", fontFamily: "Inter", fontSize: "22px", fontWeight: 700 }}>
              {farmer.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
            </div>
            <div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: "18px", fontWeight: 700, color: "#111827" }}>{farmer.name}</div>
              <div className="flex items-center gap-1.5 mt-1">
                <Phone size={12} color="#9CA3AF" />
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#6B7280" }}>{farmer.phone || "—"}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <MapPin size={12} color="#9CA3AF" />
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#6B7280" }}>{farmer.village}{farmer.region ? `, ${farmer.region}` : ""}</span>
              </div>
              {farmer.eudr_number && (
                <div className="flex items-center gap-1.5 mt-1.5 px-2 py-0.5 rounded-md bg-green-50 w-fit">
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", fontWeight: 700, color: "#14532D", textTransform: "uppercase" }}>EUDR:</span>
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600, color: "#14532D" }}>{farmer.eudr_number}</span>
                </div>
              )}
            </div>
          </div>

          {/* Stat Grid */}
          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Package, label: "Deliveries", value: `${farmerPurchases.length}`, color: "#14532D", bg: "#f0fdf4" },
              { icon: TrendingUp, label: "Total Supplied", value: `${totalWeight.toFixed(0)} kg`, color: "#6F4E37", bg: "#fdf6f3" },
              { icon: TrendingUp, label: "Total Value", value: formatUGX(totalValue), color: "#16A34A", bg: "#f0fdf4" },
              { icon: CreditCard, label: "Advance Balance", value: activeAdvance ? formatUGX(activeAdvance.remaining) : "Cleared", color: activeAdvance ? "#DC2626" : "#16A34A", bg: activeAdvance ? "#fef2f2" : "#f0fdf4" },
            ].map(s => (
              <div key={s.label} className="p-3.5 rounded-xl" style={{ backgroundColor: s.bg, border: "1px solid transparent" }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <s.icon size={13} color={s.color} />
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#6B7280" }}>{s.label}</span>
                </div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: "16px", fontWeight: 700, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.05)", border: "1px solid #F1F5F9" }}>
        {/* Tab Nav */}
        <div className="flex border-b border-gray-100">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-5 py-4 transition-colors relative"
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: "13px",
                fontWeight: activeTab === tab.id ? 600 : 400,
                color: activeTab === tab.id ? "#14532D" : "#6B7280",
                borderBottom: activeTab === tab.id ? "2px solid #14532D" : "2px solid transparent",
                backgroundColor: "transparent",
              }}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Purchase History Tab */}
        {activeTab === "purchases" && (
          <>
            {/* Desktop View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: "#F8FAFC" }}>
                    {["Date", "Type", "Gross Wt", "Moisture", "Deduction", "Payable Wt", "Total Amount", "Advance Ded.", "Cash Paid"].map(h => (
                      <th key={h} className="px-4 py-3 text-left whitespace-nowrap" style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {farmerPurchases.length > 0 ? farmerPurchases.map((p) => (
                    <tr key={p.id} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3.5">
                        <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#374151" }}>{p.date}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded-full" style={{
                          fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 500,
                          backgroundColor: p.coffee_type === "Kiboko" ? "#f0fdf4" : p.coffee_type === "Red" ? "#fef2f2" : "#fdf4ff",
                          color: p.coffee_type === "Kiboko" ? "#14532D" : p.coffee_type === "Red" ? "#991b1b" : "#701a75"
                        }}>{p.coffee_type}</span>
                      </td>
                      <td className="px-4 py-3.5" style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#374151" }}>{p.gross_weight} kg</td>
                      <td className="px-4 py-3.5">
                        <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: p.moisture_content > p.standard_moisture ? "#DC2626" : "#16A34A", fontWeight: 500 }}>{p.moisture_content}%</span>
                      </td>
                      <td className="px-4 py-3.5" style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#DC2626", fontWeight: 500 }}>−{(p.deduction_weight ?? 0).toFixed(2)} kg</td>
                      <td className="px-4 py-3.5" style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600, color: "#14532D" }}>{p.payable_weight.toFixed(2)} kg</td>
                      <td className="px-4 py-3.5" style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#111827" }}>{formatUGX(p.total_amount)}</td>
                      <td className="px-4 py-3.5" style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: p.advance_deducted > 0 ? "#DC2626" : "#9CA3AF" }}>
                        {p.advance_deducted > 0 ? `−${formatUGX(p.advance_deducted)}` : "—"}
                      </td>
                      <td className="px-4 py-3.5" style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 700, color: "#14532D" }}>{formatUGX(p.cash_paid)}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={9} className="py-12 text-center" style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#9CA3AF" }}>No purchase records found</td>
                    </tr>
                  )}
                </tbody>
                {farmerPurchases.length > 0 && (
                  <tfoot>
                    <tr style={{ backgroundColor: "#f0fdf4" }}>
                      <td colSpan={2} className="px-4 py-3" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 700, color: "#14532D" }}>TOTALS</td>
                      <td className="px-4 py-3" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 700, color: "#14532D" }}>
                        {farmerPurchases.reduce((s, p) => s + p.gross_weight, 0)} kg
                      </td>
                      <td />
                      <td className="px-4 py-3" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 700, color: "#DC2626" }}>
                        −{farmerPurchases.reduce((s, p) => s + (p.deduction_weight ?? 0), 0).toFixed(2)} kg
                      </td>
                      <td className="px-4 py-3" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 700, color: "#14532D" }}>
                        {totalWeight.toFixed(2)} kg
                      </td>
                      <td className="px-4 py-3" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 700, color: "#111827" }}>
                        {formatUGX(totalValue)}
                      </td>
                      <td className="px-4 py-3" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 700, color: "#DC2626" }}>
                        −{formatUGX(farmerPurchases.reduce((s, p) => s + p.advance_deducted, 0))}
                      </td>
                      <td className="px-4 py-3" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 700, color: "#14532D" }}>
                        {formatUGX(farmerPurchases.reduce((s, p) => s + p.cash_paid, 0))}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Mobile View */}
            <div className="lg:hidden flex flex-col divide-y divide-gray-50">
              {farmerPurchases.length > 0 ? farmerPurchases.map((p) => (
                <div key={p.id} className="p-4 flex flex-col gap-3 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                      <div style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 600, color: "#111827" }}>{p.date}</div>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full" style={{
                          fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 500,
                          backgroundColor: p.coffee_type === "Kiboko" ? "#f0fdf4" : p.coffee_type === "Red" ? "#fef2f2" : "#fdf4ff",
                          color: p.coffee_type === "Kiboko" ? "#14532D" : p.coffee_type === "Red" ? "#991b1b" : "#701a75"
                        }}>{p.coffee_type}</span>
                        <span style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: p.moisture_content > p.standard_moisture ? "#DC2626" : "#16A34A", fontWeight: 500 }}>{p.moisture_content}% Moisture</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 700, color: "#14532D" }}>{formatUGX(p.cash_paid)}</div>
                      <div style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#6B7280" }}>Cash Paid</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mt-1 bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                    <div>
                      <div style={{ fontFamily: "Inter", fontSize: "10px", color: "#9CA3AF", textTransform: "uppercase", fontWeight: 600 }}>Payable Wt</div>
                      <div style={{ fontFamily: "Inter", fontSize: "13px", fontWeight: 600, color: "#111827" }}>{p.payable_weight.toFixed(2)} kg</div>
                      <div style={{ fontFamily: "Inter", fontSize: "11px", color: "#6B7280", marginTop: "2px" }}>Gross: {p.gross_weight} kg</div>
                    </div>
                    <div>
                      <div style={{ fontFamily: "Inter", fontSize: "10px", color: "#9CA3AF", textTransform: "uppercase", fontWeight: 600 }}>Total Value</div>
                      <div style={{ fontFamily: "Inter", fontSize: "13px", fontWeight: 600, color: "#111827" }}>{formatUGX(p.total_amount)}</div>
                      {p.advance_deducted > 0 && (
                        <div style={{ fontFamily: "Inter", fontSize: "11px", color: "#DC2626", marginTop: "2px", fontWeight: 500 }}>Ded: −{formatUGX(p.advance_deducted)}</div>
                      )}
                    </div>
                  </div>
                </div>
              )) : (
                <div className="py-12 text-center" style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#9CA3AF" }}>No purchase records found</div>
              )}
              {farmerPurchases.length > 0 && (
                <div className="p-4 bg-green-50/50 space-y-2 border-t border-green-100 flex justify-between items-center mt-1">
                   <div style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#14532D" }}>Total Cash Paid</div>
                   <div style={{ fontFamily: "Inter, sans-serif", fontSize: "15px", fontWeight: 700, color: "#14532D" }}>
                      {formatUGX(farmerPurchases.reduce((s, p) => s + p.cash_paid, 0))}
                   </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Advance History Tab */}
        {activeTab === "advances" && (
          <>
            {/* Desktop View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: "#F8FAFC" }}>
                    {["Date Given", "Amount", "Expected Price", "Expected Return", "Deducted", "Balance", "Status", "Notes"].map(h => (
                      <th key={h} className="px-4 py-3 text-left whitespace-nowrap" style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {farmerAdvances.length > 0 ? farmerAdvances.map((a) => (
                    <tr key={a.id} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3.5" style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#374151" }}>{a.issue_date}</td>
                      <td className="px-4 py-3.5" style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600, color: "#111827" }}>{formatUGX(a.amount)}</td>
                      <td className="px-4 py-3.5" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#6B7280" }}>
                        {a.unit_price ? `UGX ${a.unit_price.toLocaleString()}/kg` : "—"}
                      </td>
                      <td className="px-4 py-3.5" style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 700, color: "#14532D" }}>
                        {a.unit_price ? `${(a.amount / a.unit_price).toFixed(1)} kg` : "—"}
                      </td>
                      <td className="px-4 py-3.5" style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#16A34A", fontWeight: 500 }}>{formatUGX(a.deducted)}</td>
                      <td className="px-4 py-3.5">
                        <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 700, color: a.remaining > 0 ? "#DC2626" : "#16A34A" }}>
                          {formatUGX(a.remaining)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5"><Badge status={a.status} /></td>
                      <td className="px-4 py-3.5" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#6B7280" }}>{a.notes || "—"}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center" style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#9CA3AF" }}>No advance records found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="lg:hidden flex flex-col divide-y divide-gray-50">
              {farmerAdvances.length > 0 ? farmerAdvances.map((a) => (
                <div key={a.id} className="p-4 flex flex-col gap-3 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col flex-1 pr-2">
                       <div style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 600, color: "#111827" }}>{a.issue_date}</div>
                       <div style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#6B7280" }} className="line-clamp-1 mt-0.5">{a.notes || "No notes"}</div>
                    </div>
                    <Badge status={a.status} />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mt-1 bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                    <div>
                      <div style={{ fontFamily: "Inter", fontSize: "10px", color: "#9CA3AF", textTransform: "uppercase", fontWeight: 600 }}>Given</div>
                      <div style={{ fontFamily: "Inter", fontSize: "13px", fontWeight: 600, color: "#111827" }}>{formatUGX(a.amount)}</div>
                    </div>
                    <div>
                      <div style={{ fontFamily: "Inter", fontSize: "10px", color: "#9CA3AF", textTransform: "uppercase", fontWeight: 600 }}>Deducted</div>
                      <div style={{ fontFamily: "Inter", fontSize: "13px", fontWeight: 600, color: "#16A34A" }}>{formatUGX(a.deducted)}</div>
                    </div>
                    {a.unit_price && (
                      <div className="col-span-2 pt-2 border-t border-gray-200/60 mt-1 flex justify-between items-center">
                        <div style={{ fontFamily: "Inter", fontSize: "11px", color: "#6B7280", fontWeight: 500 }}>Expected Return</div>
                        <div style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 700, color: "#14532D" }}>
                          {(a.amount / a.unit_price).toFixed(1)} kg @ {formatUGX(a.unit_price)}/kg
                        </div>
                      </div>
                    )}
                    <div className="col-span-2 pt-2 border-t border-gray-200/60 mt-1 flex justify-between items-center">
                      <div style={{ fontFamily: "Inter", fontSize: "11px", color: "#6B7280", fontWeight: 500 }}>Balance</div>
                      <div style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 700, color: a.remaining > 0 ? "#DC2626" : "#16A34A" }}>
                        {a.remaining > 0 ? formatUGX(a.remaining) : "Cleared"}
                      </div>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="py-12 text-center" style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#9CA3AF" }}>No advance records found</div>
              )}
            </div>
          </>
        )}

        {/* Seasonal Summary Tab */}
        {activeTab === "summary" && (
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: "Total KG Supplied", value: `${totalWeight.toFixed(0)} kg`, color: "#14532D", bg: "#f0fdf4" },
                { label: "Total Amount Earned", value: formatUGX(totalValue), color: "#16A34A", bg: "#f0fdf4" },
                { label: "Total Advances", value: formatUGX(totalAdvances), color: "#F59E0B", bg: "#fffbeb" },
                { label: "Final Balance", value: activeAdvance ? `${formatUGX(activeAdvance.remaining)} owed` : "Settled", color: activeAdvance ? "#DC2626" : "#16A34A", bg: activeAdvance ? "#fef2f2" : "#f0fdf4" },
              ].map(s => (
                <div key={s.label} className="p-4 rounded-xl" style={{ backgroundColor: s.bg, border: "1px solid transparent" }}>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#6B7280", marginBottom: "6px" }}>{s.label}</div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: "18px", fontWeight: 700, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Seasonal Trend Chart */}
            <div className="bg-white rounded-xl p-5" style={{ border: "1px solid #F1F5F9" }}>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 600, color: "#111827", marginBottom: "4px" }}>Monthly Supply Trend</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#6B7280", marginBottom: "20px" }}>Payable weight delivered per month</div>
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="farmerGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#14532D" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#14532D" stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="month" tick={{ fontFamily: "Inter", fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontFamily: "Inter", fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} tickFormatter={v => `${v}kg`} />
                    <Tooltip
                      contentStyle={{ fontFamily: "Inter", fontSize: 12, borderRadius: 8, border: "1px solid #E5E7EB", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                      formatter={(v: number) => [`${v} kg`, "Weight"]}
                    />
                    <Area type="monotone" dataKey="weight" stroke="#14532D" strokeWidth={2.5} fill="url(#farmerGrad)" dot={{ fill: "#14532D", r: 4 }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[200px]" style={{ color: "#9CA3AF", fontFamily: "Inter, sans-serif", fontSize: "13px" }}>
                  No purchase data to display
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

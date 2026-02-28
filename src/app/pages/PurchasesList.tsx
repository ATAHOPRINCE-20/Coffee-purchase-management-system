import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Layout } from "../components/Layout";
import { Search, Plus, Eye, Download, Filter, Loader2 } from "lucide-react";
import { purchasesService } from "../services/purchasesService";

function formatUGX(v: number) { return `UGX ${Math.round(v).toLocaleString()}`; }

import { ErrorState } from "../components/ErrorState";

export default function PurchasesList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await purchasesService.getAll();
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

      {/* Summary Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Purchases", value: `${purchases.length}`, icon: "📦" },
          { label: "Total Payable Weight", value: `${totalWeight.toFixed(0)} kg`, icon: "⚖️" },
          { label: "Total Value", value: `${formatUGX(Math.round(totalValue / 1000))}K`, icon: "💵" },
          { label: "Avg per Purchase", value: `${(totalWeight / purchases.length).toFixed(0)} kg`, icon: "📊" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-4 flex items-center gap-3" style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.05)", border: "1px solid #F1F5F9" }}>
            <span className="text-2xl">{s.icon}</span>
            <div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: "16px", fontWeight: 700, color: "#111827" }}>{s.value}</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#6B7280" }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.05)", border: "1px solid #F1F5F9" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 600, color: "#111827" }}>All Purchases</div>
          <div className="flex gap-2">
            <div className="relative">
              <Search size={13} color="#9CA3AF" className="absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 pr-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-[#14532D]"
                style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", width: "160px" }}
              />
            </div>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="px-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-[#14532D]"
              style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", cursor: "pointer" }}
            >
              <option value="All">All Types</option>
              <option value="Robusta">Robusta</option>
              <option value="Arabica">Arabica</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: "#F8FAFC" }}>
                {["Purchase ID", "Farmer", "Date", "Type", "Gross Wt", "Moisture", "Payable Wt", "Total Amt", "Advance Ded.", "Cash Paid"].map(h => (
                  <th key={h} className="px-4 py-3 text-left whitespace-nowrap" style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-t border-gray-50 hover:bg-[#f0fdf4] transition-colors cursor-pointer">
                  <td className="px-4 py-3.5">
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#14532D", backgroundColor: "#f0fdf4", padding: "2px 8px", borderRadius: "6px" }}>{p.id}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 500, color: "#111827" }}>{p.farmers?.name || "Unknown"}</div>
                  </td>
                  <td className="px-4 py-3.5" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#6B7280" }}>{p.date}</td>
                  <td className="px-4 py-3.5">
                    <span className="px-2 py-0.5 rounded-full" style={{
                      fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 500,
                      backgroundColor: p.coffee_type === "Robusta" ? "#f0fdf4" : "#fef3c7",
                      color: p.coffee_type === "Robusta" ? "#14532D" : "#92400e"
                    }}>{p.coffee_type}</span>
                  </td>
                  <td className="px-4 py-3.5" style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#374151" }}>{p.gross_weight} kg</td>
                  <td className="px-4 py-3.5">
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: p.moisture_content > (p.standard_moisture || 12) ? "#DC2626" : "#16A34A", fontWeight: 500 }}>{p.moisture_content}%</span>
                  </td>
                  <td className="px-4 py-3.5" style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600, color: "#14532D" }}>{(p.payable_weight || 0).toFixed(2)} kg</td>
                  <td className="px-4 py-3.5" style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#111827" }}>{formatUGX(Math.round((p.total_amount || 0) / 1000))}K</td>
                  <td className="px-4 py-3.5" style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: (p.advance_deducted || 0) > 0 ? "#DC2626" : "#9CA3AF" }}>
                    {(p.advance_deducted || 0) > 0 ? `−${formatUGX(Math.round(p.advance_deducted / 1000))}K` : "—"}
                  </td>
                  <td className="px-4 py-3.5" style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 700, color: "#14532D" }}>{formatUGX(Math.round((p.cash_paid || 0) / 1000))}K</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-gray-100" style={{ backgroundColor: "#F8FAFC" }}>
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#6B7280" }}>
            Showing {filtered.length} of {purchases.length} records
          </span>
        </div>
      </div>
    </Layout>
  );
}

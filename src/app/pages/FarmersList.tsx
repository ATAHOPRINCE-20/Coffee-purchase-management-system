import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Layout } from "../components/Layout";
import { Search, Plus, Eye, Phone, MapPin, Loader2 } from "lucide-react";
import { farmersService, Farmer } from "../services/farmersService";
import { purchasesService } from "../services/purchasesService";
import { advancesService } from "../services/advancesService";
import { useAuth } from "../hooks/useAuth";
import { ErrorState } from "../components/ErrorState";

function formatUGX(v: number) {
  return `UGX ${v.toLocaleString()}`;
}

export default function FarmersList() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [search, setSearch] = useState("");
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [enriched, setEnriched] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const maxFarmers = profile?.subscription?.plans?.features?.max_farmers || 10;
  const isLimitReached = farmers.length >= maxFarmers;

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [farmersData, purchasesData, advancesData] = await Promise.all([
        farmersService.getAll(),
        purchasesService.getAll(),
        advancesService.getAll()
      ]);

      const enrichedData = farmersData.map(f => {
        const farmerPurchases = (purchasesData as any[]).filter(p => p.farmer_id === f.id);
        const farmerAdvance = (advancesData as any[]).find(a => a.farmer_id === f.id && a.status === "Active");
        const totalValue = farmerPurchases.reduce((sum, p) => sum + (p.total_amount || 0), 0);
        const totalWeight = farmerPurchases.reduce((sum, p) => sum + (p.payable_weight || 0), 0);
        return { 
          ...f, 
          deliveries: farmerPurchases.length, 
          totalValue, 
          totalWeight, 
          advanceBalance: farmerAdvance?.remaining || 0, 
          advanceStatus: farmerAdvance?.status || "None" 
        };
      });

      setFarmers(farmersData);
      setEnriched(enrichedData);
    } catch (err: any) {
      console.error("Error fetching farmers:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = enriched.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.village?.toLowerCase().includes(search.toLowerCase()) ||
    f.phone?.includes(search)
  );

  if (loading) {
    return (
      <Layout breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Farmers" }]}>
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-green-700 animate-spin mb-4" />
          <p className="text-gray-500 font-medium">Loading farmers list...</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Farmers" }]}>
        <ErrorState 
          title="Couldn't Load Farmers" 
          message={error} 
          onRetry={fetchData} 
        />
      </Layout>
    );
  }


  return (
    <Layout breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Farmers" }]}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ fontFamily: "Inter, sans-serif", fontSize: "22px", fontWeight: 700, color: "#111827" }}>Farmers</h1>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#6B7280", marginTop: "2px" }}>{farmers.length} registered farmers this season</p>
        </div>
         <div className="flex flex-col items-end gap-1">
          <button
            disabled={isLimitReached}
            onClick={() => navigate("/farmers/new")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#14532D", color: "#fff", fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600 }}
          >
            <Plus size={15} />
            Add Farmer
          </button>
          {isLimitReached && (
            <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100 uppercase tracking-tight">
              Plan Limit Reached ({maxFarmers})
            </span>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Farmers", value: "42", icon: "👨‍🌾" },
          { label: "Active This Season", value: "38", icon: "✅" },
          { label: "Total Supplied", value: "18,420 kg", icon: "⚖️" },
          { label: "Total Value Paid", value: "UGX 95.76M", icon: "💰" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-4 flex items-center gap-3" style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.05)", border: "1px solid #F1F5F9" }}>
            <div className="text-2xl">{s.icon}</div>
            <div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: "16px", fontWeight: 700, color: "#111827" }}>{s.value}</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#6B7280" }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-xl" style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.05)", border: "1px solid #F1F5F9" }}>
        {/* Table Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 600, color: "#111827" }}>All Farmers</div>
          <div className="relative">
            <Search size={14} color="#9CA3AF" className="absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search farmers..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-xl border border-gray-200 outline-none focus:border-[#14532D]"
              style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#374151", width: "220px" }}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: "#F8FAFC" }}>
                {["Farmer", "Contact", "Village", "Deliveries", "Total Supplied", "Total Value", "Advance Balance", "Action"].map(h => (
                  <th key={h} className="px-4 py-3 text-left whitespace-nowrap" style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(f => (
                <tr key={f.id} className="border-t border-gray-50 hover:bg-[#f0fdf4] transition-colors cursor-pointer" onClick={() => navigate(`/farmers/${f.id}`)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: "#14532D", color: "#fff", fontFamily: "Inter", fontSize: "12px", fontWeight: 700 }}>
                        {f.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <div style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 500, color: "#111827" }}>{f.name}</div>
                        <div style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#9CA3AF" }}>{f.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Phone size={11} color="#9CA3AF" />
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#6B7280" }}>{f.phone}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={11} color="#9CA3AF" />
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#6B7280" }}>{f.village}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2.5 py-1 rounded-full" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 500, backgroundColor: "#f0fdf4", color: "#14532D" }}>
                      {f.deliveries}
                    </span>
                  </td>
                  <td className="px-4 py-3" style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 500, color: "#374151" }}>{f.totalWeight.toFixed(0)} kg</td>
                  <td className="px-4 py-3" style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 500, color: "#111827" }}>
                    {formatUGX(Math.round(f.totalValue / 1000))}K
                  </td>
                  <td className="px-4 py-3">
                    {f.advanceBalance > 0 ? (
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600, color: "#DC2626" }}>
                        {formatUGX(Math.round(f.advanceBalance / 1000))}K
                      </span>
                    ) : (
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#16A34A", fontWeight: 500 }}>Cleared</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors hover:bg-green-100"
                      style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 500, color: "#14532D", backgroundColor: "#f0fdf4" }}
                    >
                      <Eye size={12} />
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <div className="text-5xl mb-3">👨‍🌾</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 500, color: "#374151" }}>No farmers found</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#9CA3AF", marginTop: "4px" }}>Try a different search term</div>
          </div>
        )}
      </div>
    </Layout>
  );
}

import { useState, useEffect, useCallback } from "react";
import { Layout } from "../components/Layout";
import { 
  Receipt, Wallet, ShoppingCart, TrendingUp, 
  ArrowUpRight, Clock, CheckCircle2, AlertCircle, Loader2 
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { agentAdvancesService, AgentAdvance } from "../services/agentAdvancesService";
import { purchasesService } from "../services/purchasesService";

const formatUGX = (v: number) => `UGX ${Math.round(v).toLocaleString()}`;

export default function Settlement() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [advances, setAdvances] = useState<AgentAdvance[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!profile?.id) return;
    try {
      setLoading(true);
      setError(null);
      const [advancesData, purchasesData] = await Promise.all([
        agentAdvancesService.getAllForAgent(profile.id),
        purchasesService.getForAgent(profile.id)
      ]);
      setAdvances(advancesData);
      setPurchases(purchasesData);
    } catch (err: any) {
      console.error("Error fetching settlement data:", err);
      setError("Failed to load settlement data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalCapital = advances.reduce((sum, a) => sum + (a.amount || 0), 0);
  const totalPurchases = purchases.reduce((sum, p) => sum + (p.total_amount || 0), 0);
  const currentBalance = totalCapital - totalPurchases;

  return (
    <Layout breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Settle" }]}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ fontFamily: "Inter, sans-serif", fontSize: "22px", fontWeight: 700, color: "#111827" }}>Capital Settlement</h1>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#6B7280", marginTop: "2px" }}>
            Track capital received from admin and your purchase expenditure
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3 text-red-800 text-sm">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {[
          { 
            label: "Total Capital Received", 
            value: formatUGX(totalCapital), 
            icon: Wallet, 
            color: "#14532D", 
            bg: "#f0fdf4" 
          },
          { 
            label: "Total Purchase Cost", 
            value: formatUGX(totalPurchases), 
            icon: ShoppingCart, 
            color: "#6F4E37", 
            bg: "#fdf6f3" 
          },
          { 
            label: "Current Balance", 
            value: formatUGX(currentBalance), 
            icon: TrendingUp, 
            color: currentBalance >= 0 ? "#16A34A" : "#DC2626", 
            bg: currentBalance >= 0 ? "#f0fdf4" : "#fef2f2" 
          },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: stat.bg }}>
                <stat.icon size={20} color={stat.color} />
              </div>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {stat.label}
              </span>
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "24px", fontWeight: 700, color: "#111827" }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Capital History */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <h3 style={{ fontFamily: "Inter", fontSize: "15px", fontWeight: 700, color: "#111827" }}>Capital Received</h3>
            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-bold uppercase tracking-wider">
              {advances.length} Entries
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-gray-400 italic">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                      Loading...
                    </td>
                  </tr>
                ) : advances.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-gray-400 italic">No capital received yet</td>
                  </tr>
                ) : (
                  advances.map((adv) => (
                    <tr key={adv.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{adv.issue_date}</div>
                        <div className="text-[10px] text-gray-500 mt-0.5">
                          {adv.issuer?.full_name ? `From: ${adv.issuer.full_name}` : ""}
                          {adv.notes ? ` • ${adv.notes}` : ""}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900">{formatUGX(adv.amount)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                          adv.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {adv.status === 'Active' ? <Clock size={10} /> : <CheckCircle2 size={10} />}
                          {adv.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Purchases Expenditure */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <h3 style={{ fontFamily: "Inter", fontSize: "15px", fontWeight: 700, color: "#111827" }}>Recent Purchases</h3>
            <button 
              onClick={() => (window.location.href = '/purchases')}
              className="text-[#14532D] text-xs font-bold flex items-center gap-1 hover:underline"
            >
              View All <ArrowUpRight size={12} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Client / Date</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Weight</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-gray-400 italic">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                      Loading...
                    </td>
                  </tr>
                ) : purchases.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-gray-400 italic">No purchases recorded yet</td>
                  </tr>
                ) : (
                  purchases.slice(0, 10).map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-gray-900">{p.farmers?.name || "Unknown"}</div>
                        <div className="text-[10px] text-gray-500 mt-0.5">{p.date} • {p.coffee_type}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{p.payable_weight.toFixed(1)} kg</td>
                      <td className="px-6 py-4 text-sm font-bold text-red-600 text-right">{formatUGX(p.total_amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}

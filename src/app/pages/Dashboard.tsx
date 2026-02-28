import { useState, useEffect } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";
import { Layout } from "../components/Layout";
import { TrendingUp, ShoppingCart, Users, CreditCard, ArrowUpRight, Plus, Eye, AlertCircle, Loader2 } from "lucide-react";
import { purchasesService } from "../services/purchasesService";
import { farmersService } from "../services/farmersService";
import { advancesService } from "../services/advancesService";
import { seasonsService, Season } from "../services/seasonsService";
import { useAuth } from "../hooks/useAuth";

const formatUGX = (v: number) => `UGX ${v.toLocaleString()}`;


function StatCard({ icon: Icon, label, value, sub, color, trend }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color: string; trend?: string;
}) {
  return (
    <div className="bg-white rounded-xl p-6" style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.05)", border: "1px solid #F1F5F9" }}>
      <div className="flex items-start justify-between mb-4">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
          <Icon size={20} color={color} />
        </div>
        {trend && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ backgroundColor: "#f0fdf4" }}>
            <TrendingUp size={11} color="#16A34A" />
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 500, color: "#16A34A" }}>{trend}</span>
          </div>
        )}
      </div>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 500, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>{label}</div>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: "22px", fontWeight: 700, color: "#111827", lineHeight: 1.2 }}>{value}</div>
      {sub && <div style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#9CA3AF", marginTop: "4px" }}>{sub}</div>}
    </div>
  );
}

import { useNavigate } from "react-router";
import { ErrorState } from "../components/ErrorState";

const COLORS = ["#14532D", "#6F4E37"];

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [season, setSeason] = useState<Season | null>(null);
  const [stats, setStats] = useState<any>({
    totalPurchasesToday: 0,
    totalWeightToday: 0,
    totalValueToday: 0,
    activeFarmers: 0,
    totalAdvancesOutstanding: 0,
    monthlyPurchases: 0,
    monthlyValue: 0
  });
  const [monthlyTrend, setMonthlyTrend] = useState<any[]>([]);
  const [coffeeTypeBreakdown, setCoffeeTypeBreakdown] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [advances, setAdvances] = useState<any[]>([]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [activeSeason, allFarmers, allPurchases, activeAdvances] = await Promise.all([
        seasonsService.getActive(),
        farmersService.getAll(),
        purchasesService.getAll(),
        advancesService.getAll()
      ]);

      setSeason(activeSeason);
      setPurchases(allPurchases.slice(0, 5));
      setAdvances(activeAdvances.filter((a: any) => a.status === 'Active'));

      const today = new Date().toISOString().split('T')[0];
      const todayPurchases = allPurchases.filter((p: any) => p.date === today);
      
      const totalPurchasesToday = todayPurchases.length;
      const totalWeightToday = todayPurchases.reduce((sum: number, p: any) => sum + (p.payable_weight || 0), 0);
      const totalValueToday = todayPurchases.reduce((sum: number, p: any) => sum + (p.total_amount || 0), 0);
      const totalAdvancesOutstanding = activeAdvances.reduce((sum: number, a: any) => sum + (a.remaining || 0), 0);

      // Monthly Stats
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}`;
      
      const monthlyPurchasesData = allPurchases.filter((p: any) => p.date.startsWith(monthStr));
      const monthlyWeight = monthlyPurchasesData.reduce((sum: number, p: any) => sum + (p.payable_weight || 0), 0);
      const monthlyValue = monthlyPurchasesData.reduce((sum: number, p: any) => sum + (p.total_amount || 0), 0);

      // Coffee Type Breakdown (Monthly)
      const robustaSold = monthlyPurchasesData
        .filter((p: any) => p.coffee_type === 'Robusta')
        .reduce((sum: number, p: any) => sum + (p.payable_weight || 0), 0);
      const arabicaSold = monthlyPurchasesData
        .filter((p: any) => p.coffee_type === 'Arabica')
        .reduce((sum: number, p: any) => sum + (p.payable_weight || 0), 0);
      
      const totalWeight = robustaSold + arabicaSold;
      const breakdown = [
        { type: "Robusta", percentage: totalWeight > 0 ? Math.round((robustaSold / totalWeight) * 100) : 0, weight: robustaSold },
        { type: "Arabica", percentage: totalWeight > 0 ? Math.round((arabicaSold / totalWeight) * 100) : 0, weight: arabicaSold },
      ];

      // Monthly Trend (Last 6 Months)
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const trendMap: Record<string, number> = {};
      
      // Last 6 months
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const mKey = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
        trendMap[mKey] = 0;
      }

      allPurchases.forEach((p: any) => {
        const mKey = p.date.substring(0, 7);
        if (trendMap[mKey] !== undefined) {
          trendMap[mKey] += (p.payable_weight || 0);
        }
      });

      const trendData = Object.entries(trendMap).sort().map(([key, weight]) => {
        const [y, m] = key.split('-');
        return { month: months[parseInt(m) - 1], weight };
      });

      // Average Buying Price (All time or current season)
      const allTimeWeight = allPurchases.reduce((sum: number, p: any) => sum + (p.payable_weight || 0), 0);
      const allTimeValue = allPurchases.reduce((sum: number, p: any) => sum + (p.total_amount || 0), 0);
      const avgPrice = allTimeWeight > 0 ? Math.round(allTimeValue / allTimeWeight) : 0;

      setStats({
        totalPurchasesToday,
        totalWeightToday,
        totalValueToday,
        activeFarmers: allFarmers.length,
        totalAdvancesOutstanding,
        monthlyPurchases: monthlyWeight,
        monthlyValue,
        avgPrice
      });

      setMonthlyTrend(trendData);
      setCoffeeTypeBreakdown(breakdown);

    } catch (err: any) {
      console.error("Error fetching dashboard data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <Layout breadcrumbs={[{ label: "Dashboard" }]}>
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-green-700 animate-spin mb-4" />
          <p className="text-gray-500 font-medium">Loading dashboard...</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout breadcrumbs={[{ label: "Dashboard" }]}>
        <ErrorState 
          title="Couldn't Load Dashboard" 
          message={error} 
          onRetry={fetchDashboardData} 
        />
      </Layout>
    );
  }

  return (
    <Layout
      breadcrumbs={[{ label: "Dashboard" }]}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ fontFamily: "Inter, sans-serif", fontSize: "22px", fontWeight: 700, color: "#111827" }}>Good morning, {profile?.full_name?.split(' ')[0] || "User"} 👋</h1>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#6B7280", marginTop: "2px" }}>{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} · Season {season?.name || "None"}</p>
        </div>
        <button
          onClick={() => navigate("/purchases/new")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all hover:opacity-90"
          style={{ backgroundColor: "#14532D", color: "#fff", fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600 }}
        >
          <Plus size={16} />
          New Purchase
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={ShoppingCart} label="Today's Purchases" value={`${stats.totalPurchasesToday}`} sub="purchases recorded" color="#14532D" trend="+12%" />
        <StatCard icon={TrendingUp} label="Weight Today" value={`${stats.totalWeightToday.toLocaleString()} kg`} sub="all coffee types" color="#6F4E37" trend="+8%" />
        <StatCard icon={TrendingUp} label="Value Today" value={`${formatUGX(Math.round(stats.totalValueToday / 1000))}K`} sub="total payout value" color="#16A34A" trend="+5%" />
        <StatCard icon={CreditCard} label="Outstanding Advances" value={`${formatUGX(Math.round(stats.totalAdvancesOutstanding / 1000))}K`} sub={`across ${advances.length} farmers`} color="#F59E0B" />
      </div>

      {/* Second Row Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users} label="Active Farmers" value={`${stats.activeFarmers}`} sub="this season" color="#14532D" />
        <StatCard icon={ShoppingCart} label="Monthly Purchases" value={`${stats.monthlyPurchases.toLocaleString()} kg`} sub={new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })} color="#6F4E37" trend="+11%" />
        <StatCard icon={TrendingUp} label="Monthly Value" value={`${formatUGX(Math.round(stats.monthlyValue / 1000))}K`} sub={new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })} color="#16A34A" trend="+9%" />
        <StatCard icon={TrendingUp} label="Avg Buying Price" value={formatUGX(stats.avgPrice)} sub="blended avg" color="#8B5CF6" />
      </div>

      {/* Charts Row */}
      {profile?.subscription?.plans?.features?.analytics ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Area Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6" style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.05)", border: "1px solid #F1F5F9" }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: "15px", fontWeight: 600, color: "#111827" }}>Monthly Purchase Trend</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#6B7280", marginTop: "2px" }}>Weight (kg) over current season</div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0" }}>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 500, color: "#14532D" }}>2024/2025</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyTrend} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14532D" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#14532D" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="month" tick={{ fontFamily: "Inter", fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontFamily: "Inter", fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ fontFamily: "Inter", fontSize: 12, borderRadius: 8, border: "1px solid #E5E7EB", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                formatter={(v: number) => [`${v.toLocaleString()} kg`, "Weight"]}
              />
              <Area type="monotone" dataKey="weight" stroke="#14532D" strokeWidth={2.5} fill="url(#greenGrad)" dot={{ fill: "#14532D", r: 4 }} activeDot={{ r: 6 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="bg-white rounded-xl p-6" style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.05)", border: "1px solid #F1F5F9" }}>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: "15px", fontWeight: 600, color: "#111827", marginBottom: "4px" }}>Coffee Type Split</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#6B7280", marginBottom: "20px" }}>This month</div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={coffeeTypeBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={72} dataKey="percentage" stroke="none">
                {coffeeTypeBreakdown.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontFamily: "Inter", fontSize: 12, borderRadius: 8, border: "1px solid #E5E7EB" }} formatter={(v: number) => [`${v}%`, "Share"]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-4">
            {coffeeTypeBreakdown.map((item, i) => (
              <div key={item.type} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS[i] }} />
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#374151" }}>{item.type}</span>
                </div>
                <div className="text-right">
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600, color: "#111827" }}>{item.percentage}%</span>
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#9CA3AF", marginLeft: "6px" }}>{item.weight.toLocaleString()} kg</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      ) : (
        <div className="bg-[#f8fafc] rounded-3xl p-12 mb-6 border-2 border-dashed border-gray-200 text-center">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-8 h-8 text-green-700" />
          </div>
          <h3 style={{ fontSize: "18px", fontWeight: 700 }}>Analytics are locked</h3>
          <p style={{ color: "#64748b", fontSize: "14px", marginTop: "8px", maxWidth: "400px", margin: "8px auto" }}>
            Upgrade to a Starter or Professional plan to unlock detailed purchase trends and coffee type analytics.
          </p>
          <button 
            onClick={() => navigate("/subscription")}
            className="mt-4 px-6 py-2.5 bg-[#14532D] text-white rounded-xl font-bold text-sm"
          >
            Review Plans
          </button>
        </div>
      )}

      {/* Recent Purchases & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Purchases */}
        <div className="lg:col-span-2 bg-white rounded-xl" style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.05)", border: "1px solid #F1F5F9" }}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "15px", fontWeight: 600, color: "#111827" }}>Recent Purchases</div>
            <button
              onClick={() => navigate("/purchases")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors hover:bg-gray-50"
              style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 500, color: "#14532D" }}
            >
              View All <ArrowUpRight size={13} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: "#F8FAFC" }}>
                  {["Farmer", "Type", "Gross Wt", "Net Wt", "Amount", "Cash Paid"].map(h => (
                    <th key={h} className="px-4 py-3 text-left" style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {purchases.map((p: any) => (
                  <tr key={p.id} className="border-t border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer">
                    <td className="px-4 py-3">
                      <div style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 500, color: "#111827" }}>{p.farmers?.name || "Unknown"}</div>
                      <div style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#9CA3AF" }}>{p.date}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full" style={{
                        fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 500,
                        backgroundColor: p.coffee_type === "Robusta" ? "#f0fdf4" : "#fef3c7",
                        color: p.coffee_type === "Robusta" ? "#14532D" : "#92400e"
                      }}>{p.coffee_type}</span>
                    </td>
                    <td className="px-4 py-3" style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#374151" }}>{p.gross_weight} kg</td>
                    <td className="px-4 py-3" style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#374151" }}>{(p.payable_weight || 0).toFixed(1)} kg</td>
                    <td className="px-4 py-3" style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 500, color: "#111827" }}>
                      {formatUGX(Math.round((p.total_amount || 0) / 1000))}K
                    </td>
                    <td className="px-4 py-3" style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600, color: "#14532D" }}>
                      {formatUGX(Math.round((p.cash_paid || 0) / 1000))}K
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Alerts & Actions */}
        <div className="space-y-4">
          {/* Outstanding Advances Alert */}
          <div className="bg-white rounded-xl p-5" style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.05)", border: "1px solid #F1F5F9" }}>
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={15} color="#F59E0B" />
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 600, color: "#111827" }}>Outstanding Advances</span>
            </div>
            <div className="space-y-3">
              {advances.slice(0, 3).map((a: any) => (
                <div key={a.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 500, color: "#374151" }}>{a.farmers?.name || "Unknown"}</div>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#9CA3AF" }}>{a.seasons?.name || "N/A"}</div>
                  </div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#DC2626" }}>
                    {formatUGX(Math.round((a.remaining || 0) / 1000))}K
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => navigate("/advances")}
              className="w-full mt-3 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors hover:bg-gray-50"
              style={{ border: "1px solid #E5E7EB", fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 500, color: "#6B7280" }}
            >
              Manage Advances <ArrowUpRight size={12} />
            </button>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl p-5" style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.05)", border: "1px solid #F1F5F9" }}>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 600, color: "#111827", marginBottom: "12px" }}>Quick Actions</div>
            <div className="space-y-2">
              {[
                { label: "New Purchase Entry", icon: ShoppingCart, href: "/purchases/new", color: "#14532D", bg: "#f0fdf4" },
                { label: "Record Advance", icon: CreditCard, href: "/advances", color: "#6F4E37", bg: "#fdf6f3" },
                { label: "Add New Farmer", icon: Users, href: "/farmers", color: "#8B5CF6", bg: "#f5f3ff" },
              ].map(action => (
                <button
                  key={action.label}
                  onClick={() => navigate(action.href)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:opacity-90"
                  style={{ backgroundColor: action.bg }}
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: action.color }}>
                    <action.icon size={13} color="#fff" />
                  </div>
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 500, color: "#374151" }}>{action.label}</span>
                  <ArrowUpRight size={13} color="#9CA3AF" className="ml-auto" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

import { useState, useEffect } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from "recharts";
import { Layout } from "../components/Layout";
import { 
  TrendingUp, ShoppingCart, Users, CreditCard, ArrowUpRight, 
  Plus, Eye, AlertCircle, Loader2, Tag, ChevronDown, MapPin, Wallet, Share2
} from "lucide-react";
import { useNavigate } from "react-router";
import { ErrorState } from "../components/ErrorState";
import { purchasesService } from "../services/purchasesService";
import { farmersService } from "../services/farmersService";
import { advancesService } from "../services/advancesService";
import { seasonsService, Season } from "../services/seasonsService";
import { pricesService, BuyingPrice } from "../services/pricesService";
import { agentAdvancesService } from "../services/agentAdvancesService";
import { useAuth, getEffectiveAdminId } from "../hooks/useAuth";
import { getEATDateString, getEATGreeting } from "../utils/dateUtils";

const formatUGX = (v: number) => `UGX ${v.toLocaleString()}`;

import { SharePricesModal } from "../components/SharePricesModal";

function StatCard({ icon: Icon, label, value, sub, color, trend, details }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color: string; trend?: string;
  details?: { label: string; value: string; color: string }[];
}) {
  return (
    <div className="bg-white rounded-xl p-4 md:p-6 flex flex-col justify-between" style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.05)", border: "1px solid #F1F5F9" }}>
      <div>
        <div className="flex items-start justify-between mb-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
            <Icon size={20} color={color} />
          </div>
          {trend && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ backgroundColor: trend.startsWith('-') ? "#fef2f2" : "#f0fdf4" }}>
              <TrendingUp size={11} color={trend.startsWith('-') ? "#DC2626" : "#16A34A"} style={{ transform: trend.startsWith('-') ? "scaleY(-1)" : "none" }} />
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 500, color: trend.startsWith('-') ? "#DC2626" : "#16A34A" }}>{trend}</span>
            </div>
          )}
        </div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 500, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>{label}</div>
        {value && <div style={{ fontFamily: "Inter, sans-serif", fontSize: "22px", fontWeight: 700, color: "#111827", lineHeight: 1.2 }}>{value}</div>}
        {sub && <div style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#9CA3AF", marginTop: "4px" }}>{sub}</div>}
      </div>
      {details && details.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
          {details.map((d, i) => (
            <div key={d.label} className={i > 0 ? "pl-3 border-l border-gray-100" : "pr-3"}>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", fontWeight: 600, color: d.color, textTransform: "uppercase", marginBottom: "2px" }}>{d.label}</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600, color: "#374151" }}>{d.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const COLORS = ["#14532D", "#DC2626", "#A855F7"];

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [season, setSeason] = useState<Season | null>(null);
  const [allSeasons, setAllSeasons] = useState<Season[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const [viewMode, setViewMode] = useState<'Personal' | 'Team'>(profile?.role === 'Field Agent' ? 'Personal' : 'Personal');
  const [stats, setStats] = useState<any>({
    totalPurchasesToday: 0,
    totalWeightToday: 0,
    totalValueToday: 0,
    activeFarmers: 0,
    totalAdvancesOutstanding: 0,
    totalAgentCapitalOutstanding: 0,
    monthlyPurchases: 0,
    monthlyValue: 0,
    purchasesTrend: null,
    weightTrend: null,
    valueTrend: null,
    monthlyValueTrend: null,
    kibokoWeightToday: 0,
    redWeightToday: 0,
    kaseWeightToday: 0,
    kibokoWeightMonth: 0,
    redWeightMonth: 0,
    kaseWeightMonth: 0,
    totalWeightSeason: 0,
    totalValueSeason: 0,
  });
  const [monthlyTrend, setMonthlyTrend] = useState<any[]>([]);
  const [coffeeTypeBreakdown, setCoffeeTypeBreakdown] = useState<any[]>([]);
  const [topFarmers, setTopFarmers] = useState<any[]>([]);
  const [farmerRegions, setFarmerRegions] = useState<{region: string; count: number}[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [advances, setAdvances] = useState<any[]>([]);
  const [todayPrices, setTodayPrices] = useState<BuyingPrice | null>(null);
  const [agentPerformance, setAgentPerformance] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const adminId = getEffectiveAdminId(profile);
      if (!adminId) return;

      const activeSeason = await seasonsService.getActive(adminId);
      
      const [allFarmers, latestPrice, statsData, recentPurchases, activeAdvances, agentAdvances, perf] = await Promise.all([
        farmersService.getAll(adminId),
        pricesService.getLatest(adminId),
        purchasesService.getDashboardStats(adminId, getEATDateString(), viewMode === 'Personal', activeSeason?.id),
        purchasesService.getAll(adminId, 5, viewMode === 'Personal'), // Limiting to top 5 for dashboard
        advancesService.getAll(adminId),
        agentAdvancesService.getAllForAdmin(adminId),
        activeSeason ? purchasesService.getAgentPerformanceStats(activeSeason.id, getEATDateString()) : Promise.resolve([])
      ]);

      // Fetch all seasons for Super Admin selector
      if (profile?.role === 'Super Admin') {
        const seasons = await seasonsService.getAll(adminId);
        setAllSeasons(seasons);
        // Use selected season or default to active
        if (!selectedSeasonId && activeSeason) {
          setSelectedSeasonId(activeSeason.id);
        }
      }

      setSeason(activeSeason);
      const todayStr = getEATDateString();
      setTodayPrices(latestPrice?.date === todayStr ? latestPrice : null);
      setPurchases(recentPurchases);
      setAdvances(activeAdvances.filter((a: any) => a.status === 'Active'));
      setAgentPerformance(perf); 

      // Calculate farmer distribution by region
      const regionMap: Record<string, number> = {};
      allFarmers.forEach((f: any) => {
        const region = f.region || f.village || 'Unknown';
        regionMap[region] = (regionMap[region] || 0) + 1;
      });
      const regionData = Object.entries(regionMap)
        .map(([region, count]) => ({ region, count }))
        .sort((a, b) => b.count - a.count);
      setFarmerRegions(regionData);

      setStats({
        totalPurchasesToday: statsData.today.count,
        totalWeightToday: statsData.today.weight,
        totalValueToday: statsData.today.value,
        activeFarmers: allFarmers.length,
        totalAdvancesOutstanding: activeAdvances.filter(a => a.status === 'Active').reduce((s, a) => s + (a.remaining || 0), 0),
        totalAgentCapitalOutstanding: (agentAdvances || []).filter((a: any) => a.status === 'Active').reduce((s: number, a: any) => s + (a.remaining_amount || 0), 0),
        monthlyPurchases: statsData.monthly.weight,
        monthlyValue: statsData.monthly.value,
        kibokoWeightToday: statsData.today.types.Kiboko,
        redWeightToday: statsData.today.types.Red,
        kaseWeightToday: statsData.today.types.Kase,
        kibokoWeightMonth: statsData.monthly.types.Kiboko,
        redWeightMonth: statsData.monthly.types.Red,
        kaseWeightMonth: statsData.monthly.types.Kase,
        totalWeightSeason: statsData.seasonal.weight,
        totalValueSeason: statsData.seasonal.value,
      });

      // Simple Trend placeholder or remove complex trend calculation from initial load
      // For now, setting trends to null or keeping as is if data available
      
      // Calculate Coffee Type Breakdown (Today as preview)
      const breakdown = [
        { type: "Kiboko", weight: statsData.today.types.Kiboko },
        { type: "Red", weight: statsData.today.types.Red },
        { type: "Kase", weight: statsData.today.types.Kase },
      ].filter(b => b.weight > 0);
      const totalT = breakdown.reduce((s, b) => s + b.weight, 0);
      setCoffeeTypeBreakdown(breakdown.map(b => ({ ...b, percentage: Math.round((b.weight / totalT) * 100) })));

      // Calculate Top Farmers based on recent purchases weighting
      // Ideally this is done in the backend, but we can do a simplified version here for immediate display
      // We'll aggregate weights per farmer from recentPurchases and allFarmers logic if possible.
      // Assuming statsData doesn't have top farmers yet, we'll fetch top farmers from purchasesService.

      try {
        const topFarmersData = await purchasesService.getTopFarmers(adminId, 5);
        setTopFarmers(topFarmersData);
      } catch (err) {
        console.error("Failed to fetch top farmers", err);
        setTopFarmers([]);
      }

    } catch (err: any) {
      console.error("Error fetching dashboard data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [viewMode]);

  // Re-fetch when season selection changes (Super Admin)
  const handleSeasonChange = (seasonId: string) => {
    setSelectedSeasonId(seasonId);
    const picked = allSeasons.find(s => s.id === seasonId);
    if (picked) setSeason(picked);
    // For now the stats refetch is handled by useEffect below
  };

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
          <h1 style={{ fontFamily: "Inter, sans-serif", fontSize: "22px", fontWeight: 700, color: "#111827" }}>{getEATGreeting()}, {profile?.full_name?.split(' ')[0] || "User"}</h1>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#6B7280", marginTop: "2px" }}>{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} · Season {season?.name || "None"}</p>
          
          {/* View Mode Toggle - Moved into header for visibility */}
          <div className="flex gap-2 mt-4 p-1 bg-gray-100 rounded-xl w-fit">
            <button
              onClick={() => setViewMode('Personal')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'Personal' ? 'bg-white text-[#14532D] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              My Operations
            </button>
            <button
              onClick={() => setViewMode('Team')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'Team' ? 'bg-white text-[#14532D] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Team Overview
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {profile?.role === 'Super Admin' && allSeasons.length > 0 && (
            <select
              value={selectedSeasonId}
              onChange={e => handleSeasonChange(e.target.value)}
              className="px-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-[#14532D] appearance-none bg-white cursor-pointer"
              style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 500, color: "#374151", minWidth: "160px", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center", paddingRight: "30px" }}
            >
              {allSeasons.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.is_active ? '(Active)' : ''}
                </option>
              ))}
            </select>
          )}
          {profile?.role !== 'Super Admin' && (
            <button
              onClick={() => navigate("/purchases/new")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all hover:opacity-90"
              style={{ backgroundColor: "#14532D", color: "#fff", fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600 }}
            >
              <Plus size={16} />
              New Purchase
            </button>
          )}
        </div>
      </div>

      {/* Old toggle location removed */}

      {/* Today's Buying Prices Banner */}
      {profile?.role !== 'Super Admin' && (
        todayPrices ? (
          <div className="flex flex-wrap items-center gap-3 px-5 py-3.5 rounded-xl mb-6" style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0" }}>
            <div className="flex items-center gap-2 mr-2">
              <Tag size={14} color="#14532D" />
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 700, color: "#14532D", textTransform: "uppercase", letterSpacing: "0.05em" }}>Today's Prices</span>
            </div>
            {([
              { label: "Kiboko", value: todayPrices.kiboko_price, color: "#14532D" },
              { label: "Red",     value: todayPrices.red_price,     color: "#DC2626" },
              { label: "Kase",    value: todayPrices.kase_price,    color: "#A855F7" },
            ] as const).map(item => (
              <div key={item.label} className="flex items-center gap-1.5 px-3 py-1 rounded-lg" style={{ backgroundColor: "#fff", border: "1px solid #d1fae5" }}>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600, color: "#6B7280" }}>{item.label}</span>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 700, color: item.color }}>UGX {Math.round(item.value).toLocaleString()}</span>
              </div>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => setShowShareModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-[#d1fae5] transition-all"
                style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#14532D" }}
                title="Share Today's Prices"
              >
                <Share2 size={13} />
                <span className="hidden sm:inline">Share</span>
              </button>
              <button
                onClick={() => navigate("/prices")}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:opacity-80 transition-all"
                style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 500, color: "#14532D", backgroundColor: "#bbf7d0" }}
              >
                Update <ArrowUpRight size={12} />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between px-5 py-3.5 rounded-xl mb-6" style={{ backgroundColor: "#fff7ed", border: "1px solid #fed7aa" }}>
            <div className="flex items-center gap-2">
              <AlertCircle size={15} color="#F59E0B" />
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 500, color: "#92400e" }}>No buying prices set for today — purchases may be blocked.</span>
            </div>
            <button
              onClick={() => navigate("/prices")}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg transition-all hover:opacity-90"
              style={{ backgroundColor: "#F59E0B", color: "#fff", fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600 }}
            >
              Set Prices <ArrowUpRight size={12} />
            </button>
          </div>
        )
      )}

      {/* Stat Cards */}
      <div className={`grid grid-cols-1 ${profile?.role === 'Super Admin' ? 'sm:grid-cols-1' : 'sm:grid-cols-2 lg:grid-cols-3'} gap-4 mb-6`}>
        <StatCard 
          icon={TrendingUp} 
          label="Quantity Today" 
          value=""
          color="#6F4E37" 
          trend={stats.weightTrend}
          details={[
            { label: "Kiboko", value: `${stats.kibokoWeightToday.toLocaleString()} kg`, color: "#14532D" },
            { label: "Red", value: `${stats.redWeightToday.toLocaleString()} kg`, color: "#DC2626" },
            { label: "Kase", value: `${stats.kaseWeightToday.toLocaleString()} kg`, color: "#A855F7" }
          ]}
        />
        {profile?.role !== 'Super Admin' && (
          <>
            <StatCard icon={TrendingUp} label="Value Today" value={`${formatUGX(stats.totalValueToday)}`} sub="total payout value" color="#16A34A" trend={stats.valueTrend} />
            {viewMode === 'Personal' ? (
              <StatCard icon={CreditCard} label="Outstanding Farmer Advances" value={`${formatUGX(stats.totalAdvancesOutstanding)}`} sub={`across ${advances.length} farmers`} color="#F59E0B" />
            ) : (
              <StatCard icon={Wallet} label="Outstanding Agent Capital" value={`${formatUGX(stats.totalAgentCapitalOutstanding)}`} sub="issued to field agents" color="#14532D" />
            )}
          </>
        )}
      </div>

      {/* Second Row Cards */}
      <div className={`grid grid-cols-1 ${profile?.role === 'Super Admin' ? 'sm:grid-cols-1' : 'sm:grid-cols-2'} gap-4 mb-6`}>
        <StatCard 
          icon={ShoppingCart} 
          label="Monthly Weight" 
          value="" 
          color="#6F4E37" 
          trend={stats.monthlyWeightTrend}
          details={[
            { label: "Kiboko", value: `${stats.kibokoWeightMonth.toLocaleString()} kg`, color: "#14532D" },
            { label: "Red", value: `${stats.redWeightMonth.toLocaleString()} kg`, color: "#DC2626" },
            { label: "Kase", value: `${stats.kaseWeightMonth.toLocaleString()} kg`, color: "#A855F7" }
          ]}
        />
        {profile?.role !== 'Super Admin' && (
          <StatCard icon={TrendingUp} label="Monthly Value" value={`${formatUGX(stats.monthlyValue)}`} sub={new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })} color="#16A34A" trend={stats.monthlyValueTrend} />
        )}
      </div>

      {/* Seasonal Stats Row */}
      <div className={`grid grid-cols-1 ${profile?.role === 'Super Admin' ? 'sm:grid-cols-1' : 'sm:grid-cols-2'} gap-4 mb-6`}>
        <StatCard 
          icon={ShoppingCart} 
          label="Seasonal Total Weight" 
          value={`${stats.totalWeightSeason.toLocaleString()} kg`} 
          sub={`total weight for ${season?.name || "current season"}`}
          color="#14532D" 
        />
        <StatCard 
          icon={CreditCard} 
          label="Seasonal Total Value" 
          value={`${formatUGX(stats.totalValueSeason)}`} 
          sub={`total payout for ${season?.name || "current season"}`}
          color="#16A34A" 
        />
      </div>

      {/* Charts Row — always shown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Area Chart / Top Farmers Chart conditional based on role */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6" style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.05)", border: "1px solid #F1F5F9" }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: "15px", fontWeight: 600, color: "#111827" }}>
                {profile?.role === 'Super Admin' ? 'Top Performing Farmers' : 'Monthly Purchase Trend'}
              </div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#6B7280", marginTop: "2px" }}>
                {profile?.role === 'Super Admin' ? 'Highest weight delivered this season' : 'Weight (kg) over current season'}
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0" }}>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 500, color: "#14532D" }}>{season?.name || "2024/2025"}</span>
            </div>
          </div>
          
          {profile?.role === 'Super Admin' ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topFarmers} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                <XAxis type="number" tick={{ fontFamily: "Inter", fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} tickFormatter={v => `${v.toLocaleString()}`} />
                <YAxis dataKey="name" type="category" tick={{ fontFamily: "Inter", fontSize: 11, fill: "#374151" }} axisLine={false} tickLine={false} width={100} />
                <Tooltip
                  cursor={{ fill: '#F3F4F6' }}
                  contentStyle={{ fontFamily: "Inter", fontSize: 12, borderRadius: 8, border: "1px solid #E5E7EB", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                  formatter={(v: number) => [`${v.toLocaleString()} kg`, "Total Weight"]}
                />
                <Bar dataKey="total_weight" fill="#14532D" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
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
                <YAxis tick={{ fontFamily: "Inter", fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} tickFormatter={v => v.toLocaleString()} />
                <Tooltip
                  contentStyle={{ fontFamily: "Inter", fontSize: 12, borderRadius: 8, border: "1px solid #E5E7EB", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                  formatter={(v: number) => [`${v.toLocaleString()} kg`, "Weight"]}
                />
                <Area type="monotone" dataKey="weight" stroke="#14532D" strokeWidth={2.5} fill="url(#greenGrad)" dot={{ fill: "#14532D", r: 4 }} activeDot={{ r: 6 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
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

      {/* Farmer Distribution by Region — Super Admin Only */}
      {profile?.role === 'Super Admin' && farmerRegions.length > 0 && (
        <div className="bg-white rounded-xl p-6 mb-6" style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.05)", border: "1px solid #F1F5F9" }}>
          <div className="flex items-center gap-2 mb-5">
            <MapPin size={18} color="#14532D" />
            <div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: "15px", fontWeight: 600, color: "#111827" }}>Farmer Distribution by Region</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#6B7280" }}>{farmerRegions.length} regions · {farmerRegions.reduce((s, r) => s + r.count, 0)} total farmers</div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {farmerRegions.slice(0, 9).map((r, i) => {
              const maxCount = farmerRegions[0]?.count || 1;
              const pct = Math.round((r.count / maxCount) * 100);
              return (
                <div key={r.region} className="p-3 rounded-xl border border-gray-100 hover:border-green-200 transition-colors" style={{ backgroundColor: i === 0 ? "#f0fdf4" : "#FAFAFA" }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <MapPin size={13} color={i === 0 ? "#14532D" : "#6B7280"} />
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 500, color: "#111827" }}>{r.region}</span>
                    </div>
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 700, color: i === 0 ? "#14532D" : "#374151" }}>{r.count}</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: i === 0 ? "#14532D" : "#86EFAC" }} />
                  </div>
                </div>
              );
            })}
          </div>
          {farmerRegions.length > 9 && (
            <div className="mt-3 text-center">
              <button
                onClick={() => navigate("/farmers")}
                className="flex items-center gap-1.5 mx-auto px-4 py-2 rounded-lg transition-colors hover:bg-gray-50"
                style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 500, color: "#14532D", border: "1px solid #E5E7EB" }}
              >
                View All Regions <ArrowUpRight size={12} />
              </button>
            </div>
          )}
        </div>
      )}
      {/* Super Admin sees nothing here; Everyone else sees Grid + Team Advances */}
      {profile?.role !== 'Super Admin' ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-[#F1F5F9] overflow-hidden">
              {/* Recent Purchases Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 border-b border-gray-100 gap-3">
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: "15px", fontWeight: 600, color: "#111827" }}>Recent Purchases</div>
                <button onClick={() => navigate("/purchases")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-colors hover:bg-gray-50 text-[#14532D] font-medium text-xs">
                  View All <ArrowUpRight size={13} />
                </button>
              </div>
              
              {/* Table (Desktop) */}
              <div className="hidden lg:block overflow-x-auto max-h-[400px]">
                <table className="w-full relative">
                  <thead className="sticky top-0 z-10 bg-gray-50/80 backdrop-blur-sm">
                    <tr>
                      {["Client", "Agent", "Type", "Net Wt", "Total", "Status"].map(h => (
                        <th key={h} className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {purchases.map((p: any) => (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="text-sm font-semibold text-gray-900">{p.farmers?.name || "Unknown"}</div>
                          <div className="text-[10px] text-gray-400">{p.date}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 font-medium">{p.field_agent?.full_name || "Unknown"}</td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg bg-gray-100 text-gray-600">{p.coffee_type}</span>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-gray-700">{(p.payable_weight || 0).toFixed(1)} kg</td>
                        <td className="px-6 py-4 text-sm font-bold text-green-700">{formatUGX(p.total_amount || 0)}</td>
                        <td className="px-6 py-4">
                           <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${p.cash_paid >= p.total_amount ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
                             {p.cash_paid >= p.total_amount ? 'Paid' : 'Partial'}
                           </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile List View */}
              <div className="lg:hidden divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
                {purchases.map((p: any) => (
                  <div key={p.id} className="p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-sm font-bold text-gray-900">{p.farmers?.name || "Unknown"}</div>
                        <div className="text-[10px] text-gray-500">{p.date} · {p.coffee_type}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${p.cash_paid >= p.total_amount ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
                         {p.cash_paid >= p.total_amount ? 'Paid' : 'Partial'}
                      </span>
                    </div>
                    <div className="flex justify-between items-end bg-gray-50/50 p-3 rounded-xl">
                      <div>
                        <div className="text-[9px] font-bold text-gray-400 uppercase">Net Weight</div>
                        <div className="text-xs font-bold text-gray-700">{(p.payable_weight || 0).toFixed(1)} kg</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[9px] font-bold text-gray-400 uppercase">Value</div>
                        <div className="text-sm font-black text-green-700">{formatUGX(p.total_amount || 0)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sidebar Column: Alerts and Quick Actions */}
            <div className="space-y-4">
              {/* Sidebar Column: Alerts - removed quick actions */}
            </div>
          </div>

          {/* Team Advances View (Conditional) */}
          {viewMode === 'Team' && (
            <>
              {/* Agent Performance Overview */}
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-[#F1F5F9] overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
              <div className="flex items-center gap-2">
                <TrendingUp size={18} className="text-[#14532D]" />
                <h3 className="font-bold text-gray-900 text-base">Agent Performance Overview</h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-gray-500 bg-white px-2.5 py-1 rounded-lg border border-gray-100">
                  Weight Collected (kg)
                </span>
                <button 
                  onClick={() => navigate("/users")}
                  className="flex items-center gap-1 px-3 py-1 rounded-lg text-[#14532D] font-bold text-xs hover:bg-green-50 transition-colors"
                >
                  View All <ArrowUpRight size={12} />
                </button>
              </div>
            </div>
            
            {/* Desktop Table View */}
            <div className="overflow-x-auto hidden lg:block">
              <table className="w-full">
                <thead className="bg-gray-50/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Agent</th>
                    <th className="px-6 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Today</th>
                    <th className="px-6 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">This Month</th>
                    <th className="px-6 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">This Season</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {agentPerformance.length > 0 ? (
                    agentPerformance.slice(0, 3).map((ap: any) => (
                      <tr 
                        key={ap.name} 
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/users?search=${encodeURIComponent(ap.name)}`)}
                      >
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">{ap.name}</td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-gray-700">{ap.daily.toLocaleString()} kg</td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-gray-700">{ap.monthly.toLocaleString()} kg</td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-[#14532D]">{ap.seasonal.toLocaleString()} kg</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">No performance data available for this season.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
              {agentPerformance.length > 0 ? (
                agentPerformance.slice(0, 3).map((ap: any) => (
                  <div 
                    key={ap.name} 
                    className="p-4 flex flex-col gap-3 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => navigate(`/users?search=${encodeURIComponent(ap.name)}`)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="text-sm font-bold text-gray-900">{ap.name}</div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Agent</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 bg-gray-50/50 p-3 rounded-xl">
                      <div>
                        <div className="text-[9px] font-bold text-gray-400 uppercase">Today</div>
                        <div className="text-xs font-bold text-gray-700">{ap.daily.toLocaleString()} kg</div>
                      </div>
                      <div>
                        <div className="text-[9px] font-bold text-gray-400 uppercase">Month</div>
                        <div className="text-xs font-bold text-gray-700">{ap.monthly.toLocaleString()} kg</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[9px] font-bold text-gray-400 uppercase">Season</div>
                        <div className="text-sm font-black text-[#14532D]">{ap.seasonal.toLocaleString()} kg</div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-6 py-8 text-center text-sm text-gray-500">No performance data available for this season.</div>
              )}
            </div>
          </div>

            </>
          )}
        </>
      ) : null}
      <SharePricesModal 
        isOpen={showShareModal} 
        onClose={() => setShowShareModal(false)}
        prices={todayPrices || undefined}
        dateStr={todayPrices?.date || getEATDateString()}
      />
    </Layout>
  );
}

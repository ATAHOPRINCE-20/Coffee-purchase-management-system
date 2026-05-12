import React, { useState, useEffect, useRef } from "react";
import { useReactToPrint } from 'react-to-print';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from "recharts";
import { Layout } from "../components/Layout";
import { 
  BarChart3, TrendingUp, Download, Calendar, Filter, 
  ArrowUpRight, ArrowDownRight, Coffee, Loader2, Printer
} from "lucide-react";
import { purchasesService, Purchase } from "../services/purchasesService";
import { advancesService, Advance } from "../services/advancesService";
import { seasonsService, Season } from "../services/seasonsService";
import { agentAdvancesService, AgentAdvance } from "../services/agentAdvancesService";
import { useAuth, getEffectiveAdminId } from "../hooks/useAuth";
import { salesService, Sale } from "../services/salesService";
import { useSeasons } from "../hooks/queries/useSeasons";
import { usePurchases } from "../hooks/queries/usePurchases";
import { useAdvances } from "../hooks/queries/useAdvances";
import { useSales } from "../hooks/queries/useSales";
import { useAgentAdvances } from "../hooks/queries/useAgentAdvances";
import { useCompanyProfile } from "../hooks/queries/useCompanyProfile";
import { useSync } from "../contexts/SyncContext";
import { useQueryClient } from "@tanstack/react-query";
import { SeasonalReportPrint } from "../components/pos/SeasonalReportPrint";

const formatUGX = (v: number) => `UGX ${Math.round(v).toLocaleString()}`;

function ReportStat({ label, value, sub, icon: Icon, color }: { label: string; value: string; sub: string; icon: any; color: string }) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
          <Icon size={22} color={color} />
        </div>
        <div>
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{label}</div>
          <div className="text-2xl font-bold text-gray-900 leading-none">{value}</div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 mt-2">
        <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold" style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
          <ArrowUpRight size={10} /> 12%
        </div>
        <span className="text-[11px] text-gray-400 font-medium">{sub}</span>
      </div>
    </div>
  );
}
export default function Reports() {
  const { profile } = useAuth();
  const { isOnline } = useSync();
  const queryClient = useQueryClient();
  const adminId = getEffectiveAdminId(profile);

  const { data: seasons = [], isLoading: seasonsLoading } = useSeasons(adminId);
  const { data: allPurchases = [], isLoading: purchasesLoading } = usePurchases(adminId);
  const { data: allAdvances = [], isLoading: advancesLoading } = useAdvances(adminId);
  const { data: allSales = [], isLoading: salesLoading } = useSales(adminId);
  const { data: allAgentAdvances = [], isLoading: agentAdvancesLoading } = useAgentAdvances(adminId);
  const { data: company = null } = useCompanyProfile(adminId);

  const [season, setSeason] = useState<Season | null>(null);
  const [monthlyTrend, setMonthlyTrend] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalWeight: 0,
    totalValue: 0,
    totalAdvances: 0,
    batchWeight: 0,
    ownPurchasesCost: 0,
    agentCapitalCost: 0,
    byType: {
      Kiboko: { weight: 0, value: 0, batchWeight: 0 },
      Red: { weight: 0, value: 0, batchWeight: 0 },
      Kase: { weight: 0, value: 0, batchWeight: 0 }
    }
  });

  const [isExporting, setIsExporting] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Seasonal_Report_${new Date().toISOString().split('T')[0]}`,
  });

  useEffect(() => {
    if (!profile || !seasons || !allPurchases || !allAdvances || !allSales || !allAgentAdvances) return;
    
    const activeSeason = seasons.find(s => s.is_active) || null;
    setSeason(activeSeason);

    const totalWeight = allPurchases.reduce((s: number, p: any) => s + (p.payable_weight || 0), 0);
    const totalValue = allPurchases.reduce((s: number, p: any) => s + (p.total_amount || 0), 0);
    const totalAdvances = allAdvances.reduce((s: number, a: any) => s + (a.amount || 0), 0);
    
    const ownPurchasesCost = allPurchases
      .filter((p: any) => p.field_agent_id === profile.id)
      .reduce((s: number, p: any) => s + (p.total_amount || 0), 0);
    
    const agentCapitalCost = allAgentAdvances.reduce((s: number, a: any) => s + (a.amount || 0), 0);

    const latestSale = [...allSales].sort((a: Sale, b: Sale) => 
      new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime()
    )[0];
    const lastSaleTime = latestSale?.created_at || '1970-01-01T00:00:00Z';
    const batchWeight = allPurchases
      .filter((p: any) => new Date(p.created_at || p.date).getTime() > new Date(lastSaleTime).getTime())
      .reduce((s: number, p: any) => s + (p.payable_weight || 0), 0);

    const byType = {
      Kiboko: { weight: 0, value: 0, batchWeight: 0 },
      Red: { weight: 0, value: 0, batchWeight: 0 },
      Kase: { weight: 0, value: 0, batchWeight: 0 }
    };

    allPurchases.forEach((p: any) => {
      const type = p.coffee_type as keyof typeof byType;
      if (byType[type]) {
        byType[type].weight += (p.payable_weight || 0);
        byType[type].value += (p.total_amount || 0);
        
        if (new Date(p.created_at || p.date).getTime() > new Date(lastSaleTime).getTime()) {
          byType[type].batchWeight += (p.payable_weight || 0);
        }
      }
    });

    setStats({ totalWeight, totalValue, totalAdvances, batchWeight, ownPurchasesCost, agentCapitalCost, byType });

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const trendMap: Record<string, any> = {};
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const mKey = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      trendMap[mKey] = { weight: 0, value: 0 };
    }

    allPurchases.forEach((p: any) => {
      const mKey = p.date.substring(0, 7);
      if (trendMap[mKey]) {
        trendMap[mKey].weight += (p.payable_weight || 0);
        trendMap[mKey].value += (p.total_amount || 0);
      }
    });

    const trendData = Object.entries(trendMap).sort().map(([key, data]: any) => {
      const [y, m] = key.split('-');
      return { 
        month: months[parseInt(m) - 1], 
        weight: data.weight,
        value: data.value
      };
    });

    setMonthlyTrend(trendData);
  }, [seasons, allPurchases, allAdvances, allSales, allAgentAdvances, profile]);

  const loading = (seasonsLoading || purchasesLoading || advancesLoading || salesLoading || agentAdvancesLoading) && allPurchases.length === 0;

  const handleExport = () => {
    setIsExporting(true);
    
    // Use setTimeout to allow the UI to update (show loading state) before heavy CSV processing
    setTimeout(() => {
      try {
        const csvRows = [];
        // Header
        csvRows.push(['Seasonal Performance Report']);
        csvRows.push([`Company: ${company?.name || 'CPMS'}`]);
        csvRows.push([`Season: ${season?.name || 'N/A'}`]);
        csvRows.push([`Generated: ${new Date().toLocaleString()}`]);
        csvRows.push(['']);

        csvRows.push(['Category', 'Weight (kg)', 'Total Value (UGX)']);
        
        // Type Breakdown
        Object.entries(stats.byType).forEach(([type, data]: [string, any]) => {
          csvRows.push([`${type} Coffee`, data.weight, data.value]);
        });
        
        csvRows.push(['']);
        csvRows.push(['Financial Aggregates', '', 'Value (UGX)']);
        csvRows.push(['Direct Own Purchases', '', stats.ownPurchasesCost]);
        csvRows.push(['Agent Capital Issued', '', stats.agentCapitalCost]);
        csvRows.push(['Farmer Advances', '', stats.totalAdvances]);
        
        csvRows.push(['']);
        csvRows.push(['Monthly Trend', 'Volume (kg)', 'Value (UGX)']);
        monthlyTrend.forEach(item => {
          csvRows.push([item.month, item.weight, item.value]);
        });

        const csvString = csvRows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `Seasonal_Report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch (err) {
        console.error("Export failed:", err);
      } finally {
        setIsExporting(false);
      }
    }, 100);
  };

  if (loading) {
    return (
      <Layout breadcrumbs={[{ label: "Reports" }]}>
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-green-700 animate-spin mb-4" />
          <p className="text-gray-500 font-medium">Generating reports...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Reports" }]}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "Inter, sans-serif" }}>Reports & Analytics</h1>
          <p className="text-sm text-gray-500 mt-1" style={{ fontFamily: "Inter, sans-serif" }}>Seasonal performance overview and data insights</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => handlePrint()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Printer size={16} />
            Print Report
          </button>
          <button 
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#14532D] text-sm font-semibold text-white hover:opacity-90 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {isExporting ? "Exporting..." : "Export CSV"}
          </button>
        </div>
      </div>

      {/* Hidden Print Component */}
      <div className="hidden">
        <SeasonalReportPrint ref={printRef} stats={stats} season={season} company={company} monthlyTrend={monthlyTrend} />
      </div>

      {/* Type Specific Summaries */}
      {(['Kiboko', 'Red', 'Kase'] as const).map(type => (
        <div key={type} className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <div className={`w-2 h-6 rounded-full ${type === 'Kiboko' ? 'bg-green-600' : type === 'Red' ? 'bg-red-600' : 'bg-purple-600'}`} />
            <h2 className="text-lg font-bold text-gray-800">{type} Coffee Summary</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <ReportStat 
              label={`${type} Seasonal Volume`} 
              value={`${stats.byType[type].weight.toLocaleString()} kg`} 
              sub="Total collected this season" 
              icon={Coffee} 
              color={type === 'Kiboko' ? '#14532D' : type === 'Red' ? '#991B1B' : '#701A75'} 
            />
            <ReportStat 
              label={`${type} Batch Volume`} 
              value={`${stats.byType[type].batchWeight.toLocaleString()} kg`} 
              sub="Since last sale" 
              icon={Filter} 
              color={type === 'Kiboko' ? '#14532D' : type === 'Red' ? '#991B1B' : '#701A75'} 
            />
            <ReportStat 
              label={`${type} Total Cost`} 
              value={formatUGX(stats.byType[type].value)} 
              sub="Total spent on this type" 
              icon={TrendingUp} 
              color={type === 'Kiboko' ? '#16A34A' : type === 'Red' ? '#DC2626' : '#A21CAF'} 
            />
          </div>
        </div>
      ))}

      <div className="border-t border-gray-100 my-8 pt-8">
        <h2 className="text-lg font-bold text-gray-800 mb-6">Aggregated Financials</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <ReportStat label="Direct Own Purchases" value={formatUGX(stats.ownPurchasesCost)} sub="Money used personally" icon={TrendingUp} color="#14532D" />
          <ReportStat label="Agent Capital Issued" value={formatUGX(stats.agentCapitalCost)} sub="Money given to agents" icon={TrendingUp} color="#16A34A" />
          <ReportStat label="Farmer Advances" value={formatUGX(stats.totalAdvances)} sub="issued this season" icon={BarChart3} color="#F59E0B" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Main Volume Trend */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Supply Volume Trend</h3>
              <p className="text-xs text-gray-500 mt-1">Monthly coffee supply in kilograms</p>
            </div>
            <div className="flex items-center gap-4 text-[11px] font-bold uppercase tracking-wider">
              <div className="flex items-center gap-1.5 text-gray-400">
                <div className="w-2.5 h-2.5 rounded-full bg-gray-200" /> Previous
              </div>
              <div className="flex items-center gap-1.5 text-green-700">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#14532D' }} /> Current
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14532D" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#14532D" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="month" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 11, fontWeight: 500, fill: '#94a3b8' }} 
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 11, fontWeight: 500, fill: '#94a3b8' }}
                tickFormatter={(v) => `${v}kg`}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
              />
              <Area 
                type="monotone" 
                dataKey="weight" 
                stroke="#14532D" 
                strokeWidth={3} 
                fillOpacity={1} 
                fill="url(#colorWeight)" 
                dot={{ r: 4, fill: '#14532D', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Payout Value Chart */}
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm text-center">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Payout Distribution</h3>
            <p className="text-xs text-gray-500 mb-8">Monthly payout value (UGX)</p>
            <ResponsiveContainer width="100%" height={250}>
            <BarChart data={monthlyTrend} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                <Bar dataKey="value" fill="#6F4E37" radius={[4, 4, 0, 0]} barSize={24} />
            </BarChart>
            </ResponsiveContainer>
            <div className="mt-6 pt-6 border-t border-gray-50">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Highest Month</span>
                    <span className="font-bold text-gray-900">May (12.4M)</span>
                </div>
            </div>
        </div>
      </div>
    </Layout>
  );
}

import React, { useState, useEffect, useMemo, useRef } from "react";
import { X, Calendar, Download, Printer, Loader2, Coffee, TrendingUp, DollarSign, Wallet, AlertCircle, RefreshCw } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useReactToPrint } from "react-to-print";

interface MonthlyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminId: string | null;
  onlyDirect: boolean;
  initialMonth: string; // Format: YYYY-MM
}

export function MonthlyReportModal({ isOpen, onClose, adminId, onlyDirect, initialMonth }: MonthlyReportModalProps) {
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [purchases, setPurchases] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "purchases" | "sales" | "expenses">("overview");

  // Mobile expansion states
  const [expandedPurchaseId, setExpandedPurchaseId] = useState<string | null>(null);
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);
  const [expandedExpenseId, setExpandedExpenseId] = useState<string | null>(null);
  const [expandedDayDate, setExpandedDayDate] = useState<string | null>(null);

  const printRef = useRef<HTMLDivElement>(null);

  // Reset states when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedMonth(initialMonth);
      setActiveTab("overview");
      setExpandedPurchaseId(null);
      setExpandedSaleId(null);
      setExpandedExpenseId(null);
      setExpandedDayDate(null);
    }
  }, [isOpen, initialMonth]);

  // Date range helper
  const getMonthDateRange = (monthStr: string) => {
    if (!monthStr || !monthStr.includes("-")) {
      const now = new Date();
      monthStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}`;
    }
    const [year, month] = monthStr.split("-").map(Number);
    const startDate = `${monthStr}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${monthStr}-${lastDay.toString().padStart(2, "0")}`;
    return { startDate, endDate };
  };

  // Fetch data
  const fetchData = async (month: string) => {
    if (!adminId) return;
    setLoading(true);
    setError(null);
    try {
      const { startDate, endDate } = getMonthDateRange(month);

      // 1. Fetch Purchases
      let pQuery = supabase
        .from("purchases")
        .select("*, farmers!inner(name, deleted_at), field_agent:field_agent_id(full_name)")
        .is("farmers.deleted_at", null)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: false });

      if (onlyDirect) {
        pQuery = pQuery.eq("field_agent_id", adminId);
      }

      // 2. Fetch Sales
      let sQuery = supabase
        .from("sales")
        .select("*, admin:admin_id(full_name)")
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: false });

      if (onlyDirect && adminId !== "SUPER_ADMIN") {
        sQuery = sQuery.eq("admin_id", adminId);
      }

      // 3. Fetch Expenses
      let eQuery = supabase
        .from("expenses")
        .select("*, admin:admin_id(full_name)")
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: false });

      if (onlyDirect && adminId !== "SUPER_ADMIN") {
        eQuery = eQuery.eq("admin_id", adminId);
      }

      const [pRes, sRes, eRes] = await Promise.all([pQuery, sQuery, eQuery]);

      if (pRes.error) throw pRes.error;
      if (sRes.error) throw sRes.error;
      if (eRes.error) throw eRes.error;

      setPurchases(pRes.data || []);
      setSales(sRes.data || []);
      setExpenses(eRes.data || []);
    } catch (err: any) {
      console.error("Error fetching monthly report data:", err);
      setError(err.message || "Failed to load report data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && selectedMonth) {
      fetchData(selectedMonth);
    }
  }, [isOpen, selectedMonth, onlyDirect, adminId]);

  // Calculate summaries
  const summary = useMemo(() => {
    const totalPurchasedWeight = purchases.reduce((sum, p) => sum + (p.payable_weight || 0), 0);
    const totalPurchasedCost = purchases.reduce((sum, p) => sum + (p.total_amount || 0), 0);
    const totalCashPaid = purchases.reduce((sum, p) => sum + (p.cash_paid || 0), 0);

    const kibokoWeight = purchases.filter(p => p.coffee_type === "Kiboko").reduce((sum, p) => sum + (p.payable_weight || 0), 0);
    const redWeight = purchases.filter(p => p.coffee_type === "Red").reduce((sum, p) => sum + (p.payable_weight || 0), 0);
    const kaseWeight = purchases.filter(p => p.coffee_type === "Kase").reduce((sum, p) => sum + (p.payable_weight || 0), 0);

    const totalSoldWeight = sales.reduce((sum, s) => sum + (s.net_weight || 0), 0);
    const totalSalesValue = sales.reduce((sum, s) => sum + (s.total_amount || 0), 0);

    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    
    // Net Flow = Sales Revenue - Cost of purchases - Expenses
    const netCashFlow = totalSalesValue - totalPurchasedCost - totalExpenses;

    return {
      totalPurchasedWeight,
      totalPurchasedCost,
      totalCashPaid,
      kibokoWeight,
      redWeight,
      kaseWeight,
      totalSoldWeight,
      totalSalesValue,
      totalExpenses,
      netCashFlow
    };
  }, [purchases, sales, expenses]);

  // Daily operations breakdown
  const dailyBreakdown = useMemo(() => {
    const breakdown: Record<string, {
      date: string;
      weight: number;
      cost: number;
      sales: number;
      expenses: number;
      net: number;
    }> = {};

    purchases.forEach(p => {
      const d = p.date;
      if (!breakdown[d]) {
        breakdown[d] = { date: d, weight: 0, cost: 0, sales: 0, expenses: 0, net: 0 };
      }
      breakdown[d].weight += (p.payable_weight || 0);
      breakdown[d].cost += (p.total_amount || 0);
      breakdown[d].net -= (p.total_amount || 0);
    });

    sales.forEach(s => {
      const d = s.date;
      if (!breakdown[d]) {
        breakdown[d] = { date: d, weight: 0, cost: 0, sales: 0, expenses: 0, net: 0 };
      }
      breakdown[d].sales += (s.total_amount || 0);
      breakdown[d].net += (s.total_amount || 0);
    });

    expenses.forEach(e => {
      const d = e.date;
      if (!breakdown[d]) {
        breakdown[d] = { date: d, weight: 0, cost: 0, sales: 0, expenses: 0, net: 0 };
      }
      breakdown[d].expenses += (e.amount || 0);
      breakdown[d].net -= (e.amount || 0);
    });

    return Object.values(breakdown).sort((a, b) => b.date.localeCompare(a.date));
  }, [purchases, sales, expenses]);

  const formatUGX = (v: number) => `UGX ${(v || 0).toLocaleString()}`;

  // Print handler
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Monthly_Report_${selectedMonth}`,
  });

  // Download CSV
  const handleExportCSV = () => {
    const headers = ["Section", "Date", "Detail / Entity", "Type / Category", "Qty / Weight (kg)", "Amount (UGX)", "Notes"];
    const rows: string[][] = [];

    // Purchases
    purchases.forEach(p => {
      rows.push([
        "PURCHASE",
        p.date,
        p.farmers?.name || "Unknown",
        p.coffee_type,
        p.payable_weight.toString(),
        p.total_amount.toString(),
        `Agent: ${p.field_agent?.full_name || "Unknown"}, Paid: ${p.cash_paid}`
      ]);
    });

    // Sales
    sales.forEach(s => {
      rows.push([
        "SALE",
        s.date,
        s.buyer_name || "N/A",
        s.coffee_type,
        s.net_weight.toString(),
        s.total_amount.toString(),
        s.notes || ""
      ]);
    });

    // Expenses
    expenses.forEach(e => {
      rows.push([
        "EXPENSE",
        e.date,
        e.type,
        e.category,
        "0",
        e.amount.toString(),
        e.notes || ""
      ]);
    });

    // Daily breakdown logs
    rows.push([]);
    rows.push(["DAILY BREAKDOWN LOG"]);
    rows.push(["Date", "Weight Purchased (kg)", "Purchase Cost (UGX)", "Sales Revenue (UGX)", "Expenses (UGX)", "Net Flow (UGX)"]);
    dailyBreakdown.forEach(day => {
      rows.push([
        day.date,
        day.weight.toString(),
        day.cost.toString(),
        day.sales.toString(),
        day.expenses.toString(),
        day.net.toString()
      ]);
    });

    // Summary Rows
    rows.push([]);
    rows.push(["MONTHLY SUMMARY"]);
    rows.push(["Total Weight Purchased", "", "", "", summary.totalPurchasedWeight.toString()]);
    rows.push(["Total Purchases Payout", "", "", "", "", summary.totalPurchasedCost.toString()]);
    rows.push(["Total Weight Sold", "", "", "", summary.totalSoldWeight.toString()]);
    rows.push(["Total Sales Value", "", "", "", "", summary.totalSalesValue.toString()]);
    rows.push(["Total Expenses Incurred", "", "", "", "", summary.totalExpenses.toString()]);
    rows.push(["Net Cash Flow / Profit", "", "", "", "", summary.netCashFlow.toString()]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Monthly_Report_${selectedMonth}.csv`;
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-[#FAF9F6] rounded-2xl w-full max-w-4xl overflow-hidden flex flex-col shadow-2xl h-[95vh] sm:h-[90vh]" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-white border-b border-gray-100 gap-2 sm:gap-0">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div>
              <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: "16px", fontWeight: 700, color: "#111827" }} className="sm:text-lg">
                Monthly Summary
              </h2>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#6B7280" }}>
                {onlyDirect ? "Direct Personal Operations" : "Team Overview Report"}
              </p>
            </div>
            
            {/* Month Picker */}
            <div className="flex items-center gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl border border-gray-200 bg-white shadow-sm">
              <Calendar size={13} className="text-gray-400" />
              <input
                type="month"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="outline-none text-[11px] font-semibold text-gray-700 bg-transparent cursor-pointer font-sans"
                style={{ fontFamily: "Inter, sans-serif" }}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-1.5">
            <button
              onClick={() => fetchData(selectedMonth)}
              disabled={loading}
              className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
              title="Refresh"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
            >
              <X size={18} className="sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Action Bar */}
        <div className="px-4 sm:px-6 py-2.5 bg-white border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex bg-gray-100 p-0.5 rounded-xl overflow-x-auto w-full md:w-auto">
            {(["overview", "purchases", "sales", "expenses"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 md:flex-initial px-3 py-1.5 sm:px-4 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all uppercase tracking-wider ${
                  activeTab === tab ? "bg-white text-[#14532D] shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            <button
              onClick={handlePrint}
              disabled={loading}
              className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-[11px] sm:text-xs font-bold text-gray-700 rounded-xl shadow-sm transition-all"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              <Printer size={12} />
              Print
            </button>
            <button
              onClick={handleExportCSV}
              disabled={loading}
              className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-1.5 bg-[#14532D] hover:bg-[#14532D]/95 text-[11px] sm:text-xs font-bold text-white rounded-xl shadow-sm transition-all"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              <Download size={12} />
              CSV Export
            </button>
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {error && (
            <div className="p-4 mb-6 rounded-2xl bg-red-50 border border-red-100 flex items-start gap-3">
              <AlertCircle size={18} className="text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <div style={{ fontFamily: "Inter", fontSize: "14px", fontWeight: 600, color: "#991B1B" }}>Error Loading Data</div>
                <div style={{ fontFamily: "Inter", fontSize: "12px", color: "#B91C1C", marginTop: "2px" }}>{error}</div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 sm:py-24">
              <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 text-green-700 animate-spin mb-4" />
              <p className="text-gray-500 text-xs sm:text-sm font-medium">Fetching monthly report details...</p>
            </div>
          ) : (
            <>
              {/* Tab: OVERVIEW */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* Summary KPI Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Purchases Card */}
                    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Purchased This Month</div>
                        <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center text-green-700">
                          <Coffee size={14} />
                        </div>
                      </div>
                      <div className="text-lg sm:text-xl font-bold text-gray-900 leading-none mb-1">
                        {summary.totalPurchasedWeight.toLocaleString()} kg
                      </div>
                      <div className="text-[11px] text-gray-500 font-semibold mb-3">
                        Cost: {formatUGX(summary.totalPurchasedCost)}
                      </div>
                      <div className="space-y-1 pt-2 border-t border-gray-50 text-[10px]">
                        <div className="flex justify-between text-gray-500">
                          <span>Kiboko:</span>
                          <span className="font-bold text-gray-700">{summary.kibokoWeight.toLocaleString()} kg</span>
                        </div>
                        <div className="flex justify-between text-gray-500">
                          <span>Red Cherry:</span>
                          <span className="font-bold text-gray-700">{summary.redWeight.toLocaleString()} kg</span>
                        </div>
                        <div className="flex justify-between text-gray-500">
                          <span>Kase / Clean:</span>
                          <span className="font-bold text-gray-700">{summary.kaseWeight.toLocaleString()} kg</span>
                        </div>
                      </div>
                    </div>

                    {/* Sales Card */}
                    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sales This Month</div>
                        <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center text-purple-700">
                          <TrendingUp size={14} />
                        </div>
                      </div>
                      <div className="text-lg sm:text-xl font-bold text-gray-900 leading-none mb-1">
                        {summary.totalSoldWeight.toLocaleString()} kg
                      </div>
                      <div className="text-[11px] text-gray-500 font-semibold mb-3">
                        Revenue: {formatUGX(summary.totalSalesValue)}
                      </div>
                      <div className="pt-2 border-t border-gray-50 text-[10px] text-gray-500">
                        Total Recorded Sales: <span className="font-bold text-gray-700">{sales.length}</span>
                      </div>
                    </div>

                    {/* Expenses Card */}
                    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Expenses This Month</div>
                        <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-red-700">
                          <DollarSign size={14} />
                        </div>
                      </div>
                      <div className="text-lg sm:text-xl font-bold text-gray-900 leading-none mb-1">
                        {formatUGX(summary.totalExpenses)}
                      </div>
                      <div className="text-[11px] text-gray-500 font-semibold mb-3">
                        Operating costs this month
                      </div>
                      <div className="pt-2 border-t border-gray-50 text-[10px] text-gray-500">
                        Total Expenses: <span className="font-bold text-gray-700">{expenses.length}</span>
                      </div>
                    </div>

                    {/* Net Cash Flow Card */}
                    <div className={`rounded-2xl p-4 sm:p-5 shadow-sm border ${
                      summary.netCashFlow >= 0 ? "bg-[#f0fdf4] border-green-200" : "bg-red-50 border-red-200"
                    }`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className={`text-[10px] font-bold uppercase tracking-wider ${
                          summary.netCashFlow >= 0 ? "text-green-700" : "text-red-700"
                        }`}>
                          Net Cash Flow
                        </div>
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                          summary.netCashFlow >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}>
                          <Wallet size={14} />
                        </div>
                      </div>
                      <div className={`text-lg sm:text-xl font-bold leading-none mb-1 ${
                        summary.netCashFlow >= 0 ? "text-green-800" : "text-red-800"
                      }`}>
                        {formatUGX(summary.netCashFlow)}
                      </div>
                      <div className="text-[10px] text-gray-500 mt-2 font-medium">
                        Estimated monthly balance from sales minus payouts and expenses.
                      </div>
                    </div>
                  </div>

                  {/* Daily Log Breakdown Table */}
                  <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-sm">
                    <h3 className="font-bold text-gray-900 text-sm mb-4">Daily Operations Log</h3>
                    {dailyBreakdown.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-10">No transactions recorded this month</p>
                    ) : (
                      <>
                        {/* Desktop View */}
                        <div className="hidden md:block overflow-x-auto max-h-[300px]">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-gray-50/50 sticky top-0">
                              <tr className="border-b border-gray-100 text-gray-400 uppercase font-bold text-[10px] tracking-wider">
                                <th className="py-2 px-3">Date</th>
                                <th className="py-2 px-3 text-right">Purchases (kg)</th>
                                <th className="py-2 px-3 text-right">Purchase Cost</th>
                                <th className="py-2 px-3 text-right">Sales Revenue</th>
                                <th className="py-2 px-3 text-right">Expenses</th>
                                <th className="py-2 px-3 text-right">Net Flow</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {dailyBreakdown.map((day) => (
                                <tr key={day.date} className="hover:bg-gray-50/50">
                                  <td className="py-2 px-3 font-semibold text-gray-800">{day.date}</td>
                                  <td className="py-2 px-3 text-right font-semibold text-gray-700">{day.weight.toLocaleString()} kg</td>
                                  <td className="py-2 px-3 text-right font-medium text-gray-600">{day.cost > 0 ? formatUGX(day.cost) : "—"}</td>
                                  <td className="py-2 px-3 text-right font-bold text-purple-700">{day.sales > 0 ? formatUGX(day.sales) : "—"}</td>
                                  <td className="py-2 px-3 text-right font-medium text-red-600">{day.expenses > 0 ? formatUGX(day.expenses) : "—"}</td>
                                  <td className={`py-2 px-3 text-right font-bold ${
                                    day.net >= 0 ? "text-green-700" : "text-red-700"
                                  }`}>
                                    {formatUGX(day.net)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile View */}
                        <div className="md:hidden divide-y divide-gray-100 bg-white rounded-xl border border-gray-100 overflow-hidden">
                          {dailyBreakdown.map(day => {
                            const isExpanded = expandedDayDate === day.date;
                            return (
                              <div key={day.date} className="p-3.5 active:bg-gray-50/50 transition-colors">
                                <div 
                                  className="flex items-center justify-between cursor-pointer"
                                  onClick={() => setExpandedDayDate(isExpanded ? null : day.date)}
                                >
                                  <div>
                                    <div className="font-bold text-gray-900 text-sm">{day.date}</div>
                                    <div className="text-[10px] text-gray-500 font-semibold mt-0.5">
                                      Weight: {day.weight.toLocaleString()} kg
                                    </div>
                                  </div>
                                  <div className="text-right flex items-center gap-2">
                                    <span className={`font-bold text-xs ${
                                      day.net >= 0 ? "text-green-700" : "text-red-700"
                                    }`}>
                                      {formatUGX(day.net)}
                                    </span>
                                    <span className="text-gray-400 text-[10px]">{isExpanded ? "▲" : "▼"}</span>
                                  </div>
                                </div>

                                {isExpanded && (
                                  <div className="mt-3 pt-3 border-t border-gray-50 text-xs space-y-2 text-gray-600 bg-[#FAF9F6] p-2.5 rounded-xl animate-in slide-in-from-top-1 duration-150">
                                    <div className="flex justify-between">
                                      <span>Purchases Cost:</span>
                                      <span className="font-bold text-gray-800">{day.cost > 0 ? formatUGX(day.cost) : "—"}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Sales Revenue:</span>
                                      <span className="font-bold text-purple-700">{day.sales > 0 ? formatUGX(day.sales) : "—"}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Expenses:</span>
                                      <span className="font-bold text-red-600">{day.expenses > 0 ? formatUGX(day.expenses) : "—"}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Tab: PURCHASES */}
              {activeTab === "purchases" && (
                <div className="space-y-4">
                  {/* Desktop Table View */}
                  <div className="hidden md:block bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto max-h-[500px]">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                          <tr>
                            {["Date", "Farmer", "Field Agent", "Coffee Type", "Net Weight", "Total Amount", "Cash Paid", "Status"].map(h => (
                              <th key={h} className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {purchases.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="py-16 text-center text-gray-400 font-medium">
                                No purchases recorded for this month
                              </td>
                            </tr>
                          ) : (
                            purchases.map((p, idx) => (
                              <tr key={p.id || idx} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-4 py-3.5 text-gray-500 whitespace-nowrap">{p.date}</td>
                                <td className="px-4 py-3.5 font-semibold text-gray-900">{p.farmers?.name || "Unknown"}</td>
                                <td className="px-4 py-3.5 text-gray-600">{p.field_agent?.full_name || "Direct"}</td>
                                <td className="px-4 py-3.5">
                                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-lg bg-gray-100 text-gray-600">
                                    {p.coffee_type}
                                  </span>
                                </td>
                                <td className="px-4 py-3.5 font-bold text-gray-700">{(p.payable_weight || 0).toFixed(1)} kg</td>
                                <td className="px-4 py-3.5 font-bold text-green-700">{formatUGX(p.total_amount)}</td>
                                <td className="px-4 py-3.5 font-bold text-gray-700">{formatUGX(p.cash_paid)}</td>
                                <td className="px-4 py-3.5">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                    p.cash_paid >= p.total_amount ? "bg-green-50 text-green-700" : "bg-orange-50 text-orange-700"
                                  }`}>
                                    {p.cash_paid >= p.total_amount ? "Paid" : "Partial"}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Mobile Expandable List View */}
                  <div className="md:hidden divide-y divide-gray-100 bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                    {purchases.length === 0 ? (
                      <div className="py-12 text-center text-gray-400 font-medium">
                        No purchases recorded for this month
                      </div>
                    ) : (
                      purchases.map(p => {
                        const isExpanded = expandedPurchaseId === p.id;
                        return (
                          <div key={p.id} className="p-4 active:bg-gray-50/50 transition-colors">
                            <div 
                              className="flex items-center justify-between cursor-pointer"
                              onClick={() => setExpandedPurchaseId(isExpanded ? null : p.id)}
                            >
                              <div>
                                <div className="font-bold text-gray-900 text-sm">{p.farmers?.name || "Unknown"}</div>
                                <div className="text-[10px] text-gray-500 font-semibold mt-0.5">
                                  {p.payable_weight} kg · {p.coffee_type}
                                </div>
                              </div>
                              <div className="text-right flex items-center gap-2">
                                <div>
                                  <div className="font-bold text-green-700 text-xs">{formatUGX(p.total_amount)}</div>
                                  <span className={`inline-block px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase mt-1 ${
                                    p.cash_paid >= p.total_amount ? "bg-green-50 text-green-700" : "bg-orange-50 text-orange-700"
                                  }`}>
                                    {p.cash_paid >= p.total_amount ? "Paid" : "Partial"}
                                  </span>
                                </div>
                                <span className="text-gray-400 text-[10px]">{isExpanded ? "▲" : "▼"}</span>
                              </div>
                            </div>
                            
                            {/* Expanded details */}
                            {isExpanded && (
                              <div className="mt-3 pt-3 border-t border-gray-50 text-xs space-y-2 text-gray-600 bg-[#FAF9F6] p-2.5 rounded-xl animate-in slide-in-from-top-1 duration-150">
                                <div className="flex justify-between">
                                  <span>Field Agent:</span>
                                  <span className="font-bold text-gray-800">{p.field_agent?.full_name || "Direct"}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Unit Price:</span>
                                  <span className="font-bold text-gray-800">{formatUGX(p.buying_price)}/kg</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Cash Paid:</span>
                                  <span className="font-bold text-gray-800">{formatUGX(p.cash_paid)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Date:</span>
                                  <span className="font-semibold text-gray-800">{p.date}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Tab: SALES */}
              {activeTab === "sales" && (
                <div className="space-y-4">
                  {/* Desktop Table */}
                  <div className="hidden md:block bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto max-h-[500px]">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                          <tr>
                            {["Date", "Buyer", "Coffee Type", "Net Weight", "Selling Price", "Total Revenue", "Notes"].map(h => (
                              <th key={h} className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {sales.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-16 text-center text-gray-400 font-medium">
                                No sales recorded for this month
                              </td>
                            </tr>
                          ) : (
                            sales.map((s, idx) => (
                              <tr key={s.id || idx} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-4 py-3.5 text-gray-500">{s.date}</td>
                                <td className="px-4 py-3.5 font-semibold text-gray-900">{s.buyer_name || "Direct Sale"}</td>
                                <td className="px-4 py-3.5">
                                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-lg bg-purple-50 text-purple-700">
                                    {s.coffee_type}
                                  </span>
                                </td>
                                <td className="px-4 py-3.5 font-bold text-gray-700">{(s.net_weight || 0).toFixed(1)} kg</td>
                                <td className="px-4 py-3.5 text-gray-500">{formatUGX(s.selling_price)}</td>
                                <td className="px-4 py-3.5 font-bold text-purple-700">{formatUGX(s.total_amount)}</td>
                                <td className="px-4 py-3.5 text-gray-500 max-w-[200px] truncate" title={s.notes}>{s.notes || "—"}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Mobile List View */}
                  <div className="md:hidden divide-y divide-gray-100 bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                    {sales.length === 0 ? (
                      <div className="py-12 text-center text-gray-400 font-medium">
                        No sales recorded for this month
                      </div>
                    ) : (
                      sales.map(s => {
                        const isExpanded = expandedSaleId === s.id;
                        return (
                          <div key={s.id} className="p-4 active:bg-gray-50/50 transition-colors">
                            <div 
                              className="flex items-center justify-between cursor-pointer"
                              onClick={() => setExpandedSaleId(isExpanded ? null : s.id)}
                            >
                              <div>
                                <div className="font-bold text-gray-900 text-sm">{s.buyer_name || "Direct Sale"}</div>
                                <div className="text-[10px] text-gray-500 font-semibold mt-0.5">
                                  {s.net_weight} kg · {s.coffee_type}
                                </div>
                              </div>
                              <div className="text-right flex items-center gap-2">
                                <div className="font-bold text-purple-700 text-xs">{formatUGX(s.total_amount)}</div>
                                <span className="text-gray-400 text-[10px]">{isExpanded ? "▲" : "▼"}</span>
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="mt-3 pt-3 border-t border-gray-50 text-xs space-y-2 text-gray-600 bg-[#FAF9F6] p-2.5 rounded-xl animate-in slide-in-from-top-1 duration-150">
                                <div className="flex justify-between">
                                  <span>Selling Price:</span>
                                  <span className="font-bold text-gray-800">{formatUGX(s.selling_price)}/kg</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Recorded By:</span>
                                  <span className="font-bold text-gray-800">{s.admin?.full_name || "System"}</span>
                                </div>
                                {s.notes && (
                                  <div className="flex flex-col gap-0.5">
                                    <span>Notes:</span>
                                    <span className="font-medium text-gray-700 whitespace-pre-wrap">{s.notes}</span>
                                  </div>
                                )}
                                <div className="flex justify-between">
                                  <span>Date:</span>
                                  <span className="font-semibold text-gray-800">{s.date}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Tab: EXPENSES */}
              {activeTab === "expenses" && (
                <div className="space-y-4">
                  {/* Desktop Table */}
                  <div className="hidden md:block bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto max-h-[500px]">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                          <tr>
                            {["Date", "Type", "Category", "Amount", "Notes"].map(h => (
                              <th key={h} className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {expenses.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-16 text-center text-gray-400 font-medium">
                                No expenses recorded for this month
                              </td>
                            </tr>
                          ) : (
                            expenses.map((e, idx) => (
                              <tr key={e.id || idx} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-4 py-3.5 text-gray-500">{e.date}</td>
                                <td className="px-4 py-3.5 font-semibold text-gray-900">{e.type}</td>
                                <td className="px-4 py-3.5">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                                    e.category === "cost" ? "bg-yellow-50 text-yellow-800" : "bg-purple-50 text-purple-800"
                                  }`}>
                                    {e.category === "cost" ? "Cost Expense" : "General Expense"}
                                  </span>
                                </td>
                                <td className="px-4 py-3.5 font-bold text-red-600">{formatUGX(e.amount)}</td>
                                <td className="px-4 py-3.5 text-gray-500 max-w-[250px] truncate" title={e.notes}>{e.notes || "—"}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Mobile List View */}
                  <div className="md:hidden divide-y divide-gray-100 bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                    {expenses.length === 0 ? (
                      <div className="py-12 text-center text-gray-400 font-medium">
                        No expenses recorded for this month
                      </div>
                    ) : (
                      expenses.map(e => {
                        const isExpanded = expandedExpenseId === e.id;
                        return (
                          <div key={e.id} className="p-4 active:bg-gray-50/50 transition-colors">
                            <div 
                              className="flex items-center justify-between cursor-pointer"
                              onClick={() => setExpandedExpenseId(isExpanded ? null : e.id)}
                            >
                              <div>
                                <div className="font-bold text-gray-900 text-sm">{e.type}</div>
                                <span className={`inline-block px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase mt-0.5 ${
                                  e.category === "cost" ? "bg-yellow-50 text-yellow-800" : "bg-purple-50 text-purple-800"
                                }`}>
                                  {e.category === "cost" ? "Cost" : "General"}
                                </span>
                              </div>
                              <div className="text-right flex items-center gap-2">
                                <div className="font-bold text-red-600 text-xs">{formatUGX(e.amount)}</div>
                                <span className="text-gray-400 text-[10px]">{isExpanded ? "▲" : "▼"}</span>
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="mt-3 pt-3 border-t border-gray-50 text-xs space-y-2 text-gray-600 bg-[#FAF9F6] p-2.5 rounded-xl animate-in slide-in-from-top-1 duration-150">
                                <div className="flex justify-between">
                                  <span>Recorded By:</span>
                                  <span className="font-bold text-gray-800">{e.admin?.full_name || "System"}</span>
                                </div>
                                {e.notes && (
                                  <div className="flex flex-col gap-0.5">
                                    <span>Notes:</span>
                                    <span className="font-medium text-gray-700 whitespace-pre-wrap">{e.notes}</span>
                                  </div>
                                )}
                                <div className="flex justify-between">
                                  <span>Date:</span>
                                  <span className="font-semibold text-gray-800">{e.date}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Hidden Printable Component */}
        <div className="hidden">
          <div ref={printRef} className="p-8 bg-white text-gray-900" style={{ fontFamily: "Inter, sans-serif" }}>
            <div className="border-b-2 border-[#14532D] pb-6 mb-6 flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-[#14532D]">Monthly Summary</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Report Month: <span className="font-semibold text-gray-700">{selectedMonth}</span>
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Scope: {onlyDirect ? "Direct Operations" : "Team Overview"}
                </p>
              </div>
              <div className="text-right">
                <h2 className="text-lg font-bold text-gray-800">CPMS</h2>
                <p className="text-xs text-gray-400">Coffee Purchase Management System</p>
                <p className="text-xs text-gray-400 mt-1">Generated: {new Date().toLocaleString()}</p>
              </div>
            </div>

            {/* Print Summaries */}
            <div className="grid grid-cols-4 gap-4 mb-6 border-b border-gray-100 pb-6">
              <div className="p-3 bg-gray-50 rounded-xl">
                <div className="text-[10px] font-bold text-gray-400 uppercase">Weight Purchased</div>
                <div className="text-lg font-bold text-gray-900">{summary.totalPurchasedWeight.toLocaleString()} kg</div>
                <div className="text-[10px] text-gray-500">Cost: {formatUGX(summary.totalPurchasedCost)}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <div className="text-[10px] font-bold text-gray-400 uppercase">Weight Sold</div>
                <div className="text-lg font-bold text-gray-900">{summary.totalSoldWeight.toLocaleString()} kg</div>
                <div className="text-[10px] text-gray-500">Revenue: {formatUGX(summary.totalSalesValue)}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <div className="text-[10px] font-bold text-gray-400 uppercase">Expenses Incurred</div>
                <div className="text-lg font-bold text-gray-900">{formatUGX(summary.totalExpenses)}</div>
              </div>
              <div className={`p-3 rounded-xl border ${summary.netCashFlow >= 0 ? "bg-green-50/50 border-green-200" : "bg-red-50/50 border-red-200"}`}>
                <div className="text-[10px] font-bold text-gray-500 uppercase">Net Cash Flow</div>
                <div className="text-lg font-bold text-gray-900">{formatUGX(summary.netCashFlow)}</div>
              </div>
            </div>

            {/* Print Coffee breakdown */}
            <div className="mb-6">
              <h3 className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-2">Coffee Purchases breakdown</h3>
              <div className="flex gap-6 text-xs bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                <div>Kiboko: <span className="font-bold text-gray-800">{summary.kibokoWeight.toLocaleString()} kg</span></div>
                <div>Red Cherry: <span className="font-bold text-gray-800">{summary.redWeight.toLocaleString()} kg</span></div>
                <div>Kase / Clean: <span className="font-bold text-gray-800">{summary.kaseWeight.toLocaleString()} kg</span></div>
              </div>
            </div>

            {/* Print Tables */}
            <div className="space-y-6">
              {/* Daily breakdown log */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-2 border-b border-gray-100 pb-1">Daily Log</h3>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500 uppercase font-bold text-[9px] tracking-wider pb-1">
                      <th>Date</th>
                      <th className="text-right">Weight (kg)</th>
                      <th className="text-right">Purchase Cost</th>
                      <th className="text-right">Sales Revenue</th>
                      <th className="text-right">Expenses</th>
                      <th className="text-right">Net Flow</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {dailyBreakdown.map((day) => (
                      <tr key={day.date}>
                        <td className="py-1">{day.date}</td>
                        <td className="py-1 text-right">{day.weight.toLocaleString()} kg</td>
                        <td className="py-1 text-right">{day.cost > 0 ? formatUGX(day.cost) : "—"}</td>
                        <td className="py-1 text-right text-purple-700 font-medium">{day.sales > 0 ? formatUGX(day.sales) : "—"}</td>
                        <td className="py-1 text-right text-red-600">{day.expenses > 0 ? formatUGX(day.expenses) : "—"}</td>
                        <td className={`py-1 text-right font-bold ${day.net >= 0 ? "text-green-700" : "text-red-700"}`}>
                          {formatUGX(day.net)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-12 pt-6 border-t border-gray-200 flex justify-between text-[10px] text-gray-400 font-semibold uppercase">
              <span>Sign-off Administrator: _____________________</span>
              <span>CPMS Automated Monthly Report</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

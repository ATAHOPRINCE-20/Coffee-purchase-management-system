import React, { useState, useEffect, useMemo } from "react";
import { Layout } from "../components/Layout";
import {
  TrendingUp, TrendingDown, Trash2, Loader2, AlertCircle,
  Check, DollarSign, ShoppingBag, Receipt, Plus, Download, Printer, Coffee
} from "lucide-react";
import { salesService, Sale } from "../services/salesService";
import { purchasesService } from "../services/purchasesService";
import { expensesService, Expense } from "../services/expensesService";
import { seasonsService, Season } from "../services/seasonsService";
import { reportService, PostSaleReport } from "../services/reportService";
import { useAuth, getEffectiveAdminId } from "../hooks/useAuth";
import { settingsService, CompanyProfile } from "../services/settingsService";
import { getEATDateString } from "../utils/dateUtils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import { Badge } from "../components/ui/badge";
import { ScrollArea } from "../components/ui/scroll-area";
import { Separator } from "../components/ui/separator";

const formatUGX = (v: number) => `UGX ${Math.round(v).toLocaleString()}`;
const STD_MOISTURE = 12;

function calcDeduction(gross: number, moisture: number, std: number) {
  if (moisture <= std) return 0;
  return gross * (moisture - std) * 0.015;
}

type CoffeeType = "Kiboko" | "Red" | "Kase";

function PnLCard({ label, value, sub, icon: Icon, color, bgColor, big }: {
  label: string; value: string; sub?: string; icon: any;
  color: string; bgColor: string; big?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl p-4 md:p-5 flex items-start gap-3 md:gap-4"
      style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.07)", border: `1px solid ${bgColor}` }}>
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: bgColor }}>
        <Icon size={20} color={color} />
      </div>
      <div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 500, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: big ? "20px" : "17px", fontWeight: 700, color, lineHeight: 1.2 }}>{value}</div>
        {sub && <div style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#9CA3AF", marginTop: "2px" }}>{sub}</div>}
      </div>
    </div>
  );
}

export default function SalesPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "Admin" || profile?.role === "Super Admin" || profile?.role === "Field Agent";

  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [activeSeason, setActiveSeason] = useState<Season | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [availableStock, setAvailableStock] = useState<number | null>(null);
  const [loadingStock, setLoadingStock] = useState(false);

  const [report, setReport] = useState<PostSaleReport | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [pnlView, setPnlView] = useState<'Batch' | 'Season'>('Batch');

  // Form
  const [coffeeType] = useState<CoffeeType>("Kase");
  const [grossWeight, setGrossWeight] = useState("");
  const [moisture, setMoisture] = useState("");
  const [stdMoisture, setStdMoisture] = useState(String(STD_MOISTURE));
  const [sellingPrice, setSellingPrice] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [date, setDate] = useState(() => getEATDateString());
  const [notes, setNotes] = useState("");
  const [manualDeduction, setManualDeduction] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);
  const DRAFT_KEY = 'sales_form_draft';

  // Load draft on mount
  useEffect(() => {
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        setGrossWeight(parsed.grossWeight || "");
        setMoisture(parsed.moisture || "");
        setStdMoisture(parsed.stdMoisture || String(STD_MOISTURE));
        setSellingPrice(parsed.sellingPrice || "");
        setBuyerName(parsed.buyerName || "");
        setDate(parsed.date || getEATDateString());
        setNotes(parsed.notes || "");
        setManualDeduction(parsed.manualDeduction || "");
      } catch (e) {
        console.error("Failed to load draft:", e);
      }
    }
  }, []);

  // Save draft on change
  useEffect(() => {
    const draft = {
      grossWeight, moisture, stdMoisture, sellingPrice, buyerName, date, notes, manualDeduction
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [grossWeight, moisture, stdMoisture, sellingPrice, buyerName, date, notes, manualDeduction]);

  // Derived calculations
  const gross = parseFloat(grossWeight) || 0;
  const moist = parseFloat(moisture) || 0;
  const std = parseFloat(stdMoisture) || STD_MOISTURE;
  const price = parseFloat(sellingPrice) || 0;
  const autoDeduction = calcDeduction(gross, moist, std);
  const deduction = manualDeduction !== "" ? (parseFloat(manualDeduction) || 0) : autoDeduction;
  const netWeight = Math.max(0, gross - deduction);
  const totalAmount = netWeight * price;

  const fetchData = async () => {
    try {
      setLoading(true);
      const adminId = getEffectiveAdminId(profile);
      if (!adminId) return;
      const [salesData, purchasesData, expensesData, season] = await Promise.all([
        salesService.getAll(adminId),
        purchasesService.getAll(adminId),
        expensesService.getAll(adminId),
        seasonsService.getActive(adminId),
      ]);
      setSales(salesData);
      setPurchases(purchasesData);
      setExpenses(expensesData);
      setActiveSeason(season);

      // Fetch available stock
      setLoadingStock(true);
      const stock = await salesService.getAvailableStock(adminId, season?.id);
      setAvailableStock(stock);
    } catch (err: any) {
      console.error("Error loading sales data:", err);
    } finally {
      setLoading(false);
      setLoadingStock(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!grossWeight || gross <= 0) { setFormError("Enter a valid gross weight."); return; }
    if (!moisture || moist <= 0) { setFormError("Enter a valid moisture content."); return; }
    if (!sellingPrice || price <= 0) { setFormError("Enter a valid selling price."); return; }

    // Inventory Validation
    if (availableStock !== null && netWeight > availableStock) {
      setFormError(`Insufficient coffee in system. Available: ${availableStock.toFixed(1)} kg`);
      return;
    }

    try {
      setSaving(true);
      const adminId = getEffectiveAdminId(profile);
      if (!adminId) return;
      const newSale = await salesService.create({
        admin_id: adminId,
        season_id: activeSeason?.id,
        date,
        coffee_type: coffeeType,
        gross_weight: gross,
        moisture_content: moist,
        standard_moisture: std,
        deduction_weight: deduction,
        net_weight: parseFloat(netWeight.toFixed(2)),
        selling_price: price,
        total_amount: parseFloat(totalAmount.toFixed(2)),
        buyer_name: buyerName.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setSales(prev => [newSale, ...prev]);
      setGrossWeight(""); setMoisture(""); setSellingPrice("");
      setBuyerName(""); setNotes(""); setDate(getEATDateString());
      setManualDeduction("");
      localStorage.removeItem(DRAFT_KEY);
      showToast("Sale recorded successfully!");

      // Refresh stock
      const stock = await salesService.getAvailableStock(adminId, activeSeason?.id);
      setAvailableStock(stock);

      // Generate Report
      try {
        setLoadingReport(true);
        const reportData = await reportService.getTransactionsBeforeSale(adminId, newSale);
        setReport(reportData);
        setShowReport(true);
        
        // Persist the report
        await reportService.saveReport(adminId, newSale.id, reportData);
      } catch (reportErr) {
        console.error("Failed to generate post-sale report:", reportErr);
      } finally {
        setLoadingReport(false);
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to save sale.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this sale record? This cannot be undone.")) return;
    try {
      setDeletingId(id);
      await salesService.delete(id);
      setSales(prev => prev.filter(s => s.id !== id));
      showToast("Sale deleted.");
      
      // Refresh stock
      const adminId = getEffectiveAdminId(profile);
      if (adminId) {
        const stock = await salesService.getAvailableStock(adminId, activeSeason?.id);
        setAvailableStock(stock);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to delete.", false);
    } finally {
      setDeletingId(null);
    }
  };

  // P&L Calculations (Reset after each sale)
  const lastSale = useMemo(() => {
    return [...sales].sort((a, b) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime())[0];
  }, [sales]);

  const lastSaleDate = lastSale?.created_at || lastSale?.date || '1970-01-01T00:00:00Z';

  const currentBatchSales = useMemo(() => {
    return sales.filter(s => new Date(s.created_at || s.date).getTime() > new Date(lastSaleDate).getTime());
  }, [sales, lastSaleDate]);

  const currentBatchPurchases = useMemo(() => {
    return purchases.filter(p => new Date(p.created_at || p.date).getTime() > new Date(lastSaleDate).getTime());
  }, [purchases, lastSaleDate]);

  const currentBatchExpenses = useMemo(() => {
    return expenses.filter(e => new Date(e.created_at || e.date).getTime() > new Date(lastSaleDate).getTime());
  }, [expenses, lastSaleDate]);

  // Seasonal Totals
  const seasonalSales = useMemo(() => {
    return sales.filter(s => !activeSeason || s.season_id === activeSeason.id);
  }, [sales, activeSeason]);

  const seasonalPurchases = useMemo(() => {
    return purchases.filter(p => !activeSeason || p.season_id === activeSeason.id);
  }, [purchases, activeSeason]);

  const seasonalExpenses = useMemo(() => {
    return expenses.filter(e => !activeSeason || e.season_id === activeSeason.id);
  }, [expenses, activeSeason]);

  // Active Metrics based on View
  const activeSales = pnlView === 'Batch' ? currentBatchSales : seasonalSales;
  const activePurchases = pnlView === 'Batch' ? currentBatchPurchases : seasonalPurchases;
  const activeExpenses = pnlView === 'Batch' ? currentBatchExpenses : seasonalExpenses;

  const totalRevenue = useMemo(() => activeSales.reduce((s, r) => s + r.total_amount, 0), [activeSales]);
  const totalPurchaseCost = useMemo(() => activePurchases.reduce((s, p) => s + (p.total_amount || 0), 0), [activePurchases]);
  
  const costExpenses = useMemo(() => activeExpenses.filter(e => e.category === 'cost').reduce((s, e) => s + e.amount, 0), [activeExpenses]);
  const operatingExpenses = useMemo(() => activeExpenses.filter(e => e.category === 'general').reduce((s, e) => s + e.amount, 0), [activeExpenses]);

  const totalCostOfSales = totalPurchaseCost + costExpenses;
  const grossProfit = totalRevenue - totalCostOfSales;
  const netProfit = grossProfit - operatingExpenses;
  
  const isGrossProfit = grossProfit >= 0;
  const isNetProfit = netProfit >= 0;

  const typeColor = (t: string) =>
    t === "Kiboko" ? { bg: "#f0fdf4", text: "#14532D" } :
    t === "Red"    ? { bg: "#fef2f2", text: "#991b1b" } :
                    { bg: "#fdf4ff", text: "#701a75" };

  const inputClass = "w-full px-3.5 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-[#14532D] focus:ring-2 focus:ring-[#14532D]/10 bg-white";
  const labelClass = "block mb-1.5 text-xs font-semibold text-gray-600";

  if (loading) {
    return (
      <Layout breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Sales & P&L" }]}>
        <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales & P&L</h1>
          <p className="text-sm text-gray-500 mt-1">Record sales and monitor batch profitability</p>
        </div>
        
        {/* Indicator won't show until data is loaded */}
      </div>
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-green-700 animate-spin mb-4" />
          <p className="text-gray-500 font-medium">Loading sales data...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Sales & P&L" }]}>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 flex items-center gap-3 px-5 py-4 rounded-xl shadow-xl z-50"
          style={{ backgroundColor: toast.ok ? "#14532D" : "#DC2626", color: "#fff", fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 500 }}>
          <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
            {toast.ok ? <Check size={14} color="#fff" /> : <AlertCircle size={14} color="#fff" />}
          </div>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 style={{ fontFamily: "Inter, sans-serif", fontSize: "22px", fontWeight: 700, color: "#111827" }}>Sales & Profit/Loss</h1>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#6B7280", marginTop: "2px" }}>
            Record coffee sales and track your net profit or loss
          </p>
        </div>

        {/* P&L View Toggle */}
        <div className="flex bg-gray-100 p-1 rounded-xl w-fit self-start">
          <button
            onClick={() => setPnlView('Batch')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              pnlView === 'Batch' ? 'bg-white text-[#14532D] shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Current Batch
          </button>
          <button
            onClick={() => setPnlView('Season')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              pnlView === 'Season' ? 'bg-white text-[#14532D] shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Full Season
          </button>
        </div>
      </div>

      {/* P&L Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <PnLCard label="Total Revenue" value={formatUGX(totalRevenue)} sub={`${sales.length} sales`} icon={TrendingUp} color="#14532D" bgColor="#f0fdf4" />
        <PnLCard 
          label={isGrossProfit ? (pnlView === 'Batch' ? "Batch Gross Profit" : "Seasonal Gross Profit") : (pnlView === 'Batch' ? "Batch Gross Loss" : "Seasonal Gross Loss")}
          value={formatUGX(Math.abs(grossProfit))} 
          sub={pnlView === 'Batch' ? "Rev - (Purchases + Cost Exp)" : "Cumulative Seasonal Gross"} 
          icon={isGrossProfit ? TrendingUp : TrendingDown} 
          color={isGrossProfit ? "#16A34A" : "#DC2626"} 
          bgColor={isGrossProfit ? "#f0fdf4" : "#fef2f2"} 
        />
        <PnLCard label="Operating Expenses" value={formatUGX(operatingExpenses)} sub={pnlView === 'Batch' ? "Salary, Meals, etc." : "Total Seasonal OpEx"} icon={Receipt} color="#854d0e" bgColor="#fef9c3" />
        <PnLCard
          label={isNetProfit ? (pnlView === 'Batch' ? "Batch Net Profit" : "Seasonal Net Profit") : (pnlView === 'Batch' ? "Batch Net Loss" : "Seasonal Net Loss")}
          value={formatUGX(Math.abs(netProfit))}
          sub={isNetProfit ? (pnlView === 'Batch' ? "Gross - Op Exp" : "Seasonal Net Performance") : "Operating at a loss"}
          icon={isNetProfit ? TrendingUp : TrendingDown}
          color={isNetProfit ? "#16A34A" : "#DC2626"}
          bgColor={isNetProfit ? "#f0fdf4" : "#fef2f2"}
          big
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Entry Form (Admin only) ── */}
        {isAdmin && (
          <div className="bg-white rounded-xl p-6" style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.05)", border: "1px solid #F1F5F9" }}>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                <Plus size={16} color="#14532D" />
              </div>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 600, color: "#111827" }}>Record a Sale</span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-100 flex items-center gap-2">
                  <AlertCircle size={14} color="#DC2626" />
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#DC2626" }}>{formError}</span>
                </div>
              )}

              {/* Coffee Type (Fixed to Kase) */}
              <div>
                <label className={labelClass}>Coffee Type</label>
                <div className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-between" style={{ fontFamily: "Inter, sans-serif", fontSize: "13px" }}>
                  <span className="font-semibold text-purple-700">Kase</span>
                  <span className="text-gray-400 text-xs">Only Kase is sold</span>
                </div>
              </div>

              {/* Gross Weight */}
              <div>
                <div className="flex justify-between items-end mb-1.5">
                  <label className={labelClass}>Gross Weight (kg) <span className="text-red-500">*</span></label>
                  {availableStock !== null && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${availableStock > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      Available: {availableStock.toFixed(1)} kg
                    </span>
                  )}
                </div>
                <input type="number" min="0" step="0.1" placeholder="e.g. 500" value={grossWeight}
                  onChange={e => setGrossWeight(e.target.value)} className={inputClass}
                  style={{ fontFamily: "Inter, sans-serif", fontSize: "13px" }} />
              </div>

              {/* Moisture & Standard row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Moisture % <span className="text-red-500">*</span></label>
                  <input type="number" min="0" max="40" step="0.1" placeholder="e.g. 14" value={moisture}
                    onChange={e => setMoisture(e.target.value)} className={inputClass}
                    style={{ fontFamily: "Inter, sans-serif", fontSize: "13px" }} />
                </div>
                <div>
                  <label className={labelClass}>Std Moisture %</label>
                  <input type="number" min="0" max="40" step="0.1" value={stdMoisture}
                    onChange={e => setStdMoisture(e.target.value)} className={inputClass}
                    style={{ fontFamily: "Inter, sans-serif", fontSize: "13px" }} />
                </div>
              </div>

              {/* Calculated fields */}
              {(gross > 0 && moist > 0) && (
                <div className="bg-green-50 rounded-xl p-3 border border-green-100 space-y-1">
                  <div className="flex justify-between items-center text-xs" style={{ fontFamily: "Inter, sans-serif" }}>
                    <span className="text-gray-500">Deduction (kg)</span>
                    <div className="flex items-center gap-1">
                      {manualDeduction !== "" && (
                        <button 
                          type="button"
                          onClick={() => setManualDeduction("")}
                          className="text-[10px] text-green-700 font-bold uppercase hover:bg-green-100 px-1 rounded"
                        >
                          Auto
                        </button>
                      )}
                      <input
                        type="number"
                        step="any"
                        value={manualDeduction !== "" ? manualDeduction : autoDeduction > 0 ? autoDeduction.toFixed(2) : ""}
                        onChange={(e) => setManualDeduction(e.target.value)}
                        className="w-16 text-right bg-transparent border-b border-orange-200 focus:border-orange-500 outline-none font-semibold text-orange-700"
                        placeholder={autoDeduction > 0 ? autoDeduction.toFixed(2) : "0"}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between text-xs" style={{ fontFamily: "Inter, sans-serif" }}>
                    <span className="text-gray-500">Net Weight</span>
                    <span className="font-bold text-green-800">{netWeight.toFixed(2)} kg</span>
                  </div>
                </div>
              )}

              {/* Selling Price */}
              <div>
                <label className={labelClass}>Selling Price (UGX/kg) <span className="text-red-500">*</span></label>
                <input type="number" min="0" step="100" placeholder="e.g. 1200" value={sellingPrice}
                  onChange={e => setSellingPrice(e.target.value)} className={inputClass}
                  style={{ fontFamily: "Inter, sans-serif", fontSize: "13px" }} />
              </div>

              {/* Total Amount preview */}
              {totalAmount > 0 && (
                <div className="flex items-center justify-between px-4 py-3 rounded-xl"
                  style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#166534" }}>Total Amount</span>
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: "16px", fontWeight: 700, color: "#14532D" }}>{formatUGX(totalAmount)}</span>
                </div>
              )}

              {/* Buyer Name */}
              <div>
                <label className={labelClass}>Buyer Name <span className="text-gray-400 font-normal">(optional)</span></label>
                <input type="text" placeholder="e.g. Kawacom Uganda Ltd" value={buyerName}
                  onChange={e => setBuyerName(e.target.value)} className={inputClass}
                  style={{ fontFamily: "Inter, sans-serif", fontSize: "13px" }} />
              </div>

              {/* Date */}
              <div>
                <label className={labelClass}>Date <span className="text-red-500">*</span></label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputClass}
                  style={{ fontFamily: "Inter, sans-serif", fontSize: "13px" }} />
              </div>

              {/* Notes */}
              <div>
                <label className={labelClass}>Notes <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea rows={2} placeholder="Any additional details..." value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-[#14532D] resize-none"
                  style={{ fontFamily: "Inter, sans-serif", fontSize: "13px" }} />
              </div>

              <button type="submit" disabled={saving}
                className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: "#14532D", color: "#fff", fontFamily: "Inter, sans-serif" }}>
                {saving ? <><Loader2 size={15} className="animate-spin" /> Saving...</> : <><TrendingUp size={15} /> Record Sale</>}
              </button>
            </form>
          </div>
        )}

        {/* ── Sales Table ── */}
        <div className={`bg-white rounded-xl overflow-hidden ${isAdmin ? "lg:col-span-2" : "lg:col-span-3"}`}
          style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.05)", border: "1px solid #F1F5F9" }}>

          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 600, color: "#111827" }}>
              Sale Records
            </span>
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#6B7280" }}>
              {sales.length} record{sales.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Desktop */}
          <div className="hidden lg:block overflow-x-auto max-h-[600px]">
            <table className="w-full">
              <thead className="sticky top-0 z-10" style={{ backgroundColor: "#F8FAFC", borderBottom: "1px solid #F1F5F9" }}>
                <tr>
                  {["Date", "Type", "Net Wt", "Moist.", "Price/kg", "Total", "Buyer", ...(profile?.role === 'Super Admin' ? ["Admin"] : []), ...(isAdmin ? [""] : [])].map(h => (
                    <th key={h} className="px-3 py-3 text-left"
                      style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sales.length === 0 ? (
                  <tr><td colSpan={isAdmin ? 8 : 7} className="py-16 text-center">
                    <DollarSign size={32} color="#D1D5DB" className="mx-auto mb-3" />
                    <p style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", color: "#9CA3AF" }}>No sales recorded yet</p>
                  </td></tr>
                ) : sales.map(s => {
                  const col = typeColor(s.coffee_type);
                  return (
                    <tr key={s.id} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-3 py-3.5 whitespace-nowrap" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#6B7280" }}>{s.date}</td>
                      <td className="px-3 py-3.5">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: col.bg, color: col.text }}>{s.coffee_type}</span>
                      </td>
                      <td className="px-3 py-3.5 whitespace-nowrap" style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600, color: "#14532D" }}>{s.net_weight.toFixed(1)} kg</td>
                      <td className="px-3 py-3.5 whitespace-nowrap" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: s.moisture_content > s.standard_moisture ? "#DC2626" : "#16A34A", fontWeight: 500 }}>{s.moisture_content}%</td>
                      <td className="px-3 py-3.5 whitespace-nowrap" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#374151" }}>UGX {s.selling_price.toLocaleString()}</td>
                      <td className="px-3 py-3.5 whitespace-nowrap" style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 700, color: "#14532D" }}>{formatUGX(s.total_amount)}</td>
                      <td className="px-3 py-3.5" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#374151" }}>{s.buyer_name || "—"}</td>
                      {profile?.role === 'Super Admin' && (
                        <td className="px-3 py-3.5 whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-lg" style={{ backgroundColor: "#f3f4f6", color: "#4b5563", fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600 }}>
                            {(s as any).admin?.full_name || 'System'}
                          </span>
                        </td>
                      )}
                      {isAdmin && (
                        <td className="px-3 py-3.5">
                          <button onClick={() => handleDelete(s.id)} disabled={deletingId === s.id}
                            className="p-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50">
                            {deletingId === s.id ? <Loader2 size={13} color="#DC2626" className="animate-spin" /> : <Trash2 size={13} color="#DC2626" />}
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="lg:hidden flex flex-col divide-y divide-gray-50">
            {sales.length === 0 ? (
              <div className="py-16 text-center">
                <DollarSign size={28} color="#D1D5DB" className="mx-auto mb-3" />
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#9CA3AF" }}>No sales recorded yet</p>
              </div>
            ) : sales.map(s => {
              const col = typeColor(s.coffee_type);
              return (
                <div key={s.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: col.bg, color: col.text }}>{s.coffee_type}</span>
                        <span style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#9CA3AF" }}>{s.date}</span>
                      </div>
                      <div style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 600, color: "#111827" }}>
                        {s.net_weight.toFixed(1)} kg @ UGX {s.selling_price.toLocaleString()}/kg
                      </div>
                      {s.buyer_name && <div style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#6B7280", marginTop: "2px" }}>Buyer: {s.buyer_name}</div>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 700, color: "#14532D" }}>{formatUGX(s.total_amount)}</span>
                      {isAdmin && (
                        <button onClick={() => handleDelete(s.id)} disabled={deletingId === s.id} className="p-1.5 rounded-lg hover:bg-red-50">
                          {deletingId === s.id ? <Loader2 size={13} color="#DC2626" className="animate-spin" /> : <Trash2 size={13} color="#DC2626" />}
                        </button>
                      )}
                    </div>
                  </div>
                  {profile?.role === 'Super Admin' && (
                    <div className="pt-2 mt-2 border-t border-gray-100 flex justify-between items-center">
                      <span style={{ fontFamily: "Inter", fontSize: "11px", color: "#9CA3AF", textTransform: "uppercase", fontWeight: 600 }}>Admin Branch:</span>
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>
                        {(s as any).admin?.full_name || 'System'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          {sales.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 flex justify-between items-center" style={{ backgroundColor: "#F8FAFC" }}>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#6B7280" }}>{sales.length} sale{sales.length !== 1 ? "s" : ""}</span>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 700, color: "#14532D" }}>{formatUGX(totalRevenue)}</span>
            </div>
          )}
        </div>
      </div>
      <PostSaleReportModal 
        isOpen={showReport} 
        onClose={() => setShowReport(false)} 
        report={report} 
      />
    </Layout>
  );
}

function PostSaleReportModal({ isOpen, onClose, report }: { isOpen: boolean; onClose: () => void; report: PostSaleReport | null }) {
  const { profile } = useAuth();
  const [company, setCompany] = useState<CompanyProfile | null>(null);

  useEffect(() => {
    if (isOpen) {
      const adminId = getEffectiveAdminId(profile);
      if (adminId) {
        settingsService.getCompanyProfile(adminId).then(setCompany);
      }
    }
  }, [isOpen, profile]);

  if (!report) return null;

  const handleDownload = () => reportService.downloadCSV(report);
  const handlePrint = () => window.print();

  const totalCost = (report.summary.totalPurchaseCost || 0) + (report.summary.totalExpenses || 0);
  const grossProfit = report.summary.grossProfit ?? (report.sale.total_amount - (report.summary.totalPurchaseCost || 0));
  const netProfit = grossProfit - (report.summary.totalExpenses || 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden printable-modal">
        <DialogHeader className="p-6 pb-2 flex flex-row items-start justify-between">
          <div className="flex-1">
            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Receipt className="text-green-600" size={24} />
              Post-Sale Transaction Report
            </DialogTitle>
            <DialogDescription>
              Summary of transactions leading up to this sale ({new Date(report.sale.date).toLocaleDateString()})
            </DialogDescription>
          </div>
          <div className="flex items-center gap-2 mt-1 no-print">
            <button 
              onClick={handleDownload}
              className="p-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
              title="Download CSV"
            >
              <Download size={16} />
            </button>
            <button 
              onClick={handlePrint}
              className="p-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
              title="Print Report"
            >
              <Printer size={16} />
            </button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-10 print-content">
          <div className="space-y-8 py-8">
            {/* Header - Matching Image Style */}
            <div className="text-center space-y-1 pb-4">
              <h2 className="text-xl md:text-2xl font-black text-gray-900 uppercase tracking-tight">
                {company?.name || "Coffee Management"}
              </h2>
              {company?.location && (
                <p className="text-sm text-gray-700 font-medium">{company.location}</p>
              )}
              {company?.phone && (
                <p className="text-xs text-gray-600 font-medium">{company.phone}</p>
              )}
              {company?.email && (
                <p className="text-xs text-gray-500">Email : {company.email}</p>
              )}
              
              <div className="pt-4 pb-2">
                <div className="h-0.5 bg-gray-900 w-full mb-[1px]" />
                <div className="h-[0.5px] bg-gray-400 w-full" />
              </div>

              <h3 className="text-lg font-bold text-gray-900 uppercase tracking-wide py-1">
                BATCH SALE REPORT ({report.sale.coffee_type})
              </h3>
            </div>

            {/* Batch Info */}
            <div className="grid grid-cols-2 gap-4 border-y border-gray-100 py-6">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-gray-400 mb-1">Batch Reference</span>
                <span className="font-mono text-[11px] font-bold text-gray-900">{report.sale.id.slice(0, 13).toUpperCase()}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] uppercase font-bold text-gray-400 mb-1">Date Generated</span>
                <span className="font-bold text-gray-900">{new Date(report.sale.created_at || report.sale.date || new Date()).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Summary Grid - Adjusted for long UGX numbers */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100 flex flex-col items-center justify-center">
                <div className="text-[10px] uppercase font-bold text-gray-500 mb-1">Total Input</div>
                <div className="text-[15px] font-bold text-gray-900 tabular-nums">
                  {((report.summary.totalKibokoWeight || 0) + (report.summary.totalRedWeight || 0) + (report.summary.totalKaseWeight || 0)).toFixed(1)} <span className="text-[10px] font-normal">kg</span>
                </div>
              </div>
              <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100 flex flex-col items-center justify-center">
                <div className="text-[10px] uppercase font-bold text-gray-500 mb-1">Conversion</div>
                <div className="text-[15px] font-bold text-blue-600 tabular-nums">
                  {((report.summary.conversionEfficiency || 0) * 100).toFixed(1)}%
                </div>
              </div>
              <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100 flex flex-col items-center justify-center">
                <div className="text-[10px] uppercase font-bold text-gray-500 mb-1">Total Cost</div>
                <div className="text-[15px] font-bold text-red-600 tabular-nums">
                  {Math.round(totalCost).toLocaleString()}
                </div>
              </div>
              <div className="bg-green-50/50 p-3 rounded-xl border border-green-100 flex flex-col items-center justify-center">
                <div className="text-[10px] uppercase font-bold text-green-600 mb-1">Gross Profit</div>
                <div className="text-[15px] font-bold text-green-700 tabular-nums">
                  {Math.round(grossProfit).toLocaleString()}
                </div>
              </div>
              <div className="bg-green-100 p-3 rounded-xl border border-green-200 col-span-2 sm:col-span-1 flex flex-col items-center justify-center">
                <div className="text-[10px] uppercase font-bold text-green-700 mb-1">Net Profit</div>
                <div className="text-[15px] font-bold text-green-900 tabular-nums">
                  {Math.round(netProfit).toLocaleString()}
                </div>
              </div>
            </div>

            <Separator />

            {/* Purchases breakdown */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center justify-between">
                <span>Recent Purchases</span>
                <Badge variant="outline" className="font-medium text-[10px] no-print">
                  {report.purchases.length} records
                </Badge>
              </h3>
              <div className="space-y-2">
                {report.purchases.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-2">No purchases in this batch.</p>
                ) : report.purchases.map(p => (
                    <div className="flex flex-col flex-1">
                      <div className="flex justify-between items-center text-[10px] uppercase font-bold text-gray-400 mb-1">
                        <span>Farmer</span>
                        <span className="text-gray-900 normal-case">{(p as any).farmers?.name || 'Unknown Farmer'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">{p.date}</span>
                        <div className="text-right">
                          <span className="font-bold text-gray-700">{p.payable_weight.toFixed(1)} kg</span>
                          <span className="text-[10px] text-gray-400 ml-2 uppercase">{p.coffee_type}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center mt-1 border-t border-gray-50 pt-1">
                        <span className="text-[10px] text-gray-400 uppercase font-medium">Total Amount</span>
                        <span className="font-bold text-gray-900">
                          {Math.round(p.total_amount).toLocaleString()} UGX
                        </span>
                      </div>
                    </div>
                ))}
              </div>
            </div>

            {/* Expenses breakdown */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center justify-between">
                <span>Batch Expenses</span>
                <Badge variant="outline" className="font-medium text-[10px] no-print">
                  {report.expenses.length} records
                </Badge>
              </h3>
              <div className="space-y-2">
                {report.expenses.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-2">No expenses recorded for this batch.</p>
                ) : report.expenses.map(e => (
                  <div key={e.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-orange-50/30 border border-orange-100/50">
                    <div className="flex flex-col">
                      <span className="font-semibold text-gray-800">{e.type}</span>
                      <span className="text-[10px] text-gray-400">{e.date}</span>
                    </div>
                    <div className="font-bold text-red-700">
                      {Math.round(e.amount).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end no-print">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-[#14532D] text-white rounded-xl font-bold text-sm hover:opacity-90 transition-opacity"
          >
            Done
          </button>
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page { 
              margin: 10mm; 
              size: A4; 
            }
            body > * { display: none !important; }
            body > [data-radix-portal] { display: block !important; position: static !important; }
            
            [data-slot="dialog-overlay"] { display: none !important; }
            
            [data-slot="dialog-content"], .printable-modal {
              display: block !important;
              position: static !important;
              visibility: visible !important;
              width: 100% !important;
              max-width: none !important;
              height: auto !important;
              max-height: none !important;
              margin: 0 !important;
              padding: 0 !important;
              transform: none !important;
              border: none !important;
              box-shadow: none !important;
              background: white !important;
              left: unset !important;
              top: unset !important;
            }

            .no-print, [data-slot="dialog-close"] { 
              display: none !important; 
            }

            * {
              overflow: visible !important;
              max-height: none !important;
              color: #000 !important;
            }

            .print-content { 
              padding: 0 !important;
              width: 100% !important;
              height: auto !important;
              overflow: visible !important;
            }
          }
        `}} />
      </DialogContent>
    </Dialog>
  );
}

import React, { useState, useEffect } from "react";
import { Layout } from "../components/Layout";
import { useNavigate } from "react-router";
import {
  Tag, CheckCircle, AlertTriangle, TrendingUp, TrendingDown,
  Minus, Clock, Edit3, Save, X, History, Info, ChevronDown, ChevronUp, Loader2, Share2
} from "lucide-react";
import { SharePricesModal } from "../components/SharePricesModal";
import { pricesService, BuyingPrice } from "../services/pricesService";
import { useAuth, getEffectiveAdminId } from "../hooks/useAuth";
import { getEATDateString } from "../utils/dateUtils";

function formatUGX(v: number) {
  return `UGX ${Math.round(v).toLocaleString()}`;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-UG", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function PriceChange({ current, previous, label }: { current: number; previous: number | null; label: string }) {
  if (previous === null) return <span style={{ color: "#9CA3AF", fontSize: "11px" }}>—</span>;
  const diff = current - previous;
  const pct = ((diff / previous) * 100).toFixed(1);
  if (diff === 0) return (
    <div className="flex items-center gap-1">
      <Minus size={11} color="#9CA3AF" />
      <span style={{ fontSize: "11px", color: "#9CA3AF" }}>No change</span>
    </div>
  );
  const up = diff > 0;
  return (
    <div className="flex items-center gap-1">
      {up ? <TrendingUp size={11} color="#16A34A" /> : <TrendingDown size={11} color="#DC2626" />}
      <span style={{ fontSize: "11px", fontWeight: 600, color: up ? "#16A34A" : "#DC2626" }}>
        {up ? "+" : ""}{diff.toLocaleString()} ({up ? "+" : ""}{pct}%)
      </span>
    </div>
  );
}

function TablePriceChange({ current, previous }: { current: number; previous: number | null }) {
  if (previous === null) return <span style={{ fontSize: "11px", color: "#9CA3AF" }}>—</span>;
  const diff = current - previous;
  if (diff === 0) return <span style={{ fontSize: "11px", color: "#9CA3AF" }}>—</span>;
  const up = diff > 0;
  return (
    <span style={{ fontSize: "11px", fontWeight: 600, color: up ? "#16A34A" : "#DC2626" }}>
      {up ? "+" : ""}{diff.toLocaleString()}
    </span>
  );
}

export default function PriceManagement() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [prices, setPrices] = useState<BuyingPrice[]>([]);
  const [todayEntry, setTodayEntry] = useState<BuyingPrice | null>(null);
  const [yesterdayEntry, setYesterdayEntry] = useState<BuyingPrice | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [today] = useState(() => getEATDateString());
  const [toast, setToast] = useState(false);


  const [editing, setEditing] = useState(false);
  const [kibokoInput, setKibokoInput] = useState("");
  const [redInput, setRedInput] = useState("");
  const [kaseInput, setKaseInput] = useState("");
  const [notesInput, setNotesInput] = useState("");
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const DRAFT_KEY = 'price_management_draft';

  // Load draft on mount
  useEffect(() => {
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed.kibokoInput) setKibokoInput(parsed.kibokoInput);
        if (parsed.redInput) setRedInput(parsed.redInput);
        if (parsed.kaseInput) setKaseInput(parsed.kaseInput);
        if (parsed.notesInput) setNotesInput(parsed.notesInput);
      } catch (e) {
        console.error("Failed to load draft:", e);
      }
    }
  }, []);

  // Save draft on change
  useEffect(() => {
    const draft = { kibokoInput, redInput, kaseInput, notesInput };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [kibokoInput, redInput, kaseInput, notesInput]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const adminId = getEffectiveAdminId(profile);
        if (!adminId) return;

        const [history, latest] = await Promise.all([
          pricesService.getHistory(30, adminId),
          pricesService.getLatest(adminId)
        ]);
        
        setPrices(history);
        
        const yesterdayStr = getEATDateString(-1);
        
        const latestDate = latest?.date;
        const todayPrice = history.find(p => p.date === today);
        const yesterdayPrice = history.find(p => p.date === yesterdayStr);

        setTodayEntry(todayPrice || null);
        setYesterdayEntry(yesterdayPrice || null);

        if (todayPrice) {
          setKibokoInput(String(todayPrice.kiboko_price));
          setRedInput(String(todayPrice.red_price || 0));
          setKaseInput(String(todayPrice.kase_price || 0));
          setNotesInput(todayPrice.notes || "");
        } else {
          setEditing(true);
          if (yesterdayPrice) {
            setKibokoInput(String(yesterdayPrice.kiboko_price));
            setRedInput(String(yesterdayPrice.red_price || 0));
            setKaseInput(String(yesterdayPrice.kase_price || 0));
          }
        }
      } catch (err) {
        console.error("Error fetching prices:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [today]);

  const handleEdit = () => {
    setEditing(true);
    setSaved(false);
  };

  const handleCancel = () => {
    if (todayEntry) {
      setKibokoInput(String(todayEntry.kiboko_price));
      setRedInput(String(todayEntry.red_price || 0));
      setKaseInput(String(todayEntry.kase_price || 0));
      setNotesInput(todayEntry.notes || "");
      setEditing(false);
    }
    setErrors({});
  };

  const handleSave = async () => {
    const e: Record<string, string> = {};
    const k_b = parseFloat(kibokoInput);
    const red = parseFloat(redInput);
    const k = parseFloat(kaseInput);

    if (!kibokoInput || isNaN(k_b) || k_b <= 0) e.kiboko = "Enter a valid Kiboko price";
    if (!redInput || isNaN(red) || red <= 0) e.red = "Enter a valid Red price";
    if (!kaseInput || isNaN(k) || k <= 0) e.kase = "Enter a valid Kase price";

    if (Object.keys(e).length > 0) { setErrors(e); return; }
    
    const adminId = getEffectiveAdminId(profile);
    if (!adminId) {
      setSaveError("System Error: Your user profile is missing. Please contact support or run the recovery script.");
      return;
    }

    setSaveError(null);
    try {
      setSubmitting(true);
      await pricesService.setPrices({
        date: today,
        kiboko_price: k_b,
        red_price: red,
        kase_price: k,
        notes: notesInput,
        set_by: profile?.id || null,
        admin_id: adminId,
      });

      setSaved(true);
      setEditing(false);
      localStorage.removeItem(DRAFT_KEY);
      setTimeout(() => setSaved(false), 3000);
      
      // Refresh history
      const history = await pricesService.getHistory(30, adminId!);
      setPrices(history);
      setTodayEntry(history.find(p => p.date === today) || null);
    } catch (err: any) {
      console.error("Error saving prices:", err);
      setSaveError(err?.message || "Failed to save prices. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputBase = (field: string) =>
    `w-full px-3.5 py-2.5 rounded-xl border transition-all outline-none ${
      errors[field] ? "border-red-400 bg-red-50" : "border-gray-200 bg-white"
    } focus:border-[#14532D] focus:ring-2 focus:ring-[#14532D]/10`;

  const kibokoChange = todayEntry && yesterdayEntry ? todayEntry.kiboko_price - yesterdayEntry.kiboko_price : null;

  // Build history with deltas
  const historyWithDelta = prices.map((entry, idx) => {
    const prev = prices[idx + 1] ?? null;
    return { entry, prev };
  });

  if (loading) {
    return (
      <Layout breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Price Management" }]}>
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-green-700 animate-spin mb-4" />
          <p className="text-gray-500 font-medium">Loading price data...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Price Management" }]}>

      {/* Saved toast */}
      {saved && (
        <div className="fixed bottom-6 right-6 flex items-center gap-3 px-5 py-4 rounded-xl shadow-xl z-50"
          style={{ backgroundColor: "#14532D", color: "#fff", fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 500 }}>
          <CheckCircle size={18} color="#86efac" />
          Today's prices updated successfully!
        </div>
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ fontFamily: "Inter, sans-serif", fontSize: "22px", fontWeight: 700, color: "#111827" }}>Price Management</h1>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#6B7280", marginTop: "2px" }}>
            Set and manage daily buying prices for Kiboko, Red, and Kase coffee
          </p>
        </div>
        <div className="flex items-center gap-2">
          {todayEntry ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0" }}>
              <CheckCircle size={13} color="#16A34A" />
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 500, color: "#14532D" }}>
                Prices set for today
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ backgroundColor: "#fff7ed", border: "1px solid #fed7aa" }}>
              <AlertTriangle size={13} color="#F59E0B" />
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 500, color: "#92400e" }}>
                No prices set for today
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-5">
        {/* Left Column */}
        <div className="flex-1 space-y-5">

          {/* Today's Status Card */}
          <div className="bg-white rounded-xl p-6" style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.05)", border: "1px solid #F1F5F9" }}>
            <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-gray-100">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#f0fdf4" }}>
                <Tag size={15} color="#14532D" />
              </div>
              <div className="flex-1">
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: "15px", fontWeight: 600, color: "#111827" }}>
                  Today's Active Prices
                </div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#6B7280" }}>
                  {formatDate(today)}
                </div>
              </div>
              {todayEntry && (
                <div className="flex items-center gap-1.5" style={{ color: "#6B7280" }}>
                  <Clock size={12} />
                   <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px" }}>
                    Last set at {new Date(todayEntry.set_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
            </div>

            {todayEntry && !editing ? (
              /* Display mode */
              <div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {/* Kiboko Price */}
                  <div className="p-4 rounded-xl" style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#14532D" }} />
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Kiboko
                      </span>
                    </div>
                     <div style={{ fontFamily: "Inter, sans-serif", fontSize: "24px", fontWeight: 700, color: "#14532D" }}>
                      {formatUGX(todayEntry.kiboko_price)}
                    </div>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#16A34A", marginBottom: "8px" }}>per kilogram</div>
                    <PriceChange current={todayEntry.kiboko_price} previous={yesterdayEntry?.kiboko_price ?? null} label="vs yesterday" />
                  </div>

                  {/* Red Price */}
                  <div className="p-4 rounded-xl" style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#DC2626" }} />
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Red
                      </span>
                    </div>
                     <div style={{ fontFamily: "Inter, sans-serif", fontSize: "24px", fontWeight: 700, color: "#DC2626" }}>
                      {formatUGX(todayEntry.red_price)}
                    </div>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#991b1b", marginBottom: "8px" }}>per kilogram</div>
                    <PriceChange current={todayEntry.red_price} previous={yesterdayEntry?.red_price ?? null} label="vs yesterday" />
                  </div>

                  {/* Kase Price */}
                  <div className="p-4 rounded-xl" style={{ backgroundColor: "#fdf4ff", border: "1px solid #f5d0fe" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#A855F7" }} />
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Kase
                      </span>
                    </div>
                     <div style={{ fontFamily: "Inter, sans-serif", fontSize: "24px", fontWeight: 700, color: "#A855F7" }}>
                      {formatUGX(todayEntry.kase_price)}
                    </div>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#701a75", marginBottom: "8px" }}>per kilogram</div>
                    <PriceChange current={todayEntry.kase_price} previous={yesterdayEntry?.kase_price ?? null} label="vs yesterday" />
                  </div>
                </div>

                {todayEntry.notes && (
                  <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg mb-4" style={{ backgroundColor: "#F8FAFC", border: "1px solid #F1F5F9" }}>
                    <Info size={13} color="#6B7280" style={{ marginTop: "2px", flexShrink: 0 }} />
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#6B7280" }}>{todayEntry.notes}</span>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all hover:opacity-90"
                    style={{ backgroundColor: "#14532D", color: "#fff", fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600 }}
                  >
                    <Share2 size={15} />
                    Share Prices
                  </button>
                  <button
                    onClick={handleEdit}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all hover:bg-gray-50 border border-gray-200"
                    style={{ color: "#374151", fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600 }}
                  >
                    <Edit3 size={14} />
                    Edit
                  </button>
                </div>
              </div>

            ) : (
              /* Edit / Set mode */
              <div>
                {!todayEntry && (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl mb-5" style={{ backgroundColor: "#fff7ed", border: "1px solid #fed7aa" }}>
                    <AlertTriangle size={14} color="#F59E0B" />
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#92400e" }}>
                      Prices have not been set for today. Purchases will be blocked until you set today's prices.
                    </span>
                  </div>
                )}

                {/* Reference from yesterday */}
                {yesterdayEntry && (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-5" style={{ backgroundColor: "#F8FAFC", border: "1px solid #F1F5F9" }}>
                    <History size={13} color="#6B7280" />
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#6B7280" }}>
                      Yesterday's prices:&nbsp;
                       <strong style={{ color: "#14532D" }}>Kiboko {formatUGX(yesterdayEntry.kiboko_price)}</strong>
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Kiboko Input */}
                  <div>
                    <label style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "6px" }}>
                      Kiboko Price (UGX/kg) <span style={{ color: "#DC2626" }}>*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#9CA3AF" }}>UGX</span>
                      <input
                        type="number"
                        min="1"
                        value={kibokoInput}
                        onChange={e => setKibokoInput(e.target.value)}
                        placeholder="e.g. 5400"
                        className={inputBase("kiboko")}
                        style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 600, color: "#14532D", paddingLeft: "52px" }}
                      />
                    </div>
                    {errors.kiboko && <p style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#DC2626", marginTop: "4px" }}>{errors.kiboko}</p>}
                     {kibokoInput && yesterdayEntry && (
                      <div className="mt-1.5">
                        <PriceChange current={parseFloat(kibokoInput) || 0} previous={yesterdayEntry.kiboko_price} label="vs yesterday" />
                      </div>
                    )}
                  </div>

                  {/* Red Input */}
                  <div>
                    <label style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "6px" }}>
                      Red Price (UGX/kg) <span style={{ color: "#DC2626" }}>*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#9CA3AF" }}>UGX</span>
                      <input
                        type="number"
                        min="1"
                        value={redInput}
                        onChange={e => setRedInput(e.target.value)}
                        placeholder="e.g. 4800"
                        className={inputBase("red")}
                        style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 600, color: "#DC2626", paddingLeft: "52px" }}
                      />
                    </div>
                    {errors.red && <p style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#DC2626", marginTop: "4px" }}>{errors.red}</p>}
                     {redInput && yesterdayEntry && (
                      <div className="mt-1.5">
                        <PriceChange current={parseFloat(redInput) || 0} previous={yesterdayEntry.red_price || 0} label="vs yesterday" />
                      </div>
                    )}
                  </div>

                  {/* Kase Input */}
                  <div>
                    <label style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "6px" }}>
                      Kase Price (UGX/kg) <span style={{ color: "#DC2626" }}>*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#9CA3AF" }}>UGX</span>
                      <input
                        type="number"
                        min="1"
                        value={kaseInput}
                        onChange={e => setKaseInput(e.target.value)}
                        placeholder="e.g. 3200"
                        className={inputBase("kase")}
                        style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 600, color: "#A855F7", paddingLeft: "52px" }}
                      />
                    </div>
                    {errors.kase && <p style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#DC2626", marginTop: "4px" }}>{errors.kase}</p>}
                     {kaseInput && yesterdayEntry && (
                      <div className="mt-1.5">
                        <PriceChange current={parseFloat(kaseInput) || 0} previous={yesterdayEntry.kase_price || 0} label="vs yesterday" />
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  <div className="md:col-span-2">
                    <label style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "6px" }}>
                      Reason / Notes <span style={{ color: "#9CA3AF" }}>(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={notesInput}
                      onChange={e => setNotesInput(e.target.value)}
                      placeholder="e.g. UCE market rate, seasonal adjustment..."
                      className={inputBase("")}
                      style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#374151" }}
                    />
                  </div>
                </div>

                {saveError && (
                  <div className="flex items-start gap-2 px-4 py-3 rounded-xl mb-3" style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}>
                    <AlertTriangle size={15} color="#DC2626" style={{ marginTop: "1px", flexShrink: 0 }} />
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#991b1b" }}>{saveError}</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                   <button
                    onClick={handleSave}
                    disabled={submitting}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: "#14532D", color: "#fff", fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600 }}
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={14} />}
                    {todayEntry ? "Update Today's Prices" : "Set Today's Prices"}
                  </button>
                  {todayEntry && (
                    <button
                      onClick={handleCancel}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 transition-all hover:bg-gray-50"
                      style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#6B7280" }}
                    >
                      <X size={14} />
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Price History Table */}
          <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.05)", border: "1px solid #F1F5F9" }}>
            <button
              className="w-full flex items-center justify-between px-6 py-4 border-b border-gray-100"
              onClick={() => setShowHistory(!showHistory)}
            >
              <div className="flex items-center gap-2">
                <History size={15} color="#6B7280" />
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: "15px", fontWeight: 600, color: "#111827" }}>Price History</span>
                <span className="px-2 py-0.5 rounded-full" style={{ backgroundColor: "#F1F5F9", fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 500, color: "#6B7280" }}>
                  {prices.length} days
                </span>
              </div>
              {showHistory ? <ChevronUp size={16} color="#9CA3AF" /> : <ChevronDown size={16} color="#9CA3AF" />}
            </button>

            {showHistory && (
              <>
                {/* Desktop View */}
                <div className="hidden lg:block overflow-x-auto max-h-[600px]">
                  <table className="w-full relative">
                    <thead className="sticky top-0 z-10">
                      <tr style={{ backgroundColor: "#F8FAFC" }}>
                        {["Date", "Kiboko (UGX)", "Δ Kiboko", "Red (UGX)", "Δ Red", "Kase (UGX)", "Δ Kase", "Set By", "Time", "Notes"].map(h => (
                          <th key={h} className="px-4 py-3 text-left" style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {historyWithDelta.map(({ entry, prev }, i) => {
                        const isToday = entry.date === today;
                        return (
                          <tr key={entry.id} className="border-t border-gray-50 hover:bg-gray-50 transition-colors" style={{ backgroundColor: isToday ? "#f0fdf4" : undefined }}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div>
                                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: isToday ? 600 : 400, color: "#111827" }}>
                                    {formatDate(entry.date)}
                                  </div>
                                  {isToday && (
                                    <span className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: "#14532D", color: "#fff", fontFamily: "Inter", fontSize: "10px", fontWeight: 600 }}>
                                      TODAY
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                             <td className="px-4 py-3">
                              <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600, color: "#14532D" }}>
                                {entry.kiboko_price.toLocaleString()}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <TablePriceChange current={entry.kiboko_price} previous={prev?.kiboko_price ?? null} />
                            </td>
                             <td className="px-4 py-3">
                              <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600, color: "#DC2626" }}>
                                {entry.red_price.toLocaleString()}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <TablePriceChange current={entry.red_price} previous={prev?.red_price ?? null} />
                            </td>
                             <td className="px-4 py-3">
                              <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600, color: "#A855F7" }}>
                                {entry.kase_price.toLocaleString()}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <TablePriceChange current={entry.kase_price} previous={prev?.kase_price ?? null} />
                            </td>
                             <td className="px-4 py-3" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#374151" }}>
                              {entry.profiles?.full_name || "System"}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <Clock size={11} color="#9CA3AF" />
                                <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#6B7280" }}>{new Date(entry.set_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#9CA3AF", maxWidth: "160px" }}>
                              {entry.notes || "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View */}
                <div className="lg:hidden flex flex-col divide-y divide-gray-50">
                  {historyWithDelta.map(({ entry, prev }) => {
                    const isToday = entry.date === today;
                    return (
                      <div key={entry.id} className="p-4 flex flex-col gap-3 hover:bg-gray-50 transition-colors" style={{ backgroundColor: isToday ? "#f0fdf4" : undefined }}>
                        <div className="flex justify-between items-start">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <div style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: isToday ? 700 : 600, color: isToday ? "#14532D" : "#111827" }}>
                                {formatDate(entry.date)}
                              </div>
                              {isToday && (
                                <span className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: "#14532D", color: "#fff", fontFamily: "Inter", fontSize: "10px", fontWeight: 600 }}>TODAY</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                              <Clock size={11} color="#9CA3AF" />
                              <span style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#6B7280" }}>
                                {new Date(entry.set_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {entry.profiles?.full_name || "System"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-1 bg-white p-3 rounded-xl border border-gray-100">
                          <div>
                            <div style={{ fontFamily: "Inter", fontSize: "10px", color: "#9CA3AF", textTransform: "uppercase", fontWeight: 600, marginBottom: "2px" }}>Kiboko</div>
                            <div className="flex items-baseline gap-2">
                              <span style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 600, color: "#14532D" }}>{entry.kiboko_price.toLocaleString()}</span>
                              <TablePriceChange current={entry.kiboko_price} previous={prev?.kiboko_price ?? null} />
                            </div>
                          </div>
                          <div>
                            <div style={{ fontFamily: "Inter", fontSize: "10px", color: "#9CA3AF", textTransform: "uppercase", fontWeight: 600, marginBottom: "2px" }}>Red</div>
                            <div className="flex items-baseline gap-2">
                              <span style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 600, color: "#DC2626" }}>{entry.red_price?.toLocaleString() ?? '—'}</span>
                              <TablePriceChange current={entry.red_price} previous={prev?.red_price ?? null} />
                            </div>
                          </div>
                          <div>
                            <div style={{ fontFamily: "Inter", fontSize: "10px", color: "#9CA3AF", textTransform: "uppercase", fontWeight: 600, marginBottom: "2px" }}>Kase</div>
                            <div className="flex items-baseline gap-2">
                              <span style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 600, color: "#A855F7" }}>{entry.kase_price?.toLocaleString() ?? '—'}</span>
                              <TablePriceChange current={entry.kase_price} previous={prev?.kase_price ?? null} />
                            </div>
                          </div>
                          {entry.notes && (
                            <div className="col-span-2 pt-2 border-t border-gray-50 flex items-start gap-1.5">
                              <Info size={12} color="#9CA3AF" style={{ marginTop: "2px", flexShrink: 0 }} />
                              <span style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#6B7280", lineHeight: "1.4" }}>{entry.notes}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right: Summary Sidebar */}
        <div className="xl:w-72 flex-shrink-0 space-y-4">

          {/* 14-Day Range Summary */}
          <div className="bg-white rounded-xl p-5" style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.05)", border: "1px solid #F1F5F9" }}>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 600, color: "#111827", marginBottom: "12px" }}>
              14-Day Price Range
            </div>
             {(["kiboko_price", "red_price", "kase_price"] as const).map(type => {
              const vals = prices.map(p => Number(p[type])).filter(v => !isNaN(v));
              if (vals.length === 0) return null;
              const min = Math.min(...vals);
              const max = Math.max(...vals);
              const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
              const current = todayEntry?.[type] ?? prices[0]?.[type];
              
              const label = type === 'kiboko_price' ? "Kiboko" : type === 'red_price' ? "Red" : "Kase";
              const color = type === 'kiboko_price' ? "#14532D" : type === 'red_price' ? "#DC2626" : "#A855F7";
              const bg = type === 'kiboko_price' ? "#f0fdf4" : type === 'red_price' ? "#fef2f2" : "#fdf4ff";
              
              return (
                <div key={type} className="mb-4 last:mb-0 p-4 rounded-xl" style={{ backgroundColor: bg }}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600, color }}>
                      {label}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {[
                      { label: "Today", value: current ? formatUGX(current) : "—", bold: true },
                      { label: "14-day High", value: formatUGX(max) },
                      { label: "14-day Low", value: formatUGX(min) },
                      { label: "14-day Avg", value: formatUGX(avg) },
                    ].map(row => (
                      <div key={row.label} className="flex justify-between items-center">
                        <span style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#6B7280" }}>{row.label}</span>
                        <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: row.bold ? 700 : 500, color: row.bold ? color : "#374151" }}>
                          {row.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Guide Card */}
          <div className="rounded-xl p-5" style={{ backgroundColor: "#14532D" }}>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600, color: "#fff", marginBottom: "8px" }}>
              Pricing Guidelines
            </div>
            <div className="space-y-2">
              {[
                "Set prices before 8:00 AM daily",
                "Prices are locked once a purchase is recorded",
                "Historical prices cannot be edited",
                "Add a reason when prices change by >5%",
              ].map((tip, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: "#86efac" }} />
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#a7f3d0" }}>{tip}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <SharePricesModal 
        isOpen={showShareModal} 
        onClose={() => setShowShareModal(false)}
        prices={todayEntry}
        dateStr={today}
      />
    </Layout>
  );
}


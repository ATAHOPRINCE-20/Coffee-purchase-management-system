import React, { useState, useEffect } from "react";
import { Layout } from "../components/Layout";
import { useNavigate } from "react-router";
import {
  Tag, CheckCircle, AlertTriangle, TrendingUp, TrendingDown,
  Minus, Clock, Edit3, Save, X, History, Info, ChevronDown, ChevronUp, Loader2
} from "lucide-react";
import { pricesService, BuyingPrice } from "../services/pricesService";
import { useAuth } from "../hooks/useAuth";

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
  const [today] = useState(() => new Date().toISOString().split("T")[0]);


  const [editing, setEditing] = useState(false);
  const [robustaInput, setRobustaInput] = useState("");
  const [arabicaInput, setArabicaInput] = useState("");
  const [redInput, setRedInput] = useState("");
  const [kaseInput, setKaseInput] = useState("");
  const [notesInput, setNotesInput] = useState("");
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showHistory, setShowHistory] = useState(true);

  useEffect(() => {
    async function fetchPrices() {
      try {
        setLoading(true);
        const history = await pricesService.getHistory(30);
        setPrices(history);
        
        const todayPrice = history.find(p => p.date === today);
        const yesterdayDate = new Date();
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterdayStr = yesterdayDate.toISOString().split('T')[0];
        const yesterdayPrice = history.find(p => p.date === yesterdayStr);

        setTodayEntry(todayPrice || null);
        setYesterdayEntry(yesterdayPrice || null);

        if (todayPrice) {
          setRobustaInput(String(todayPrice.robusta_price));
          setArabicaInput(String(todayPrice.arabica_price));
          setRedInput(String(todayPrice.red_price || 0));
          setKaseInput(String(todayPrice.kase_price || 0));
          setNotesInput(todayPrice.notes || "");
        } else {
          setEditing(true);
          if (yesterdayPrice) {
            setRobustaInput(String(yesterdayPrice.robusta_price));
            setArabicaInput(String(yesterdayPrice.arabica_price));
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
    fetchPrices();
  }, [today]);

  const handleEdit = () => {
    setEditing(true);
    setSaved(false);
  };

  const handleCancel = () => {
    if (todayEntry) {
      setRobustaInput(String(todayEntry.robusta_price));
      setArabicaInput(String(todayEntry.arabica_price));
      setRedInput(String(todayEntry.red_price || 0));
      setKaseInput(String(todayEntry.kase_price || 0));
      setNotesInput(todayEntry.notes || "");
      setEditing(false);
    }
    setErrors({});
  };

  const handleSave = async () => {
    const e: Record<string, string> = {};
    const r = parseFloat(robustaInput);
    const a = parseFloat(arabicaInput);
    const red = parseFloat(redInput);
    const k = parseFloat(kaseInput);

    if (!robustaInput || isNaN(r) || r <= 0) e.robusta = "Enter a valid Robusta price";
    if (!arabicaInput || isNaN(a) || a <= 0) e.arabica = "Enter a valid Arabica price";
    if (!redInput || isNaN(red) || red <= 0) e.red = "Enter a valid Red price";
    if (!kaseInput || isNaN(k) || k <= 0) e.kase = "Enter a valid Kase price";

    if (Object.keys(e).length > 0) { setErrors(e); return; }
    
    try {
      setSubmitting(true);
      await pricesService.setPrices({
        date: today,
        robusta_price: r,
        arabica_price: a,
        red_price: red,
        kase_price: k,
        notes: notesInput,
        set_by: profile?.id || null
      });

      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 3000);
      
      // Refresh history
      const history = await pricesService.getHistory(30);
      setPrices(history);
      setTodayEntry(history.find(p => p.date === today) || null);
    } catch (err: any) {
      console.error("Error saving prices:", err);
      // Optional: Set a toast error
    } finally {
      setSubmitting(false);
    }
  };

  const inputBase = (field: string) =>
    `w-full px-3.5 py-2.5 rounded-xl border transition-all outline-none ${
      errors[field] ? "border-red-400 bg-red-50" : "border-gray-200 bg-white"
    } focus:border-[#14532D] focus:ring-2 focus:ring-[#14532D]/10`;

  const robustaChange = todayEntry && yesterdayEntry ? todayEntry.robusta_price - yesterdayEntry.robusta_price : null;
  const arabicaChange = todayEntry && yesterdayEntry ? todayEntry.arabica_price - yesterdayEntry.arabica_price : null;

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
            Set and manage daily buying prices for Robusta and Arabica coffee
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
                  {/* Robusta Price */}
                  <div className="p-4 rounded-xl" style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#14532D" }} />
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Robusta
                      </span>
                    </div>
                     <div style={{ fontFamily: "Inter, sans-serif", fontSize: "24px", fontWeight: 700, color: "#14532D" }}>
                      {formatUGX(todayEntry.robusta_price)}
                    </div>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#16A34A", marginBottom: "8px" }}>per kilogram</div>
                    <PriceChange current={todayEntry.robusta_price} previous={yesterdayEntry?.robusta_price ?? null} label="vs yesterday" />
                  </div>

                  {/* Arabica Price */}
                  <div className="p-4 rounded-xl" style={{ backgroundColor: "#fdf6f3", border: "1px solid #e8d5cc" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#6F4E37" }} />
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Arabica
                      </span>
                    </div>
                     <div style={{ fontFamily: "Inter, sans-serif", fontSize: "24px", fontWeight: 700, color: "#6F4E37" }}>
                      {formatUGX(todayEntry.arabica_price)}
                    </div>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#92400e", marginBottom: "8px" }}>per kilogram</div>
                    <PriceChange current={todayEntry.arabica_price} previous={yesterdayEntry?.arabica_price ?? null} label="vs yesterday" />
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

                <button
                  onClick={handleEdit}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all hover:opacity-90"
                  style={{ backgroundColor: "#14532D", color: "#fff", fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600 }}
                >
                  <Edit3 size={14} />
                  Update Today's Prices
                </button>
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
                       <strong style={{ color: "#14532D" }}>Robusta {formatUGX(yesterdayEntry.robusta_price)}</strong>
                      &nbsp;·&nbsp;
                      <strong style={{ color: "#6F4E37" }}>Arabica {formatUGX(yesterdayEntry.arabica_price)}</strong>
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Robusta Input */}
                  <div>
                    <label style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "6px" }}>
                      Robusta Price (UGX/kg) <span style={{ color: "#DC2626" }}>*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#9CA3AF" }}>UGX</span>
                      <input
                        type="number"
                        min="1"
                        value={robustaInput}
                        onChange={e => setRobustaInput(e.target.value)}
                        placeholder="e.g. 5400"
                        className={inputBase("robusta")}
                        style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 600, color: "#14532D", paddingLeft: "52px" }}
                      />
                    </div>
                    {errors.robusta && <p style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#DC2626", marginTop: "4px" }}>{errors.robusta}</p>}
                     {robustaInput && yesterdayEntry && (
                      <div className="mt-1.5">
                        <PriceChange current={parseFloat(robustaInput) || 0} previous={yesterdayEntry.robusta_price} label="vs yesterday" />
                      </div>
                    )}
                  </div>

                  {/* Arabica Input */}
                  <div>
                    <label style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "6px" }}>
                      Arabica Price (UGX/kg) <span style={{ color: "#DC2626" }}>*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#9CA3AF" }}>UGX</span>
                      <input
                        type="number"
                        min="1"
                        value={arabicaInput}
                        onChange={e => setArabicaInput(e.target.value)}
                        placeholder="e.g. 7100"
                        className={inputBase("arabica")}
                        style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 600, color: "#6F4E37", paddingLeft: "52px" }}
                      />
                    </div>
                    {errors.arabica && <p style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#DC2626", marginTop: "4px" }}>{errors.arabica}</p>}
                     {arabicaInput && yesterdayEntry && (
                      <div className="mt-1.5">
                        <PriceChange current={parseFloat(arabicaInput) || 0} previous={yesterdayEntry.arabica_price} label="vs yesterday" />
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
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ backgroundColor: "#F8FAFC" }}>
                      {["Date", "Robusta (UGX)", "Δ Robusta", "Arabica (UGX)", "Δ Arabica", "Set By", "Time", "Notes"].map(h => (
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
                              {entry.robusta_price.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <TablePriceChange current={entry.robusta_price} previous={prev?.robusta_price ?? null} />
                          </td>
                          <td className="px-4 py-3">
                            <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600, color: "#6F4E37" }}>
                              {entry.arabica_price.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <TablePriceChange current={entry.arabica_price} previous={prev?.arabica_price ?? null} />
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
             {(["robusta_price", "arabica_price"] as const).map(type => {
              const vals = prices.map(p => Number(p[type]));
              const min = Math.min(...vals);
              const max = Math.max(...vals);
              const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
              const current = todayEntry?.[type] ?? prices[0]?.[type];
              const label = type === "robusta_price" ? "Robusta" : "Arabica";
              const color = type === "robusta_price" ? "#14532D" : "#6F4E37";
              const bg = type === "robusta_price" ? "#f0fdf4" : "#fdf6f3";
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
                "Arabica is always priced higher than Robusta",
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
    </Layout>
  );
}

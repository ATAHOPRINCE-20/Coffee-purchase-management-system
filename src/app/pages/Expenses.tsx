import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Layout } from "../components/Layout";
import {
  Receipt, Plus, Trash2, Loader2, AlertCircle, Check,
  TrendingDown, Wallet, DollarSign
} from "lucide-react";
import { expensesService, Expense, COST_TYPES, GENERAL_TYPES } from "../services/expensesService";
import { seasonsService, Season } from "../services/seasonsService";
import { useAuth, getEffectiveAdminId } from "../hooks/useAuth";
import { getEATDateString } from "../utils/dateUtils";

const formatUGX = (v: number) => `UGX ${Math.round(v).toLocaleString()}`;

type Tab = "all" | "cost" | "general";

function StatCard({ label, value, icon: Icon, color, bgColor }: {
  label: string; value: string; icon: any; color: string; bgColor: string;
}) {
  return (
    <div className="bg-white rounded-xl p-5 flex items-center gap-4" style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.05)", border: "1px solid #F1F5F9" }}>
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: bgColor }}>
        <Icon size={20} color={color} />
      </div>
      <div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 500, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: "18px", fontWeight: 700, color: "#111827" }}>{value}</div>
      </div>
    </div>
  );
}

export default function Expenses() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "Admin" || profile?.role === "Super Admin" || profile?.role === "Field Agent";

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [activeSeason, setActiveSeason] = useState<Season | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("all");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [sales, setSales] = useState<any[]>([]);
  const [selectedSaleId, setSelectedSaleId] = useState<string>("");
  const [lastSaleDate, setLastSaleDate] = useState<string>("1970-01-01T00:00:00Z");
  const [showBatchOnly, setShowBatchOnly] = useState(true);

  // Form state
  const [category, setCategory] = useState<"cost" | "general">("cost");
  const [expType, setExpType] = useState<string>(COST_TYPES[0]);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => getEATDateString());
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const DRAFT_KEY = 'expenses_form_draft';

  // Load draft on mount
  useEffect(() => {
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        setCategory(parsed.category || "cost");
        setExpType(parsed.expType || "");
        setAmount(parsed.amount || "");
        setDate(parsed.date || getEATDateString());
        setNotes(parsed.notes || "");
        setSelectedSaleId(parsed.selectedSaleId || "");
      } catch (e) {
        console.error("Failed to load draft:", e);
      }
    }
  }, []);

  // Save draft on change
  useEffect(() => {
    const draft = { category, expType, amount, date, notes, selectedSaleId };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [category, expType, amount, date, notes, selectedSaleId]);

  const typeOptions = category === "cost" ? COST_TYPES : GENERAL_TYPES;

  useEffect(() => {
    // Reset type to first option when category changes, 
    // but only if current type is not valid for new category
    const options = category === "cost" ? COST_TYPES : GENERAL_TYPES;
    if (!(options as readonly string[]).includes(expType)) {
      setExpType(options[0]);
    }
  }, [category, expType]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const adminId = getEffectiveAdminId(profile);
      if (!adminId) return;
      const [data, season, salesData, latestSale] = await Promise.all([
        expensesService.getAll(adminId),
        seasonsService.getActive(adminId),
        supabase.from('sales').select('id, coffee_type, date, total_amount').order('date', { ascending: false }).limit(20),
        supabase.from('sales').select('created_at').order('created_at', { ascending: false }).limit(1).maybeSingle()
      ]);
      setExpenses(data);
      setActiveSeason(season);
      setSales(salesData.data || []);
      if (latestSale.data) {
        setLastSaleDate(latestSale.data.created_at);
      }
    } catch (err: any) {
      console.error("Error loading expenses:", err);
    } finally {
      setLoading(false);
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
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) {
      setFormError("Please enter a valid amount.");
      return;
    }
    try {
      setSaving(true);
      const adminId = getEffectiveAdminId(profile);
      if (!adminId) return;
      const newExpense = await expensesService.create({
        admin_id: adminId,
        season_id: activeSeason?.id,
        category,
        type: expType,
        amount: amt,
        date,
        notes: notes.trim() || undefined,
        sale_id: selectedSaleId || undefined,
      });
      setExpenses(prev => [newExpense, ...prev]);
      setNotes("");
      setSelectedSaleId("");
      setDate(getEATDateString());
      localStorage.removeItem(DRAFT_KEY);
      showToast("Expense recorded successfully!");
    } catch (err: any) {
      setFormError(err.message || "Failed to save expense.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this expense? This cannot be undone.")) return;
    try {
      setDeletingId(id);
      await expensesService.delete(id);
      setExpenses(prev => prev.filter(e => e.id !== id));
      showToast("Expense deleted.");
    } catch (err: any) {
      showToast(err.message || "Failed to delete.", false);
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = expenses.filter(e =>
    tab === "all" ? true : e.category === tab
  );

  const batchExpenses = expenses.filter(e => !e.sale_id && new Date(e.created_at || e.date).getTime() > new Date(lastSaleDate).getTime());
  
  const displayExpenses = showBatchOnly ? batchExpenses : expenses;

  const totalCost = displayExpenses.filter(e => e.category === "cost").reduce((s, e) => s + e.amount, 0);
  const totalGeneral = displayExpenses.filter(e => e.category === "general").reduce((s, e) => s + e.amount, 0);
  const grandTotal = totalCost + totalGeneral;

  const categoryLabel = (c: string) => c === "cost" ? "Cost Expense" : "General Expense";
  const categoryColor = (c: string) => c === "cost" ? { bg: "#fef9c3", text: "#854d0e" } : { bg: "#ede9fe", text: "#6d28d9" };

  if (loading) {
    return (
      <Layout breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Expenses" }]}>
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-green-700 animate-spin mb-4" />
          <p className="text-gray-500 font-medium">Loading expenses...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Expenses" }]}>

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-6 right-6 flex items-center gap-3 px-5 py-4 rounded-xl shadow-xl z-50 transition-all"
          style={{ backgroundColor: toast.ok ? "#14532D" : "#DC2626", color: "#fff", fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 500 }}
        >
          <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
            {toast.ok ? <Check size={14} color="#fff" /> : <AlertCircle size={14} color="#fff" />}
          </div>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ fontFamily: "Inter, sans-serif", fontSize: "22px", fontWeight: 700, color: "#111827" }}>Expenses</h1>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#6B7280", marginTop: "2px" }}>
            Track operational costs and general expenses
          </p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setShowBatchOnly(true)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${showBatchOnly ? 'bg-white text-[#14532D] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Current Batch
          </button>
          <button
            onClick={() => setShowBatchOnly(false)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${!showBatchOnly ? 'bg-white text-[#14532D] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            All Time
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Cost Expenses" value={formatUGX(totalCost)} icon={TrendingDown} color="#854d0e" bgColor="#fef9c3" />
        <StatCard label="Total General Expenses" value={formatUGX(totalGeneral)} icon={Wallet} color="#6d28d9" bgColor="#ede9fe" />
        <StatCard label="Grand Total" value={formatUGX(grandTotal)} icon={DollarSign} color="#DC2626" bgColor="#fef2f2" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Form (Admin only) ── */}
        {isAdmin && (
          <div className="bg-white rounded-xl p-6" style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.05)", border: "1px solid #F1F5F9" }}>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                <Plus size={16} color="#14532D" />
              </div>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 600, color: "#111827" }}>
                Add Expense
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-100 flex items-center gap-2">
                  <AlertCircle size={14} color="#DC2626" />
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#DC2626" }}>{formError}</span>
                </div>
              )}

              {/* Category Toggle */}
              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "6px" }}>
                  Category
                </label>
                <div className="flex rounded-xl overflow-hidden border border-gray-200">
                  {(["cost", "general"] as const).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className="flex-1 py-2 text-xs font-semibold transition-all"
                      style={{
                        fontFamily: "Inter, sans-serif",
                        backgroundColor: category === cat ? "#14532D" : "#fff",
                        color: category === cat ? "#fff" : "#6B7280",
                      }}
                    >
                      {cat === "cost" ? "Cost Expense" : "General Expense"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Type */}
              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "6px" }}>
                  Type <span style={{ color: "#DC2626" }}>*</span>
                </label>
                <select
                  value={expType}
                  onChange={e => setExpType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-[#14532D] bg-white"
                  style={{ fontFamily: "Inter, sans-serif", fontSize: "13px" }}
                >
                  {typeOptions.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "6px" }}>
                  Amount (UGX) <span style={{ color: "#DC2626" }}>*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  placeholder="e.g. 50000"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-[#14532D]"
                  style={{ fontFamily: "Inter, sans-serif", fontSize: "13px" }}
                />
              </div>

              {/* Date */}
              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "6px" }}>
                  Date <span style={{ color: "#DC2626" }}>*</span>
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-[#14532D]"
                  style={{ fontFamily: "Inter, sans-serif", fontSize: "13px" }}
                />
              </div>

              {/* Notes */}
              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "6px" }}>
                  Notes <span style={{ color: "#9CA3AF", fontWeight: 400 }}>(optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Any additional details..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-[#14532D] resize-none"
                  style={{ fontFamily: "Inter, sans-serif", fontSize: "13px" }}
                />
              </div>

              {/* Batch / Sale Link */}
              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "6px" }}>
                  Link to Batch (Sale) <span style={{ color: "#9CA3AF", fontWeight: 400 }}>(optional)</span>
                </label>
                <select
                  value={selectedSaleId}
                  onChange={e => setSelectedSaleId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-[#14532D] bg-white transition-all shadow-sm"
                  style={{ fontFamily: "Inter, sans-serif", fontSize: "13px" }}
                >
                  <option value="">Current Batch (Future Sale)</option>
                  {sales.map(s => (
                    <option key={s.id} value={s.id}>
                      Sale: {s.date} - {s.coffee_type} ({Math.round(s.total_amount).toLocaleString()} UGX)
                    </option>
                  ))}
                </select>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", color: "#6B7280", marginTop: "4px" }}>
                  Capture costs for a specific sale batch.
                </p>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: "#14532D", color: "#fff", fontFamily: "Inter, sans-serif" }}
              >
                {saving ? <><Loader2 size={15} className="animate-spin" /> Saving...</> : <><Receipt size={15} /> Record Expense</>}
              </button>
            </form>
          </div>
        )}

        {/* ── Table ── */}
        <div className={`bg-white rounded-xl overflow-hidden ${isAdmin ? "lg:col-span-2" : "lg:col-span-3"}`}
          style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.05)", border: "1px solid #F1F5F9" }}>

          {/* Tabs */}
          <div className="flex items-center gap-1 px-5 py-4 border-b border-gray-100">
            {(["all", "cost", "general"] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  fontFamily: "Inter, sans-serif",
                  backgroundColor: tab === t ? "#14532D" : "#F8FAFC",
                  color: tab === t ? "#fff" : "#6B7280",
                }}
              >
                {t === "all" ? "All" : t === "cost" ? "Cost Expenses" : "General Expenses"}
              </button>
            ))}
            <span className="ml-auto text-xs text-gray-400" style={{ fontFamily: "Inter, sans-serif" }}>
              {filtered.length} record{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto max-h-[600px]">
            <table className="w-full">
              <thead className="sticky top-0 z-10" style={{ backgroundColor: "#F8FAFC", borderBottom: "1px solid #F1F5F9" }}>
                <tr>
                  {["Date", "Category", "Type", "Amount", "Notes", ...(profile?.role === 'Super Admin' ? ["Admin"] : []), ...(isAdmin ? [""] : [])].map(h => (
                    <th key={h} className="px-4 py-3 text-left" style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="py-16 text-center">
                      <Receipt size={32} color="#D1D5DB" className="mx-auto mb-3" />
                      <p style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", color: "#9CA3AF" }}>No expenses recorded yet</p>
                    </td>
                  </tr>
                ) : filtered.map(exp => {
                  const colors = categoryColor(exp.category);
                  return (
                    <tr key={exp.id} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3.5" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#6B7280", whiteSpace: "nowrap" }}>{exp.date}</td>
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: colors.bg, color: colors.text }}>
                          {categoryLabel(exp.category)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5" style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 500, color: "#111827" }}>{exp.type}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap" style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 700, color: "#DC2626" }}>{formatUGX(exp.amount)}</td>
                      <td className="px-4 py-3.5" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#6B7280", maxWidth: "200px" }}>
                        <span className="line-clamp-1">{exp.notes || "—"}</span>
                      </td>
                      {profile?.role === 'Super Admin' && (
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-lg" style={{ backgroundColor: "#f3f4f6", color: "#4b5563", fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600 }}>
                            {(exp as any).admin?.full_name || 'System'}
                          </span>
                        </td>
                      )}
                      {isAdmin && (
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            {exp.sale_id ? (
                               <div className="px-2 py-0.5 rounded-md bg-green-50 text-[10px] font-bold text-green-700 border border-green-100" title="Linked to Past Sale">
                                 PAST BATCH
                               </div>
                            ) : new Date(exp.created_at || exp.date).getTime() > new Date(lastSaleDate).getTime() ? (
                               <div className="px-2 py-0.5 rounded-md bg-blue-50 text-[10px] font-bold text-blue-700 border border-blue-100" title="Part of current batch">
                                 CURRENT BATCH
                               </div>
                            ) : (
                               <div className="px-2 py-0.5 rounded-md bg-gray-50 text-[10px] font-bold text-gray-400 border border-gray-100" title="Unlinked and from a previous period">
                                 UNLINKED
                               </div>
                            )}
                            <button
                              onClick={() => handleDelete(exp.id)}
                              disabled={deletingId === exp.id}
                              className="p-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                              title="Delete"
                            >
                              {deletingId === exp.id ? <Loader2 size={14} color="#DC2626" className="animate-spin" /> : <Trash2 size={14} color="#DC2626" />}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden flex flex-col divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <div className="py-16 text-center">
                <Receipt size={28} color="#D1D5DB" className="mx-auto mb-3" />
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#9CA3AF" }}>No expenses recorded yet</p>
              </div>
            ) : filtered.map(exp => {
              const colors = categoryColor(exp.category);
              return (
                <div key={exp.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: colors.bg, color: colors.text }}>
                          {categoryLabel(exp.category)}
                        </span>
                        <span style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#9CA3AF" }}>{exp.date}</span>
                      </div>
                      <div style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 600, color: "#111827" }}>{exp.type}</div>
                      {exp.notes && <div style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#6B7280", marginTop: "2px" }}>{exp.notes}</div>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 700, color: "#DC2626" }}>{formatUGX(exp.amount)}</span>
                      {isAdmin && (
                        <button onClick={() => handleDelete(exp.id)} disabled={deletingId === exp.id} className="p-1.5 rounded-lg hover:bg-red-50">
                          {deletingId === exp.id ? <Loader2 size={13} color="#DC2626" className="animate-spin" /> : <Trash2 size={13} color="#DC2626" />}
                        </button>
                      )}
                    </div>
                  </div>
                  {profile?.role === 'Super Admin' && (
                    <div className="pt-2 mt-2 border-t border-gray-100 flex justify-between items-center">
                      <span style={{ fontFamily: "Inter", fontSize: "11px", color: "#9CA3AF", textTransform: "uppercase", fontWeight: 600 }}>Admin Branch:</span>
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>
                        {(exp as any).admin?.full_name || 'System'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer total */}
          {filtered.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 flex justify-between items-center" style={{ backgroundColor: "#F8FAFC" }}>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#6B7280" }}>
                {filtered.length} record{filtered.length !== 1 ? "s" : ""}
              </span>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 700, color: "#DC2626" }}>
                {formatUGX(filtered.reduce((s, e) => s + e.amount, 0))}
              </span>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

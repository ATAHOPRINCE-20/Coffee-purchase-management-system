import React, { useState, useEffect, useMemo } from "react";
import { Layout } from "../components/Layout";
import { processingService, ProcessingBatch } from "../services/processingService";
import { batchesService, CoffeeBatch, BatchDetails } from "../services/batchesService";
import { purchasesService } from "../services/purchasesService";
import { useAuth, getEffectiveAdminId } from "../hooks/useAuth";
import { useSeasons } from "../hooks/queries/useSeasons";
import { COFFEE_CONVERSION_RATES } from "../utils/coffeeConversions";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import {
  Coffee,
  CheckCircle,
  AlertTriangle,
  History,
  Info,
  Calendar,
  Layers,
  Scale,
  FileText,
  User,
  Plus,
  Trash2,
  TrendingUp,
  Percent,
  Eye,
} from "lucide-react";

// Helper functions for Date Ranges
function getWeekNumber(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return weekNo;
}

function getWeekRange(dateStr: string) {
  const date = new Date(dateStr);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  return {
    start: monday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0],
    label: `W${getWeekNumber(monday)} (${monday.toLocaleDateString("en-UG", { month: "short", day: "numeric" })} - ${sunday.toLocaleDateString("en-UG", { month: "short", day: "numeric", year: "numeric" })})`
  };
}

function getMonthRange(monthStr: string) {
  const [year, month] = monthStr.split('-').map(Number);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  
  return {
    start: startDate.toISOString().split('T')[0],
    end: endDate.toISOString().split('T')[0],
    label: `${startDate.toLocaleDateString("en-UG", { month: "long", year: "numeric" })}`
  };
}

export default function CoffeeProcessing() {
  const { profile } = useAuth();
  const { data: seasons } = useSeasons(profile?.id ?? null);
  const [activeTab, setActiveTab] = useState<'milling' | 'batches'>('milling');
  
  // Ledger/Milling states
  const [batches, setBatches] = useState<ProcessingBatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Red Cherry Batches states
  const [coffeeBatches, setCoffeeBatches] = useState<CoffeeBatch[]>([]);
  const [allPurchases, setAllPurchases] = useState<any[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [batchDetails, setBatchDetails] = useState<BatchDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [form, setForm] = useState({
    stage: "Dry & Mill" as "Dry & Mill" | "Mill",
    input_coffee_type: "Red" as "Red" | "Kiboko",
    input_weight: "",
    output_weight: "",
    processing_date: new Date().toISOString().slice(0, 10),
    season_id: "",
    coffee_batch_id: "",
  });

  const [batchForm, setBatchForm] = useState({
    name: "",
    batch_type: "weekly" as "weekly" | "monthly" | "custom",
    start_date: "",
    end_date: "",
    selected_date: new Date().toISOString().slice(0, 10),
    selected_month: new Date().toISOString().slice(0, 7),
  });

  const [unprocessedStats, setUnprocessedStats] = useState({
    purchasedRed: 0,
    processedRed: 0,
    purchasedKiboko: 0,
    processedKiboko: 0,
  });

  const loadUnprocessedStats = async () => {
    if (!profile) return;
    const adminId = getEffectiveAdminId(profile);
    if (!adminId) return;
    try {
      const stats = await processingService.getUnprocessedTotals(adminId, form.season_id || undefined);
      setUnprocessedStats(stats);
    } catch (err) {
      console.error("Failed to load unprocessed stats:", err);
    }
  };

  const loadBatches = async () => {
    if (!profile) return;
    const adminId = getEffectiveAdminId(profile);
    if (!adminId) return;
    setLoading(true);
    try {
      const data = await processingService.getAll(adminId);
      setBatches(data);
    } catch (err: any) {
      console.error(err);
      setError("Failed to load processing batches.");
    } finally {
      setLoading(false);
    }
  };

  const loadCoffeeBatches = async () => {
    if (!profile) return;
    const adminId = getEffectiveAdminId(profile);
    if (!adminId) return;
    try {
      const data = await batchesService.getAll(adminId, form.season_id || undefined);
      setCoffeeBatches(data);
    } catch (err) {
      console.error("Failed to load coffee batches:", err);
    }
  };

  const loadAllPurchases = async () => {
    if (!profile) return;
    const adminId = getEffectiveAdminId(profile);
    if (!adminId) return;
    try {
      const data = await purchasesService.getAll(adminId);
      setAllPurchases(data);
    } catch (err) {
      console.error("Failed to load purchases:", err);
    }
  };

  // Auto-select active season on load
  useEffect(() => {
    if (seasons && seasons.length > 0 && !form.season_id) {
      const active = seasons.find(s => s.is_active);
      if (active) {
        setForm(prev => ({ ...prev, season_id: active.id }));
      }
    }
  }, [seasons, form.season_id]);

  useEffect(() => {
    loadBatches();
    loadUnprocessedStats();
    loadCoffeeBatches();
    loadAllPurchases();
  }, [profile, form.season_id]);

  // Load Batch Details dynamically
  useEffect(() => {
    if (selectedBatchId) {
      setLoadingDetails(true);
      batchesService.getBatchDetails(selectedBatchId)
        .then(setBatchDetails)
        .catch(err => console.error(err))
        .finally(() => setLoadingDetails(false));
    } else {
      setBatchDetails(null);
    }
  }, [selectedBatchId]);

  // Auto-fill batch creation start/end dates
  useEffect(() => {
    if (batchForm.batch_type === 'weekly') {
      if (batchForm.selected_date) {
        const { start, end, label } = getWeekRange(batchForm.selected_date);
        setBatchForm(prev => ({
          ...prev,
          start_date: start,
          end_date: end,
          name: `Weekly Red Batch: ${label}`
        }));
      }
    } else if (batchForm.batch_type === 'monthly') {
      if (batchForm.selected_month) {
        const { start, end, label } = getMonthRange(batchForm.selected_month);
        setBatchForm(prev => ({
          ...prev,
          start_date: start,
          end_date: end,
          name: `Monthly Red Batch: ${label}`
        }));
      }
    }
  }, [batchForm.batch_type, batchForm.selected_date, batchForm.selected_month]);

  // Local Filter for Previewing weight of a new batch before creation
  const previewPurchases = useMemo(() => {
    if (!batchForm.start_date || !batchForm.end_date) return [];
    return allPurchases.filter(p => 
      p.coffee_type === 'Red' && 
      !p.batch_id &&
      p.date >= batchForm.start_date && 
      p.date <= batchForm.end_date
    );
  }, [allPurchases, batchForm.start_date, batchForm.end_date]);

  const previewWeight = useMemo(() => {
    return previewPurchases.reduce((sum, p) => sum + (p.payable_weight || 0), 0);
  }, [previewPurchases]);

  const openBatches = useMemo(() => {
    return coffeeBatches.filter(b => b.status === 'Open');
  }, [coffeeBatches]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === "stage") {
        updated.input_coffee_type = value === "Dry & Mill" ? "Red" : "Kiboko";
        updated.coffee_batch_id = ""; // Reset linked batch if stage changes
        updated.input_weight = "";
      }
      return updated;
    });
  };

  const handleBatchFormInput = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setBatchForm(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'batch_type' && value === 'custom' ? { start_date: "", end_date: "", name: "Custom Red Cherry Batch" } : {})
    }));
  };

  const submitBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setError(null);
    setSuccess(false);

    const inputWeight = parseFloat(form.input_weight);
    const outputWeight = parseFloat(form.output_weight);

    if (isNaN(inputWeight) || inputWeight <= 0) {
      setError("Please enter a valid input weight.");
      return;
    }
    if (isNaN(outputWeight) || outputWeight <= 0) {
      setError("Please enter a valid actual output weight.");
      return;
    }

    try {
      const batch = {
        admin_id: profile.id,
        season_id: form.season_id || undefined,
        stage: form.stage,
        input_coffee_type: form.input_coffee_type,
        input_weight: inputWeight,
        output_weight: outputWeight,
        processing_date: form.processing_date,
        coffee_batch_id: form.stage === "Dry & Mill" && form.coffee_batch_id ? form.coffee_batch_id : undefined,
      };

      await processingService.create(batch);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);

      // Reset form
      setForm((prev) => ({
        ...prev,
        input_weight: "",
        output_weight: "",
        coffee_batch_id: "",
      }));

      await loadBatches();
      await loadCoffeeBatches();
      await loadUnprocessedStats();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to record processing batch.");
    }
  };

  const createRedBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const adminId = getEffectiveAdminId(profile);
    if (!adminId) return;

    setError(null);
    setSuccess(false);

    if (!batchForm.name || !batchForm.start_date || !batchForm.end_date) {
      setError("Please complete all batch fields.");
      return;
    }

    try {
      await batchesService.create({
        admin_id: adminId,
        season_id: form.season_id || undefined,
        name: batchForm.name,
        batch_type: batchForm.batch_type,
        start_date: batchForm.start_date,
        end_date: batchForm.end_date,
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);

      // Reset batch form
      setBatchForm({
        name: "",
        batch_type: "weekly",
        start_date: "",
        end_date: "",
        selected_date: new Date().toISOString().slice(0, 10),
        selected_month: new Date().toISOString().slice(0, 7),
      });

      await loadCoffeeBatches();
      await loadAllPurchases();
      await loadUnprocessedStats();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to create Red Cherry batch.");
    }
  };

  const deleteBatch = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this processing batch? This will restore the auto-estimated stock levels and reopen any linked purchase batches.")) {
      return;
    }
    try {
      await processingService.delete(id);
      await loadBatches();
      await loadCoffeeBatches();
      await loadUnprocessedStats();
    } catch (err: any) {
      console.error(err);
      alert("Failed to delete processing batch.");
    }
  };

  const deleteRedBatch = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this Red Cherry batch? All purchases linked to it will become unprocessed/available for new batches.")) {
      return;
    }
    try {
      await batchesService.delete(id);
      await loadCoffeeBatches();
      await loadAllPurchases();
      await loadUnprocessedStats();
    } catch (err: any) {
      console.error(err);
      alert("Failed to delete batch.");
    }
  };

  const rate = COFFEE_CONVERSION_RATES[form.input_coffee_type] ?? 1.0;
  const autoEstimatedOutput = form.input_weight ? (parseFloat(form.input_weight) * rate).toFixed(2) : "0.00";
  const actualOutputNum = parseFloat(form.output_weight) || 0;
  const difference = form.input_weight && form.output_weight ? (actualOutputNum - parseFloat(autoEstimatedOutput)).toFixed(2) : null;

  const unprocessedRemaining = form.input_coffee_type === "Red"
    ? Math.max(0, unprocessedStats.purchasedRed - unprocessedStats.processedRed)
    : Math.max(0, unprocessedStats.purchasedKiboko - unprocessedStats.processedKiboko);

  return (
    <Layout breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Coffee Processing" }]}>
      {/* Success Toast */}
      {success && (
        <div className="fixed bottom-6 right-6 flex items-center gap-3 px-5 py-4 rounded-xl shadow-xl z-50 animate-bounce"
          style={{ backgroundColor: "#14532D", color: "#fff", fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 500 }}>
          <CheckCircle size={18} color="#86efac" />
          Recorded successfully!
        </div>
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 animate-fade-in" style={{ fontFamily: "Inter, sans-serif" }}>Coffee Processing</h1>
          <p className="text-sm text-gray-500 mt-1" style={{ fontFamily: "Inter, sans-serif" }}>
            Group your bought Red Cherry into batches to track exact milling yields and outturns.
          </p>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit mb-6">
        <button
          onClick={() => setActiveTab('milling')}
          className={`px-5 py-2 rounded-lg text-xs font-bold transition-all duration-250 ${activeTab === 'milling' ? 'bg-white text-[#14532D] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Milling Runs
        </button>
        <button
          onClick={() => setActiveTab('batches')}
          className={`px-5 py-2 rounded-lg text-xs font-bold transition-all duration-250 ${activeTab === 'batches' ? 'bg-white text-[#14532D] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Red Cherry Batches
        </button>
      </div>

      {activeTab === 'milling' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Form Card */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-gray-100">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-green-50">
                  <Coffee size={15} className="text-[#14532D]" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Record Milling Yield</h2>
                  <p className="text-xs text-gray-500">Log actual Kase weight from a mill run</p>
                </div>
              </div>

              <form onSubmit={submitBatch} className="space-y-7">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">Processing Stage</label>
                  <select
                    name="stage"
                    value={form.stage}
                    onChange={handleInput}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-[#14532D] focus:ring-2 focus:ring-[#14532D]/10 transition-all font-medium"
                  >
                    <option value="Dry & Mill">Dry &amp; Mill (Red Cherry → Kase)</option>
                    <option value="Mill">Mill Only (Kiboko → Kase)</option>
                  </select>
                </div>

                {form.stage === "Dry & Mill" && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">Link to Red Cherry Batch</label>
                    <select
                      name="coffee_batch_id"
                      value={form.coffee_batch_id}
                      onChange={(e) => {
                        const val = e.target.value;
                        setForm(prev => {
                          const updated = { ...prev, coffee_batch_id: val };
                          if (val) {
                            const selectedBatch = openBatches.find(b => b.id === val);
                            if (selectedBatch) {
                              updated.input_weight = (selectedBatch.total_weight || 0).toString();
                            }
                          } else {
                            updated.input_weight = "";
                          }
                          return updated;
                        });
                      }}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-[#14532D] focus:ring-2 focus:ring-[#14532D]/10 transition-all font-medium"
                    >
                      <option value="">(none - enter manual weight)</option>
                      {openBatches.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.total_weight?.toLocaleString()} kg available)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">Input Coffee Type</label>
                  <input
                    type="text"
                    readOnly
                    value={form.input_coffee_type + " Cherry"}
                    className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 text-gray-600 text-sm outline-none cursor-not-allowed font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">Input Weight (kg)</label>
                      {unprocessedRemaining > 0 && !form.coffee_batch_id && (
                        <button
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, input_weight: unprocessedRemaining.toFixed(1) }))}
                          className="text-[10px] font-bold text-[#14532D] hover:underline animate-fade-in"
                          title="Autofill total unprocessed weight"
                        >
                          Use Total ({unprocessedRemaining.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg)
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Input
                        type="number"
                        name="input_weight"
                        value={form.input_weight}
                        onChange={handleInput}
                        readOnly={!!form.coffee_batch_id}
                        placeholder="e.g. 1000"
                        className={`pr-10 rounded-xl py-3 px-4 h-11 text-sm font-medium ${form.coffee_batch_id ? 'bg-gray-50 border-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                        required
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">kg</span>
                    </div>
                    {form.coffee_batch_id && (
                      <span className="text-[10px] text-green-700 font-semibold mt-1 block">Locked to batch total</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">Estimated Kase (kg)</label>
                    <div className="relative">
                      <input
                        type="text"
                        readOnly
                        value={autoEstimatedOutput}
                        className="w-full px-4 py-3 pr-10 rounded-xl border border-gray-100 bg-gray-50 text-gray-500 text-sm font-medium outline-none cursor-not-allowed h-11"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">kg</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">Actual Kase Output (kg)</label>
                  <div className="relative">
                    <Input
                      type="number"
                      name="output_weight"
                      value={form.output_weight}
                      onChange={handleInput}
                      placeholder="e.g. 260"
                      className="pr-10 rounded-xl font-semibold text-[#14532D] focus:border-[#14532D] py-3 px-4 h-11 text-sm"
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">kg</span>
                  </div>
                </div>

                {difference !== null && (
                  <div className={`p-4 rounded-xl flex items-center justify-between text-xs font-medium border transition-colors duration-250 ${
                    parseFloat(difference) >= 0
                      ? "bg-green-50 border-green-200 text-[#14532D]"
                      : "bg-amber-50 border-amber-200 text-amber-800"
                  }`}>
                    <div className="flex items-center gap-1.5">
                      <Percent size={13} />
                      <span>Milling Yield Variance:</span>
                    </div>
                    <span className="font-bold">
                      {parseFloat(difference) >= 0 ? `+${difference} kg (Bonus)` : `${difference} kg (Loss)`}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">Processing Date</label>
                    <div className="relative">
                      <Input
                        type="date"
                        name="processing_date"
                        value={form.processing_date}
                        onChange={handleInput}
                        className="rounded-xl py-3 px-4 h-11 text-sm font-medium"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">Active Season</label>
                    <select
                      name="season_id"
                      value={form.season_id}
                      onChange={handleInput}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-[#14532D] focus:ring-2 focus:ring-[#14532D]/10 transition-all font-medium h-11"
                    >
                      <option value="">(none)</option>
                      {seasons?.map((s) => (
                        <option key={s.id} value={s.id}>
                          Season {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-700 animate-shake">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <Button type="submit" className="w-full py-2.5 rounded-xl bg-[#14532D] text-white hover:bg-[#114023] font-semibold text-sm transition-all shadow-sm">
                  Record Processing Batch
                </Button>
              </form>
            </div>
          </div>

          {/* Right Column: Existing Batches Table Card */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <History size={16} className="text-gray-500" />
                  <h2 className="text-base font-semibold text-gray-900">Processing Ledger</h2>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                    {batches.length} {batches.length === 1 ? 'batch' : 'batches'}
                  </span>
                </div>
              </div>

              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center text-gray-400">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14532D] mb-3" />
                  <p className="text-xs">Fetching processing records...</p>
                </div>
              ) : batches.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-gray-400">
                  <Layers size={36} className="text-gray-300 mb-3" />
                  <p className="text-sm font-semibold">No yields recorded yet</p>
                  <p className="text-xs max-w-sm text-center mt-1 text-gray-500">
                    No processing batches yet. Record a milling run to track actual yields.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="bg-gray-50/75 border-b border-gray-100 text-xs font-semibold uppercase tracking-wider text-gray-500">
                        <th className="px-6 py-3.5">Date</th>
                        <th className="px-6 py-3.5">Stage / Batch</th>
                        <th className="px-6 py-3.5 text-right">Input Weight</th>
                        <th className="px-6 py-3.5 text-right">Milled Kase</th>
                        <th className="px-6 py-3.5 text-right">Outturn %</th>
                        <th className="px-6 py-3.5 text-right">Variance</th>
                        <th className="px-6 py-3.5"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {batches.map((b) => {
                        const estOutput = b.estimated_output ?? 0;
                        const diffVal = b.output_weight - estOutput;
                        return (
                          <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="font-semibold text-gray-900">
                                {new Date(b.processing_date).toLocaleDateString("en-UG", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-semibold text-gray-800 text-xs">{b.stage}</div>
                              {b.coffee_batch && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedBatchId(b.coffee_batch_id || null)}
                                  className="text-[10px] text-green-700 font-bold hover:underline block text-left mt-0.5"
                                  title="View batch deliveries"
                                >
                                  Batch: {b.coffee_batch.name}
                                </button>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right whitespace-nowrap font-medium text-gray-700">
                              {b.input_weight.toLocaleString()} kg
                              <span className="block text-[10px] text-gray-400">{b.input_coffee_type} Cherry</span>
                            </td>
                            <td className="px-6 py-4 text-right whitespace-nowrap font-semibold text-[#14532D]">
                              {b.output_weight.toLocaleString()} kg
                              <span className="block text-[10px] text-gray-400">Est: {estOutput.toFixed(0)} kg</span>
                            </td>
                            <td className="px-6 py-4 text-right whitespace-nowrap">
                              <div className="font-bold text-gray-900">{b.yield_percentage?.toFixed(1)}%</div>
                              <span className="text-[10px] text-gray-400 font-medium">
                                vs {b.input_coffee_type === "Red" ? "25%" : "65%"}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                                diffVal >= 0
                                  ? "bg-green-50 text-[#14532D]"
                                  : "bg-red-50 text-red-700"
                              }`}>
                                {diffVal >= 0 ? `+${diffVal.toFixed(1)} kg` : `${diffVal.toFixed(1)} kg`}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => deleteBatch(b.id)}
                                className="text-gray-400 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50"
                                title="Delete batch"
                              >
                                <Trash2 size={15} />
                              </button>
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
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Create Batch Form */}
          <div className="lg:col-span-5 animate-fade-in">
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-gray-100">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-green-50">
                  <Calendar size={15} className="text-[#14532D]" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Create Red Cherry Batch</h2>
                  <p className="text-xs text-gray-500">Group deliveries by week or month</p>
                </div>
              </div>

              <form onSubmit={createRedBatch} className="space-y-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">Grouping Strategy</label>
                  <select
                    name="batch_type"
                    value={batchForm.batch_type}
                    onChange={handleBatchFormInput}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-[#14532D] focus:ring-2 focus:ring-[#14532D]/10 transition-all font-medium"
                  >
                    <option value="weekly">Weekly Grouping (Mon - Sun)</option>
                    <option value="monthly">Monthly Grouping</option>
                    <option value="custom">Custom Date Range</option>
                  </select>
                </div>

                {batchForm.batch_type === 'weekly' && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">Select Date in Week</label>
                    <Input
                      type="date"
                      name="selected_date"
                      value={batchForm.selected_date}
                      onChange={handleBatchFormInput}
                      className="rounded-xl py-3 px-4 h-11 text-sm font-medium"
                      required
                    />
                    <span className="text-[10px] text-gray-400 mt-1 block">We'll automatically set start and end boundaries for this week.</span>
                  </div>
                )}

                {batchForm.batch_type === 'monthly' && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">Select Month</label>
                    <Input
                      type="month"
                      name="selected_month"
                      value={batchForm.selected_month}
                      onChange={handleBatchFormInput}
                      className="rounded-xl py-3 px-4 h-11 text-sm font-medium"
                      required
                    />
                  </div>
                )}

                {batchForm.batch_type === 'custom' && (
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">Start Date</label>
                      <Input
                        type="date"
                        name="start_date"
                        value={batchForm.start_date}
                        onChange={handleBatchFormInput}
                        className="rounded-xl py-3 px-4 h-11 text-sm font-medium"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">End Date</label>
                      <Input
                        type="date"
                        name="end_date"
                        value={batchForm.end_date}
                        onChange={handleBatchFormInput}
                        className="rounded-xl py-3 px-4 h-11 text-sm font-medium"
                        required
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">Batch Name</label>
                  <Input
                    type="text"
                    name="name"
                    value={batchForm.name}
                    onChange={handleBatchFormInput}
                    placeholder="e.g. W25 Red Cherry Lot"
                    className="rounded-xl py-3 px-4 h-11 text-sm font-semibold text-gray-800"
                    required
                  />
                </div>

                {/* Batch Preview Card */}
                {batchForm.start_date && batchForm.end_date && (
                  <div className="bg-gray-50/75 p-4 rounded-xl border border-gray-100 text-xs space-y-2">
                    <div className="font-bold text-gray-700 uppercase tracking-wide text-[10px]">Batch Preview</div>
                    <div className="flex justify-between text-gray-500">
                      <span>Date range:</span>
                      <span className="font-medium text-gray-700">
                        {batchForm.start_date} to {batchForm.end_date}
                      </span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>Matching Intakes:</span>
                      <span className="font-bold text-gray-800">
                        {previewPurchases.length} deliveries
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-gray-200/50">
                      <span className="font-semibold text-gray-600">Total Batch Weight:</span>
                      <span className="font-extrabold text-[#14532D] text-sm">
                        {previewWeight.toLocaleString()} kg
                      </span>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-700 animate-shake">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={previewWeight === 0}
                  className="w-full py-2.5 rounded-xl bg-[#14532D] text-white hover:bg-[#114023] font-semibold text-sm transition-all shadow-sm disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  Create Batch ({previewWeight.toLocaleString()} kg)
                </Button>
              </form>
            </div>
          </div>

          {/* Right Column: Existing Red Cherry Batches Ledger */}
          <div className="lg:col-span-7 space-y-6 animate-fade-in">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <History size={16} className="text-gray-500" />
                  <h2 className="text-base font-semibold text-gray-900">Red Cherry Batches Ledger</h2>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                    {coffeeBatches.length} {coffeeBatches.length === 1 ? 'batch' : 'batches'}
                  </span>
                </div>
              </div>

              {coffeeBatches.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-gray-400">
                  <Layers size={36} className="text-gray-300 mb-3" />
                  <p className="text-sm font-semibold">No batches created yet</p>
                  <p className="text-xs max-w-sm text-center mt-1 text-gray-500">
                    Create a weekly or monthly batch to aggregate bought Red Cherry deliveries.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="bg-gray-50/75 border-b border-gray-100 text-xs font-semibold uppercase tracking-wider text-gray-500">
                        <th className="px-6 py-3.5">Batch Name</th>
                        <th className="px-6 py-3.5">Date Range</th>
                        <th className="px-6 py-3.5 text-right">Total Weight</th>
                        <th className="px-6 py-3.5 text-center">Status</th>
                        <th className="px-6 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {coffeeBatches.map((b) => (
                        <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold text-gray-900">{b.name}</div>
                            <span className="block text-[10px] text-gray-400 capitalize">{b.batch_type} Batch</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-xs text-gray-700 font-medium">
                              {new Date(b.start_date).toLocaleDateString("en-UG", { month: "short", day: "numeric" })} - {new Date(b.end_date).toLocaleDateString("en-UG", { month: "short", day: "numeric", year: "numeric" })}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right font-extrabold text-gray-800 whitespace-nowrap">
                            {b.total_weight?.toLocaleString()} kg
                          </td>
                          <td className="px-6 py-4 text-center whitespace-nowrap">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              b.status === 'Milled' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                            }`}>
                              {b.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right whitespace-nowrap space-x-1">
                            <button
                              onClick={() => setSelectedBatchId(b.id)}
                              className="text-gray-400 hover:text-[#14532D] transition-colors p-1.5 rounded-lg hover:bg-green-50"
                              title="View Deliveries"
                            >
                              <Eye size={15} />
                            </button>
                            {b.status === 'Open' && (
                              <button
                                onClick={() => deleteRedBatch(b.id)}
                                className="text-gray-400 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50"
                                title="Delete Batch"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Batch Details Modal */}
      {selectedBatchId && batchDetails && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-gray-100">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">{batchDetails.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {batchDetails.batch_type.toUpperCase()} · {new Date(batchDetails.start_date).toLocaleDateString("en-UG", { month: "short", day: "numeric", year: "numeric" })} to {new Date(batchDetails.end_date).toLocaleDateString("en-UG", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
              <button
                onClick={() => setSelectedBatchId(null)}
                className="text-gray-400 hover:text-gray-600 font-semibold text-sm px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Close
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {loadingDetails ? (
                <div className="py-12 flex flex-col items-center justify-center text-gray-400">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14532D] mb-3" />
                  <p className="text-xs">Loading batch deliveries...</p>
                </div>
              ) : (
                <>
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-xl">
                    <div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</div>
                      <div className={`text-sm font-extrabold mt-1 uppercase ${batchDetails.status === 'Milled' ? 'text-green-700' : 'text-amber-600'}`}>
                        {batchDetails.status}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Weight</div>
                      <div className="text-sm font-extrabold text-gray-900 mt-1">
                        {batchDetails.total_weight?.toLocaleString()} kg
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Deliveries</div>
                      <div className="text-sm font-extrabold text-gray-900 mt-1">
                        {batchDetails.purchases?.length || 0} intake records
                      </div>
                    </div>
                  </div>

                  {/* Deliveries List */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Linked Red Cherry Intakes</h4>
                    {batchDetails.purchases?.length === 0 ? (
                      <p className="text-xs text-gray-500 text-center py-6 bg-gray-50 rounded-lg">No deliveries associated with this batch.</p>
                    ) : (
                      <div className="border border-gray-100 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-gray-50 text-gray-500 uppercase tracking-wider font-bold border-b border-gray-100">
                              <th className="px-4 py-3">Farmer</th>
                              <th className="px-4 py-3">Date</th>
                              <th className="px-4 py-3 text-right">Net Weight</th>
                              <th className="px-4 py-3 text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {batchDetails.purchases.map(p => (
                              <tr key={p.id} className="hover:bg-gray-50/50">
                                <td className="px-4 py-3 font-semibold text-gray-800">{p.farmers?.name || "Unknown"}</td>
                                <td className="px-4 py-3 text-gray-500">
                                  {new Date(p.date).toLocaleDateString("en-UG", { month: "short", day: "numeric", year: "numeric" })}
                                </td>
                                <td className="px-4 py-3 text-right font-bold text-gray-700">{p.payable_weight.toLocaleString()} kg</td>
                                <td className="px-4 py-3 text-right font-medium text-green-700">UGX {Math.round(p.total_amount).toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

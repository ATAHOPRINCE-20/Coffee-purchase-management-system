import React, { useState, useEffect } from "react";
import { Layout } from "../components/Layout";
import { Search, Plus, ChevronDown, Filter, Eye, Check, X, CreditCard, TrendingUp, AlertCircle, Users, Loader2 } from "lucide-react";
import { farmersService, Farmer } from "../services/farmersService";
import { advancesService } from "../services/advancesService";
import { seasonsService, Season } from "../services/seasonsService";
import { ErrorState } from "../components/ErrorState";

function formatUGX(v: number) { return `UGX ${Math.round(v).toLocaleString()}`; }

function Badge({ status }: { status: string }) {
  const config = status === "Active"
    ? { bg: "#fff7ed", color: "#9a3412", border: "#fed7aa", dot: "#F59E0B" }
    : { bg: "#f0fdf4", color: "#14532D", border: "#bbf7d0", dot: "#16A34A" };
  return (
    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full w-fit" style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600, backgroundColor: config.bg, color: config.color, border: `1px solid ${config.border}` }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: config.dot }} />
      {status}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, sub, color, bgColor }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color: string; bgColor: string;
}) {
  return (
    <div className="bg-white rounded-xl p-5" style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.05)", border: "1px solid #F1F5F9" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: bgColor }}>
          <Icon size={18} color={color} />
        </div>
      </div>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 500, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>{label}</div>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: "20px", fontWeight: 700, color: "#111827", lineHeight: 1.2 }}>{value}</div>
      {sub && <div style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#9CA3AF", marginTop: "3px" }}>{sub}</div>}
    </div>
  );
}

export default function AdvanceManagement() {
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [advances, setAdvances] = useState<any[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedFarmer, setSelectedFarmer] = useState<Farmer | null>(null);
  const [farmerDropdown, setFarmerDropdown] = useState(false);
  const [farmerSearch, setFarmerSearch] = useState("");
  const [amount, setAmount] = useState("");
  const [seasonId, setSeasonId] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterSeason, setFilterSeason] = useState("All");
  const [tableSearch, setTableSearch] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [farmersData, advancesData, seasonsData] = await Promise.all([
        farmersService.getAll(),
        advancesService.getAll(),
        seasonsService.getAll()
      ]);
      setFarmers(farmersData);
      setAdvances(advancesData);
      setSeasons(seasonsData);
      
      const activeSeason = seasonsData.find(s => s.is_active);
      if (activeSeason) {
        setSeasonId(activeSeason.id);
      }
    } catch (err: any) {
      console.error("Error fetching data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalGiven = advances.reduce((s, a) => s + (a.amount || 0), 0);
  const totalDeducted = advances.reduce((s, a) => s + (a.deducted || 0), 0);
  const outstanding = advances.filter(a => a.status === "Active").reduce((s, a) => s + (a.remaining || 0), 0);
  const activeCount = advances.filter(a => a.status === "Active").length;

  const filteredFarmers = farmers.filter(f =>
    f.name.toLowerCase().includes(farmerSearch.toLowerCase())
  );

  const filteredAdvances = advances.filter(a => {
    const matchStatus = filterStatus === "All" || a.status === filterStatus;
    const matchSeason = filterSeason === "All" || (a.seasons?.name === filterSeason);
    const farmerName = a.farmers?.name || "Unknown";
    const matchSearch = farmerName.toLowerCase().includes(tableSearch.toLowerCase());
    return matchStatus && matchSeason && matchSearch;
  });


  const handleSubmit = async () => {
    const e: Record<string, string> = {};
    if (!selectedFarmer) e.farmer = "Please select a farmer";
    if (!amount || parseFloat(amount) <= 0) e.amount = "Enter a valid amount";
    if (!seasonId) e.season = "Please select a season";
    
    setErrors(e);
    if (Object.keys(e).length === 0 && selectedFarmer) {
      try {
        setSubmitting(true);
        await advancesService.create({
          id: `ADV-${Math.random().toString(36).substr(2, 4).toUpperCase()}`, // temp ID gen
          farmer_id: selectedFarmer.id,
          amount: parseFloat(amount),
          deducted: 0,
          season_id: seasonId,
          issue_date: date,
          notes,
        });

        setToast({ msg: "Advance recorded successfully!", type: "success" });
        setTimeout(() => setToast(null), 3000);
        handleReset();
        
        // Refresh list
        const updatedAdvances = await advancesService.getAll();
        setAdvances(updatedAdvances);
      } catch (err: any) {
        setToast({ msg: err.message || "Failed to record advance", type: "error" });
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleReset = () => {
    setSelectedFarmer(null);
    setFarmerSearch("");
    setAmount("");
    setNotes("");
    setDate(new Date().toISOString().split("T")[0]);
    setErrors({});
  };

  const inputBase = (field?: string) => `w-full px-3.5 py-2.5 rounded-xl border transition-all outline-none ${
    field && errors[field] ? "border-red-400 bg-red-50" : "border-gray-200 bg-white"
  } focus:border-[#14532D] focus:ring-2 focus:ring-[#14532D]/10`;

  if (loading) {
    return (
      <Layout breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Advances" }]}>
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-green-700 animate-spin mb-4" />
          <p className="text-gray-500 font-medium">Loading advances...</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Advances" }]}>
        <ErrorState 
          title="Couldn't Load Advances" 
          message={error} 
          onRetry={fetchData} 
        />
      </Layout>
    );
  }

  return (
    <Layout breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Advances" }]}>
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-xl"
          style={{ backgroundColor: toast.type === "success" ? "#14532D" : "#DC2626", color: "#fff", fontFamily: "Inter, sans-serif", fontSize: "14px" }}>
          <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
            {toast.type === "success" ? <Check size={14} color="#fff" /> : <X size={14} color="#fff" />}
          </div>
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ fontFamily: "Inter, sans-serif", fontSize: "22px", fontWeight: 700, color: "#111827" }}>Advance Management</h1>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#6B7280", marginTop: "2px" }}>Track and manage farmer advance payments</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={CreditCard} label="Total Advances Given" value={`${formatUGX(Math.round(totalGiven / 1000))}K`} sub="all time" color="#14532D" bgColor="#f0fdf4" />
        <StatCard icon={TrendingUp} label="Total Deducted" value={`${formatUGX(Math.round(totalDeducted / 1000))}K`} sub="recovered" color="#16A34A" bgColor="#f0fdf4" />
        <StatCard icon={AlertCircle} label="Outstanding Balance" value={`${formatUGX(Math.round(outstanding / 1000))}K`} sub="to be recovered" color="#DC2626" bgColor="#fef2f2" />
        <StatCard icon={Users} label="Active Advances" value={`${activeCount}`} sub="farmers with balance" color="#F59E0B" bgColor="#fffbeb" />
      </div>

      {/* Main Split Layout */}
      <div className="flex flex-col lg:flex-row gap-5">
        {/* Left: New Advance Form */}
        <div className="lg:w-80 flex-shrink-0">
          <div className="bg-white rounded-xl overflow-hidden sticky top-0" style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.05)", border: "1px solid #F1F5F9" }}>
            <div className="px-5 py-4" style={{ backgroundColor: "#14532D" }}>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: "15px", fontWeight: 600, color: "#fff" }}>Record New Advance</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#86efac", marginTop: "2px" }}>Enter advance details below</div>
            </div>

            <div className="p-5 space-y-4">
              {/* Farmer Select */}
              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "6px" }}>
                  Farmer Name <span style={{ color: "#DC2626" }}>*</span>
                </label>
                <div className="relative">
                  <div
                    className="w-full px-3.5 py-2.5 rounded-xl cursor-pointer flex items-center justify-between transition-all"
                    style={{
                      border: errors.farmer ? "1px solid #F87171" : farmerDropdown ? "1px solid #14532D" : "1px solid #E5E7EB",
                      backgroundColor: errors.farmer ? "#FFF5F5" : "#fff",
                      boxShadow: farmerDropdown ? "0 0 0 3px rgba(20,83,45,0.08)" : "none"
                    }}
                    onClick={() => setFarmerDropdown(!farmerDropdown)}
                  >
                    {selectedFarmer ? (
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#111827", fontWeight: 500 }}>{selectedFarmer.name}</span>
                    ) : (
                      <input
                        type="text"
                        placeholder="Search farmer..."
                        value={farmerSearch}
                        onChange={e => { setFarmerSearch(e.target.value); setFarmerDropdown(true); }}
                        onClick={e => { e.stopPropagation(); setFarmerDropdown(true); }}
                        className="flex-1 outline-none bg-transparent"
                        style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#374151" }}
                      />
                    )}
                    <ChevronDown size={14} color="#9CA3AF" style={{ transform: farmerDropdown ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.15s", flexShrink: 0 }} />
                  </div>

                  {farmerDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 z-20 overflow-hidden"
                      style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
                      {selectedFarmer && (
                        <div className="px-3 pt-3 pb-2">
                          <input
                            type="text"
                            placeholder="Search..."
                            value={farmerSearch}
                            onChange={e => setFarmerSearch(e.target.value)}
                            autoFocus
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 outline-none"
                            style={{ fontFamily: "Inter, sans-serif", fontSize: "13px" }}
                          />
                        </div>
                      )}
                      <div className="max-h-48 overflow-y-auto">
                        {filteredFarmers.map(f => (
                          <div
                            key={f.id}
                            className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50"
                            onClick={() => { setSelectedFarmer(f); setFarmerSearch(f.name); setFarmerDropdown(false); }}
                          >
                            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: "#14532D", color: "#fff", fontFamily: "Inter", fontSize: "10px", fontWeight: 700 }}>
                              {f.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                            </div>
                            <div>
                              <div style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 500, color: "#111827" }}>{f.name}</div>
                              <div style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#9CA3AF" }}>{f.village}</div>
                            </div>
                            {selectedFarmer?.id === f.id && <Check size={13} color="#14532D" className="ml-auto" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {errors.farmer && <p style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#DC2626", marginTop: "4px" }}>{errors.farmer}</p>}
              </div>

              {/* Amount */}
              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "6px" }}>
                  Amount (UGX) <span style={{ color: "#DC2626" }}>*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#9CA3AF" }}>UGX</span>
                  <input
                    type="number"
                    min="0"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0"
                    className={inputBase("amount")}
                    style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#374151", paddingLeft: "48px" }}
                  />
                </div>
                {errors.amount && <p style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#DC2626", marginTop: "4px" }}>{errors.amount}</p>}
              </div>

              {/* Season */}
              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "6px" }}>Season</label>
                <select
                  value={seasonId}
                  onChange={e => setSeasonId(e.target.value)}
                  className={inputBase("season")}
                  style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#374151", cursor: "pointer" }}
                >
                  {seasons.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                {errors.season && <p style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#DC2626", marginTop: "4px" }}>{errors.season}</p>}
              </div>

              {/* Date */}
              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "6px" }}>Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className={inputBase()}
                  style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#374151" }}
                />
              </div>

              {/* Notes */}
              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "6px" }}>Notes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Purpose of advance (optional)"
                  rows={3}
                  className={inputBase()}
                  style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#374151", resize: "none" }}
                />
              </div>

              {/* Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
                  style={{ backgroundColor: "#14532D", color: "#fff", fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 600, boxShadow: "0 4px 12px rgba(20,83,45,0.25)" }}
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus size={15} />}
                  Record Advance
                </button>
                <button
                  onClick={handleReset}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl hover:bg-gray-50 transition-all"
                  style={{ border: "1.5px solid #E5E7EB", color: "#6B7280", fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 500, backgroundColor: "#fff" }}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Advances Table */}
        <div className="flex-1">
          <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.05)", border: "1px solid #F1F5F9" }}>
            {/* Filters */}
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 600, color: "#111827" }}>All Advances</div>
                <div className="flex flex-wrap gap-2">
                  {/* Search */}
                  <div className="relative">
                    <Search size={13} color="#9CA3AF" className="absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search farmer..."
                      value={tableSearch}
                      onChange={e => setTableSearch(e.target.value)}
                      className="pl-8 pr-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-[#14532D]"
                      style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#374151", width: "160px" }}
                    />
                  </div>
                  {/* Status Filter */}
                  <select
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-[#14532D]"
                    style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#374151", cursor: "pointer" }}
                  >
                    <option value="All">All Status</option>
                    <option value="Active">Active</option>
                    <option value="Cleared">Cleared</option>
                  </select>
                  {/* Season Filter */}
                  <select
                    value={filterSeason}
                    onChange={e => setFilterSeason(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-[#14532D]"
                    style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#374151", cursor: "pointer" }}
                  >
                    <option value="All">All Seasons</option>
                    {seasons.map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: "#F8FAFC" }}>
                    {["Farmer", "Amount Given", "Amount Deducted", "Remaining Balance", "Status", "Date", "Action"].map(h => (
                      <th key={h} className="px-4 py-3 text-left whitespace-nowrap" style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredAdvances.map(a => (
                    <tr key={a.id} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: "#14532D", color: "#fff", fontFamily: "Inter", fontSize: "11px", fontWeight: 700 }}>
                            {(a.farmers?.name || "Unknown").split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                          </div>
                          <div>
                            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 500, color: "#111827" }}>{a.farmers?.name || "Unknown"}</div>
                            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#9CA3AF" }}>{a.seasons?.name || "N/A"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5" style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600, color: "#111827" }}>
                        {formatUGX(a.amount)}
                      </td>
                      <td className="px-4 py-3.5" style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 500, color: "#16A34A" }}>
                        {formatUGX(a.deducted)}
                      </td>
                      <td className="px-4 py-3.5">
                        {a.remaining > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <div className="flex-1 h-1.5 rounded-full bg-gray-100" style={{ minWidth: "60px" }}>
                              <div className="h-1.5 rounded-full" style={{ width: `${(a.remaining / a.amount) * 100}%`, backgroundColor: "#DC2626" }} />
                            </div>
                            <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 700, color: "#DC2626" }}>
                              {formatUGX(a.remaining)}
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600, color: "#16A34A" }}>Cleared</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5"><Badge status={a.status} /></td>
                      <td className="px-4 py-3.5" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#6B7280" }}>{a.issue_date}</td>
                      <td className="px-4 py-3.5">
                        <button
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors"
                          style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 500, color: "#14532D", backgroundColor: "#f0fdf4" }}
                        >
                          <Eye size={12} />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredAdvances.length === 0 && (
                <div className="py-12 text-center">
                  <div className="text-4xl mb-3">💳</div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#6B7280" }}>No advances match your filter</div>
                </div>
              )}
            </div>

            {/* Table Footer */}
            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between" style={{ backgroundColor: "#F8FAFC" }}>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#6B7280" }}>
                Showing {filteredAdvances.length} of {advances.length} advances
              </span>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, backgroundColor: "#fef2f2", color: "#DC2626" }}>
                  Outstanding: {formatUGX(filteredAdvances.filter(a => a.status === "Active").reduce((s, a) => s + a.remaining, 0))}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { Layout } from "../components/Layout";
import { Search, Plus, ChevronDown, Filter, Eye, Check, X, CreditCard, TrendingUp, AlertCircle, Users, Loader2, Pencil, Info, Download } from "lucide-react";
import { farmersService, Farmer } from "../services/farmersService";
import { advancesService } from "../services/advancesService";
import { seasonsService, Season } from "../services/seasonsService";
import { useAuth, getEffectiveAdminId } from "../hooks/useAuth";
import { getEATDateString } from "../utils/dateUtils";
import { ErrorState } from "../components/ErrorState";
import { useAdvances } from "../hooks/queries/useAdvances";
import { useFarmers } from "../hooks/queries/useFarmers";
import { useSeasons } from "../hooks/queries/useSeasons";
import { useCompanyProfile } from "../hooks/queries/useCompanyProfile";
import { queryClient } from "../lib/QueryProvider";
import { useReactToPrint } from 'react-to-print';
import { FarmerAdvancesPrint } from "../components/pos/FarmerAdvancesPrint";
import { Printer } from "lucide-react";

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
  const navigate = useNavigate();
  const { profile } = useAuth();
  const adminId = getEffectiveAdminId(profile);

  const { data: advances = [], isLoading: advancesLoading, error: advancesError, refetch: refetchAdvances } = useAdvances(adminId);
  const { data: farmers = [], isLoading: farmersLoading } = useFarmers(adminId);
  const { data: seasons = [], isLoading: seasonsLoading } = useSeasons(adminId);
  
  const [selectedFarmer, setSelectedFarmer] = useState<Farmer | null>(null);
  const [farmerDropdown, setFarmerDropdown] = useState(false);
  const [farmerSearch, setFarmerSearch] = useState("");
  const [amount, setAmount] = useState("");
  const [deductedStr, setDeductedStr] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [seasonId, setSeasonId] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(() => getEATDateString());
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterSeason, setFilterSeason] = useState("All");
  const [tableSearch, setTableSearch] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [editingAdvance, setEditingAdvance] = useState<any | null>(null);
  const [viewingAdvance, setViewingAdvance] = useState<any | null>(null);
  const [confirmConsolidate, setConfirmConsolidate] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { data: company } = useCompanyProfile(adminId);
  const printRef = React.useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Farmer_Advances_${new Date().toISOString().split('T')[0]}`,
  });

  const loading = (advancesLoading || farmersLoading || seasonsLoading) && advances.length === 0;
  const error = (advancesError as any)?.message || null;

  const DRAFT_KEY = 'advance_management_draft';

  // Load basic fields on mount
  useEffect(() => {
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        setAmount(parsed.amount || "");
        setUnitPrice(parsed.unitPrice || "");
        if (parsed.seasonId) setSeasonId(parsed.seasonId);
        setDate(parsed.date || getEATDateString());
        setNotes(parsed.notes || "");
      } catch (e) {
        console.error("Failed to load advance draft:", e);
      }
    }
    setDraftLoaded(true);
  }, []);

  // Resolve farmer once farmers are loaded
  useEffect(() => {
    if (draftLoaded && farmers.length > 0) {
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          if (parsed.farmerId) {
            const found = farmers.find(f => f.id === parsed.farmerId);
            if (found) setSelectedFarmer(found);
          }
        } catch (e) {}
      }
    }
  }, [draftLoaded, farmers]);

  // Save draft on change
  useEffect(() => {
    if (!draftLoaded) return;
    const draft = {
      farmerId: selectedFarmer?.id,
      amount,
      unitPrice,
      seasonId,
      date,
      notes
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [selectedFarmer, amount, unitPrice, seasonId, date, notes, draftLoaded]);

  // Auto-set active season
  useEffect(() => {
    if (seasons.length > 0 && !seasonId) {
      const activeSeason = seasons.find(s => s.is_active);
      if (activeSeason) {
        setSeasonId(activeSeason.id);
      }
    }
  }, [seasons, seasonId]);

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

  const groupedByFarmer = useMemo(() => {
    const groups: Record<string, any> = {};
    filteredAdvances.forEach(a => {
      const fId = a.farmer_id || a.farmers?.id || a.farmers?.name || 'unknown';
      if (!groups[fId]) {
        groups[fId] = {
          farmerId: fId,
          farmerName: a.farmers?.name || "Unknown",
          advances: [],
          totalGiven: 0,
          totalDeducted: 0,
          totalRemaining: 0,
          hasActiveStatus: false
        };
      }
      groups[fId].advances.push(a);
      groups[fId].totalGiven += (a.amount || 0);
      groups[fId].totalDeducted += (a.deducted || 0);
      groups[fId].totalRemaining += (a.remaining || 0);
      if (a.status === 'Active') groups[fId].hasActiveStatus = true;
    });
    return Object.values(groups).sort((a: any, b: any) => b.advances.length - a.advances.length);
  }, [filteredAdvances]);


  const handleSubmit = async () => {
    const e: Record<string, string> = {};
    if (!selectedFarmer) e.farmer = "Please select a farmer";
    if (!amount || parseFloat(amount) <= 0) e.amount = "Enter a valid amount";
    if (!seasonId) e.season = "Please select a season";
    
    setErrors(e);
    if (Object.keys(e).length === 0 && selectedFarmer && profile) {
      try {
        setSubmitting(true);
        const adminId = getEffectiveAdminId(profile);
        const advanceData: any = {
          farmer_id: selectedFarmer.id,
          amount: parseFloat(amount),
          season_id: seasonId,
          issue_date: date,
          notes,
          unit_price: unitPrice ? parseFloat(unitPrice) : undefined,
          admin_id: (adminId === 'SUPER_ADMIN' ? profile.id : adminId) || undefined,
        };

        if (!editingAdvance) {
          advanceData.deducted = 0;
        } else if (['Admin', 'Super Admin'].includes(profile?.role || '') && deductedStr !== "") {
          advanceData.deducted = parseFloat(deductedStr);
        }

        if (editingAdvance) {
          const finalDeducted = advanceData.deducted !== undefined ? advanceData.deducted : (editingAdvance.deducted || 0);
          const currentStatus = advanceData.amount <= finalDeducted ? 'Cleared' : 'Active';

          const updatePayload: any = {
            amount: advanceData.amount,
            season_id: advanceData.season_id,
            issue_date: advanceData.issue_date,
            notes: advanceData.notes,
            status: currentStatus,
          };
          
          if (advanceData.unit_price !== undefined) updatePayload.unit_price = advanceData.unit_price;
          if (advanceData.admin_id !== undefined) updatePayload.admin_id = advanceData.admin_id;
          if (advanceData.deducted !== undefined) updatePayload.deducted = advanceData.deducted;

          await advancesService.update(editingAdvance.id, updatePayload);
          setToast({ msg: "Advance updated successfully!", type: "success" });
        } else {
          // Check for existing active advance for this farmer in this season
          const existingActive = advances.find(a => {
            const fId = a.farmer_id || (a as any).farmers?.id;
            return (
              fId === selectedFarmer.id && 
              a.status === 'Active' && 
              a.season_id === seasonId
            );
          });

          if (existingActive) {
            const newAmt = parseFloat(amount);
            const topupHeader = `[Top-up ${date}]: UGX ${newAmt.toLocaleString()}`;
            const topupMsg = notes ? `${topupHeader} - ${notes}` : topupHeader;
            
            // Ensure even the first entry has a header if it didn't before
            const currentNotes = existingActive.notes || `[Initial ${existingActive.issue_date}]: UGX ${existingActive.amount.toLocaleString()}`;
            
            const newTotalAmount = (existingActive.amount || 0) + newAmt;
            const mergedData = {
              amount: newTotalAmount,
              notes: `${currentNotes}\n---\n${topupMsg}`,
              issue_date: date,
              unit_price: (unitPrice && parseFloat(unitPrice) > 0) ? parseFloat(unitPrice) : existingActive.unit_price,
              admin_id: advanceData.admin_id
            };
            await advancesService.update(existingActive.id, mergedData);
            setToast({ msg: `Added UGX ${newAmt.toLocaleString()} to existing active balance!`, type: "success" });
          } else {
            // Include header in the first entry as well for consistency
            const initialAdvance = {
              ...advanceData,
              notes: notes ? `[Initial ${date}]: UGX ${parseFloat(amount).toLocaleString()} - ${notes}` : `[Initial ${date}]: UGX ${parseFloat(amount).toLocaleString()}`
            };
            await advancesService.create({
              ...initialAdvance
            });
            setToast({ msg: "Advance recorded successfully!", type: "success" });
          }
        }
        setTimeout(() => setToast(null), 3000);
        
        localStorage.removeItem(DRAFT_KEY);
        handleReset();
        
        // Refresh all relevant queries by invalidating their prefixes
        queryClient.invalidateQueries({ queryKey: ['advances'] });
        queryClient.invalidateQueries({ queryKey: ['debt-summary'] });
        queryClient.invalidateQueries({ queryKey: ['purchases'] });
        queryClient.invalidateQueries({ queryKey: ['farmer'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      } catch (err: any) {
        setToast({ msg: err.message || "Failed to record advance", type: "error" });
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      try {
        const csvRows = [];
        csvRows.push(['Outstanding Farmer Advances Report']);
        csvRows.push([`Generated: ${new Date().toLocaleString()}`]);
        csvRows.push(['']);
        csvRows.push(['Farmer', 'Village', 'Date Given', 'Amount Given', 'Deducted', 'Balance', 'Status']);
        
        filteredAdvances.forEach(a => {
          csvRows.push([
            a.farmers?.name || "Unknown",
            a.farmers?.village || "",
            a.issue_date,
            a.amount,
            a.deducted || 0,
            a.remaining,
            a.status
          ]);
        });

        const csvString = csvRows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `Farmer_Advances_${new Date().toISOString().split('T')[0]}.csv`);
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

  const handleConsolidate = async (group: any) => {
    setConfirmConsolidate(group);
  };

  const executeConsolidation = async (group: any) => {
    const active = group.advances.filter((a: any) => a.status === 'Active');
    if (active.length <= 1) return;

    try {
      setSubmitting(true);
      const target = active[0];
      const others = active.slice(1);

      let totalAmount = target.amount || 0;
      let totalDeducted = target.deducted || 0;
      
      // Ensure the first record has a proper history header
      let mergedNotes = target.notes || `[Initial ${target.issue_date}]: UGX ${target.amount.toLocaleString()}`;

      for (const other of others) {
        totalAmount += (other.amount || 0);
        totalDeducted += (other.deducted || 0);
        
        // Append other records as top-ups
        const entryHeader = `[Top-up ${other.issue_date}]: UGX ${other.amount.toLocaleString()}`;
        const entryBody = other.notes ? (other.notes.includes(']:') ? other.notes.split('\n---\n').pop() : other.notes) : '';
        const entry = entryBody ? `${entryHeader} - ${entryBody}` : entryHeader;
        
        mergedNotes += `\n---\n${entry}`;
      }

      // 1. Update the main record with combined totals
      await advancesService.update(target.id, {
        amount: totalAmount,
        deducted: totalDeducted,
        notes: mergedNotes
      });

      // 2. Delete the extra records
      for (const other of others) {
        await advancesService.delete(other.id);
      }

      setToast({ msg: `Consolidated ${active.length} advances for ${group.farmerName}`, type: "success" });
      setConfirmConsolidate(null);
      queryClient.invalidateQueries({ queryKey: ['advances', adminId] });
    } catch (err: any) {
      console.error("Consolidation error:", err);
      setToast({ msg: "Failed to consolidate advances", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSelectedFarmer(null);
    setFarmerSearch("");
    setAmount("");
    setDeductedStr("");
    setNotes("");
    setUnitPrice("");
    setDate(getEATDateString());
    setErrors({});
    setEditingAdvance(null);
    localStorage.removeItem(DRAFT_KEY);
  };

  const handleEdit = (advance: any) => {
    setEditingAdvance(advance);
    setViewingAdvance(null);
    setSelectedFarmer(advance.farmers || farmers.find(f => f.id === advance.farmer_id) || null);
    setFarmerSearch(advance.farmers?.name || "");
    setAmount(String(advance.amount || ""));
    setDeductedStr(String(advance.deducted || "0"));
    setUnitPrice(advance.unit_price ? String(advance.unit_price) : "");
    setSeasonId(advance.season_id);
    setDate(advance.issue_date);
    setNotes(advance.notes || "");
    setExpandedId(null); // Close expansion if open
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
          onRetry={() => refetchAdvances()} 
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
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#6B7280", marginTop: "2px" }}>Track and manage client advance payments</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard icon={CreditCard} label="Total Advances Given" value={formatUGX(totalGiven)} sub="all time" color="#14532D" bgColor="#f0fdf4" />
        <StatCard icon={AlertCircle} label="Outstanding Balance" value={formatUGX(outstanding)} sub="to be recovered" color="#DC2626" bgColor="#fef2f2" />
        <StatCard icon={Users} label="Active Advances" value={`${activeCount}`} sub="clients with balance" color="#F59E0B" bgColor="#fffbeb" />
      </div>

      {/* Main Split Layout */}
      <div className="flex flex-col lg:flex-row gap-5">
        {/* Left: New Advance Form */}
        <div className="lg:w-80 flex-shrink-0">
          <div className="bg-white rounded-xl overflow-hidden sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto custom-scrollbar" style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.05)", border: "1px solid #F1F5F9" }}>
            <div className="px-5 py-4" style={{ backgroundColor: editingAdvance ? "#1D4ED8" : "#14532D" }}>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: "15px", fontWeight: 600, color: "#fff" }}>
                {editingAdvance ? "Edit Advance" : "Record New Advance"}
              </div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: editingAdvance ? "#BFDBFE" : "#86efac", marginTop: "2px" }}>
                {editingAdvance ? `Modifying ${editingAdvance.id}` : "Enter advance details below"}
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Farmer Select */}
              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "6px" }}>
                  Client Name <span style={{ color: "#DC2626" }}>*</span>
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
                        placeholder="Search client..."
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

              {/* Unit Price (Optional) */}
              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "6px" }}>
                  Unit Price (Optional)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#9CA3AF" }}>UGX</span>
                  <input
                    type="number"
                    min="0"
                    value={unitPrice}
                    onChange={e => setUnitPrice(e.target.value)}
                    placeholder="Agreed price per kg"
                    className={inputBase()}
                    style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#374151", paddingLeft: "48px" }}
                  />
                </div>
                
                {editingAdvance && ['Admin', 'Super Admin'].includes(profile?.role || '') && (
                  <div className="mt-4 p-3 rounded-xl" style={{ border: "1px solid #FECACA", backgroundColor: "#FFF5F5" }}>
                    <label style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 700, color: "#DC2626", display: "block", marginBottom: "6px" }}>⚠️ Manual Deducted Override</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-semibold" style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#9CA3AF" }}>UGX</span>
                      <input
                        type="number"
                        value={deductedStr}
                        onChange={e => setDeductedStr(e.target.value)}
                        placeholder="e.g. 392000"
                        className={inputBase()}
                        style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#DC2626", paddingLeft: "48px", border: "1px solid #FECACA", backgroundColor: "#FEF2F2" }}
                      />
                    </div>
                    <p style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", color: "#9B1C1C", marginTop: "6px", lineHeight: "1.4" }}>
                      Use this ONLY to correct a balance after a purchase was deleted. Set to the correct total amount already recovered from this advance.
                    </p>
                  </div>
                )}
                
                {unitPrice && parseFloat(unitPrice) > 0 && amount && parseFloat(amount) > 0 && (
                  <div className="mt-2 p-2.5 rounded-lg bg-green-50 border border-green-100 flex items-center justify-between">
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#14532D", fontWeight: 600 }}>Expected KGs:</span>
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#14532D", fontWeight: 700 }}>
                      {(parseFloat(amount) / parseFloat(unitPrice)).toFixed(2)} kg
                    </span>
                  </div>
                )}
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
                  style={{ 
                    backgroundColor: editingAdvance ? "#1D4ED8" : "#14532D", 
                    color: "#fff", 
                    fontFamily: "Inter, sans-serif", 
                    fontSize: "14px", 
                    fontWeight: 600, 
                    boxShadow: editingAdvance ? "0 4px 12px rgba(29,78,216,0.25)" : "0 4px 12px rgba(20,83,45,0.25)" 
                  }}
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : editingAdvance ? <Check size={15} /> : <Plus size={15} />}
                  {editingAdvance ? "Save Changes" : "Record Advance"}
                </button>
                {editingAdvance && (
                  <button
                    onClick={handleReset}
                    className="w-full py-2.5 text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Cancel Edit
                  </button>
                )}
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
                      placeholder="Search client..."
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
                <button
                  onClick={() => handlePrint()}
                  className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all font-bold flex items-center gap-2"
                  style={{ fontFamily: 'Inter', fontSize: '12px' }}
                >
                  <Printer size={14} /> Print Statement
                </button>
                <button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all font-bold flex items-center gap-2 disabled:opacity-50"
                  style={{ fontFamily: 'Inter', fontSize: '12px' }}
                >
                  {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  Export CSV
                </button>
              </div>
            </div>
          </div>

          <div className="hidden">
            <FarmerAdvancesPrint ref={printRef} advances={filteredAdvances} company={company || null} />
          </div>

            {/* Desktop View */}
          <div className="hidden lg:block overflow-x-auto max-h-[600px]">
            <table className="w-full relative">
              <thead className="sticky top-0 z-10" style={{ backgroundColor: "#F8FAFC" }}>
                <tr>
                  <th className="px-2 py-3 w-8"></th>
                  <th className="px-2 py-3 text-left" style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase" }}>Client</th>
                  <th className="px-2 py-3 text-left" style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase" }}>Advances Count</th>
                  <th className="px-2 py-3 text-left" style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase" }}>Total Given</th>
                  <th className="px-2 py-3 text-left" style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase" }}>Total Deducted</th>
                  <th className="px-2 py-3 text-left" style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase" }}>Balance</th>
                  <th className="px-2 py-3 text-left" style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {groupedByFarmer.map(group => {
                  const isExpanded = expandedId === group.farmerId;
                  return (
                    <React.Fragment key={group.farmerId}>
                      <tr onClick={() => setExpandedId(isExpanded ? null : group.farmerId)} className="border-t border-gray-50 hover:bg-[#f0fdf4] transition-colors cursor-pointer">
                        <td className="px-3 py-4 text-center">
                          <ChevronDown size={14} color="#6B7280" className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                        </td>
                        <td className="px-2 py-4">
                          <div style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 600, color: "#111827" }}>{group.farmerName}</div>
                          <div className="flex flex-col gap-0.5">
                            {group.advances[0]?.farmers?.village && (
                              <div style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", color: "#6B7280" }}>{group.advances[0].farmers.village}</div>
                            )}
                            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "9px", color: "#9CA3AF" }} className="truncate max-w-[120px]">
                              ID: {group.farmerId}
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-4">
                          <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 500, color: "#4B5563", backgroundColor: "#F3F4F6", padding: "2px 8px", borderRadius: "12px" }}>
                            {group.advances.length} Advance(s)
                          </span>
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap" style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600, color: "#111827" }}>
                          {formatUGX(group.totalGiven)}
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap" style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 500, color: "#16A34A" }}>
                          {formatUGX(group.totalDeducted)}
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap">
                          {group.totalRemaining > 0 ? (
                             <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 700, color: "#DC2626" }}>
                               {formatUGX(group.totalRemaining)}
                             </span>
                          ) : (
                            <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600, color: "#16A34A" }}>Cleared</span>
                          )}
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            {group.advances.filter((ax: any) => ax.status === 'Active').length > 1 && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleConsolidate(group); }}
                                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 transition-all font-bold"
                                style={{ fontFamily: 'Inter', fontSize: '10px', textTransform: 'uppercase' }}
                              >
                                <Plus size={10} /> Merge
                              </button>
                            )}
                            <Badge status={group.hasActiveStatus ? "Active" : "Cleared"} />
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="p-0 border-b border-gray-50 bg-[#F8FAFC]">
                            <div className="p-4 pl-12">
                              <table className="w-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                                <thead className="bg-[#F1F5F9]">
                                  <tr>
                                    {["Given", "Deducted", "Balance", "Expected Price", "Expected Return", "Status", "Date", ...(profile?.role === 'Super Admin' ? ["Admin"] : []), "Action"].map(h => (
                                      <th key={h} className="px-3 py-2.5 text-left" style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase" }}>{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {group.advances.map((a: any) => (
                                    <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                                      <td className="px-3 py-2.5 whitespace-nowrap" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#111827" }}>{formatUGX(a.amount)}</td>
                                      <td className="px-3 py-2.5 whitespace-nowrap" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#16A34A" }}>{formatUGX(a.deducted)}</td>
                                      <td className="px-3 py-2.5 whitespace-nowrap">
                                        {a.remaining > 0 ? (
                                          <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 700, color: "#DC2626" }}>{formatUGX(a.remaining)}</span>
                                        ) : (
                                          <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#16A34A" }}>Cleared</span>
                                        )}
                                      </td>
                                      <td className="px-3 py-2.5 whitespace-nowrap" style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#6B7280" }}>{a.unit_price ? `UGX ${a.unit_price.toLocaleString()}/kg` : "—"}</td>
                                      <td className="px-3 py-2.5 whitespace-nowrap" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#14532D" }}>{a.unit_price ? `${(a.amount / a.unit_price).toFixed(1)} kg` : "—"}</td>
                                      <td className="px-3 py-2.5 whitespace-nowrap"><Badge status={a.status} /></td>
                                      <td className="px-3 py-2.5 whitespace-nowrap" style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#6B7280" }}>{a.issue_date}</td>
                                      {profile?.role === 'Super Admin' && (
                                        <td className="px-3 py-2.5 whitespace-nowrap">
                                          <span className="px-2 py-0.5 rounded-md" style={{ backgroundColor: "#f3f4f6", color: "#4b5563", fontFamily: "Inter, sans-serif", fontSize: "10px", fontWeight: 600 }}>{a.admin?.full_name || 'System'}</span>
                                        </td>
                                      )}
                                      <td className="px-3 py-2.5">
                                        <div className="flex items-center gap-1.5">
                                          <button 
                                            onClick={() => handleEdit(a)}
                                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-blue-50 transition-colors whitespace-nowrap" 
                                            style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 500, color: "#1D4ED8", backgroundColor: "#EFF6FF" }}
                                          >
                                            <Pencil size={11} /> Edit
                                          </button>
                                          <button 
                                            onClick={() => setViewingAdvance(a)}
                                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-green-100 transition-colors whitespace-nowrap" 
                                            style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 500, color: "#14532D", backgroundColor: "#f0fdf4" }}
                                          >
                                            <Eye size={11} /> View
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
            {groupedByFarmer.length === 0 && (
              <div className="py-12 text-center">
                <div className="text-4xl mb-3">💳</div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#6B7280" }}>No advances match your filter</div>
              </div>
            )}
          </div>

            {/* Mobile View */}
            <div className="lg:hidden flex flex-col divide-y divide-gray-50">
              {groupedByFarmer.map(group => {
                const isExpanded = expandedId === group.farmerId;
                return (
                  <div key={group.farmerId} className="flex flex-col bg-white">
                    <div 
                      className={`p-4 flex justify-between items-center w-full cursor-pointer transition-colors ${isExpanded ? 'bg-[#F8FAFC]' : ''}`}
                      onClick={() => setExpandedId(isExpanded ? null : group.farmerId)}
                    >
                      <div className="flex flex-col min-w-0 pr-3">
                        <div style={{ fontFamily: "Inter, sans-serif", fontSize: "15px", fontWeight: 600, color: "#111827" }} className="truncate">
                          {group.farmerName}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#4B5563", backgroundColor: "#F3F4F6", padding: "2px 8px", borderRadius: "12px", fontWeight: 500 }}>
                            {group.advances.length} Advance(s)
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right border-r border-gray-200 pr-3">
                          <div style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 700, color: group.totalRemaining > 0 ? "#DC2626" : "#16A34A" }}>
                            {formatUGX(group.totalRemaining)}
                          </div>
                          <div style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#6B7280" }}>Balance</div>
                        </div>
                        <div className={`p-1.5 rounded-full ${isExpanded ? 'bg-gray-200/50' : 'bg-gray-50'}`}>
                          <ChevronDown size={16} color="#6B7280" className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                        </div>
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div className="bg-[#F8FAFC] pb-4 px-3 flex flex-col gap-3 border-t border-gray-100 shadow-inner">
                        {group.advances.map((a: any) => (
                          <div key={a.id} className="mt-3 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                               <div className="flex items-center gap-2">
                                  <Badge status={a.status} />
                               </div>
                               <span style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", color: "#6B7280" }}>{a.seasons?.name || "N/A"} • {a.issue_date}</span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-y-3 gap-x-2 bg-gray-50/50 p-2.5 rounded-lg border border-gray-100">
                              <div>
                                <div style={{ fontFamily: "Inter", fontSize: "10px", color: "#9CA3AF", textTransform: "uppercase", fontWeight: 600 }}>Given</div>
                                <div style={{ fontFamily: "Inter", fontSize: "12px", fontWeight: 600, color: "#111827" }}>{formatUGX(a.amount)}</div>
                              </div>
                              <div>
                                <div style={{ fontFamily: "Inter", fontSize: "10px", color: "#9CA3AF", textTransform: "uppercase", fontWeight: 600 }}>Deducted</div>
                                <div style={{ fontFamily: "Inter", fontSize: "12px", fontWeight: 600, color: "#16A34A" }}>{formatUGX(a.deducted)}</div>
                              </div>
                              
                              <div className="col-span-2 pt-2 border-t border-gray-200/60 mt-1 flex justify-between items-center">
                                <div style={{ fontFamily: "Inter", fontSize: "11px", color: "#6B7280", fontWeight: 500 }}>Balance</div>
                                <div>
                                  {a.remaining > 0 ? (
                                     <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 700, color: "#DC2626" }}>{formatUGX(a.remaining)}</span>
                                  ) : (
                                     <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#16A34A" }}>Cleared</span>
                                  )}
                                </div>
                              </div>
                              
                              {a.unit_price && (
                                <div className="col-span-2 pt-2 border-t border-gray-200/60 mt-1 flex justify-between items-center">
                                  <div style={{ fontFamily: "Inter", fontSize: "11px", color: "#6B7280", fontWeight: 500 }}>Expected Return</div>
                                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 700, color: "#14532D" }}>
                                    {(a.amount / a.unit_price).toFixed(1)} kg @ {formatUGX(a.unit_price)}/kg
                                  </div>
                                </div>
                              )}
                              
                              {profile?.role === 'Super Admin' && (
                                <div className="col-span-2 pt-2 border-t border-gray-200/60 mt-1 flex justify-between items-center">
                                  <div style={{ fontFamily: "Inter", fontSize: "11px", color: "#6B7280", fontWeight: 500 }}>Admin Branch</div>
                                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600, color: "#4b5563" }}>
                                    {a.admin?.full_name || 'System'}
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-gray-100">
                              <button 
                                onClick={() => handleEdit(a)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors" 
                                style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 500 }}
                              >
                                <Pencil size={12} /> Edit
                              </button>
                              <button 
                                onClick={() => setViewingAdvance(a)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors" 
                                style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 500 }}
                              >
                                <Eye size={12} /> View Details
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {groupedByFarmer.length === 0 && (
                <div className="py-12 text-center">
                  <div className="text-4xl mb-3">💳</div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#6B7280" }}>No advances match your filter</div>
                </div>
              )}
            </div>

            {/* Table Footer */}
            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between" style={{ backgroundColor: "#F8FAFC" }}>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#6B7280" }}>
                Showing {groupedByFarmer.length} distinct farmer(s) for {filteredAdvances.length} advances
              </span>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, backgroundColor: "#fef2f2", color: "#DC2626" }}>
                  Outstanding: {formatUGX(filteredAdvances.filter(a => a.status === "Active").reduce((s, a) => s + (a.remaining || 0), 0))}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <MergeConfirmationModal 
        isOpen={!!confirmConsolidate}
        onClose={() => setConfirmConsolidate(null)}
        onConfirm={() => executeConsolidation(confirmConsolidate)}
        group={confirmConsolidate}
        loading={submitting}
      />
      <AdvanceDetailsModal 
        isOpen={!!viewingAdvance}
        onClose={() => setViewingAdvance(null)}
        advance={viewingAdvance}
      />
    </Layout>
  );
}

function MergeConfirmationModal({ isOpen, onClose, onConfirm, group, loading }: { isOpen: boolean, onClose: () => void, onConfirm: () => void, group: any, loading: boolean }) {
  if (!isOpen || !group) return null;
  const activeCount = group.advances.filter((a: any) => a.status === 'Active').length;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-md my-auto overflow-hidden shadow-2xl animate-in fade-in zoom-in slide-in-from-bottom-4 duration-300">
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
             <AlertCircle size={32} className="text-amber-600" />
          </div>
          <h3 style={{ fontFamily: "Inter", fontSize: "18px", fontWeight: 700, color: "#111827", marginBottom: "8px" }}>Consolidate Advances?</h3>
          <p style={{ fontFamily: "Inter", fontSize: "14px", color: "#4B5563", lineHeight: 1.5 }}>
            You are about to merge <span className="font-bold text-gray-900">{activeCount} active advances</span> for <strong>{group.farmerName}</strong> into a single cumulative record.
          </p>
          
          <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-100 text-left">
            <div className="flex justify-between items-center mb-2">
               <span style={{ fontSize: "12px", color: "#6B7280" }}>New Combined Given</span>
               <span style={{ fontSize: "13px", fontWeight: 700, color: "#111827" }}>{formatUGX(group.totalGiven)}</span>
            </div>
            <div className="flex justify-between items-center">
               <span style={{ fontSize: "12px", color: "#6B7280" }}>New Combined Balance</span>
               <span style={{ fontSize: "13px", fontWeight: 700, color: "#DC2626" }}>{formatUGX(group.totalRemaining)}</span>
            </div>
          </div>
          
          <div className="mt-4 flex items-start gap-2 text-left">
             <div className="mt-0.5"><Check size={14} className="text-green-600" /></div>
             <p style={{ fontSize: "11px", color: "#4B5563" }}>Full transaction history will be preserved in the notes.</p>
          </div>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
          <button 
            disabled={loading}
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold text-sm hover:bg-gray-100 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button 
            disabled={loading}
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 rounded-xl bg-amber-600 text-white font-bold text-sm hover:bg-amber-700 transition-all shadow-lg shadow-amber-200 flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <TrendingUp size={16} />}
            {loading ? "Merging..." : "Confirm Merge"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AdvanceDetailsModal({ isOpen, onClose, advance }: { isOpen: boolean; onClose: () => void; advance: any }) {
  if (!isOpen || !advance) return null;

  const historyEntries = (advance.notes || `[Initial ${advance.issue_date}]: UGX ${advance.amount.toLocaleString()}`)
    .split('\n---\n')
    .map((entry: string) => {
        const regex = /^\[(Initial|Top-up) ([\d-]+)\]: (.*)$/;
        const match = entry.trim().match(regex);
        let type = 'note', date = advance.issue_date, content = entry.trim();
        
        if (match) {
          type = match[1]?.toLowerCase() === 'initial' ? 'initial' : 'topup';
          date = match[2];
          content = match[3];
        }

        // Try to separate Amount from Note in content
        // Expected: "UGX 100,000 - School Fees"
        let displayAmount = '';
        let displayNote = content;
        
        const amountMatch = content.match(/^(UGX [\d,]+)(?:\s*-\s*(.*))?$/);
        if (amountMatch) {
          displayAmount = amountMatch[1];
          displayNote = amountMatch[2] || '';
        }

        return { type, date, displayAmount, displayNote, original: entry };
      });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg my-auto overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="p-6 bg-[#14532D] text-white flex justify-between items-start">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <CreditCard size={20} color="#86efac" />
             </div>
             <div>
                <div style={{ fontFamily: "Inter", fontSize: "11px", fontWeight: 600, color: "#86efac", textTransform: "uppercase", letterSpacing: "0.05em" }}>Client Advance Account</div>
                <h2 style={{ fontFamily: "Inter", fontSize: "20px", fontWeight: 700 }}>{advance.farmers?.name || 'Unknown Farmer'}</h2>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total Issued', value: formatUGX(advance.amount), color: '#111827', bg: '#f8fafc' },
              { label: 'Total Paid', value: formatUGX(advance.deducted), color: '#16A34A', bg: '#f0fdf4' },
              { label: 'Outstanding', value: formatUGX(advance.remaining), color: advance.remaining > 0 ? '#DC2626' : '#16A34A', bg: advance.remaining > 0 ? '#fff5f5' : '#f0fdf4' }
            ].map(s => (
              <div key={s.label} className="p-3 rounded-xl border border-gray-100" style={{ backgroundColor: s.bg }}>
                <div style={{ fontFamily: "Inter", fontSize: "9px", color: "#6B7280", fontWeight: 700, textTransform: "uppercase", marginBottom: "4px" }}>{s.label}</div>
                <div style={{ fontFamily: "Inter", fontSize: "12px", fontWeight: 700, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Breakdown Timeline */}
          <div>
            <div className="flex items-center justify-between mb-5">
              <div style={{ fontFamily: "Inter", fontSize: "14px", fontWeight: 700, color: "#111827" }}>Transaction History</div>
              <div className="px-2 py-1 bg-gray-100 rounded text-[10px] font-bold text-gray-500 uppercase">{advance.seasons?.name || 'N/A'}</div>
            </div>
            
            <div className="space-y-6">
              {historyEntries.map((entry: any, i: number) => (
                <div key={i} className="relative pl-7 border-l-2 border-gray-100 pb-1">
                  {/* Timeline Dot */}
                  <div className={`absolute -left-[9.5px] top-0 w-4 h-4 rounded-full border-4 border-white shadow-sm ${entry.type === 'initial' ? 'bg-green-600' : (entry.type === 'topup' ? 'bg-amber-500' : 'bg-gray-400')}`} />
                  
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <span style={{ fontFamily: "Inter", fontSize: "10px", fontWeight: 800, color: entry.type === 'initial' ? '#14532D' : (entry.type === 'topup' ? '#92400e' : '#6B7280'), textTransform: 'uppercase' }}>
                        {entry.type === 'initial' ? 'Initial Advance' : (entry.type === 'topup' ? 'Additional Top-up' : 'Note/Comment')}
                      </span>
                      <span style={{ fontFamily: "Inter", fontSize: "11px", fontWeight: 500, color: "#9CA3AF" }}>{entry.date}</span>
                    </div>
                    
                    <div style={{ fontFamily: "Inter", fontSize: "14px", color: "#1F2937", lineHeight: 1.4 }}>
                      {entry.displayAmount ? (
                        <>Client received <span className="font-bold text-gray-900">{entry.displayAmount}</span></>
                      ) : (
                        <span className="italic text-gray-600">{entry.displayNote || 'Record captured'}</span>
                      )}
                    </div>
                    
                    {entry.displayAmount && entry.displayNote && (
                      <div className="mt-1 flex items-start gap-1.5 p-2 rounded-lg bg-gray-50 border border-gray-100">
                        <Info size={12} className="text-gray-400 mt-0.5" />
                        <p style={{ fontFamily: "Inter", fontSize: "12px", color: "#6B7280", fontStyle: 'italic' }}>{entry.displayNote}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {advance.unit_price && (
             <div className="p-4 bg-green-50 rounded-2xl border border-green-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                      <TrendingUp size={18} color="#15803d" />
                   </div>
                   <div>
                      <div style={{ fontFamily: "Inter", fontSize: "11px", color: "#15803d", fontWeight: 700, textTransform: "uppercase" }}>Expected Return</div>
                      <div style={{ fontFamily: "Inter", fontSize: "15px", fontWeight: 800, color: "#064e3b" }}>{(advance.amount / advance.unit_price).toFixed(1)} kg <span className="text-[11px] font-medium text-green-600 uppercase ml-1">of coffee</span></div>
                   </div>
                </div>
                <div className="text-right">
                   <div style={{ fontFamily: "Inter", fontSize: "11px", color: "#15803d", fontWeight: 700, textTransform: "uppercase" }}>Agreed Price</div>
                   <div style={{ fontFamily: "Inter", fontSize: "14px", fontWeight: 700, color: "#064e3b" }}>{formatUGX(advance.unit_price)}/kg</div>
                </div>
             </div>
          )}
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold text-sm hover:bg-gray-50 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

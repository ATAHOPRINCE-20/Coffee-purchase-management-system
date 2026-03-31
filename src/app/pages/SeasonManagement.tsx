import React, { useState, useEffect } from "react";
import { Layout } from "../components/Layout";
import { Plus, CheckCircle2, ChevronDown, Calendar, AlertCircle, Loader2 } from "lucide-react";
import { seasonsService, Season } from "../services/seasonsService";
import { useAuth, getEffectiveAdminId } from "../hooks/useAuth";
import { getEATDateString } from "../utils/dateUtils";
import { supabase } from "../lib/supabase";

export default function SeasonManagement() {
  const { profile } = useAuth();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // New Season Form State
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [startDate, setStartDate] = useState(() => getEATDateString());
  const [endDate, setEndDate] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const DRAFT_KEY = 'season_management_draft';

  // Load draft on mount
  useEffect(() => {
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        setNewName(parsed.newName || "");
        setStartDate(parsed.startDate || getEATDateString());
        setEndDate(parsed.endDate || "");
      } catch (e) {
        console.error("Failed to load draft:", e);
      }
    }
  }, []);

  // Save draft on change
  useEffect(() => {
    const draft = { newName, startDate, endDate };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [newName, startDate, endDate]);

  const fetchSeasons = async () => {
    try {
      setLoading(true);
      setError(null);
      const adminId = getEffectiveAdminId(profile);
      if (!adminId) return;
      
      const data = await seasonsService.getAll(adminId);
      setSeasons(data);
    } catch (err: any) {
      setError(err.message || "Failed to load seasons");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSeasons();
  }, [profile]);

  const handleCreate = async () => {
    if (!newName || !startDate || !endDate) {
      setError("Please fill in all fields (Name, Start Date, End Date)");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const adminId = getEffectiveAdminId(profile);
      if (!adminId) return;

      const { error: insertError } = await supabase
        .from('seasons')
        .insert({
          name: newName,
          start_date: startDate,
          end_date: endDate,
          is_active: seasons.length === 0, // auto-activate if it's the first one
          admin_id: adminId
        });

      if (insertError) throw insertError;

      setNewName("");
      setEndDate("");
      setShowForm(false);
      localStorage.removeItem(DRAFT_KEY);
      await fetchSeasons();
    } catch (err: any) {
      setError(err.message || "Failed to create season");
    } finally {
      setSubmitting(false);
    }
  };

  const handleActivate = async (id: string) => {
    try {
      setSubmitting(true);
      setError(null);
      const adminId = getEffectiveAdminId(profile);
      if (!adminId) return;

      // 1. Deactivate all seasons for this admin
      await supabase
        .from('seasons')
        .update({ is_active: false })
        .eq('admin_id', adminId);

      // 2. Activate the selected one
      await supabase
        .from('seasons')
        .update({ is_active: true })
        .eq('id', id)
        .eq('admin_id', adminId);

      await fetchSeasons();
    } catch (err: any) {
      setError(err.message || "Failed to activate season");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout breadcrumbs={[{ label: "System" }, { label: "Season Management" }]}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ fontFamily: "Inter, sans-serif", fontSize: "22px", fontWeight: 700, color: "#111827" }}>Seasons</h1>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#6B7280", marginTop: "2px" }}>Manage harvesting seasons and set the active one</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-[#14532D] text-white rounded-xl font-semibold hover:bg-green-800 transition-all text-sm"
        >
          <Plus size={16} />
          {showForm ? "Cancel" : "New Season"}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3 text-red-800 text-sm">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {showForm && (
        <div className="mb-6 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Create New Season</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Season Name</label>
              <input
                type="text"
                placeholder="e.g. October 2024 - March 2025"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-[#14532D] focus:ring-2 focus:ring-green-50 transition-all text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-[#14532D] focus:ring-2 focus:ring-green-50 transition-all text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-[#14532D] focus:ring-2 focus:ring-green-50 transition-all text-sm"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
             <button
                onClick={handleCreate}
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#14532D] text-white rounded-xl font-bold hover:bg-green-800 transition-all text-sm disabled:opacity-50"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Create Season
              </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Desktop View */}
        <div className="hidden lg:block overflow-x-auto max-h-[600px]">
          <table className="w-full text-left relative">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Season Name</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Duration</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center">
                  <Loader2 className="w-8 h-8 text-green-700 animate-spin mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">Loading seasons...</p>
                </td>
              </tr>
            ) : seasons.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center">
                  <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No seasons found</p>
                  <p className="text-gray-400 text-sm mt-1">Create your first season using the button above.</p>
                </td>
              </tr>
            ) : (
              seasons.map(season => (
                <tr key={season.id} className={`hover:bg-gray-50/50 transition-colors ${season.is_active ? 'bg-green-50/30' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-gray-900">{season.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600 flex items-center gap-2">
                       <Calendar size={14} className="text-gray-400" />
                       {new Date(season.start_date).toLocaleDateString()} - {new Date(season.end_date).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {season.is_active ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
                        <CheckCircle2 size={12} />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {!season.is_active && (
                      <button
                        onClick={() => handleActivate(season.id)}
                        disabled={submitting}
                        className="text-xs font-bold px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
                      >
                         Make Active
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="lg:hidden flex flex-col divide-y divide-gray-50">
          {loading ? (
             <div className="px-6 py-12 text-center">
               <Loader2 className="w-8 h-8 text-green-700 animate-spin mx-auto mb-2" />
               <p className="text-gray-500 text-sm">Loading seasons...</p>
             </div>
          ) : seasons.length === 0 ? (
             <div className="px-6 py-12 text-center">
               <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
               <p className="text-gray-500 font-medium">No seasons found</p>
               <p className="text-gray-400 text-sm mt-1">Create your first season using the button above.</p>
             </div>
          ) : (
            seasons.map(season => {
              const isExpanded = expandedId === season.id;
              return (
                <div key={season.id} className={`p-4 flex flex-col bg-white ${season.is_active ? 'bg-green-50/20' : ''}`}>
                  <div 
                    className="flex justify-between items-center w-full cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : season.id)}
                  >
                    <div className="flex flex-col min-w-0 pr-3">
                      <div style={{ fontFamily: "Inter, sans-serif", fontSize: "15px", fontWeight: 600, color: "#111827" }} className="truncate">
                        {season.name}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {season.is_active ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-800 uppercase tracking-wide">
                          <CheckCircle2 size={10} /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500 uppercase tracking-wide">
                          Inactive
                        </span>
                      )}
                      <ChevronDown size={18} color="#9CA3AF" className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-3 animate-in slide-in-from-top-2 duration-200">
                      <div className="bg-gray-50 p-3 rounded-xl border border-gray-100/60 flex items-center gap-2">
                        <Calendar size={14} className="text-gray-400" />
                        <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#374151", fontWeight: 500 }}>
                          {new Date(season.start_date).toLocaleDateString()} - {new Date(season.end_date).toLocaleDateString()}
                        </span>
                      </div>
                      
                      {!season.is_active && (
                        <button
                          onClick={() => handleActivate(season.id)}
                          disabled={submitting}
                          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all disabled:opacity-50"
                          style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600, color: "#14532D", backgroundColor: "#f0fdf4", border: "1px solid #dcfce7" }}
                        >
                          <CheckCircle2 size={15} /> Make Active Season
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </Layout>
  );
}

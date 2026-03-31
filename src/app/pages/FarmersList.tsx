import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Layout } from "../components/Layout";
import { Search, Plus, Eye, Phone, MapPin, Loader2, ChevronDown, Users } from "lucide-react";
import { farmersService, Farmer } from "../services/farmersService";
import { purchasesService } from "../services/purchasesService";
import { advancesService } from "../services/advancesService";
import { useAuth, getEffectiveAdminId } from "../hooks/useAuth";
import { ErrorState } from "../components/ErrorState";
import { supabase } from "../lib/supabase";

function formatUGX(v: number) {
  return `UGX ${v.toLocaleString()}`;
}

export default function FarmersList() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [search, setSearch] = useState("");
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [enriched, setEnriched] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adminNames, setAdminNames] = useState<Record<string, string>>({});
  const [collapsedAdmins, setCollapsedAdmins] = useState<Record<string, boolean>>({});



  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const adminId = getEffectiveAdminId(profile);
      if (!adminId) return;
      const [farmersData, purchasesData, advancesData] = await Promise.all([
        farmersService.getAll(adminId),
        purchasesService.getAll(adminId),
        advancesService.getAll(adminId)
      ]);

      const enrichedData = farmersData.map(f => {
        const farmerPurchases = (purchasesData as any[]).filter(p => p.farmer_id === f.id);
        const farmerAdvance = (advancesData as any[]).find(a => a.farmer_id === f.id && a.status === "Active");
        const totalValue = farmerPurchases.reduce((sum, p) => sum + (p.total_amount || 0), 0);
        const totalWeight = farmerPurchases.reduce((sum, p) => sum + (p.payable_weight || 0), 0);
        return { 
          ...f, 
          deliveries: farmerPurchases.length, 
          totalValue, 
          totalWeight, 
          advanceBalance: farmerAdvance?.remaining || 0, 
          advanceStatus: farmerAdvance?.status || "None" 
        };
      });

      setFarmers(farmersData);
      setEnriched(enrichedData);

      // Fetch admin names for Super Admin grouping
      if (profile?.role === 'Super Admin') {
        const adminIds = [...new Set(farmersData.map(f => f.admin_id).filter(Boolean))] as string[];
        if (adminIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', adminIds);
          const nameMap: Record<string, string> = {};
          (profiles || []).forEach((p: any) => { nameMap[p.id] = p.full_name; });
          setAdminNames(nameMap);
        }
      }
    } catch (err: any) {
      console.error("Error fetching farmers:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = enriched.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.village?.toLowerCase().includes(search.toLowerCase()) ||
    f.phone?.includes(search)
  );

  const totalFarmers = farmers.length;
  const activeFarmers = enriched.filter(f => f.deliveries > 0 || f.advanceBalance > 0).length;
  const totalSupplied = enriched.reduce((sum, f) => sum + f.totalWeight, 0);
  const totalValuePaid = enriched.reduce((sum, f) => sum + f.totalValue, 0);
  const isSuperAdmin = profile?.role === 'Super Admin';

  // Group filtered farmers by admin_id for Super Admin
  const adminGroups: { adminId: string; adminName: string; farmers: any[] }[] = [];
  if (isSuperAdmin) {
    const groupMap: Record<string, any[]> = {};
    filtered.forEach(f => {
      const aid = f.admin_id || 'unknown';
      if (!groupMap[aid]) groupMap[aid] = [];
      groupMap[aid].push(f);
    });
    Object.entries(groupMap)
      .sort((a, b) => (adminNames[b[0]] || '').localeCompare(adminNames[a[0]] || ''))
      .forEach(([adminId, farmers]) => {
        adminGroups.push({ adminId, adminName: adminNames[adminId] || 'Unknown Admin', farmers });
      });
  }

  if (loading) {
    return (
      <Layout breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Clients" }]}>
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-green-700 animate-spin mb-4" />
          <p className="text-gray-500 font-medium">Loading clients list...</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Clients" }]}>
        <ErrorState 
          title="Couldn't Load Clients" 
          message={error} 
          onRetry={fetchData} 
        />
      </Layout>
    );
  }


  return (
    <Layout breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Clients" }]}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ fontFamily: "Inter, sans-serif", fontSize: "22px", fontWeight: 700, color: "#111827" }}>Clients</h1>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#6B7280", marginTop: "2px" }}>{farmers.length} registered clients this season</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={() => navigate("/farmers/new")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all hover:opacity-90"
            style={{ backgroundColor: "#14532D", color: "#fff", fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600 }}
          >
            <Plus size={15} />
            Add Client
          </button>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-xl" style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.05)", border: "1px solid #F1F5F9" }}>
        {/* Table Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 600, color: "#111827" }}>All Clients</div>
          <div className="relative">
            <Search size={14} color="#9CA3AF" className="absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search clients..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-xl border border-gray-200 outline-none focus:border-[#14532D]"
              style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#374151", width: "220px" }}
            />
          </div>
        </div>

        {/* Desktop View */}
        <div className="hidden lg:block w-full overflow-hidden">
          <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full relative">
            <thead className="sticky top-0 z-10" style={{ backgroundColor: "#F8FAFC", borderBottom: "1px solid #F1F5F9" }}>
              <tr>
                {["Client", "Contact", "Village", "Deliveries", "Supplied", ...(isSuperAdmin ? [] : ["Total Value", "Advance"])].map(h => (
                  <th key={h} className="px-3 py-3 text-left" style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                ))}
                <th className="px-3 py-3 text-left" style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {isSuperAdmin ? (
                adminGroups.map(group => (
                  <React.Fragment key={group.adminId}>
                    <tr
                      className="cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => setCollapsedAdmins(prev => ({ ...prev, [group.adminId]: !prev[group.adminId] }))}
                      style={{ backgroundColor: "#f8fafc" }}
                    >
                      <td colSpan={6} className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#14532D" }}>
                            <Users size={13} color="#fff" />
                          </div>
                          <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 700, color: "#111827" }}>{group.adminName}</span>
                          <span className="px-2 py-0.5 rounded-full" style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600, backgroundColor: "#f0fdf4", color: "#14532D" }}>
                            {group.farmers.length} client{group.farmers.length !== 1 ? 's' : ''}
                          </span>
                          <ChevronDown size={14} color="#6B7280" className={`ml-auto transition-transform duration-200 ${collapsedAdmins[group.adminId] ? '' : 'rotate-180'}`} />
                        </div>
                      </td>
                    </tr>
                    {!collapsedAdmins[group.adminId] && group.farmers.map(f => (
                      <tr key={f.id} className="border-t border-gray-50 hover:bg-[#f0fdf4] transition-colors cursor-pointer" onClick={() => navigate(`/farmers/${f.id}`)}>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: "#14532D", color: "#fff", fontFamily: "Inter", fontSize: "12px", fontWeight: 700 }}>
                              {f.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                            </div>
                            <div>
                              <div style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 500, color: "#111827" }} className="line-clamp-1 break-words">{f.name}</div>
                              {f.eudr_number && (
                                <div style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", color: "#14532D", fontWeight: 600 }}>EUDR: {f.eudr_number}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1.5 whitespace-nowrap">
                            <Phone size={11} color="#9CA3AF" />
                            <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#6B7280" }}>{f.phone}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 max-w-[100px]">
                          <div className="flex items-center gap-1.5 truncate">
                            <MapPin size={11} color="#9CA3AF" />
                            <span className="truncate" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#6B7280", maxWidth: "120px" }}>{f.village}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-left">
                          <span className="px-2.5 py-1 rounded-full" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 500, backgroundColor: "#f0fdf4", color: "#14532D" }}>
                            {f.deliveries}
                          </span>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap" style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 500, color: "#374151" }}>{f.totalWeight.toFixed(0)} kg</td>
                        <td className="px-3 py-3">
                          <button
                            className="flex items-center gap-1 px-2 py-1.5 rounded-lg transition-colors hover:bg-green-100 whitespace-nowrap"
                            style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 500, color: "#14532D", backgroundColor: "#f0fdf4" }}
                          >
                            <Eye size={12} />
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))
              ) : (
                filtered.map(f => (
                <tr key={f.id} className="border-t border-gray-50 hover:bg-[#f0fdf4] transition-colors cursor-pointer" onClick={() => navigate(`/farmers/${f.id}`)}>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: "#14532D", color: "#fff", fontFamily: "Inter", fontSize: "12px", fontWeight: 700 }}>
                        {f.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <div style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 500, color: "#111827" }} className="line-clamp-1 break-words">{f.name}</div>
                        {f.eudr_number && (
                          <div style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", color: "#14532D", fontWeight: 600 }}>EUDR: {f.eudr_number}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                      <Phone size={11} color="#9CA3AF" />
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#6B7280" }}>{f.phone}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 max-w-[100px]">
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin size={11} color="#9CA3AF" />
                      <span className="truncate" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#6B7280", maxWidth: "120px" }}>{f.village}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-left">
                    <span className="px-2.5 py-1 rounded-full" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 500, backgroundColor: "#f0fdf4", color: "#14532D" }}>
                      {f.deliveries}
                    </span>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap" style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 500, color: "#374151" }}>{f.totalWeight.toFixed(0)} kg</td>
                  <td className="px-3 py-3 whitespace-nowrap" style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 500, color: "#111827" }}>
                    {formatUGX(f.totalValue)}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {f.advanceBalance > 0 ? (
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600, color: "#DC2626" }}>
                        {formatUGX(f.advanceBalance)}
                      </span>
                    ) : (
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#16A34A", fontWeight: 500 }}>Cleared</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <button
                      className="flex items-center gap-1 px-2 py-1.5 rounded-lg transition-colors hover:bg-green-100 whitespace-nowrap"
                      style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 500, color: "#14532D", backgroundColor: "#f0fdf4" }}
                    >
                      <Eye size={12} />
                      View
                    </button>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
          </div>
        </div>

        {/* Mobile View */}
        <div className="lg:hidden flex flex-col divide-y divide-gray-50">
          {isSuperAdmin ? (
            adminGroups.map(group => (
              <React.Fragment key={group.adminId}>
                <div
                  className="px-4 py-3 flex items-center gap-2 cursor-pointer hover:bg-gray-50 transition-colors"
                  style={{ backgroundColor: "#f8fafc" }}
                  onClick={() => setCollapsedAdmins(prev => ({ ...prev, [group.adminId]: !prev[group.adminId] }))}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#14532D" }}>
                    <Users size={14} color="#fff" />
                  </div>
                  <div className="flex-1">
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 700, color: "#111827" }}>{group.adminName}</div>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#6B7280" }}>{group.farmers.length} client{group.farmers.length !== 1 ? 's' : ''}</div>
                  </div>
                  <ChevronDown size={16} color="#6B7280" className={`transition-transform duration-200 ${collapsedAdmins[group.adminId] ? '' : 'rotate-180'}`} />
                </div>
                {!collapsedAdmins[group.adminId] && group.farmers.map(f => {
                  const isExpanded = expandedId === f.id;
                  return (
                    <div key={f.id} className="p-4 flex flex-col bg-white">
                       <div 
                         className="flex justify-between items-center w-full cursor-pointer"
                         onClick={() => setExpandedId(isExpanded ? null : f.id)}
                       >
                          <div className="flex items-center gap-3 min-w-0 pr-3">
                              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: "#f0fdf4", color: "#14532D", fontFamily: "Inter", fontSize: "14px", fontWeight: 700 }}>
                                {f.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div style={{ fontFamily: "Inter, sans-serif", fontSize: "15px", fontWeight: 600, color: "#111827" }} className="truncate">
                                  {f.name}
                                </div>
                                <div className="flex items-center gap-1 mt-0.5" style={{ fontFamily: "Inter", fontSize: "12px", color: "#6B7280" }}>
                                   {f.deliveries} delivery{f.deliveries !== 1 ? 's' : ''} · {f.totalWeight.toFixed(0)} kg
                                </div>
                              </div>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <ChevronDown size={18} color="#9CA3AF" className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                          </div>
                       </div>
                       {isExpanded && (
                         <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-3 animate-in slide-in-from-top-2 duration-200">
                           <div className="flex flex-col gap-2 mb-1 px-1">
                              <div className="flex items-center gap-2">
                                <Phone size={13} color="#9CA3AF" />
                                <span style={{ fontFamily: "Inter", fontSize: "13px", color: "#374151" }}>{f.phone}</span>
                              </div>
                              {f.village && (
                                <div className="flex items-center gap-2">
                                  <MapPin size={13} color="#9CA3AF" />
                                  <span style={{ fontFamily: "Inter", fontSize: "13px", color: "#374151" }}>{f.village}</span>
                                </div>
                              )}
                              {f.eudr_number && (
                                <div className="flex items-center gap-2">
                                  <div className="w-3.5 h-3.5 rounded-full bg-green-100 flex items-center justify-center">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-600"></div>
                                  </div>
                                  <span style={{ fontFamily: "Inter", fontSize: "12px", color: "#14532D", fontWeight: 600 }}>EUDR: {f.eudr_number}</span>
                                </div>
                              )}
                           </div>
                           <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100/60">
                              <div>
                                 <div style={{ fontFamily: "Inter", fontSize: "10px", color: "#9CA3AF", textTransform: "uppercase", fontWeight: 600 }}>Total Volume</div>
                                 <div style={{ fontFamily: "Inter", fontSize: "13px", fontWeight: 600, color: "#374151", marginTop: "2px" }}>
                                   {f.totalWeight.toFixed(0)} kg
                                 </div>
                              </div>
                              <div>
                                 <div style={{ fontFamily: "Inter", fontSize: "10px", color: "#9CA3AF", textTransform: "uppercase", fontWeight: 600 }}>Deliveries</div>
                                 <div style={{ fontFamily: "Inter", fontSize: "13px", fontWeight: 600, color: "#111827", marginTop: "2px" }}>
                                    {f.deliveries}
                                 </div>
                              </div>
                           </div>
                           <button
                             onClick={() => navigate(`/farmers/${f.id}`)}
                             className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition-colors"
                             style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600, color: "#14532D", backgroundColor: "#f0fdf4", border: "1px solid #dcfce7" }}
                           >
                             <Eye size={14} />
                             View Client Details
                           </button>
                         </div>
                       )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))
          ) : (
            filtered.map(f => {
            const isExpanded = expandedId === f.id;
            return (
              <div key={f.id} className="p-4 flex flex-col bg-white">
                 <div 
                   className="flex justify-between items-center w-full cursor-pointer"
                   onClick={() => setExpandedId(isExpanded ? null : f.id)}
                 >
                    <div className="flex items-center gap-3 min-w-0 pr-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: "#f0fdf4", color: "#14532D", fontFamily: "Inter", fontSize: "14px", fontWeight: 700 }}>
                          {f.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div style={{ fontFamily: "Inter, sans-serif", fontSize: "15px", fontWeight: 600, color: "#111827" }} className="truncate">
                            {f.name}
                          </div>
                          <div className="flex items-center gap-1 mt-0.5" style={{ fontFamily: "Inter", fontSize: "12px", color: "#6B7280" }}>
                             {f.deliveries} delivery{f.deliveries !== 1 ? 's' : ''}
                          </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        {f.advanceBalance > 0 ? (
                          <>
                           <div style={{ fontFamily: "Inter", fontSize: "11px", color: "#9CA3AF" }}>Bal.</div>
                           <div style={{ fontFamily: "Inter", fontSize: "13px", fontWeight: 700, color: "#DC2626" }}>{formatUGX(f.advanceBalance)}</div>
                          </>
                        ) : (
                          <>
                           <div style={{ fontFamily: "Inter", fontSize: "11px", color: "#9CA3AF" }}>Bal.</div>
                           <div style={{ fontFamily: "Inter", fontSize: "13px", fontWeight: 600, color: "#16A34A" }}>Cleared</div>
                          </>
                        )}
                      </div>
                      <ChevronDown size={18} color="#9CA3AF" className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                    </div>
                 </div>
                 
                 {isExpanded && (
                   <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-3 animate-in slide-in-from-top-2 duration-200">
                     <div className="flex flex-col gap-2 mb-1 px-1">
                        <div className="flex items-center gap-2">
                          <Phone size={13} color="#9CA3AF" />
                          <span style={{ fontFamily: "Inter", fontSize: "13px", color: "#374151" }}>{f.phone}</span>
                        </div>
                        {f.village && (
                          <div className="flex items-center gap-2">
                            <MapPin size={13} color="#9CA3AF" />
                            <span style={{ fontFamily: "Inter", fontSize: "13px", color: "#374151" }}>{f.village}</span>
                          </div>
                        )}
                        {f.eudr_number && (
                          <div className="flex items-center gap-2">
                            <div className="w-3.5 h-3.5 rounded-full bg-green-100 flex items-center justify-center">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-600"></div>
                            </div>
                            <span style={{ fontFamily: "Inter", fontSize: "12px", color: "#14532D", fontWeight: 600 }}>EUDR: {f.eudr_number}</span>
                          </div>
                        )}
                     </div>
                     <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100/60">
                        <div>
                           <div style={{ fontFamily: "Inter", fontSize: "10px", color: "#9CA3AF", textTransform: "uppercase", fontWeight: 600 }}>Total Volume</div>
                           <div style={{ fontFamily: "Inter", fontSize: "13px", fontWeight: 600, color: "#374151", marginTop: "2px" }}>
                             {f.totalWeight.toFixed(0)} kg
                           </div>
                        </div>
                        <div>
                           <div style={{ fontFamily: "Inter", fontSize: "10px", color: "#9CA3AF", textTransform: "uppercase", fontWeight: 600 }}>Total Value</div>
                           <div style={{ fontFamily: "Inter", fontSize: "13px", fontWeight: 600, color: "#111827", marginTop: "2px" }}>
                              {formatUGX(f.totalValue)}
                           </div>
                        </div>
                        <div className="col-span-2 flex items-center justify-between border-t border-gray-200/60 pt-2 mt-1">
                          <span style={{ fontFamily: "Inter", fontSize: "11px", color: "#6B7280", fontWeight: 500 }}>Total Outstanding Balance:</span>
                          <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: f.advanceBalance > 0 ? 700 : 600, color: f.advanceBalance > 0 ? "#DC2626" : "#16A34A" }}>
                            {f.advanceBalance > 0 ? formatUGX(f.advanceBalance) : "Cleared"}
                          </span>
                        </div>
                     </div>
                     <button
                       onClick={() => navigate(`/farmers/${f.id}`)}
                       className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition-colors"
                       style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600, color: "#14532D", backgroundColor: "#f0fdf4", border: "1px solid #dcfce7" }}
                     >
                       <Eye size={14} />
                       View Client Details
                     </button>
                   </div>
                 )}
              </div>
            );
          }))}
        </div>

        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <div className="text-5xl mb-3">👨‍🌾</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 500, color: "#374151" }}>No clients found</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#9CA3AF", marginTop: "4px" }}>Try a different search term</div>
          </div>
        )}
      </div>
    </Layout>
  );
}

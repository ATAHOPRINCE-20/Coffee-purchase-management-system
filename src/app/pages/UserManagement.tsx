import { useState, useEffect, useCallback } from "react";
import { Layout } from "../components/Layout";
import {
  Users, UserPlus, Mail, Shield, Smartphone,
  Search, MoreVertical, CheckCircle2, ShoppingCart,
  XCircle, Loader2, AlertCircle, X, Send, MessageCircle, ChevronDown, Wallet, Clock
} from "lucide-react";
import { useSearchParams } from "react-router";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";
import { agentAdvancesService } from "../services/agentAdvancesService";

interface AgentProfile {
  id: string;
  full_name: string;
  role: 'Admin' | 'Manager' | 'Field Agent';
  phone: string;
  status: 'Active' | 'Inactive' | 'Pending';
  created_at: string;
  total_issued?: number;
  remaining_balance?: number;
  daily_weight?: number;
  monthly_weight?: number;
  seasonal_weight?: number;
}

const formatUGX = (v: number) => `UGX ${Math.round(v).toLocaleString()}`;

export default function UserManagement() {
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [search, setSearch] = useState(searchParams.get('search') || "");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteRole, setInviteRole] = useState<'Admin' | 'Manager' | 'Field Agent'>('Field Agent');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Capital flow state
  const [showCapitalModal, setShowCapitalModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentProfile | null>(null);
  const [capitalAmount, setCapitalAmount] = useState("");
  const [capitalNotes, setCapitalNotes] = useState("");
  const [capitalLoading, setCapitalLoading] = useState(false);
  const [capitalError, setCapitalError] = useState<string | null>(null);

  // Settlement state
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [settlementAmount, setSettlementAmount] = useState("");
  const [settlementWeight, setSettlementWeight] = useState("");
  const [settlementUnitPrice, setSettlementUnitPrice] = useState("");
  const [settlementType, setSettlementType] = useState<string>("Kiboko");
  const [settlementNotes, setSettlementNotes] = useState("");
  const [settlementLoading, setSettlementLoading] = useState(false);
  const [settlementError, setSettlementError] = useState<string | null>(null);

  const INVITE_DRAFT_KEY = 'user_invite_draft';
  const CAPITAL_DRAFT_KEY = 'user_capital_draft';

  // Load drafts on mount
  useEffect(() => {
    const inviteDraft = localStorage.getItem(INVITE_DRAFT_KEY);
    if (inviteDraft) {
      try {
        const parsed = JSON.parse(inviteDraft);
        setInviteEmail(parsed.inviteEmail || "");
        setInviteName(parsed.inviteName || "");
        setInvitePhone(parsed.invitePhone || "");
      } catch (e) {}
    }
    const capitalDraft = localStorage.getItem(CAPITAL_DRAFT_KEY);
    if (capitalDraft) {
      try {
        const parsed = JSON.parse(capitalDraft);
        setCapitalAmount(parsed.capitalAmount || "");
        setCapitalNotes(parsed.capitalNotes || "");
      } catch (e) {}
    }
  }, []);

  // Save drafts on change
  useEffect(() => {
    localStorage.setItem(INVITE_DRAFT_KEY, JSON.stringify({ inviteEmail, inviteName, invitePhone }));
  }, [inviteEmail, inviteName, invitePhone]);

  useEffect(() => {
    localStorage.setItem(CAPITAL_DRAFT_KEY, JSON.stringify({ capitalAmount, capitalNotes }));
  }, [capitalAmount, capitalNotes]);

  // Logic to auto-calculate settlement amount based on weight and unit price
  useEffect(() => {
    const w = parseFloat(settlementWeight);
    const up = parseFloat(settlementUnitPrice);
    if (!isNaN(w) && !isNaN(up)) {
      setSettlementAmount(Math.round(w * up).toString());
    }
  }, [settlementWeight, settlementUnitPrice]);

  const fetchAgents = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);

    try {
      const adminId = profile.role === 'Admin' ? profile.id : profile.admin_id;
      
      // 1. Fetch profiles
      let query = supabase
        .from('profiles')
        .select('id, full_name, role, phone, status, created_at')
        .order('created_at', { ascending: false });

      if (profile.role === 'Super Admin') {
        // Super Admin sees everyone
      } else if (profile.role === 'Admin') {
        query = query.eq('admin_id', profile.id);
      } else {
        query = query.eq('parent_id', profile.id);
      }

      const { data: profilesData, error: profilesError } = await query;
      if (profilesError) {
        console.error("Profiles fetch error:", profilesError);
        setLoading(false);
        return;
      }

      // 2. Fetch all capital advances for this admin's branch to calculate balances
      // We don't throw error here to avoid hiding the agents list if migration isn't run yet
      const { data: advancesData, error: advancesError } = await supabase
        .from('agent_capital_advances')
        .select('agent_id, amount, remaining_amount');
      
      // If we have an adminId, filter by it for efficiency, otherwise get all (for Super Admin)
      if (adminId && profile.role !== 'Super Admin') {
        // We do this matching in Step 3/4 anyway, but reducing data here is better if possible
        // Actually, for now let's just fetch and let Step 3 handle it to be safe
      }

      if (advancesError) {
        console.warn("Capital metrics fetch error:", advancesError);
      }
      
      // 2b. Fetch active season to get weight metrics
      const { data: activeSeason } = await supabase
        .from('seasons')
        .select('id')
        .eq('is_active', true)
        .eq('admin_id', adminId)
        .maybeSingle();
      
      let weightMetricsMap: Record<string, any> = {};
      if (activeSeason) {
        const { data: pData } = await supabase
          .from('purchases')
          .select('field_agent_id, payable_weight, date')
          .eq('season_id', activeSeason.id);
        
        const today = new Date().toISOString().split('T')[0]; // Simple UTC check or better date handling
        const thisMonth = today.substring(0, 7);
        
        (pData || []).forEach(p => {
          const aid = p.field_agent_id;
          if (!weightMetricsMap[aid]) {
            weightMetricsMap[aid] = { daily: 0, monthly: 0, seasonal: 0 };
          }
          const w = Number(p.payable_weight) || 0;
          weightMetricsMap[aid].seasonal += w;
          if (p.date === today) weightMetricsMap[aid].daily += w;
          if (p.date.startsWith(thisMonth)) weightMetricsMap[aid].monthly += w;
        });
      }

      // 3. Aggregate metrics
      const metricsMap = (advancesData || []).reduce((acc: any, adv) => {
        if (!acc[adv.agent_id]) {
          acc[adv.agent_id] = { total_issued: 0, remaining_balance: 0 };
        }
        acc[adv.agent_id].total_issued += (Number(adv.amount) || 0);
        acc[adv.agent_id].remaining_balance += (Number(adv.remaining_amount) || 0);
        return acc;
      }, {});

      // 4. Combine
      const enrichedAgents = (profilesData || []).map(p => ({
        ...p,
        total_issued: metricsMap[p.id]?.total_issued || 0,
        remaining_balance: metricsMap[p.id]?.remaining_balance || 0,
        daily_weight: weightMetricsMap[p.id]?.daily || 0,
        monthly_weight: weightMetricsMap[p.id]?.monthly || 0,
        seasonal_weight: weightMetricsMap[p.id]?.seasonal || 0
      }));

      setAgents(enrichedAgents as AgentProfile[]);
      
      // Auto-expand if search matches exactly one agent
      const searchParam = searchParams.get('search');
      if (searchParam) {
        const match = enrichedAgents.find(a => a.full_name?.toLowerCase() === searchParam.toLowerCase());
        if (match) {
          setExpandedId(match.id);
        }
      }
    } catch (err) {
      console.error("Error fetching agents with metrics:", err);
    } finally {
      setLoading(false);
    }
  }, [profile?.id, profile?.role, profile?.admin_id]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const handleToggleStatus = async (agent: AgentProfile) => {
    setActionLoadingId(agent.id);
    const newStatus = agent.status === 'Active' ? 'Inactive' : 'Active';
    const { error } = await supabase
      .from('profiles')
      .update({ status: newStatus })
      .eq('id', agent.id);

    if (!error) {
      setAgents(prev => prev.map(a => a.id === agent.id ? { ...a, status: newStatus } : a));
    }
    setActionLoadingId(null);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);
    setInviteError(null);

    // Normalize the phone number: accept 07XXXXXXXX or +256XXXXXXXXX
    const rawPhone = invitePhone.trim();
    let normalizedPhone = rawPhone.replace(/\D/g, ''); // strip all non-digits
    
    if (normalizedPhone.startsWith('07')) {
      normalizedPhone = '256' + normalizedPhone.slice(1); // 07XX → 256XX
    } 

    if (normalizedPhone.length < 10) {
      setInviteError('The phone number is too short. Please use a full number (e.g., 0712345678).');
      setInviteLoading(false);
      return;
    }
    
    if (!normalizedPhone.startsWith('256')) {
      setInviteError('Please enter a valid Ugandan phone number starting with 07 or +256.');
      setInviteLoading(false);
      return;
    }

    const finalEmail = inviteEmail.trim() || `agent_${normalizedPhone}@coffeetrack.local`;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('invite-agent', {
        body: { 
          email: finalEmail, 
          full_name: inviteName, 
          phone: normalizedPhone,
          role: inviteRole
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });

      // Function always returns 200; check data.error for failures
      console.log("Supabase edge function response:", data);
      
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      if (!data?.inviteUrl) {
         console.error("Invite URL was missing from the response", data);
      }

      setGeneratedLink(data?.inviteUrl || null);
      setInviteSuccess(true);
      setInviteEmail("");
      localStorage.removeItem(INVITE_DRAFT_KEY);
      // Kept open so admin can click WhatsApp button
    } catch (err: any) {
      console.error("Invite error details:", err);
      // Detailed error reporting
      if (err.message?.includes('Failed to fetch') || err.message?.includes('network')) {
        setInviteError('Connectivity Error: Could not reach the invitation service. Please check your internet or firewall.');
      } else {
        setInviteError(err.message ?? 'Failed to send invite. Please check the details and try again.');
      }
    } finally {
      setInviteLoading(false);
    }
  };

  const closeModal = () => {
    setShowInviteModal(false);
    setInviteEmail("");
    setInviteName("");
    setInvitePhone("");
    setInviteError(null);
    setInviteSuccess(false);
    setGeneratedLink(null);
  };

  const handleRecordSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgent || !profile?.id) return;

    setSettlementLoading(true);
    setSettlementError(null);

    try {
      const amount = parseFloat(settlementAmount);
      const weight = parseFloat(settlementWeight) || 0;
      if (isNaN(amount) || amount <= 0) {
        throw new Error("Please enter a valid amount greater than 0");
      }

      await agentAdvancesService.recordSettlement({
        admin_id: profile.id,
        agent_id: selectedAgent.id,
        amount,
        weight,
        unit_price: parseFloat(settlementUnitPrice) || 0,
        coffee_type: settlementType,
        notes: settlementNotes
      });

      setShowSettlementModal(false);
      setSettlementAmount("");
      setSettlementWeight("");
      setSettlementUnitPrice("");
      setSettlementNotes("");
      setSelectedAgent(null);
      alert(`Successfully recorded settlement of ${formatUGX(amount)} from ${selectedAgent.full_name}`);
      fetchAgents();
    } catch (err: any) {
      setSettlementError(err.message || "Failed to record settlement");
    } finally {
      setSettlementLoading(false);
    }
  };

  const handleIssueCapital = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgent || !profile?.id) return;
    
    setCapitalLoading(true);
    setCapitalError(null);

    try {
      const amount = parseFloat(capitalAmount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error("Please enter a valid amount greater than 0");
      }

      await agentAdvancesService.create({
        admin_id: profile.id,
        agent_id: selectedAgent.id,
        amount,
        remaining_amount: amount, // NEW: track remaining amount
        issue_date: new Date().toISOString().split('T')[0],
        notes: capitalNotes
      });

      setShowCapitalModal(false);
      setCapitalAmount("");
      setCapitalNotes("");
      setSelectedAgent(null);
      localStorage.removeItem(CAPITAL_DRAFT_KEY);
      alert(`Successfully issued ${formatUGX(amount)} to ${selectedAgent.full_name}`);
    } catch (err: any) {
      setCapitalError(err.message || "Failed to issue capital");
    } finally {
      setCapitalLoading(false);
    }
  };

  const filtered = agents.filter(a =>
    a.full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout
      breadcrumbs={[{ label: "System" }, { label: "User Management" }]}
      title="User Management"
    >
      {/* Header row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search agents by name..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#14532D] text-white rounded-xl font-semibold hover:bg-[#1a6b35] transition-all"
        >
          <UserPlus size={18} />
          Invite Agent
        </button>
      </div>

      {/* Agent table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Desktop View */}
        <div className="hidden lg:block overflow-x-auto max-h-[600px]">
          <table className="w-full text-left relative">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Agent</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Total Issued</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Capital Balance</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Season Weight</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <Loader2 className="w-8 h-8 text-green-700 animate-spin mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">Loading agents...</p>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No agents yet</p>
                  <p className="text-gray-400 text-sm mt-1">Invite your first field agent using the button above.</p>
                </td>
              </tr>
            ) : filtered.map((agent) => (
              <tr key={agent.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm">
                      {agent.full_name?.charAt(0) ?? '?'}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-900">{agent.full_name}</div>
                      {agent.phone && (
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <Smartphone size={11} /> {agent.phone}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="text-sm font-semibold text-gray-700">{formatUGX(agent.total_issued || 0)}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className={`text-sm font-bold ${ (agent.remaining_balance || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatUGX(agent.remaining_balance || 0)}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="text-sm font-bold text-[#14532D]">{(agent.seasonal_weight || 0).toLocaleString()} kg</div>
                  <div className="text-[10px] text-gray-400">{(agent.monthly_weight || 0).toLocaleString()} kg this month</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                    agent.status === 'Active' ? 'bg-green-50 text-green-700' : 
                    agent.status === 'Pending' ? 'bg-yellow-50 text-yellow-700' :
                    'bg-red-50 text-red-700'
                  }`}>
                    {agent.status === 'Active' ? <CheckCircle2 size={12} /> : 
                     agent.status === 'Pending' ? <Clock size={12} /> : 
                     <XCircle size={12} />}
                    {agent.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        setSelectedAgent(agent);
                        setShowCapitalModal(true);
                      }}
                      className="text-xs font-bold px-3 py-1.5 bg-green-50 text-[#14532D] rounded-lg hover:bg-green-100 transition-all border border-green-100"
                    >
                      Issue Capital
                    </button>
                    <button
                      onClick={() => {
                        setSelectedAgent(agent);
                        setShowSettlementModal(true);
                      }}
                      className="text-xs font-bold px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-all border border-blue-100"
                    >
                      Receive Coffee
                    </button>
                    <button
                      onClick={() => handleToggleStatus(agent)}
                      disabled={actionLoadingId === agent.id}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                        agent.status === 'Active'
                          ? 'bg-red-50 text-red-600 hover:bg-red-100'
                          : 'bg-green-50 text-green-700 hover:bg-green-100'
                      } disabled:opacity-50`}
                    >
                      {actionLoadingId === agent.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : agent.status === 'Active' ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="lg:hidden flex flex-col divide-y divide-gray-50">
          {loading ? (
             <div className="px-6 py-12 text-center">
               <Loader2 className="w-8 h-8 text-green-700 animate-spin mx-auto mb-2" />
               <p className="text-gray-500 text-sm">Loading agents...</p>
             </div>
          ) : filtered.length === 0 ? (
             <div className="px-6 py-12 text-center">
               <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
               <p className="text-gray-500 font-medium">No agents yet</p>
               <p className="text-gray-400 text-sm mt-1">Invite your first field agent using the button above.</p>
             </div>
          ) : (
            filtered.map(agent => {
              const isExpanded = expandedId === agent.id;
              return (
                <div key={agent.id} className={`p-4 flex flex-col bg-white ${agent.status === 'Active' ? 'bg-green-50/20' : ''}`}>
                  <div 
                    className="flex justify-between items-center w-full cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : agent.id)}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: "#f0fdf4", color: "#14532D", fontFamily: "Inter", fontSize: "14px", fontWeight: 700 }}>
                        {agent.full_name?.charAt(0) ?? '?'}
                      </div>
                      <div className="flex-col min-w-0">
                        <div style={{ fontFamily: "Inter, sans-serif", fontSize: "15px", fontWeight: 600, color: "#111827" }} className="truncate">
                          {agent.full_name}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Shield size={11} className={agent.role === 'Admin' ? 'text-blue-600' : 'text-gray-400'} />
                          <span style={{ fontFamily: "Inter", fontSize: "12px", color: "#6B7280" }}>{agent.role}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {agent.status === 'Active' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-800 uppercase tracking-wide">
                          <CheckCircle2 size={10} /> Active
                        </span>
                      ) : agent.status === 'Pending' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-yellow-100 text-yellow-800 uppercase tracking-wide">
                          <Clock size={10} /> Pending
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-800 uppercase tracking-wide">
                          <XCircle size={10} /> Inactive
                        </span>
                      )}
                      <ChevronDown size={18} color="#9CA3AF" className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-3 animate-in slide-in-from-top-2 duration-200">
                      <div className="grid grid-cols-2 gap-3 mt-1 bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <div>
                          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Total Issued</div>
                          <div className="text-xs font-bold text-gray-900">{formatUGX(agent.total_issued || 0)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Capital Balance</div>
                          <div className={`text-xs font-black ${ (agent.remaining_balance || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {formatUGX(agent.remaining_balance || 0)}
                          </div>
                        </div>
                        <div className="col-span-2 pt-2 border-t border-gray-100 flex justify-between items-center">
                          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Weight (Season / Month / Day)</div>
                          <div className="text-xs font-bold text-[#14532D]">
                            {(agent.seasonal_weight || 0).toLocaleString()} / {(agent.monthly_weight || 0).toLocaleString()} / {(agent.daily_weight || 0).toLocaleString()} kg
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 mt-1 px-1">
                        {agent.phone && (
                          <div className="flex items-center gap-2">
                            <Smartphone size={13} className="text-gray-400" />
                            <span style={{ fontFamily: "Inter", fontSize: "13px", color: "#374151" }}>{agent.phone}</span>
                          </div>
                        )}
                        {agent.created_at && (
                          <div className="flex items-center gap-2">
                            <Users size={13} className="text-gray-400" />
                            <span style={{ fontFamily: "Inter", fontSize: "13px", color: "#374151" }}>
                              Joined {new Date(agent.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <button
                        onClick={() => {
                          setSelectedAgent(agent);
                          setShowCapitalModal(true);
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white rounded-xl transition-all font-bold text-sm shadow-sm mb-2"
                      >
                        <Wallet size={16} /> Issue Capital
                      </button>

                      <button
                        onClick={() => {
                          setSelectedAgent(agent);
                          setShowSettlementModal(true);
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-50 text-blue-700 rounded-xl transition-all font-bold text-sm border border-blue-100 mb-2"
                      >
                        <ShoppingCart size={16} /> Receive Coffee
                      </button>

                      <button
                        onClick={() => handleToggleStatus(agent)}
                        disabled={actionLoadingId === agent.id}
                        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all disabled:opacity-50 font-semibold text-sm ${
                          agent.status === 'Active'
                            ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-100'
                            : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-100'
                        }`}
                      >
                        {actionLoadingId === agent.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : agent.status === 'Active' ? 'Deactivate User' : 'Activate User'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Info note */}
      <div className="mt-6 bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-4 items-start">
        <AlertCircle className="text-blue-600 shrink-0 mt-0.5" size={20} />
        <div>
          <h4 className="text-sm font-bold text-blue-900">How invitations work</h4>
          <p className="text-xs text-blue-700 mt-1 leading-relaxed">
            Generate an invite link to establish a new team member under your account. Send the link directly to them via WhatsApp so they can choose their password and get started. 
            You will be able to see all data recorded by team members you invite.
          </p>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-all text-gray-400"
            >
              <X size={20} />
            </button>

            <div className="mb-6">
              <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center mb-4">
                <Mail size={22} className="text-green-700" />
              </div>
              <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Inter, sans-serif' }}>
                Invite a Team Member
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Generate a unique link to send directly via WhatsApp.
              </p>
            </div>

            {inviteSuccess ? (
              <div className="flex flex-col items-center py-4">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                  <CheckCircle2 size={32} className="text-green-700" />
                </div>
                <div className="text-center w-full">
                  <p className="text-xl font-bold text-gray-900">Invite URL Ready!</p>
                  <p className="text-sm text-gray-500 mt-2 mb-6 px-4 leading-relaxed">
                    {inviteName}'s invite link has been generated. Tap the button below to send their secure setup link directly to them via WhatsApp.
                  </p>
                </div>
                {generatedLink && (
                  <div className="w-full space-y-3">
                    <a
                      href={`https://wa.me/${invitePhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${inviteName},\n\nYou've been invited to CoffeeTrack as a ${inviteRole}.\n\nClick here to securely set up your account: ${generatedLink}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-[#25D366] text-white rounded-xl font-bold hover:bg-[#20b858] transition-all shadow-sm"
                    >
                      <MessageCircle size={20} />
                      Send to WhatsApp
                    </a>
                    <button
                      onClick={closeModal}
                      className="w-full py-3.5 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleInvite} className="space-y-4">
                {inviteError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-100 flex items-start gap-2">
                    <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700">{inviteError}</p>
                  </div>
                )}

                <div>
                  <label className="block mb-1.5 text-xs font-semibold text-gray-600">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-[#14532D] focus:ring-4 focus:ring-green-50 transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="block mb-1.5 text-xs font-semibold text-gray-600">
                    Email Address <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="agent@example.com"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-[#14532D] focus:ring-4 focus:ring-green-50 transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="block mb-1.5 text-xs font-semibold text-gray-600">
                    WhatsApp Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={invitePhone}
                    onChange={(e) => setInvitePhone(e.target.value)}
                    placeholder="07XXXXXXXX or +256XXXXXXXXX"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-[#14532D] focus:ring-4 focus:ring-green-50 transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="block mb-1.5 text-xs font-semibold text-gray-600">
                    Assign Role
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-[#14532D] focus:ring-4 focus:ring-green-50 transition-all text-sm bg-white"
                  >
                    <option value="Field Agent">Field Agent</option>
                    <option value="Manager">Manager</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="w-full py-3 bg-[#14532D] text-white rounded-xl font-bold text-sm hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                >
                  {inviteLoading ? (
                    <><Loader2 size={16} className="animate-spin" /> Sending...</>
                  ) : (
                    <><Send size={16} /> Send Invitation</>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
      {/* Issue Capital Modal */}
      {showCapitalModal && selectedAgent && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative">
            <button
              onClick={() => {
                setShowCapitalModal(false);
                setSelectedAgent(null);
                setCapitalAmount("");
                setCapitalNotes("");
                setCapitalError(null);
              }}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-all text-gray-400"
            >
              <X size={20} />
            </button>

            <div className="mb-6">
              <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center mb-4">
                <Wallet size={22} className="text-green-700" />
              </div>
              <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Inter, sans-serif' }}>
                Issue Capital
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Advance capital to <strong>{selectedAgent.full_name}</strong> for purchases.
              </p>
            </div>

            <form onSubmit={handleIssueCapital} className="space-y-4">
              {capitalError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-100 flex items-start gap-2">
                  <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{capitalError}</p>
                </div>
              )}

              <div>
                <label className="block mb-1.5 text-xs font-semibold text-gray-600">
                  Amount (UGX)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={capitalAmount}
                  onChange={(e) => setCapitalAmount(e.target.value)}
                  placeholder="e.g. 5,000,000"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-[#14532D] focus:ring-4 focus:ring-green-50 transition-all text-sm"
                />
              </div>

              <div>
                <label className="block mb-1.5 text-xs font-semibold text-gray-600">
                  Notes (Optional)
                </label>
                <textarea
                  value={capitalNotes}
                  onChange={(e) => setCapitalNotes(e.target.value)}
                  placeholder="Additional details..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-[#14532D] focus:ring-4 focus:ring-green-50 transition-all text-sm resize-none h-24"
                />
              </div>

              <button
                type="submit"
                disabled={capitalLoading}
                className="w-full py-3 bg-[#14532D] text-white rounded-xl font-bold text-sm hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                {capitalLoading ? (
                  <><Loader2 size={16} className="animate-spin" /> Processing...</>
                ) : (
                  <><Send size={16} /> Issue Capital</>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Receive Coffee / Settlement Modal */}
      {showSettlementModal && selectedAgent && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative">
            <button
              onClick={() => {
                setShowSettlementModal(false);
                setSelectedAgent(null);
                setSettlementAmount("");
                setSettlementWeight("");
                setSettlementUnitPrice("");
                setSettlementNotes("");
                setSettlementError(null);
              }}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-all text-gray-400"
            >
              <X size={20} />
            </button>

            <div className="mb-6">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center mb-4">
                <ShoppingCart size={22} className="text-blue-700" />
              </div>
              <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Inter, sans-serif' }}>
                Receive Coffee
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Record coffee delivered by <strong>{selectedAgent.full_name}</strong> to settle their capital.
              </p>
            </div>

            <form onSubmit={handleRecordSettlement} className="space-y-4">
              {settlementError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-100 flex items-start gap-2">
                  <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{settlementError}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1.5 text-xs font-semibold text-gray-600">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    value={settlementWeight}
                    onChange={(e) => setSettlementWeight(e.target.value)}
                    placeholder="e.g. 150"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-[#14532D] focus:ring-4 focus:ring-green-50 transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block mb-1.5 text-xs font-semibold text-gray-600">
                    Unit Price (UGX/kg)
                  </label>
                  <input
                    type="number"
                    value={settlementUnitPrice}
                    onChange={(e) => setSettlementUnitPrice(e.target.value)}
                    placeholder="e.g. 4500"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-[#14532D] focus:ring-4 focus:ring-green-50 transition-all text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1.5 text-xs font-semibold text-gray-600">
                  Total Value (UGX) - Auto-calculated
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={settlementAmount}
                  onChange={(e) => setSettlementAmount(e.target.value)}
                  placeholder="e.g. 500,000"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-[#14532D] focus:ring-4 focus:ring-green-50 transition-all text-sm bg-gray-50"
                />
              </div>

              <div>
                <label className="block mb-1.5 text-xs font-semibold text-gray-600">
                  Coffee Type
                </label>
                <select
                  value={settlementType}
                  onChange={(e) => setSettlementType(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-[#14532D] focus:ring-4 focus:ring-green-50 transition-all text-sm appearance-none bg-white"
                >
                  <option value="Kiboko">Kiboko</option>
                  <option value="Red">Red Cherry</option>
                  <option value="Kase">Kase</option>
                </select>
              </div>

              <div>
                <label className="block mb-1.5 text-xs font-semibold text-gray-600">
                  Notes (Optional)
                </label>
                <textarea
                  value={settlementNotes}
                  onChange={(e) => setSettlementNotes(e.target.value)}
                  placeholder="e.g. Quality was excellent..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-[#14532D] focus:ring-4 focus:ring-green-50 transition-all text-sm resize-none h-20"
                />
              </div>

              <button
                type="submit"
                disabled={settlementLoading}
                className="w-full py-3 bg-[#14532D] text-white rounded-xl font-bold text-sm hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                {settlementLoading ? (
                  <><Loader2 size={16} className="animate-spin" /> Processing...</>
                ) : (
                  <><CheckCircle2 size={16} /> Confirm Settlement</>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}

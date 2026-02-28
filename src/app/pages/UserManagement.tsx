import { useState, useEffect, useCallback } from "react";
import { Layout } from "../components/Layout";
import {
  Users, UserPlus, Mail, Shield, Smartphone,
  Search, MoreVertical, CheckCircle2,
  XCircle, Loader2, AlertCircle, X, Send
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";

interface AgentProfile {
  id: string;
  full_name: string;
  role: 'Admin' | 'Manager' | 'Field Agent';
  phone: string;
  status: 'Active' | 'Inactive';
  created_at: string;
}

export default function UserManagement() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [search, setSearch] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    // RLS automatically scopes this to users where admin_id = current admin's id
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, role, phone, status, created_at')
      .neq('id', profile?.id)   // exclude self
      .order('created_at', { ascending: false });

    if (!error && data) {
      setAgents(data as AgentProfile[]);
    }
    setLoading(false);
  }, [profile?.id]);

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

    try {
      const { error } = await supabase.functions.invoke('invite-agent', {
        body: { email: inviteEmail, full_name: inviteName },
      });

      if (error) throw error;

      setInviteSuccess(true);
      setInviteEmail("");
      setInviteName("");
      setTimeout(() => {
        setInviteSuccess(false);
        setShowInviteModal(false);
      }, 2500);
    } catch (err: any) {
      setInviteError(err.message ?? 'Failed to send invite. Try again.');
    } finally {
      setInviteLoading(false);
    }
  };

  const closeModal = () => {
    setShowInviteModal(false);
    setInviteEmail("");
    setInviteName("");
    setInviteError(null);
    setInviteSuccess(false);
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
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Agent</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Role</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Joined</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <Loader2 className="w-8 h-8 text-green-700 animate-spin mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">Loading agents...</p>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
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
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5 text-sm">
                    <Shield size={14} className={agent.role === 'Admin' ? 'text-blue-600' : 'text-gray-400'} />
                    <span className="font-medium">{agent.role}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                    agent.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {agent.status === 'Active' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                    {agent.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {agent.created_at ? new Date(agent.created_at).toLocaleDateString() : '—'}
                </td>
                <td className="px-6 py-4 text-right">
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Info note */}
      <div className="mt-6 bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-4 items-start">
        <AlertCircle className="text-blue-600 shrink-0 mt-0.5" size={20} />
        <div>
          <h4 className="text-sm font-bold text-blue-900">How invitations work</h4>
          <p className="text-xs text-blue-700 mt-1 leading-relaxed">
            Invited agents receive an email with a setup link. They choose their password and are automatically linked to your account.
            Agents can only view your farmers and enter purchases — they cannot access reports, prices, or settings.
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
                Invite a Field Agent
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                They'll receive an email to set up their account under your workspace.
              </p>
            </div>

            {inviteSuccess ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 size={28} className="text-green-700" />
                </div>
                <p className="font-bold text-gray-800">Invite sent!</p>
                <p className="text-sm text-gray-500 text-center">
                  {inviteName} will receive a setup email shortly.
                </p>
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
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="agent@example.com"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-[#14532D] focus:ring-4 focus:ring-green-50 transition-all text-sm"
                  />
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
    </Layout>
  );
}

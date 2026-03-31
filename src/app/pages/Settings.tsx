import React, { useState, useEffect } from "react";
import { Layout } from "../components/Layout";
import { 
  User, Bell, Shield, Smartphone, Globe, 
  Save, Loader2, Check, ChevronRight, LogOut,
  Mail, MapPin, Building2
} from "lucide-react";
import { useAuth, getEffectiveAdminId } from "../hooks/useAuth";
import { settingsService, CompanyProfile } from "../services/settingsService";

const Section = ({ icon: Icon, title, subtitle, children }: { icon: any; title: string; subtitle: string; children: React.ReactNode }) => (
  <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm mb-6">
    <div className="flex items-center gap-3 mb-8 pb-5 border-b border-gray-50">
      <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
        <Icon size={20} />
      </div>
      <div>
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
      </div>
    </div>
    {children}
  </div>
);

export default function Settings() {
  const { profile, user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("Profile");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Determine permissions
  const canManageAgency = profile?.role === "Admin" || profile?.role === "Manager" || profile?.role === "Super Admin";

  // Profile Form
  const [profileData, setProfileData] = useState({
    fullName: profile?.full_name || "",
    phone: profile?.phone || "",
    email: user?.email || "",
  });

  // Agency Form
  const [agencyData, setAgencyData] = useState<CompanyProfile>({
    admin_id: "",
    name: "",
    phone: "",
    email: "",
    location: "",
  });

  useEffect(() => {
    if (canManageAgency && activeTab === "Agency") {
      fetchAgencyDetails();
    }
  }, [activeTab, profile, canManageAgency]);

  const fetchAgencyDetails = async () => {
    const adminId = getEffectiveAdminId(profile);
    if (!adminId) return;
    
    setLoading(true);
    try {
      const data = await settingsService.getCompanyProfile(adminId);
      if (data) {
        setAgencyData(data);
      }
    } catch (err) {
      console.error("Failed to load agency details:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 800));
    setSaving(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const handleSaveAgency = async () => {
    const adminId = getEffectiveAdminId(profile);
    if (!adminId) return;

    setSaving(true);
    setError(null);
    try {
      await settingsService.updateCompanyProfile(adminId, agencyData);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error("Failed to save agency details:", err);
      setError(err?.message || "Failed to save details. Please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const menuItems = [
    { id: "Profile", label: "Profile Information", icon: User },
    { id: "Agency", label: "Agency Details", icon: Globe, hidden: !canManageAgency },
    { id: "Notifications", label: "Notifications", icon: Bell },
    { id: "Security", label: "Security & Login", icon: Shield },
  ];

  return (
    <Layout breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Settings" }]}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "Inter, sans-serif" }}>Account Settings</h1>
        <p className="text-sm text-gray-500 mt-1" style={{ fontFamily: "Inter, sans-serif" }}>Manage your profile and application preferences</p>
      </div>

      <div className="max-w-4xl grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar Nav */}
        <div className="lg:col-span-1 space-y-2">
            {menuItems.filter(i => !i.hidden).map(item => (
                <button 
                  key={item.id} 
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${activeTab === item.id ? 'bg-white text-[#14532D] shadow-sm border border-gray-100' : 'text-gray-500 hover:bg-white/50'}`}
                >
                    <item.icon size={18} />
                    {item.label}
                    {activeTab === item.id && <ChevronRight size={14} className="ml-auto" />}
                </button>
            ))}
            <button 
                onClick={signOut}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-red-500 hover:bg-red-50 transition-all mt-4"
            >
                <LogOut size={18} />
                Sign Out
            </button>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-2">
          {activeTab === "Profile" && (
            <Section icon={User} title="Profile Information" subtitle="Manage your personal profile and account credentials">
              <div className="space-y-6">
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Full Name</label>
                  <input 
                    type="text" 
                    value={profileData.fullName}
                    onChange={e => setProfileData({...profileData, fullName: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-[#14532D] outline-none transition-all text-sm font-medium" 
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Phone Number</label>
                    <div className="relative">
                      <Smartphone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input 
                        type="text" 
                        value={profileData.phone}
                        onChange={e => setProfileData({...profileData, phone: e.target.value})}
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-[#14532D] outline-none transition-all text-sm font-medium" 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Account Role</label>
                    <div className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-100/50 text-gray-500 cursor-not-allowed text-sm font-bold uppercase tracking-widest">
                      {profile?.role || "User"}
                    </div>
                  </div>
                </div>
                
                <div className="pt-4 flex items-center justify-between">
                  <p className="text-xs text-gray-400 max-w-[280px]">Your profile information is visible to administration for reporting</p>
                  <button 
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#14532D] text-white text-sm font-bold hover:opacity-90 transition-all shadow-md disabled:opacity-50"
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : (success ? <Check size={16} /> : <Save size={16} />)}
                    {saving ? "Saving..." : (success ? "Saved!" : "Save Changes")}
                  </button>
                </div>
              </div>
            </Section>
          )}

          {activeTab === "Agency" && canManageAgency && (
            <Section icon={Globe} title="Agency Details" subtitle="These details will appear at the top of your purchase receipts">
              {/* Agency form content stay the same */}
              <div className="space-y-6">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-[#14532D] animate-spin mb-4" />
                    <p className="text-sm text-gray-500">Loading details...</p>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Company / Agency Name</label>
                      <div className="relative">
                        <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                          type="text" 
                          placeholder="e.g. Western Coffee Traders Ltd"
                          value={agencyData.name}
                          onChange={e => setAgencyData({...agencyData, name: e.target.value})}
                          className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-[#14532D] outline-none transition-all text-sm font-medium" 
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Business Phone</label>
                        <div className="relative">
                          <Smartphone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input 
                            type="text" 
                            placeholder="+256 ..."
                            value={agencyData.phone}
                            onChange={e => setAgencyData({...agencyData, phone: e.target.value})}
                            className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-[#14532D] outline-none transition-all text-sm font-medium" 
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Business Email</label>
                        <div className="relative">
                          <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input 
                            type="email" 
                            placeholder="agency@example.com"
                            value={agencyData.email}
                            onChange={e => setAgencyData({...agencyData, email: e.target.value})}
                            className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-[#14532D] outline-none transition-all text-sm font-medium" 
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Location / Address</label>
                      <div className="relative">
                        <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                          type="text" 
                          placeholder="e.g. Plot 45, Kasese Main St."
                          value={agencyData.location}
                          onChange={e => setAgencyData({...agencyData, location: e.target.value})}
                          className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-[#14532D] outline-none transition-all text-sm font-medium" 
                        />
                      </div>
                    </div>
                    
                    <div className="pt-4 flex items-center justify-end">
                      {error && <p className="text-red-500 text-xs font-bold mr-4">{error}</p>}
                      <button 
                        onClick={handleSaveAgency}
                        disabled={saving || !agencyData.name}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#14532D] text-white text-sm font-bold hover:opacity-90 transition-all shadow-md disabled:opacity-50"
                      >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : (success ? <Check size={16} /> : <Save size={16} />)}
                        {saving ? "Saving..." : (success ? "Saved!" : "Save Agency Details")}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </Section>
          )}

          {(activeTab === "Notifications" || activeTab === "Security") && (
            <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-gray-100 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-300 mb-4">
                {activeTab === "Notifications" ? <Bell size={32} /> : <Shield size={32} />}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{activeTab} Settings</h3>
              <p className="text-gray-500 text-sm">This feature is currently under development.</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

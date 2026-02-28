import React, { useState } from "react";
import { Layout } from "../components/Layout";
import { 
  User, Bell, Shield, Smartphone, Globe, 
  CreditCard, Save, Loader2, Check, ExternalLink,
  ChevronRight, LogOut
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";

export default function Settings() {
  const { profile, user, signOut } = useAuth();
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    fullName: profile?.full_name || "",
    phone: profile?.phone || "",
    email: user?.email || "",
  });

  const handleSave = async () => {
    setSaving(true);
    // Simulate API call
    await new Promise(r => setTimeout(r, 1000));
    setSaving(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const Section = ({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) => (
    <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm mb-6">
      <div className="flex items-center gap-3 mb-8 pb-5 border-b border-gray-50">
        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
          <Icon size={20} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <p className="text-xs text-gray-500 mt-0.5">Manage your {title.toLowerCase()} preferences</p>
        </div>
      </div>
      {children}
    </div>
  );

  return (
    <Layout breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Settings" }]}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "Inter, sans-serif" }}>Account Settings</h1>
        <p className="text-sm text-gray-500 mt-1" style={{ fontFamily: "Inter, sans-serif" }}>Manage your profile and application preferences</p>
      </div>

      <div className="max-w-4xl grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar Nav */}
        <div className="lg:col-span-1 space-y-2">
            {[
                { label: "Profile Information", icon: User, active: true },
                { label: "Notifications", icon: Bell },
                { label: "Security & Login", icon: Shield },
                { label: "Subscription", icon: CreditCard },
                { label: "Agency Details", icon: Globe },
            ].map(item => (
                <button key={item.label} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${item.active ? 'bg-white text-[#14532D] shadow-sm border border-gray-100' : 'text-gray-500 hover:bg-white/50'}`}>
                    <item.icon size={18} />
                    {item.label}
                    {item.active && <ChevronRight size={14} className="ml-auto" />}
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
          <Section icon={User} title="Profile Information">
            <div className="space-y-6">
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Full Name</label>
                <input 
                  type="text" 
                  value={formData.fullName}
                  onChange={e => setFormData({...formData, fullName: e.target.value})}
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
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-[#14532D] outline-none transition-all text-sm font-medium" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Local Region</label>
                  <select className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-[#14532D] outline-none transition-all text-sm font-medium appearance-none">
                    <option>Western Uganda</option>
                    <option>Central Uganda</option>
                  </select>
                </div>
              </div>
              
              <div className="pt-4 flex items-center justify-between">
                <p className="text-xs text-gray-400 max-w-[280px]">Your profile information is visible to administration for reporting</p>
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#14532D] text-white text-sm font-bold hover:opacity-90 transition-all shadow-md disabled:opacity-50"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : (success ? <Check size={16} /> : <Save size={16} />)}
                  {saving ? "Saving..." : (success ? "Saved!" : "Save Changes")}
                </button>
              </div>
            </div>
          </Section>

          <div className="bg-[#14532D] rounded-3xl p-8 text-white relative overflow-hidden">
            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold uppercase tracking-widest border border-white/20">Active Plan</div>
                </div>
                <h4 className="text-xl font-bold mb-1">{profile?.subscription?.plans?.name || "Premium Agent"}</h4>
                <p className="text-white/60 text-xs mb-6">Manage up to {profile?.subscription?.plans?.features?.max_farmers || 100} farmers this season</p>
                <button className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-[#14532D] text-sm font-bold hover:bg-gray-50 transition-all">
                    Upgrade Subscription
                    <ExternalLink size={14} />
                </button>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full translate-x-8 -translate-y-8" />
            <div className="absolute bottom-0 right-0 w-24 h-24 bg-white/5 rounded-full translate-x-4 translate-y-4" />
          </div>
        </div>
      </div>
    </Layout>
  );
}

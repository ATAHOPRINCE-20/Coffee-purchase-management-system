import React, { useState, useEffect, useRef } from "react";
import { useReactToPrint } from 'react-to-print';
import { Layout } from "../components/Layout";
import { 
  User, Bell, Shield, Smartphone, Globe, 
  Save, Loader2, Check, ChevronRight, LogOut,
  Mail, MapPin, Building2, Wallet, Plus, ArrowUpRight, ArrowDownLeft, Printer, Download
} from "lucide-react";
import { useAuth, getEffectiveAdminId } from "../hooks/useAuth";
import { settingsService, CompanyProfile, CapitalLedgerEntry } from "../services/settingsService";
import { formatCurrency } from "../utils/formatters";
import { CapitalLedgerPrint } from "../components/pos/CapitalLedgerPrint";

const Section = ({ icon: Icon, title, subtitle, children }: { icon: any; title: string; subtitle: string; children: React.ReactNode }) => (
  <div className="bg-white rounded-3xl p-5 md:p-8 border border-gray-100 shadow-sm mb-6">
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
  const [isExporting, setIsExporting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [ledger, setLedger] = useState<CapitalLedgerEntry[]>([]);
  const [printLedger, setPrintLedger] = useState<CapitalLedgerEntry[]>([]);
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [topUpNotes, setTopUpNotes] = useState("");
  const [ledgerPage, setLedgerPage] = useState(0);
  const [hasMoreLedger, setHasMoreLedger] = useState(true);
  const PAGE_SIZE = 20;

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Capital_Ledger_${new Date().toISOString().split('T')[0]}`,
  });

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
    if (canManageAgency) {
      if (activeTab === "Agency" || activeTab === "Capital") fetchAgencyDetails();
      if (activeTab === "Capital") fetchCapitalLedger();
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

  const fetchCapitalLedger = async (page: number = 0) => {
    const adminId = getEffectiveAdminId(profile);
    if (!adminId) return;

    setLoading(true);
    try {
      const data = await settingsService.getCapitalLedger(adminId, PAGE_SIZE, page * PAGE_SIZE);
      if (page === 0) {
        setLedger(data);
      } else {
        setLedger(prev => [...prev, ...data]);
      }
      setHasMoreLedger(data.length === PAGE_SIZE);
      setLedgerPage(page);
    } catch (err) {
      console.error("Ledger fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleTopUp = async () => {
    const adminId = getEffectiveAdminId(profile);
    if (!adminId || !topUpAmount) return;

    setSaving(true);
    try {
      await settingsService.addCapital(adminId, parseFloat(topUpAmount), topUpNotes);
      setTopUpAmount("");
      setTopUpNotes("");
      setShowTopUp(false);
      fetchCapitalLedger();
      fetchAgencyDetails(); // Refresh balance in profile
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Top-up failed:", err);
      setError("Top-up failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleExportLedger = async () => {
    const adminId = getEffectiveAdminId(profile);
    if (!adminId) return;

    setIsExporting(true);
    try {
      // Fetch all capital ledger entries (up to 5,000 for full history)
      const allEntries = await settingsService.getCapitalLedger(adminId, 5000, 0);
      
      const csvRows = [];
      // Header Info
      csvRows.push([`Capital & Transaction Ledger Report`]);
      csvRows.push([`Company: ${agencyData.name || 'CPMS'}`]);
      csvRows.push([`Generated: ${new Date().toLocaleString()}`]);
      csvRows.push(['']);

      // Table Headers
      csvRows.push(['Date', 'Time', 'Description', 'Type', 'Amount (UGX)']);

      // Group by month
      const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      
      const grouped: Record<string, CapitalLedgerEntry[]> = {};
      allEntries.forEach(entry => {
        const d = new Date(entry.created_at);
        const monthKey = `${months[d.getMonth()]} ${d.getFullYear()}`;
        if (!grouped[monthKey]) {
          grouped[monthKey] = [];
        }
        grouped[monthKey].push(entry);
      });

      // Sort month keys in reverse chronological order (newest month first)
      const sortedMonthKeys = Object.keys(grouped).sort((a, b) => {
        const [monthA, yearA] = a.split(' ');
        const [monthB, yearB] = b.split(' ');
        const idxA = months.indexOf(monthA);
        const idxB = months.indexOf(monthB);
        
        if (yearA !== yearB) {
          return parseInt(yearB) - parseInt(yearA);
        }
        return idxB - idxA;
      });

      sortedMonthKeys.forEach(monthKey => {
        // Insert a section header for the month
        csvRows.push(['']);
        csvRows.push([`--- ${monthKey.toUpperCase()} ---`, '', '', '', '']);
        
        // Insert entries for this month
        grouped[monthKey].forEach(entry => {
          const d = new Date(entry.created_at);
          const dateStr = d.toLocaleDateString("en-GB");
          const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const amountStr = `${entry.amount > 0 ? '+' : ''}${entry.amount}`;
          csvRows.push([
            dateStr,
            timeStr,
            entry.notes || entry.type,
            entry.type,
            amountStr
          ]);
        });
      });

      // Generate CSV String
      const csvString = csvRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
      
      // Download CSV
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('hidden', '');
      a.setAttribute('href', url);
      a.setAttribute('download', `Capital_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("Failed to export ledger:", err);
      alert("Failed to export ledger. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };
  const handlePrintLedger = async () => {
    const adminId = getEffectiveAdminId(profile);
    if (!adminId) return;

    setLoading(true);
    try {
      const data = await settingsService.getCapitalLedger(adminId, 5000, 0);
      setPrintLedger(data);
      setIsPrinting(true);
    } catch (err) {
      console.error("Failed to fetch print ledger:", err);
      alert("Failed to prepare ledger for printing. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isPrinting) {
      handlePrint();
      setIsPrinting(false);
    }
  }, [isPrinting]);


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
    { id: "Capital", label: "Capital & Wallet", icon: Wallet, hidden: !canManageAgency },
    { id: "Notifications", label: "Notifications", icon: Bell },
    { id: "Security", label: "Security & Login", icon: Shield },
  ];

  return (
    <Layout breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Settings" }]}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "Inter, sans-serif" }}>Account Settings</h1>
        <p className="text-sm text-gray-500 mt-1" style={{ fontFamily: "Inter, sans-serif" }}>Manage your profile and application preferences</p>
      </div>

      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-4 gap-8">
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
        <div className="lg:col-span-3">
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

          {activeTab === "Capital" && canManageAgency && (
            <Section icon={Wallet} title="Capital Management" subtitle="Manage your operational funds and track expenditure">
              <div className="space-y-6">
                <div className="bg-[#14532D] rounded-2xl p-6 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <p className="text-white/70 text-xs font-bold uppercase tracking-wider mb-1">Current Balance</p>
                    <h2 className="text-3xl font-black">{formatCurrency(agencyData.capital || 0)}</h2>
                  </div>
                  <button 
                    onClick={() => setShowTopUp(true)}
                    className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white text-[#14532D] text-sm font-bold hover:bg-gray-50 transition-all shadow-md"
                  >
                    <Plus size={18} />
                    Top up Capital
                  </button>
                </div>

                {/* Summary Stats */}
                {ledger.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-green-50 border border-green-100 rounded-2xl p-4">
                      <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">Total Invested</p>
                      <p className="text-lg font-black text-green-800">
                        {formatCurrency(ledger.filter(e => e.type === 'Top-up').reduce((sum, e) => sum + e.amount, 0))}
                      </p>
                      <p className="text-[10px] text-green-500 mt-1">{ledger.filter(e => e.type === 'Top-up').length} top-up(s)</p>
                    </div>
                    <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
                      <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">Total Spent</p>
                      <p className="text-lg font-black text-red-800">
                        {formatCurrency(Math.abs(ledger.filter(e => e.amount < 0).reduce((sum, e) => sum + e.amount, 0)))}
                      </p>
                      <p className="text-[10px] text-red-400 mt-1">purchases & expenses</p>
                    </div>
                    <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Balance</p>
                      <p className="text-lg font-black text-gray-900">{formatCurrency(agencyData.capital || 0)}</p>
                      <p className="text-[10px] text-gray-400 mt-1">available funds</p>
                    </div>
                  </div>
                )}

                {showTopUp && (
                  <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 animate-in fade-in slide-in-from-top-4 duration-300">
                    <h4 className="font-bold text-gray-900 mb-4">Top up Operating Capital</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Amount (UGX)</label>
                        <input 
                          type="number"
                          placeholder="0"
                          value={topUpAmount}
                          onChange={e => setTopUpAmount(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-[#14532D] transition-all text-sm font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Note (Optional)</label>
                        <input 
                          type="text"
                          placeholder="e.g. Weekly funding"
                          value={topUpNotes}
                          onChange={e => setTopUpNotes(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-[#14532D] transition-all text-sm font-medium"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-3">
                      <button 
                        onClick={() => setShowTopUp(false)}
                        className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleTopUp}
                        disabled={saving || !topUpAmount}
                        className="px-6 py-2 rounded-xl bg-[#14532D] text-white text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50"
                      >
                        {saving ? "Processing..." : "Confirm Top up"}
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
                    <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      Recent Transactions
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold">LATEST 20</span>
                    </h4>
                    <div className="flex gap-2">
                      <button 
                        onClick={handleExportLedger}
                        disabled={isExporting}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-all text-[11px] font-bold"
                      >
                        {isExporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                        Download Ledger
                      </button>
                      <button 
                        onClick={handlePrintLedger}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all text-[11px] font-bold"
                      >
                        <Printer size={13} />
                        Print Ledger
                      </button>
                    </div>
                  </div>
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                    {loading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 size={24} className="animate-spin text-[#14532D]" />
                      </div>
                    ) : ledger.length === 0 ? (
                      <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-2xl">
                        <p className="text-sm text-gray-400">No transactions yet. Add capital to get started.</p>
                      </div>
                    ) : (
                      <>
                        {ledger.map(entry => (
                          <div key={entry.id} className="grid grid-cols-[1fr_auto] md:grid-cols-[auto_1fr_auto] items-center gap-3 md:gap-4 p-4 md:p-5 rounded-2xl border border-gray-50 hover:border-green-100 hover:shadow-md hover:scale-[1.01] transition-all bg-white group mb-3 last:mb-0">
                            {/* Icon - Hidden on mobile */}
                            <div className={`hidden md:flex w-12 h-12 rounded-2xl items-center justify-center flex-shrink-0 ${entry.amount > 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'} transition-colors group-hover:bg-opacity-80`}>
                              {entry.amount > 0 ? <ArrowUpRight size={22} /> : <ArrowDownLeft size={22} />}
                            </div>

                            {/* Details */}
                            <div className="min-w-0">
                              <p className="text-[14px] md:text-[15px] font-bold text-gray-900 truncate mb-0.5 tracking-tight">
                                {entry.notes || entry.type}
                              </p>
                              <p className="text-[10px] md:text-[11px] text-gray-400 font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                                {new Date(entry.created_at).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' })} • {new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>

                            {/* Amount */}
                            <div className="text-right pl-2">
                              <p className={`text-[15px] md:text-[16px] font-black whitespace-nowrap ${entry.amount > 0 ? 'text-green-700' : 'text-red-600'}`}>
                                {entry.amount > 0 ? '+' : ''}{formatCurrency(entry.amount)}
                              </p>
                              <p className="text-[9px] md:text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{entry.type}</p>
                            </div>
                          </div>
                        ))}
                        {hasMoreLedger && (
                          <div className="mt-4 text-center">
                            <button
                              onClick={() => fetchCapitalLedger(ledgerPage + 1)}
                              className="px-6 py-2 rounded-xl text-xs font-bold text-green-700 bg-green-50 border border-green-100 hover:bg-green-100 transition-all"
                            >
                              Load More Transactions
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Hidden Print Component */}
              <div className="hidden">
                <CapitalLedgerPrint ref={printRef} ledger={printLedger.length > 0 ? printLedger : ledger} company={agencyData} />
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

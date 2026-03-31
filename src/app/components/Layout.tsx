import React, { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router";
import {
  LayoutDashboard, ShoppingCart, Users, CreditCard, BarChart3,
  Settings, Coffee, ChevronRight, Menu, X, Bell, Search, LogOut, ChevronDown, Tag,
  Crown, Receipt, TrendingUp
} from "lucide-react";
import { useAuth, getEffectiveAdminId } from "../hooks/useAuth";
import { seasonsService, Season } from "../services/seasonsService";
import { useSync } from "../contexts/SyncContext";

interface LayoutProps {
  children: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
  title?: string;
}

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/", roles: ["Admin", "Manager", "Super Admin", "Field Agent"] },
  { icon: ShoppingCart, label: "Purchases", roles: ["Admin", "Manager", "Field Agent", "Super Admin"], children: [
    { label: "All Purchases", href: "/purchases", roles: ["Admin", "Manager", "Field Agent", "Super Admin"] },
    { label: "New Purchase", href: "/purchases/new", roles: ["Admin", "Manager", "Field Agent", "Super Admin"] },
  ]},
  { icon: Users, label: "Clients", href: "/farmers", roles: ["Admin", "Manager", "Field Agent", "Super Admin"] },
  { icon: CreditCard, label: "Advances", href: "/advances", roles: ["Admin", "Manager", "Field Agent"] },
  { icon: Tag, label: "Prices", href: "/prices", roles: ["Admin", "Manager", "Field Agent"] },
  { icon: BarChart3, label: "Reports", href: "/reports", roles: ["Admin", "Manager", "Field Agent"] },
  { icon: Receipt, label: "Expenses", href: "/expenses", roles: ["Admin", "Manager", "Field Agent"] },
  { icon: TrendingUp, label: "Sales & P&L", href: "/sales", roles: ["Admin", "Manager"] },
  { icon: Receipt, label: "Settle", href: "/settle", roles: ["Field Agent"] },
  { icon: Receipt, label: "History", href: "/history", roles: ["Admin", "Manager", "Field Agent"] },
  // { icon: Crown, label: "Subscription", href: "/subscription", roles: ["Admin", "Manager"] },
  // { icon: Bell, label: "Notifications", href: "/notifications", roles: ["Admin", "Manager"] },
  { icon: Users, label: "Agent Management", href: "/users", roles: ["Admin", "Manager", "Field Agent", "Super Admin"] },
  { icon: Coffee, label: "Seasons", href: "/seasons", roles: ["Admin", "Manager", "Field Agent", "Super Admin"] },
  { icon: Settings, label: "Settings", href: "/settings", roles: ["Admin", "Manager", "Field Agent", "Super Admin"] },
];


export function Layout({ children, breadcrumbs, title }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>(["Purchases"]);
  const [activeSeason, setActiveSeason] = useState<Season | null>(null);
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const { isOnline, pendingSyncCount, isSyncing } = useSync();

  useEffect(() => {
    async function loadSeason() {
      try {
        const adminId = getEffectiveAdminId(profile);
        if (!adminId) return;
        const season = await seasonsService.getActive(adminId);
        setActiveSeason(season);
      } catch (err) {
        console.error("Failed to load active season for layout header", err);
      }
    }
    if (profile) {
      loadSeason();
    }
  }, [profile]);

  const toggleExpanded = (label: string) => {
    setExpandedItems(prev =>
      prev.includes(label) ? prev.filter(i => i !== label) : [...prev, label]
    );
  };

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-[#1a6b35]">
        <div className="w-10 h-10 flex items-center justify-center shrink-0">
          <img src="/icon.png" alt="CoffeeTrack Logo" className="w-full h-full object-contain drop-shadow-sm" />
        </div>
        {sidebarOpen && (
          <div>
            <div style={{ color: "#fff", fontFamily: "Inter, sans-serif", fontSize: "15px", fontWeight: 700, lineHeight: 1.2 }}>CoffeeTrack</div>
            <div style={{ color: "#86efac", fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 400 }}>Management System</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {navItems
          .filter(item => !item.roles || (profile && item.roles.includes(profile.role)))
          .map((item) => {
            const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + "/");
            const isExpanded = expandedItems.includes(item.label);
            
            const filteredChildren = item.children?.filter(child => 
              !(child as any).roles || (profile && (child as any).roles.includes(profile.role))
            );
            const hasChildren = filteredChildren && filteredChildren.length > 0;

          return (
            <div key={item.label} className="mb-1">
              {hasChildren ? (
                <>
                  <button
                    onClick={() => toggleExpanded(item.label)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group"
                    style={{
                      backgroundColor: isActive ? "rgba(255,255,255,0.15)" : "transparent",
                      color: isActive ? "#fff" : "#86efac",
                    }}
                    onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.08)"; }}
                    onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
                  >
                    <item.icon size={18} />
                    {sidebarOpen && (
                      <>
                        <span style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: isActive ? 600 : 400, flex: 1, textAlign: "left" }}>{item.label}</span>
                        <ChevronDown size={14} style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }} />
                      </>
                    )}
                  </button>
                  {isExpanded && sidebarOpen && (
                    <div className="ml-8 mt-1 space-y-0.5">
                      {filteredChildren!.map(child => {
                        const childActive = location.pathname === child.href;
                        return (
                          <NavLink
                            key={child.href}
                            to={child.href}
                            onClick={() => setMobileSidebarOpen(false)}
                            className="block px-3 py-2 rounded-lg transition-all duration-150"
                            style={({ isActive: linkActive }) => ({
                              backgroundColor: linkActive ? "rgba(255,255,255,0.12)" : "transparent",
                              color: linkActive ? "#fff" : "#a7f3d0",
                              fontFamily: "Inter, sans-serif",
                              fontSize: "13px",
                              fontWeight: linkActive ? 500 : 400,
                            })}
                          >
                            {child.label}
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <NavLink
                  to={item.href!}
                  end={item.href === "/"}
                  onClick={() => setMobileSidebarOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150"
                  style={({ isActive: linkActive }) => ({
                    backgroundColor: linkActive ? "rgba(255,255,255,0.15)" : "transparent",
                    color: linkActive ? "#fff" : "#86efac",
                  })}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    if (!el.style.backgroundColor.includes("0.15")) el.style.backgroundColor = "rgba(255,255,255,0.08)";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    if (!el.style.backgroundColor.includes("0.15")) el.style.backgroundColor = "transparent";
                  }}
                >
                  <item.icon size={18} />
                  {sidebarOpen && (
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 400 }}>{item.label}</span>
                  )}
                </NavLink>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom User */}
      <div className="p-3 border-t border-[#1a6b35]">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
          style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: "#6F4E37", color: "#fff", fontFamily: "Inter", fontSize: "13px", fontWeight: 600 }}>
            {profile?.full_name?.charAt(0) || "U"}
          </div>
          {sidebarOpen && (
            <div className="flex-1 min-w-0">
              <div style={{ color: "#fff", fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {profile?.full_name || "User"}
              </div>
              <div className="flex items-center gap-1.5">
                <div style={{ color: "#86efac", fontFamily: "Inter, sans-serif", fontSize: "11px" }}>{profile?.role || "Agent"}</div>
                {/* Subscription badge hidden
                {profile?.subscription && (
                  <>
                    <div className="w-1 h-1 rounded-full bg-white/30" />
                    <div className="flex items-center gap-0.5 text-amber-300">
                      <Crown size={8} />
                      <span className="text-[9px] font-bold uppercase tracking-tight">{profile.subscription.plans?.name}</span>
                    </div>
                  </>
                )}
                */}
              </div>
            </div>
          )}
          {sidebarOpen && (
            <button onClick={signOut} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
              <LogOut size={14} color="#86efac" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#F8FAFC", fontFamily: "Inter, sans-serif" }}>
      {/* Desktop Sidebar */}
      <aside
        className="hidden md:flex flex-col flex-shrink-0 transition-all duration-300"
        style={{
          width: sidebarOpen ? "240px" : "72px",
          backgroundColor: "#14532D",
        }}
      >
        {renderSidebarContent()}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileSidebarOpen(false)} />
          <aside className="relative w-64 flex flex-col" style={{ backgroundColor: "#14532D" }}>
            <button className="absolute top-4 right-4" onClick={() => setMobileSidebarOpen(false)}>
              <X size={20} color="#fff" />
            </button>
            {renderSidebarContent()}
          </aside>
        </div>
      )}

      {/* Main Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 flex-shrink-0"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div className="flex items-center gap-4">
            <button
              className="hidden md:flex p-2 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={() => { setSidebarOpen(!sidebarOpen); }}
            >
              <Menu size={20} color="#6B7280" />
            </button>
            <button
              className="flex md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={() => setMobileSidebarOpen(true)}
            >
              <Menu size={20} color="#6B7280" />
            </button>
            {/* Breadcrumb */}
            {breadcrumbs && (
              <nav className="hidden sm:flex items-center gap-1.5">
                {breadcrumbs.map((crumb, i) => (
                  <span key={i} className="flex items-center gap-1.5">
                    {i > 0 && <ChevronRight size={13} color="#9CA3AF" />}
                    {crumb.href ? (
                      <NavLink
                        to={crumb.href}
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: "13px",
                          fontWeight: i === breadcrumbs.length - 1 ? 600 : 400,
                          color: i === breadcrumbs.length - 1 ? "#14532D" : "#6B7280",
                        }}
                        className="hover:underline"
                      >
                        {crumb.label}
                      </NavLink>
                    ) : (
                      <span
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: "13px",
                          fontWeight: i === breadcrumbs.length - 1 ? 600 : 400,
                          color: i === breadcrumbs.length - 1 ? "#14532D" : "#6B7280",
                        }}
                      >
                        {crumb.label}
                      </span>
                    )}
                  </span>
                ))}
              </nav>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Offline/Sync Indicator */}
            {!isOnline ? (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all" style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA" }}>
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#EF4444" }} />
                 <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 500, color: "#991B1B" }}>
                   Offline {pendingSyncCount > 0 && `(${pendingSyncCount} pending)`}
                 </span>
              </div>
            ) : pendingSyncCount > 0 ? (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all" style={{ backgroundColor: "#FEF3C7", border: "1px solid #FDE68A" }}>
                <div className={`w-2 h-2 rounded-full ${isSyncing ? "animate-ping" : ""}`} style={{ backgroundColor: "#F59E0B" }} />
                 <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 500, color: "#92400E" }}>
                   {isSyncing ? "Syncing..." : `${pendingSyncCount} to sync`}
                 </span>
              </div>
            ) : null}

            {/* Notifications
            <button className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors">
              <Bell size={18} color="#6B7280" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ backgroundColor: "#DC2626" }} />
            </button>
            */}
            {/* Season indicator */}
            {activeSeason && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#16A34A" }} />
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 500, color: "#14532D" }}>Season {activeSeason.name}</span>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {title && (
            <div className="mb-6">
              <h1 style={{ fontFamily: "Inter, sans-serif", fontSize: "22px", fontWeight: 700, color: "#111827" }}>{title}</h1>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
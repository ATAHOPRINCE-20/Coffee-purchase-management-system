import React, { useState, useEffect } from "react";
import { Layout } from "../components/Layout";
import { useAuth } from "../hooks/useAuth";
import { subscriptionsService, SubscriptionPlan } from "../services/subscriptionsService";
import { 
  CreditCard, Check, ShieldCheck, Zap, AlertCircle, 
  ArrowRight, Clock, History, Loader2, Sparkles, Star
} from "lucide-react";

function formatUGX(v: number) {
  return `UGX ${Math.round(v).toLocaleString()}`;
}

export default function SubscriptionManagement() {
  const { profile, user } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'plans' | 'billing'>('plans');

  useEffect(() => {
    async function init() {
      try {
        const data = await subscriptionsService.getPlans();
        setPlans(data);
      } catch (err) {
        console.error("Error fetching plans:", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const handleSubscribe = async (planId: string) => {
    if (!user) return;
    try {
      setSubmitting(planId);
      await subscriptionsService.subscribe(user.id, planId);
      // Refresh page or update context (in a real app, use a toast and state update)
      window.location.reload();
    } catch (err) {
      console.error("Error subscribing:", err);
    } finally {
      setSubmitting(null);
    }
  };

  const currentPlanId = profile?.subscription?.plan_id;
  const isTrialing = profile?.subscription?.status === 'trialing';

  if (loading) {
    return (
      <Layout breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Subscription" }]}>
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-green-700 animate-spin mb-4" />
          <p className="text-gray-500 font-medium">Loading subscription details...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Subscription" }]}>
      <div className="mb-8">
        <h1 style={{ fontFamily: "Inter, sans-serif", fontSize: "24px", fontWeight: 700, color: "#111827" }}>Subscription & Billing</h1>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", color: "#6B7280", marginTop: "4px" }}>
          Manage your software subscription and view your payment history
        </p>
      </div>

      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-8 w-fit">
        <button
          onClick={() => setActiveTab('plans')}
          className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'plans' ? "bg-white text-[#14532D] shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Subscription Plans
        </button>
        <button
          onClick={() => setActiveTab('billing')}
          className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'billing' ? "bg-white text-[#14532D] shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Billing History
        </button>
      </div>

      {activeTab === 'plans' ? (
        <div className="space-y-8">
          {/* Current Plan Overview */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col md:flex-row items-center gap-6">
            <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-8 h-8 text-green-700" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-center gap-2 mb-1">
                <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: "18px", fontWeight: 700, color: "#111827" }}>
                  Current Plan: {profile?.subscription?.plans?.name || "Free Trial"}
                </h2>
                {isTrialing && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold uppercase tracking-wider w-fit mx-auto md:mx-0">
                    Trial Period
                  </span>
                )}
              </div>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#6B7280" }}>
                Next billing date: {profile?.subscription?.current_period_end ? new Date(profile.subscription.current_period_end).toLocaleDateString() : "N/A"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden md:block">
                <div style={{ fontSize: "18px", fontWeight: 700, color: "#111827" }}>
                  {profile?.subscription?.plans?.price_monthly ? formatUGX(profile.subscription.plans.price_monthly) : "UGX 0"}
                </div>
                <div style={{ fontSize: "11px", color: "#6B7280" }}>per month</div>
              </div>
            </div>
          </div>

          {/* Plan Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const isCurrent = plan.id === currentPlanId;
              const isPremium = plan.name === 'Professional';
              
              return (
                <div 
                  key={plan.id}
                  className={`relative rounded-3xl p-8 border-2 transition-all flex flex-col ${
                    isCurrent 
                      ? "border-[#14532D] bg-white" 
                      : isPremium 
                        ? "border-green-100 bg-[#f0fdf4]" 
                        : "border-gray-100 bg-white hover:border-gray-300"
                  }`}
                >
                  {isPremium && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#14532D] text-white px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                      <Sparkles size={10} /> MOST POPULAR
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 style={{ fontFamily: "Inter, sans-serif", fontSize: "18px", fontWeight: 700, color: "#111827" }}>{plan.name}</h3>
                    <div className="mt-4 flex items-baseline gap-1">
                      <span style={{ fontSize: "28px", fontWeight: 800, color: "#111827" }}>{formatUGX(plan.price_monthly)}</span>
                      <span style={{ fontSize: "13px", color: "#6B7280" }}>/mo</span>
                    </div>
                  </div>

                  <div className="space-y-4 mb-8 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <Check size={12} className="text-[#14532D]" />
                      </div>
                      <span style={{ fontSize: "13px", color: "#4B5563" }}>Up to {plan.features.max_farmers} farmers</span>
                    </div>
                    {plan.features.analytics && (
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                          <Check size={12} className="text-[#14532D]" />
                        </div>
                        <span style={{ fontSize: "13px", color: "#4B5563" }}>Advanced Analytics</span>
                      </div>
                    )}
                    {plan.features.multi_agent && (
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                          <Check size={12} className="text-[#14532D]" />
                        </div>
                        <span style={{ fontSize: "13px", color: "#4B5563" }}>Multi-Agent Support</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={isCurrent || submitting !== null}
                    className={`w-full py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${
                      isCurrent 
                        ? "bg-gray-100 text-gray-400 cursor-default" 
                        : "bg-[#14532D] text-white hover:opacity-90 shadow-lg shadow-green-900/10"
                    }`}
                  >
                    {submitting === plan.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isCurrent ? (
                      <Zap size={16} />
                    ) : (
                      "Switch to Plan"
                    )}
                    {isCurrent ? "Current Plan" : ""}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-8 text-center py-20">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <History className="w-8 h-8 text-gray-400" />
            </div>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#111827" }}>No transactions yet</h3>
            <p style={{ fontSize: "14px", color: "#6B7280", marginTop: "8px" }}>
              Your future subscription payments will appear here.
            </p>
          </div>
        </div>
      )}

      {/* Security Note */}
      <div className="mt-12 p-6 rounded-2xl bg-[#f8fafc] border border-[#f1f5f9] flex items-start gap-4">
        <CreditCard className="w-6 h-6 text-[#14532D] flex-shrink-0 mt-0.5" />
        <div>
          <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#111827" }}>Safe & Secure Payments</h4>
          <p style={{ fontSize: "12px", color: "#6B7280", marginTop: "4px", lineHeight: 1.5 }}>
            All transactions are processed using industry-standard encryption. 
            Monthly subscriptions can be canceled at any time from this dashboard.
            Prices are in Ugandan Shillings (UGX).
          </p>
        </div>
      </div>
    </Layout>
  );
}

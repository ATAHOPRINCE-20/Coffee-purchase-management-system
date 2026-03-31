import React, { useRef, useState, useEffect } from "react";
import { X, Download, Share2, Loader2, Tag, Info } from "lucide-react";
import { toPng } from "html-to-image";
import { useAuth, getEffectiveAdminId } from "../hooks/useAuth";
import { settingsService } from "../services/settingsService";

export function SharePricesModal({ isOpen, onClose, prices, dateStr }: any) {
  const { profile } = useAuth();
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [companyName, setCompanyName] = useState("Your Company Name");

  useEffect(() => {
    if (isOpen && profile) {
      const adminId = getEffectiveAdminId(profile);
      if (adminId) {
        settingsService.getCompanyProfile(adminId).then(data => {
          if (data && data.name) {
            setCompanyName(data.name);
          }
        }).catch(err => console.error("Error fetching company name", err));
      }
    }
  }, [isOpen, profile]);

  if (!isOpen || !prices) return null;

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      // html-to-image is much more reliable with modern CSS
      const dataUrl = await toPng(cardRef.current, { 
        cacheBust: true, 
        backgroundColor: "#ffffff",
        pixelRatio: 3
      });
      
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `CoffeeTrack_Prices_${dateStr}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("Failed to generate image", err);
    } finally {
      setDownloading(false);
    }
  };

  const shareText = `☕ *Today's Coffee Buying Prices*
🗓 ${new Date(dateStr).toLocaleDateString("en-UG", { weekday: "short", day: "numeric", month: "long", year: "numeric" })}

🟢 *Kiboko:* UGX ${prices.kiboko_price?.toLocaleString()} / kg
🔴 *Red:* UGX ${prices.red_price?.toLocaleString() || 'N/A'} / kg
🟣 *Kase:* UGX ${prices.kase_price?.toLocaleString() || 'N/A'} / kg

_Bring your coffee to us today!_ 🚛`;

  const handleWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm md:max-w-md overflow-hidden flex flex-col shadow-2xl" style={{ maxHeight: "90vh" }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: "16px", fontWeight: 600, color: "#111827" }}>Share Today's Prices</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 bg-gray-50 flex flex-col items-center">
          
          {/* Price Card Preview (What html2canvas captures) */}
          <div 
            ref={cardRef} 
            className="w-full relative overflow-hidden rounded-2xl bg-white shadow-sm border border-gray-100 p-6"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            {/* Aesthetic Background Accents */}
            <div className="absolute top-0 left-0 w-full h-2 bg-[#14532D]" />
            <div className="absolute -top-16 -right-16 w-40 h-40 bg-[#f0fdf4] rounded-full pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-[#fef3c7] rounded-full pointer-events-none" />

            <div className="relative z-10">
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-7 h-7 rounded-lg bg-[#f0fdf4] flex items-center justify-center border border-[#bbf7d0]">
                      <Tag size={12} color="#14532D" />
                    </div>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: "#14532D", textTransform: "uppercase", letterSpacing: "0.05em" }}>Daily Buying Prices</span>
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: "#111827" }} className="truncate max-w-[200px]" title={companyName}>
                    {companyName}
                  </div>
                </div>
                <div className="text-right">
                  <div style={{ fontSize: "10px", color: "#6B7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Date</div>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "#111827" }}>
                    {new Date(dateStr).toLocaleDateString("en-GB", { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
              </div>

              {/* Price List */}
              <div className="space-y-2 mb-5">
                {/* Kiboko */}
                <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-[#F8FAFC]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#14532D" }} />
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "#374151" }}>Kiboko</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span style={{ fontSize: "10px", color: "#6B7280", fontWeight: 500 }}>UGX</span>
                    <span style={{ fontSize: "15px", fontWeight: 700, color: "#14532D" }}>{prices.kiboko_price?.toLocaleString()}</span>
                  </div>
                </div>

                {/* Red */}
                <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-[#F8FAFC]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#DC2626" }} />
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "#374151" }}>Red</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span style={{ fontSize: "10px", color: "#6B7280", fontWeight: 500 }}>UGX</span>
                    <span style={{ fontSize: "15px", fontWeight: 700, color: "#DC2626" }}>{prices.red_price ? prices.red_price.toLocaleString() : '—'}</span>
                  </div>
                </div>

                {/* Kase */}
                <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-[#F8FAFC]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#A855F7" }} />
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "#374151" }}>Kase</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span style={{ fontSize: "10px", color: "#6B7280", fontWeight: 500 }}>UGX</span>
                    <span style={{ fontSize: "15px", fontWeight: 700, color: "#A855F7" }}>{prices.kase_price ? prices.kase_price.toLocaleString() : '—'}</span>
                  </div>
                </div>
              </div>

              {/* Footer / Notes */}
              {prices.notes && (
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-yellow-50 border border-yellow-100 mb-3">
                  <Info size={12} color="#F59E0B" className="mt-0.5 flex-shrink-0" />
                  <span style={{ fontSize: "11px", color: "#92400E", lineHeight: 1.4 }}>{prices.notes}</span>
                </div>
              )}

              <div className="text-center pt-3 border-t border-gray-100">
                <span style={{ fontSize: "11px", fontWeight: 600, color: "#9CA3AF" }}>Bring your coffee to us today! 🚚</span>
              </div>
            </div>
          </div>
          
          <div className="mt-5 text-center px-4">
            <span style={{ fontFamily: "Inter", fontSize: "12px", color: "#6B7280" }}>
              Share this beautiful price card to your WhatsApp status or directly to farmer groups.
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="p-5 border-t border-gray-100 bg-white grid grid-cols-2 gap-3">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
            style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600, color: "#374151" }}
          >
            {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Save Image
          </button>
          <button
            onClick={handleWhatsApp}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-colors hover:opacity-90"
            style={{ backgroundColor: "#25D366", color: "#fff", fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600 }}
          >
            <Share2 size={16} />
            Share Text
          </button>
        </div>
      </div>
    </div>
  );
}

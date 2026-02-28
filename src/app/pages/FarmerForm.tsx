import React, { useState } from "react";
import { useNavigate } from "react-router";
import { Layout } from "../components/Layout";
import { User, Phone, MapPin, Save, X, Loader2, Check, AlertCircle } from "lucide-react";
import { farmersService, Farmer } from "../services/farmersService";

function SuccessToast({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="fixed bottom-6 right-6 flex items-center gap-3 px-5 py-4 rounded-xl shadow-xl z-50"
      style={{ backgroundColor: "#14532D", color: "#fff", fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 500 }}>
      <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center"><Check size={14} color="#fff" /></div>
      Farmer registered successfully!
    </div>
  );
}

export default function FarmerForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    village: "",
    region: "Western Uganda", // Default region
  });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!formData.name.trim()) e.name = "Farmer name is required";
    if (!formData.phone.trim()) e.phone = "Phone number is required";
    if (!formData.village.trim()) e.village = "Village name is required";
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }

    try {
      setLoading(true);
      setErrors({});
      
      await farmersService.create(formData as Farmer);
      
      setToast(true);
      setTimeout(() => {
        setToast(false);
        navigate("/farmers");
      }, 2000);
    } catch (err: any) {
      console.error("Error saving farmer:", err);
      setErrors({ submit: err.message || "Failed to register farmer" });
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (field: string) =>
    `w-full px-3.5 py-2.5 rounded-xl border transition-all outline-none ${
      errors[field] ? "border-red-400 bg-red-50" : "border-gray-200 bg-white"
    } focus:border-[#14532D] focus:ring-2 focus:ring-[#14532D]/10`;

  return (
    <Layout breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Farmers", href: "/farmers" }, { label: "Register Farmer" }]}>
      <SuccessToast visible={toast} />

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 style={{ fontFamily: "Inter, sans-serif", fontSize: "22px", fontWeight: 700, color: "#111827" }}>Register New Farmer</h1>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#6B7280", marginTop: "2px" }}>Onboard a new farmer to the coffee management system</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl shadow-sm" style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0" }}>
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#16A34A" }} />
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 500, color: "#14532D" }}>New Profile Registration</span>
        </div>
      </div>

      {errors.submit && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3 text-red-800 text-sm">
          <AlertCircle size={18} />
          {errors.submit}
        </div>
      )}

      <div className="max-w-2xl">
        <div className="bg-white rounded-2xl p-8 mb-6" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.04)", border: "1px solid #F1F5F9" }}>
          <div className="flex items-center gap-3 mb-8 pb-5 border-b border-gray-100">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#f0fdf4" }}>
              <User size={20} color="#14532D" />
            </div>
            <div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: "16px", fontWeight: 600, color: "#111827" }}>Farmer Profile Information</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#6B7280" }}>Basic contact details for the farmer</div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Name */}
            <div>
              <label style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "8px" }}>
                Full Name <span style={{ color: "#DC2626" }}>*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. John Doe"
                  className={inputClass("name")}
                  style={{ fontFamily: "Inter, sans-serif", fontSize: "14px" }}
                />
              </div>
              {errors.name && <p style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#DC2626", marginTop: "4px" }}>{errors.name}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Phone */}
              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "8px" }}>
                  Phone Number <span style={{ color: "#DC2626" }}>*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
                    <Phone size={16} color="#9CA3AF" />
                  </div>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="07..."
                    className={`${inputClass("phone")} pl-10`}
                    style={{ fontFamily: "Inter, sans-serif", fontSize: "14px" }}
                  />
                </div>
                {errors.phone && <p style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#DC2626", marginTop: "4px" }}>{errors.phone}</p>}
              </div>

              {/* Village */}
              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "8px" }}>
                  Village <span style={{ color: "#DC2626" }}>*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
                    <MapPin size={16} color="#9CA3AF" />
                  </div>
                  <input
                    type="text"
                    value={formData.village}
                    onChange={e => setFormData({ ...formData, village: e.target.value })}
                    placeholder="Enter village"
                    className={`${inputClass("village")} pl-10`}
                    style={{ fontFamily: "Inter, sans-serif", fontSize: "14px" }}
                  />
                </div>
                {errors.village && <p style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#DC2626", marginTop: "4px" }}>{errors.village}</p>}
              </div>
            </div>

            {/* Region */}
            <div>
              <label style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "8px" }}>Region</label>
              <select
                value={formData.region}
                onChange={e => setFormData({ ...formData, region: e.target.value })}
                className={inputClass("region")}
                style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", color: "#374151", appearance: "none" }}
              >
                <option value="Western Uganda">Western Uganda</option>
                <option value="Central Uganda">Central Uganda</option>
                <option value="Eastern Uganda">Eastern Uganda</option>
                <option value="Northern Uganda">Northern Uganda</option>
              </select>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#14532D", color: "#fff", fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 600, boxShadow: "0 4px 12px rgba(20,83,45,0.2)" }}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Registering...
              </>
            ) : (
              <>
                <Save size={18} />
                Save Farmer Profile
              </>
            )}
          </button>
          <button
            onClick={() => navigate("/farmers")}
            className="px-8 py-3.5 rounded-xl transition-all hover:bg-gray-50 flex items-center gap-2"
            style={{ border: "2px solid #F1F5F9", color: "#6B7280", fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 500, backgroundColor: "#fff" }}
          >
            <X size={18} />
            Cancel
          </button>
        </div>
      </div>
    </Layout>
  );
}

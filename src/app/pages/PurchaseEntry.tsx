import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Layout } from "../components/Layout";
import { Check, ChevronDown, Info, Save, X, Calculator, User, Coffee, UserPlus, AlertCircle, Loader2 } from "lucide-react";
import { farmersService, Farmer } from "../services/farmersService";
import { purchasesService } from "../services/purchasesService";
import { advancesService, Advance } from "../services/advancesService";
import { pricesService } from "../services/pricesService";
import { seasonsService, Season } from "../services/seasonsService";
import { useAuth } from "../hooks/useAuth";

const STANDARD_MOISTURE = parseFloat(import.meta.env.VITE_STANDARD_MOISTURE || "14");

function calcDeduction(gross: number, moisture: number, std: number) {
  if (moisture <= std) return 0;
  return (gross * (moisture - std)) / (100 - std);
}

function formatUGX(v: number) {
  return `UGX ${Math.round(v).toLocaleString()}`;
}

type SuccessToastProps = { visible: boolean };
function SuccessToast({ visible }: SuccessToastProps) {
  if (!visible) return null;
  return (
    <div className="fixed bottom-6 right-6 flex items-center gap-3 px-5 py-4 rounded-xl shadow-xl z-50"
      style={{ backgroundColor: "#14532D", color: "#fff", fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 500 }}>
      <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center"><Check size={14} color="#fff" /></div>
      Purchase saved successfully!
    </div>
  );
}

export default function PurchaseEntry() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [allFarmers, setAllFarmers] = useState<Farmer[]>([]);
  const [activeSeason, setActiveSeason] = useState<Season | null>(null);
  const [buyingPrices, setBuyingPrices] = useState({ Robusta: 0, Arabica: 0, Red: 0, Kase: 0 });
  const [selectedFarmer, setSelectedFarmer] = useState<Farmer | null>(null);
  const [farmerSearch, setFarmerSearch] = useState("");
  const [farmerDropdownOpen, setFarmerDropdownOpen] = useState(false);
  
  // New Farmer State
  const [isNewFarmer, setIsNewFarmer] = useState(false);
  const [newFarmerData, setNewFarmerData] = useState({ phone: "", village: "" });

  const [coffeeType, setCoffeeType] = useState<"Robusta" | "Arabica" | "Red" | "Kase">("Robusta");
  const [grossWeight, setGrossWeight] = useState<string>("");
  const [moisture, setMoisture] = useState<string>("");
  const [standardMoisture, setStandardMoisture] = useState<string>(String(STANDARD_MOISTURE));
  const [advanceDeduct, setAdvanceDeduct] = useState<string>("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [toast, setToast] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [farmerAdvances, setFarmerAdvances] = useState<Advance[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [farmers, season, prices] = await Promise.all([
          farmersService.getAll(),
          seasonsService.getActive(),
          pricesService.getLatest()
        ]);
        setAllFarmers(farmers);
        setActiveSeason(season);
        if (prices) {
          setBuyingPrices({
            Robusta: prices.robusta_price,
            Arabica: prices.arabica_price,
            Red: prices.red_price || 0,
            Kase: prices.kase_price || 0
          });
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedFarmer && !isNewFarmer) {
      advancesService.getByFarmerId(selectedFarmer.id).then(setFarmerAdvances);
    } else {
      setFarmerAdvances([]);
    }
  }, [selectedFarmer, isNewFarmer]);

  const farmerAdvance = farmerAdvances.find(a => a.status === "Active");

  const gross = parseFloat(grossWeight) || 0;
  const moist = parseFloat(moisture) || 0;
  const std = parseFloat(standardMoisture) || 14;
  const price = buyingPrices[coffeeType];

  const deduction = calcDeduction(gross, moist, std);
  const payable = gross - deduction;
  const moistureLoss = gross > 0 ? (deduction / gross) * 100 : 0;
  const totalAmount = payable * price;

  useEffect(() => {
    if (farmerAdvance && totalAmount > 0 && !isNewFarmer) {
      const maxPossible = Math.min(totalAmount, farmerAdvance.remaining);
      // We automatically set the deduction to the maximum possible amount
      // This follows the "deduct first" rule requested by the user
      setAdvanceDeduct(String(Math.round(maxPossible)));
    } else if (!farmerAdvance || isNewFarmer || totalAmount <= 0) {
      setAdvanceDeduct("");
    }
  }, [totalAmount, farmerAdvance?.id, isNewFarmer]);

  const advDed = parseFloat(advanceDeduct) || 0;
  const cashToPay = totalAmount - advDed;

  const filteredFarmers = allFarmers.filter(f =>
    f.name.toLowerCase().includes(farmerSearch.toLowerCase()) ||
    f.village.toLowerCase().includes(farmerSearch.toLowerCase())
  );

  const handleSelectFarmer = (f: Farmer | { name: string, isNew: true }) => {
    if ('isNew' in f) {
      setIsNewFarmer(true);
      setSelectedFarmer({ id: 'new', name: f.name, phone: '', village: '', region: '' });
      setFarmerSearch(f.name);
    } else {
      setIsNewFarmer(false);
      setSelectedFarmer(f);
      setFarmerSearch(f.name);
    }
    setFarmerDropdownOpen(false);
    setAdvanceDeduct("");
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!selectedFarmer) e.farmer = "Please select a farmer";
    if (isNewFarmer) {
      if (!newFarmerData.phone) e.phone = "Phone is required for new farmers";
      if (!newFarmerData.village) e.village = "Village is required for new farmers";
    }
    if (!grossWeight || gross <= 0) e.grossWeight = "Enter a valid gross weight";
    if (!moisture || moist < 0 || moist > 100) e.moisture = "Enter a valid moisture content (0–100%)";
    if (!activeSeason) e.season = "No active season found. Please contact admin.";
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    
    try {
      setSaving(true);
      setErrors({});

      let farmerId = selectedFarmer!.id;

      if (isNewFarmer) {
        const newFarmer = await farmersService.create({
          name: selectedFarmer!.name,
          phone: newFarmerData.phone,
          village: newFarmerData.village,
          region: "Western Uganda", // Default or add field
        } as Farmer);
        farmerId = newFarmer.id;
      }

      await purchasesService.create({
        farmer_id: farmerId,
        season_id: activeSeason!.id,
        date: date,
        coffee_type: coffeeType,
        gross_weight: gross,
        moisture_content: moist,
        standard_moisture: std,
        deduction_weight: deduction,
        payable_weight: payable,
        buying_price: price,
        total_amount: totalAmount,
        advance_deducted: advDed,
        cash_paid: cashToPay,
        field_agent_id: profile?.id || '',
      });

      // Update the advance balance if a deduction was made
      if (advDed > 0 && farmerAdvance) {
        const newDeducted = (farmerAdvance.deducted || 0) + advDed;
        const newRemaining = farmerAdvance.amount - newDeducted;
        
        await advancesService.update(farmerAdvance.id, {
          deducted: newDeducted
        });
      }

      setToast(true);
      setTimeout(() => {
        setToast(false);
        navigate("/purchases");
      }, 2000);
    } catch (err: any) {
      console.error("Error saving purchase:", err);
      setErrors({ submit: err.message || "Failed to save purchase" });
    } finally {
      setSaving(false);
    }
  };

  const inputClass = (field: string) =>
    `w-full px-3.5 py-2.5 rounded-xl border transition-all outline-none ${
      errors[field] ? "border-red-400 bg-red-50" : "border-gray-200 bg-white"
    } focus:border-[#14532D] focus:ring-2 focus:ring-[#14532D]/10`;

  if (loading) {
    return (
      <Layout breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Purchases", href: "/purchases" }, { label: "New Purchase" }]}>
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-100 shadow-sm">
          <Loader2 className="w-10 h-10 text-green-700 animate-spin mb-4" />
          <h2 className="text-xl font-bold text-gray-900">Preparing Purchase Entry...</h2>
          <p className="text-gray-500 mt-2">Fetching the latest farmers and buying prices</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Purchases", href: "/purchases" }, { label: "New Purchase" }]}>
      <SuccessToast visible={toast} />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ fontFamily: "Inter, sans-serif", fontSize: "22px", fontWeight: 700, color: "#111827" }}>New Purchase Entry</h1>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#6B7280", marginTop: "2px" }}>Record a new coffee purchase from a farmer</p>
        </div>
        {!activeSeason && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
            <AlertCircle size={14} />
            No active season! Entries may be restricted.
          </div>
        )}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0" }}>
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#16A34A" }} />
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 500, color: "#14532D" }}>Live Calculation Active</span>
        </div>
      </div>

      {errors.submit && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3 text-red-800 text-sm">
          <AlertCircle size={18} />
          {errors.submit}
        </div>
      )}

      <div className="flex flex-col xl:flex-row gap-5">
        {/* Left: Forms */}
        <div className="flex-1 space-y-5">

          {/* 1. Farmer Information */}
          <div className="bg-white rounded-xl p-6" style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.05)", border: "1px solid #F1F5F9" }}>
            <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-gray-100">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#f0fdf4" }}>
                <User size={15} color="#14532D" />
              </div>
              <div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: "15px", fontWeight: 600, color: "#111827" }}>Farmer Information</div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#6B7280" }}>Select the farmer for this purchase</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Farmer Name Dropdown */}
              <div className="md:col-span-2">
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "6px" }}>
                  Farmer Name <span style={{ color: "#DC2626" }}>*</span>
                </label>
                <div className="relative">
                  <div
                    className="w-full px-3.5 py-2.5 rounded-xl border cursor-pointer flex items-center justify-between transition-all"
                    style={{
                      border: errors.farmer ? "1px solid #F87171" : farmerDropdownOpen ? "1px solid #14532D" : "1px solid #E5E7EB",
                      backgroundColor: errors.farmer ? "#FFF5F5" : "#fff",
                      boxShadow: farmerDropdownOpen ? "0 0 0 3px rgba(20,83,45,0.08)" : "none"
                    }}
                    onClick={() => setFarmerDropdownOpen(!farmerDropdownOpen)}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      {selectedFarmer && !farmerDropdownOpen ? (
                        <>
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: isNewFarmer ? "#F59E0B" : "#14532D", color: "#fff", fontFamily: "Inter", fontSize: "11px", fontWeight: 700 }}>
                            {selectedFarmer.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#111827", fontWeight: 500 }}>
                            {selectedFarmer.name}
                            {isNewFarmer && <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md">NEW</span>}
                          </span>
                        </>
                      ) : (
                        <input
                          type="text"
                          placeholder="Search farmer by name or village..."
                          value={farmerSearch}
                          onChange={e => { setFarmerSearch(e.target.value); setFarmerDropdownOpen(true); }}
                          onClick={e => { e.stopPropagation(); setFarmerDropdownOpen(true); }}
                          className="flex-1 outline-none bg-transparent"
                          style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#374151" }}
                        />
                      )}
                    </div>
                    <ChevronDown size={15} color="#9CA3AF" style={{ flexShrink: 0, transform: farmerDropdownOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.15s" }} />
                  </div>

                  {farmerDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 z-50 overflow-hidden"
                      style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
                      <div className="max-h-52 overflow-y-auto">
                        {filteredFarmers.length === 0 && farmerSearch.trim() !== "" ? (
                          <div
                            className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-amber-50"
                            onClick={() => handleSelectFarmer({ name: farmerSearch, isNew: true })}
                          >
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500 text-white">
                              <UserPlus size={15} />
                            </div>
                            <div>
                              <div style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600, color: "#111827" }}>Add "{farmerSearch}" as new farmer</div>
                              <div style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#9CA3AF" }}>Create a new profile for this client</div>
                            </div>
                          </div>
                        ) : filteredFarmers.length === 0 ? (
                          <div className="px-4 py-3 text-center" style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#9CA3AF" }}>Type to search or add new</div>
                        ) : (
                          <>
                            {filteredFarmers.map(f => (
                              <div
                                key={f.id}
                                className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50"
                                onClick={() => handleSelectFarmer(f)}
                              >
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                                  style={{ backgroundColor: "#14532D", color: "#fff", fontFamily: "Inter", fontSize: "11px", fontWeight: 700 }}>
                                  {f.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 500, color: "#111827" }}>{f.name}</div>
                                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#9CA3AF" }}>{f.village} · {f.phone}</div>
                                </div>
                                {selectedFarmer?.id === f.id && <Check size={14} color="#14532D" className="ml-auto" />}
                              </div>
                            ))}
                            {farmerSearch.trim() !== "" && !filteredFarmers.some(f => f.name.toLowerCase() === farmerSearch.toLowerCase()) && (
                              <div
                                className="flex items-center gap-3 px-4 py-3 border-t border-gray-50 cursor-pointer transition-colors hover:bg-amber-50"
                                onClick={() => handleSelectFarmer({ name: farmerSearch, isNew: true })}
                              >
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-100 text-amber-600">
                                  <UserPlus size={15} />
                                </div>
                                <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 500, color: "#92400e" }}>Add "{farmerSearch}" as new</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {errors.farmer && <p style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#DC2626", marginTop: "4px" }}>{errors.farmer}</p>}
              </div>

              {/* New Farmer Addition Fields */}
              {isNewFarmer ? (
                <>
                  <div>
                    <label style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "6px" }}>
                      New Farmer Phone <span style={{ color: "#DC2626" }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={newFarmerData.phone}
                      onChange={e => setNewFarmerData({ ...newFarmerData, phone: e.target.value })}
                      placeholder="+256..."
                      className={inputClass("phone")}
                      style={{ fontFamily: "Inter, sans-serif", fontSize: "13px" }}
                    />
                    {errors.phone && <p style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#DC2626", marginTop: "4px" }}>{errors.phone}</p>}
                  </div>
                  <div>
                    <label style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "6px" }}>
                      New Farmer Village <span style={{ color: "#DC2626" }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={newFarmerData.village}
                      onChange={e => setNewFarmerData({ ...newFarmerData, village: e.target.value })}
                      placeholder="Enter village"
                      className={inputClass("village")}
                      style={{ fontFamily: "Inter, sans-serif", fontSize: "13px" }}
                    />
                    {errors.village && <p style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#DC2626", marginTop: "4px" }}>{errors.village}</p>}
                  </div>
                </>
              ) : (
                <>
                  {/* Contact Number */}
                  <div>
                    <label style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "6px" }}>Contact Number</label>
                    <input
                      type="text"
                      value={selectedFarmer?.phone || ""}
                      readOnly
                      placeholder="Auto-filled"
                      className={inputClass("")}
                      style={{ backgroundColor: "#F9FAFB", color: "#6B7280", fontFamily: "Inter, sans-serif", fontSize: "13px", cursor: "not-allowed" }}
                    />
                  </div>

                  {/* Village */}
                  <div>
                    <label style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "6px" }}>Village</label>
                    <input
                      type="text"
                      value={selectedFarmer?.village || ""}
                      readOnly
                      placeholder="Auto-filled"
                      className={inputClass("")}
                      style={{ backgroundColor: "#F9FAFB", color: "#6B7280", fontFamily: "Inter, sans-serif", fontSize: "13px", cursor: "not-allowed" }}
                    />
                  </div>
                </>
              )}

              {/* Date */}
              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "6px" }}>Purchase Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className={inputClass("")}
                  style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#374151" }}
                />
              </div>
            </div>
          </div>

          {/* 2. Coffee Details */}
          <div className="bg-white rounded-xl p-6" style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.05)", border: "1px solid #F1F5F9" }}>
            <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-gray-100">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#fdf6f3" }}>
                <Coffee size={15} color="#6F4E37" />
              </div>
              <div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: "15px", fontWeight: 600, color: "#111827" }}>Coffee Details</div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#6B7280" }}>Enter weight and moisture readings</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Coffee Type */}
              <div className="md:col-span-2">
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "6px" }}>Coffee Type</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(["Robusta", "Arabica", "Red", "Kase"] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setCoffeeType(type)}
                      className="py-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1"
                      style={{
                        borderColor: coffeeType === type ? 
                          (type === 'Robusta' ? '#14532D' : type === 'Arabica' ? '#6F4E37' : type === 'Red' ? '#DC2626' : '#A855F7') : '#E5E7EB',
                        backgroundColor: coffeeType === type ? 
                          (type === 'Robusta' ? '#f0fdf4' : type === 'Arabica' ? '#fdf6f3' : type === 'Red' ? '#fef2f2' : '#fdf4ff') : '#fff',
                        fontFamily: "Inter, sans-serif",
                        color: coffeeType === type ? 
                          (type === 'Robusta' ? '#14532D' : type === 'Arabica' ? '#6F4E37' : type === 'Red' ? '#DC2626' : '#A855F7') : '#6B7280'
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {coffeeType === type && <Check size={13} />}
                        <span className="text-sm font-bold">{type}</span>
                      </div>
                      <span className="text-[10px] opacity-70">
                        UGX {buyingPrices[type].toLocaleString()}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Gross Weight */}
              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "6px" }}>
                  Gross Weight (kg) <span style={{ color: "#DC2626" }}>*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={grossWeight}
                    onChange={e => setGrossWeight(e.target.value)}
                    placeholder="0.00"
                    className={inputClass("grossWeight")}
                    style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#374151", paddingRight: "48px" }}
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#9CA3AF" }}>kg</span>
                </div>
                {errors.grossWeight && <p style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#DC2626", marginTop: "4px" }}>{errors.grossWeight}</p>}
              </div>

              {/* Moisture Content */}
              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "6px" }}>
                  Moisture Content (%) <span style={{ color: "#DC2626" }}>*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={moisture}
                    onChange={e => setMoisture(e.target.value)}
                    placeholder="0.0"
                    className={inputClass("moisture")}
                    style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#374151", paddingRight: "32px" }}
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#9CA3AF" }}>%</span>
                </div>
                {errors.moisture && <p style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#DC2626", marginTop: "4px" }}>{errors.moisture}</p>}
              </div>

              {/* Standard Moisture */}
              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "6px" }}>
                  Standard Moisture (%)
                  <span className="ml-1.5 px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: "#fef9c3", color: "#854d0e", fontSize: "10px" }}>Admin</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={standardMoisture}
                    onChange={e => setStandardMoisture(e.target.value)}
                    className={inputClass("")}
                    style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#374151", paddingRight: "32px" }}
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#9CA3AF" }}>%</span>
                </div>
              </div>

              {/* Active Price Display */}
              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "6px" }}>Active Buying Price</label>
                <div className="px-3.5 py-2.5 rounded-xl border border-gray-200 flex items-center justify-between"
                  style={{ backgroundColor: "#f0fdf4" }}>
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 700, color: "#14532D" }}>UGX {price.toLocaleString()}</span>
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#16A34A" }}>per kg · {coffeeType}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Advance Information */}
          {selectedFarmer && (
            <div className="bg-white rounded-xl p-6" style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.05)", border: "1px solid #F1F5F9" }}>
              <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-gray-100">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#fff7ed" }}>
                  <Info size={15} color="#F59E0B" />
                </div>
                <div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: "15px", fontWeight: 600, color: "#111827" }}>Advance Information</div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#6B7280" }}>{selectedFarmer.name}'s advance account</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                {[
                  { label: "Total Advance Given", value: farmerAdvance ? formatUGX(farmerAdvance.amount) : "UGX 0", color: "#374151" },
                  { label: "Total Deducted", value: farmerAdvance ? formatUGX(farmerAdvance.deducted) : "UGX 0", color: "#16A34A" },
                  { label: "Current Balance", value: farmerAdvance ? formatUGX(farmerAdvance.remaining) : "UGX 0", color: farmerAdvance ? "#DC2626" : "#6B7280" },
                ].map(item => (
                  <div key={item.label} className="p-3 rounded-xl" style={{ backgroundColor: "#F8FAFC", border: "1px solid #F1F5F9" }}>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#6B7280", marginBottom: "4px" }}>{item.label}</div>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600, color: item.color }}>{item.value}</div>
                  </div>
                ))}
              </div>

              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "6px" }}>
                  Advance to Deduct This Purchase
                  {advDed > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-green-100 text-green-700 font-bold uppercase tracking-wider">
                      Auto-Applied
                    </span>
                  )}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#9CA3AF" }}>UGX</span>
                  <input
                    type="number"
                    min="0"
                    max={farmerAdvance?.remaining || 0}
                    value={advanceDeduct}
                    onChange={e => setAdvanceDeduct(e.target.value)}
                    placeholder="0"
                    className={inputClass("")}
                    style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#374151", paddingLeft: "48px" }}
                  />
                </div>
                {farmerAdvance && (
                  <p style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#6B7280", marginTop: "4px" }}>
                    Max deductible: {formatUGX(farmerAdvance.remaining)}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Live Calculation Panel */}
        <div className="xl:w-80 flex-shrink-0">
          <div className="sticky top-0">
            {/* Calculation Card */}
            <div className="rounded-xl overflow-hidden" style={{ boxShadow: "0 8px 24px rgba(20,83,45,0.12)", border: "1px solid #bbf7d0" }}>
              {/* Header */}
              <div className="px-5 py-4" style={{ backgroundColor: "#14532D" }}>
                <div className="flex items-center gap-2">
                  <Calculator size={16} color="#86efac" />
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 600, color: "#fff" }}>Live Calculation</span>
                </div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#86efac", marginTop: "2px" }}>Updates automatically as you type</div>
              </div>

              {/* Body */}
              <div className="p-5 space-y-0" style={{ backgroundColor: "#f0fdf4" }}>
                {/* Inputs summary */}
                <div className="flex justify-between items-center py-3 border-b border-green-200">
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#374151" }}>Gross Weight</span>
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600, color: "#111827" }}>{gross > 0 ? `${gross.toFixed(2)} kg` : "—"}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-green-200">
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#374151" }}>Moisture Content</span>
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600, color: "#111827" }}>{moist > 0 ? `${moist.toFixed(1)}%` : "—"}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-green-200">
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#374151" }}>Standard Moisture</span>
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600, color: "#111827" }}>{std}%</span>
                </div>

                <div className="mt-1 pt-1">
                  <div className="flex justify-between items-center py-3 border-b border-green-200">
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#374151" }}>Moisture Loss %</span>
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600, color: moistureLoss > 0 ? "#DC2626" : "#6B7280" }}>
                      {gross > 0 && moist > std ? `${moistureLoss.toFixed(2)}%` : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-green-200">
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#374151" }}>Deduction</span>
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600, color: deduction > 0 ? "#DC2626" : "#6B7280" }}>
                      {deduction > 0 ? `−${deduction.toFixed(2)} kg` : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-green-200">
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#14532D" }}>Payable Weight</span>
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 700, color: "#14532D" }}>
                      {payable > 0 ? `${payable.toFixed(2)} kg` : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-green-200">
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#374151" }}>Buying Price</span>
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 500, color: "#111827" }}>UGX {price.toLocaleString()}/kg</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-green-200">
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#374151" }}>Total Amount</span>
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600, color: "#111827" }}>
                      {totalAmount > 0 ? `UGX ${Math.round(totalAmount).toLocaleString()}` : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-green-200">
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#374151" }}>Advance Deducted</span>
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 500, color: advDed > 0 ? "#DC2626" : "#6B7280" }}>
                      {advDed > 0 ? `−UGX ${Math.round(advDed).toLocaleString()}` : "—"}
                    </span>
                  </div>
                </div>

                {/* Cash to Pay - Highlighted */}
                <div className="mt-2 p-4 rounded-xl" style={{ backgroundColor: "#14532D", marginTop: "8px" }}>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600, color: "#86efac", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>
                    Cash to Pay Farmer
                  </div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: "28px", fontWeight: 800, color: "#ffffff", lineHeight: 1.1 }}>
                    {cashToPay > 0 ? `UGX ${Math.round(cashToPay).toLocaleString()}` : "UGX 0"}
                  </div>
                  {payable > 0 && (
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#a7f3d0", marginTop: "6px" }}>
                      {payable.toFixed(2)} kg × UGX {price.toLocaleString()} {advDed > 0 ? `− UGX ${Math.round(advDed).toLocaleString()}` : ""}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-4 space-y-2.5">
              <button
                onClick={handleSave}
                disabled={saving || !activeSeason}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: "#14532D", color: "#fff", fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 600, boxShadow: "0 4px 12px rgba(20,83,45,0.3)" }}
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Save Purchase
                  </>
                )}
              </button>
              <button
                onClick={() => navigate(-1)}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl transition-all hover:bg-gray-50"
                style={{ border: "2px solid #E5E7EB", color: "#374151", fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 500, backgroundColor: "#fff" }}
              >
                <X size={16} />
                Cancel
              </button>
            </div>

            {/* Info Note */}
            <div className="mt-3 p-3 rounded-xl flex items-start gap-2" style={{ backgroundColor: "#fffbeb", border: "1px solid #fde68a" }}>
              <Info size={13} color="#F59E0B" style={{ flexShrink: 0, marginTop: "1px" }} />
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#92400e", lineHeight: 1.5 }}>
                Formula: Deduction = Gross × (Moisture − Std) ÷ (100 − Std)
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

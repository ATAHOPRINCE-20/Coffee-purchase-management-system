import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { Layout } from "../components/Layout";
import { supabase } from "../lib/supabase";
import { Check, ChevronDown, Info, Save, X, Calculator, User, Coffee, UserPlus, AlertCircle, Loader2 } from "lucide-react";
import { farmersService, Farmer } from "../services/farmersService";
import { purchasesService } from "../services/purchasesService";
import { advancesService, Advance } from "../services/advancesService";
import { pricesService } from "../services/pricesService";
import { seasonsService, Season } from "../services/seasonsService";
import { useAuth, getEffectiveAdminId } from "../hooks/useAuth";
import { useSync } from "../contexts/SyncContext";
import { getEATDateString } from "../utils/dateUtils";
import { PurchaseReceiptModal } from "../components/PurchaseReceiptModal";

const STANDARD_MOISTURE = parseFloat(import.meta.env.VITE_STANDARD_MOISTURE || "14");
const PURCHASE_DRAFT_KEY = "cpms_purchase_entry_draft";

function calcDeduction(gross: number, moisture: number, std: number) {
  if (moisture <= std) return 0;
  // User Formula: Deduction = Gross * (Moisture - Std) * 1.5%
  return gross * (moisture - std) * 0.015;
}

function formatUGX(v: number) {
  return `UGX ${Math.round(v).toLocaleString()}`;
}

type SuccessToastProps = { visible: boolean };
function SuccessToast({ visible, isOnline }: SuccessToastProps & { isOnline: boolean }) {
  if (!visible) return null;
  return (
    <div className="fixed bottom-6 right-6 flex items-center gap-3 px-5 py-4 rounded-xl shadow-xl z-50 transition-all"
      style={{ backgroundColor: isOnline ? "#14532D" : "#F59E0B", color: "#fff", fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 500 }}>
      {isOnline ? (
         <>
           <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center"><Check size={14} color="#fff" /></div>
           Purchase saved successfully!
         </>
      ) : (
         <>
           <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center"><AlertCircle size={14} color="#fff" /></div>
           Saved Offline. Pending Sync.
         </>
      )}
    </div>
  );
}

export default function PurchaseEntry() {
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const farmerIdParam = searchParams.get('farmerId');
  const isEditMode = !!editId;
  const { profile } = useAuth();
  const { isOnline, addToSyncQueue } = useSync();
  const [loading, setLoading] = useState(true);
  const [allFarmers, setAllFarmers] = useState<Farmer[]>([]);
  const [activeSeason, setActiveSeason] = useState<Season | null>(null);
  const [buyingPrices, setBuyingPrices] = useState({ Kiboko: 0, Red: 0, Kase: 0 });
  const [selectedFarmer, setSelectedFarmer] = useState<Farmer | null>(null);
  const [farmerSearch, setFarmerSearch] = useState("");
  const [farmerDropdownOpen, setFarmerDropdownOpen] = useState(false);
  
  // New Farmer State
  const [isNewFarmer, setIsNewFarmer] = useState(false);
  const [newFarmerData, setNewFarmerData] = useState({ phone: "", village: "", eudr_number: "" });

  const [coffeeType, setCoffeeType] = useState<"Kiboko" | "Red" | "Kase">("Kiboko");
  const [grossWeight, setGrossWeight] = useState<string>("");
  const [moisture, setMoisture] = useState<string>("");
  const [standardMoisture, setStandardMoisture] = useState<string>(String(STANDARD_MOISTURE));
  const [advanceDeduct, setAdvanceDeduct] = useState<string>("");
  const [date, setDate] = useState(() => getEATDateString());
  const [eudrNumber, setEudrNumber] = useState("");
  const [toast, setToast] = useState(false);
  const [manualDeduction, setManualDeduction] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [savedPurchase, setSavedPurchase] = useState<any>(null);

  const [farmerAdvances, setFarmerAdvances] = useState<Advance[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const adminId = getEffectiveAdminId(profile);
        if (!adminId) return;
        const [farmers, season, prices] = await Promise.all([
          farmersService.getAll(adminId),
          seasonsService.getActive(adminId),
          pricesService.getLatest(adminId)
        ]);
        setAllFarmers(farmers);
        setActiveSeason(season);
        if (prices) {
          setBuyingPrices({
            Kiboko: prices.kiboko_price,
            Red: prices.red_price || 0,
            Kase: prices.kase_price || 0
          });
        }

        // If editing, load existing purchase data
        if (isEditMode && editId) {
          const existing = await purchasesService.getById(editId);
          if (existing) {
            setCoffeeType(existing.coffee_type as any);
            setGrossWeight(String(existing.gross_weight));
            setMoisture(String(existing.moisture_content));
            setStandardMoisture(String(existing.standard_moisture));
            setAdvanceDeduct(String(existing.advance_deducted || ''));
            setDate(existing.date);
            // Find and set the farmer
            const farmer = farmers.find(f => f.id === existing.farmer_id);
            if (farmer) {
              setSelectedFarmer(farmer);
              setFarmerSearch(farmer.name);
            }
          }
        } else {
          // New purchase - check for farmerId param first, then try to restore draft
          const farmerIdFromParam = farmerIdParam;
          const draftStr = localStorage.getItem(PURCHASE_DRAFT_KEY);
          let draft: any = null;
          if (draftStr) {
            try {
              draft = JSON.parse(draftStr);
            } catch (e) {
              console.error("Error parsing purchase draft", e);
            }
          }

          if (farmerIdFromParam) {
            const farmer = farmers.find(f => f.id === farmerIdFromParam);
            if (farmer) {
              setSelectedFarmer(farmer);
              setFarmerSearch(farmer.name);
              setEudrNumber(farmer.eudr_number || "");
            }
          } else if (draft) {
            setCoffeeType(draft.coffeeType || "Kiboko");
            setGrossWeight(draft.grossWeight || "");
            setMoisture(draft.moisture || "");
            setStandardMoisture(draft.standardMoisture || String(STANDARD_MOISTURE));
            setAdvanceDeduct(draft.advanceDeduct || "");
            setDate(draft.date || getEATDateString());
            setManualDeduction(draft.manualDeduction || "");
            setIsNewFarmer(!!draft.isNewFarmer);
            setNewFarmerData(draft.newFarmerData || { phone: "", village: "", eudr_number: "" });
            setEudrNumber(draft.eudrNumber || "");
            if (draft.selectedFarmer) {
              setSelectedFarmer(draft.selectedFarmer);
              setFarmerSearch(draft.selectedFarmer.name);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isEditMode]);

  useEffect(() => {
    if (selectedFarmer && !isNewFarmer) {
      advancesService.getByFarmerId(selectedFarmer.id).then(setFarmerAdvances);
    } else {
      setFarmerAdvances([]);
    }
  }, [selectedFarmer, isNewFarmer]);

  // Persist draft to localStorage on change
  useEffect(() => {
    if (!isEditMode && !loading) {
      const draft = {
        selectedFarmer,
        coffeeType,
        grossWeight,
        moisture,
        standardMoisture,
        advanceDeduct,
        date,
        eudrNumber,
        manualDeduction,
        isNewFarmer,
        newFarmerData
      };
      localStorage.setItem(PURCHASE_DRAFT_KEY, JSON.stringify(draft));
    }
  }, [
    selectedFarmer, coffeeType, grossWeight, moisture, standardMoisture, 
    advanceDeduct, date, manualDeduction, isNewFarmer, newFarmerData, isEditMode, loading
  ]);

  const farmerAdvance = farmerAdvances.find(a => a.status === "Active");

  const gross = parseFloat(grossWeight) || 0;
  const moist = coffeeType === "Kase" ? (parseFloat(moisture) || 0) : 0;
  const std = coffeeType === "Kase" ? (parseFloat(standardMoisture) || 14) : 0;
  const price = buyingPrices[coffeeType];

  const exactDeduction = coffeeType === "Kase" ? calcDeduction(gross, moist, std) : 0;
  const autoDeduction = Math.ceil(exactDeduction);
  const deduction = manualDeduction !== "" ? (parseFloat(manualDeduction) || 0) : autoDeduction;
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
      setEudrNumber("");
    } else {
      setIsNewFarmer(false);
      setSelectedFarmer(f);
      setFarmerSearch(f.name);
      setEudrNumber(f.eudr_number || "");
    }
    setFarmerDropdownOpen(false);
    setAdvanceDeduct("");
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!selectedFarmer) e.farmer = "Please select a client";
    if (isNewFarmer) {
      if (!newFarmerData.phone) e.phone = "Phone is required for new clients";
      if (!newFarmerData.village) e.village = "Village is required for new clients";
    }
    if (!grossWeight || gross <= 0) e.grossWeight = "Enter a valid gross weight";
    if (coffeeType === "Kase" && (!moisture || moist < 0 || moist > 100)) e.moisture = "Enter a valid moisture content (0–100%)";
    if (!activeSeason) e.season = "No active season found. Please contact admin.";
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    
    try {
      setSaving(true);
      setErrors({});

      let finalPurchaseData: any;

      if (isEditMode && editId) {
        // Update existing purchase
        const updateData = {
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
          date: date,
        };
        await purchasesService.update(editId, updateData);
        finalPurchaseData = { id: editId, ...updateData };
      } else {
        let farmerId = selectedFarmer!.id;

        if (isNewFarmer) {
          const newFarmerPayload = {
            id: crypto.randomUUID(),
            name: selectedFarmer!.name,
            phone: newFarmerData.phone,
            village: newFarmerData.village,
            eudr_number: eudrNumber,
            region: "Western Uganda",
            admin_id: getEffectiveAdminId(profile) || '',
          };

          if (isOnline) {
            const newFarmer = await farmersService.create(newFarmerPayload);
            farmerId = newFarmer.id;
          } else {
            await addToSyncQueue('CREATE_FARMER', newFarmerPayload);
            farmerId = newFarmerPayload.id;
          }
        } else if (selectedFarmer && eudrNumber !== (selectedFarmer.eudr_number || "")) {
          // Update existing farmer's EUDR number if it changed
          try {
            if (isOnline) {
              await farmersService.update(selectedFarmer.id, { eudr_number: eudrNumber });
            } else {
              await addToSyncQueue('UPDATE_FARMER', { id: selectedFarmer.id, eudr_number: eudrNumber });
            }
          } catch (err) {
            console.error("Error updating farmer EUDR number:", err);
            // Non-critical, continue with purchase
          }
        }

        const purchasePayload = {
          p_id: crypto.randomUUID(),
          p_farmer_id: farmerId,
          p_season_id: activeSeason!.id,
          p_date: date,
          p_coffee_type: coffeeType,
          p_gross_weight: gross,
          p_moisture_content: moist,
          p_standard_moisture: std,
          p_deduction_weight: deduction,
          p_payable_weight: payable,
          p_buying_price: price,
          p_total_amount: totalAmount,
          p_advance_deducted: advDed,
          p_cash_paid: cashToPay,
          p_field_agent_id: profile?.id || '',
          p_admin_id: getEffectiveAdminId(profile) || '',
        };

        if (isOnline) {
          const { data: rpcData, error: rpcError } = await supabase.rpc('record_purchase_v1', purchasePayload);
          if (rpcError) throw rpcError;
          if (rpcData && !rpcData.success) throw new Error(rpcData.error || 'Failed to record purchase');
        } else {
          await addToSyncQueue('CREATE_PURCHASE_ATOMIC', purchasePayload);
        }

        finalPurchaseData = {
          id: purchasePayload.p_id,
          farmer_id: purchasePayload.p_farmer_id,
          date: purchasePayload.p_date,
          coffee_type: purchasePayload.p_coffee_type,
          gross_weight: purchasePayload.p_gross_weight,
          payable_weight: purchasePayload.p_payable_weight,
          buying_price: purchasePayload.p_buying_price,
          total_amount: purchasePayload.p_total_amount,
          advance_deducted: purchasePayload.p_advance_deducted,
          cash_paid: purchasePayload.p_cash_paid,
          field_agent_id: purchasePayload.p_field_agent_id,
        };
      }

      setSavedPurchase({
        ...finalPurchaseData,
        farmers: isNewFarmer ? { ...selectedFarmer, ...newFarmerData } : selectedFarmer,
        profiles: { full_name: profile?.full_name }
      });
      setToast(true);
      setShowReceipt(true);
      
      // Clear draft on successful save
      if (!isEditMode) {
        localStorage.removeItem(PURCHASE_DRAFT_KEY);
      }
      
      // We don't navigate immediately anymore so the user can print the receipt
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
          <p className="text-gray-500 mt-2">Fetching the latest clients and buying prices</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Purchases", href: "/purchases" }, { label: "New Purchase" }]}>
      <SuccessToast visible={toast} isOnline={isOnline} />

      <div className="flex items-center justify-between mb-6">
        <div>
      <h1 style={{ fontFamily: "Inter, sans-serif", fontSize: "22px", fontWeight: 700, color: "#111827" }}>
        {isEditMode ? "Edit Purchase" : "New Purchase Entry"}
      </h1>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#6B7280", marginTop: "2px" }}>
        {isEditMode ? "Update the details for an existing purchase" : "Record a new coffee purchase from a client"}
      </p>
        </div>
        {!activeSeason && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
            <AlertCircle size={14} />
            No active season! Entries may be restricted.
          </div>
        )}
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

          <div className="bg-white rounded-xl p-6" style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.05)", border: "1px solid #F1F5F9" }}>
            <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-gray-100">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#f0fdf4" }}>
                <User size={15} color="#14532D" />
              </div>
              <div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: "15px", fontWeight: 600, color: "#111827" }}>Client Information</div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#6B7280" }}>Select the client for this purchase</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Client Name Dropdown */}
              <div className="md:col-span-2">
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "6px" }}>
                  Client Name <span style={{ color: "#DC2626" }}>*</span>
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
                          placeholder="Search client by name or village..."
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
                              <div style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600, color: "#111827" }}>Add "{farmerSearch}" as new client</div>
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

              {/* EUDR Number */}
              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "6px" }}>
                  EUDR Number (Optional)
                </label>
                <input
                  type="text"
                  value={eudrNumber}
                  onChange={e => setEudrNumber(e.target.value)}
                  placeholder="Enter EUDR number"
                  className={inputClass("")}
                  style={{ fontFamily: "Inter, sans-serif", fontSize: "13px" }}
                />
              </div>

              {/* New Client Addition Fields */}
              {isNewFarmer ? (
                <>
                  <div>
                    <label style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "6px" }}>
                      New Client Phone <span style={{ color: "#DC2626" }}>*</span>
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
                      New Client Village <span style={{ color: "#DC2626" }}>*</span>
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
                  {(["Kiboko", "Red", "Kase"] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setCoffeeType(type)}
                      className="py-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1"
                      style={{
                        borderColor: coffeeType === type ? 
                          (type === 'Kiboko' ? '#14532D' : type === 'Red' ? '#DC2626' : '#A855F7') : '#E5E7EB',
                        backgroundColor: coffeeType === type ? 
                          (type === 'Kiboko' ? '#f0fdf4' : type === 'Red' ? '#fef2f2' : '#fdf4ff') : '#fff',
                        fontFamily: "Inter, sans-serif",
                        color: coffeeType === type ? 
                          (type === 'Kiboko' ? '#14532D' : type === 'Red' ? '#DC2626' : '#A855F7') : '#6B7280'
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
                    step="any"
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

              {/* Moisture Content & Standard Moisture (Only for Kase) */}
              {coffeeType === "Kase" && (
                <>
                  <div>
                    <label style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "6px" }}>
                      Moisture Content (%) <span style={{ color: "#DC2626" }}>*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="any"
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

                  <div>
                    <label style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "6px" }}>
                      Standard Moisture (%)
                      {profile?.role === 'Field Agent' ? (
                        <span className="ml-1.5 px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: "#e2e8f0", color: "#475569", fontSize: "10px" }}>Fixed</span>
                      ) : (
                        <span className="ml-1.5 px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: "#fef9c3", color: "#854d0e", fontSize: "10px" }}>Admin</span>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={standardMoisture}
                        onChange={e => setStandardMoisture(e.target.value)}
                        disabled={profile?.role === 'Field Agent'}
                        className={inputClass("")}
                        style={{ 
                          fontFamily: "Inter, sans-serif", 
                          fontSize: "13px", 
                          color: "#374151", 
                          paddingRight: "32px",
                          backgroundColor: profile?.role === 'Field Agent' ? "#F9FAFB" : "#fff",
                          cursor: profile?.role === 'Field Agent' ? "not-allowed" : "text",
                          opacity: profile?.role === 'Field Agent' ? 0.7 : 1
                        }}
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#9CA3AF" }}>%</span>
                    </div>
                  </div>
                </>
              )}

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

              <div className="p-5 space-y-0" style={{ backgroundColor: "#f0fdf4" }}>
                {/* Inputs summary */}
                <div className="flex justify-between items-center py-3 border-b border-green-200">
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#374151" }}>Gross Weight</span>
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600, color: "#111827" }}>{gross > 0 ? `${gross.toFixed(2)} kg` : "—"}</span>
                </div>
                {coffeeType === "Kase" && (
                  <>
                    <div className="flex justify-between items-center py-3 border-b border-green-200">
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#374151" }}>Moisture Content</span>
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600, color: "#111827" }}>{moist > 0 ? `${moist.toFixed(1)}%` : "—"}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-green-200">
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#374151" }}>Standard Moisture</span>
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600, color: "#111827" }}>{std}%</span>
                    </div>
                  </>
                )}

                <div className="mt-1 pt-1">
                  {coffeeType === "Kase" && (
                    <>
                      <div className="flex justify-between items-center py-3 border-b border-green-200">
                        <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#374151" }}>Moisture Loss %</span>
                        <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600, color: moistureLoss > 0 ? "#DC2626" : "#6B7280" }}>
                          {gross > 0 && moist > std ? `${moistureLoss.toFixed(2)}%` : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-3 border-b border-green-200">
                        <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#374151" }}>Deduction (kg)</span>
                        {profile?.role === 'Admin' || profile?.role === 'Super Admin' ? (
                          <div className="flex items-center gap-1">
                            {manualDeduction !== "" && (
                              <button 
                                onClick={() => setManualDeduction("")}
                                className="p-1 hover:bg-green-100 rounded text-[10px] text-green-700 font-bold uppercase"
                                title="Reset to auto"
                              >
                                Auto
                              </button>
                            )}
                            <input
                              type="number"
                              step="any"
                              value={manualDeduction !== "" ? manualDeduction : autoDeduction > 0 ? autoDeduction.toString() : ""}
                              onChange={(e) => setManualDeduction(e.target.value)}
                              className="w-20 text-right bg-white/50 border-b border-green-300 focus:border-green-600 outline-none rounded px-1"
                              style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 700, color: "#DC2626" }}
                              placeholder={autoDeduction > 0 ? autoDeduction.toString() : "0"}
                            />
                          </div>
                        ) : (
                          <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600, color: deduction > 0 ? "#DC2626" : "#6B7280" }}>
                            {deduction > 0 ? `−${deduction.toFixed(2)} kg` : "—"}
                          </span>
                        )}
                      </div>
                    </>
                  )}
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
                    Cash to Pay Client
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
                Formula: Deduction = Gross × (Moisture − Std) × 1.5%
              </p>
            </div>
          </div>
        </div>
      </div>
{/* Added missing parent for siblings if needed, but Layout usually handles it */}
      <PurchaseReceiptModal 
        isOpen={showReceipt} 
        onClose={() => {
          setShowReceipt(false);
          setToast(false);
          navigate("/purchases");
        }} 
        purchase={savedPurchase}
      />
    </Layout>
  );
}

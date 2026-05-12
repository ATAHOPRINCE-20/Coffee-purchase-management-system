import React, { useState, useEffect, useCallback, useRef } from "react";
import { useReactToPrint } from 'react-to-print';
import { useNavigate } from "react-router";
import { Layout } from "../components/Layout";
import { 
  History, Wallet, Users, ArrowUpRight, 
  Clock, CheckCircle2, AlertCircle, Loader2,
  DollarSign, Search, Calendar, ChevronRight,
  Filter, Download, MoreHorizontal, Package, Printer
} from "lucide-react";
import { useAuth, getEffectiveAdminId } from "../hooks/useAuth";
import { farmerPaymentsService, FarmerDebtSummary, FarmerPayment } from "../services/farmerPaymentsService";
import { getEATDateString } from "../utils/dateUtils";
import { useFarmerDebts, useFarmerPaymentHistory } from "../hooks/queries/useFarmerDebts";
import { useCompanyProfile } from "../hooks/queries/useCompanyProfile";
import { useSync } from "../contexts/SyncContext";
import { useQueryClient } from "@tanstack/react-query";
import { FarmerDebtsPrint } from "../components/pos/FarmerDebtsPrint";

const formatUGX = (v: number) => `UGX ${Math.round(v).toLocaleString()}`;

const MobileDebtCard = ({ 
  debt, 
  onRecordPayment, 
  onViewHistory 
}: { 
  debt: FarmerDebtSummary; 
  onRecordPayment: () => void; 
  onViewHistory: () => void;
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="p-4 transition-all hover:bg-gray-50/30">
      {/* Header - Always Visible, Clickable to Expand */}
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-xs uppercase tracking-tight">
            {debt.farmer_name.slice(0, 2)}
          </div>
          <div>
            <div className="text-sm font-bold text-gray-900">{debt.farmer_name}</div>
            <div className="text-[10px] text-gray-500">{debt.village}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] font-bold text-gray-400 uppercase">Remaining</div>
            <div className="text-sm font-black text-red-600">{formatUGX(debt.remaining_debt)}</div>
          </div>
          <div className={`text-gray-300 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>
            <ChevronRight size={16} />
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-50 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-2 gap-3 bg-gray-50/50 p-3 rounded-xl border border-gray-50">
            <div>
              <div className="text-[9px] font-bold text-gray-400 uppercase">Total Value</div>
              <div className="text-xs font-bold text-gray-700">{formatUGX(debt.total_purchase_value)}</div>
            </div>
            <div className="text-right">
              <div className="text-[9px] font-bold text-gray-400 uppercase">Paid So Far</div>
              <div className="text-xs font-bold text-green-600">
                {formatUGX(debt.total_cash_paid_at_purchase + debt.total_subsequent_payments + debt.total_advance_deducted)}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onRecordPayment();
              }}
              className="flex-1 py-2.5 bg-green-700 text-white rounded-xl text-xs font-bold uppercase tracking-wide hover:bg-green-800 transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <Wallet size={14} />
              Record Payment
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onViewHistory();
              }}
              className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 transition-all"
            >
              <History size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function FarmerDebts() {
  const { profile } = useAuth();
  const { isOnline, addToSyncQueue } = useSync();
  const queryClient = useQueryClient();
  const adminId = getEffectiveAdminId(profile);

  const { data: debts, isLoading: debtsLoading, error: debtsError } = useFarmerDebts(adminId);
  const { data: company } = useCompanyProfile(adminId);
  const [selectedFarmerId, setSelectedFarmerId] = useState<string | null>(null);
  const { data: history, isLoading: loadingHistory } = useFarmerPaymentHistory(selectedFarmerId);

  const [isExporting, setIsExporting] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Farmer_Debts_${new Date().toISOString().split('T')[0]}`,
  });

  const [debtsList, setDebtsList] = useState<FarmerDebtSummary[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<FarmerPayment[]>([]);

  useEffect(() => {
    if (debts) setDebtsList(debts);
  }, [debts]);

  useEffect(() => {
    if (history) setPaymentHistory(history);
  }, [history]);

  const loading = debtsLoading && debtsList.length === 0;
  const error = debtsError ? (debtsError as any).message : null;
  const [searchTerm, setSearchTerm] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedFarmer, setSelectedFarmer] = useState<FarmerDebtSummary | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastPaymentInfo, setLastPaymentInfo] = useState<{name: string, amount: number} | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const [formError, setFormError] = useState<string | null>(null);

  const handleRecordPayment = async () => {
    if (!selectedFarmer || !paymentAmount) return;
    
    const adminId = getEffectiveAdminId(profile);
    if (!adminId) return;

    try {
      setFormError(null);
      setProcessingPayment(true);
      const paymentData = {
        farmer_id: selectedFarmer.farmer_id,
        amount: parseFloat(paymentAmount),
        payment_date: getEATDateString(),
        notes: paymentNotes,
        admin_id: (adminId === 'SUPER_ADMIN' ? profile!.id : adminId) || "",
      };

      if (!isOnline) {
        await addToSyncQueue('CREATE_FARMER_PAYMENT', paymentData);
        // Optimistically update UI
        setDebtsList(prev => prev.map(d => 
          d.farmer_id === selectedFarmer.farmer_id 
            ? { ...d, total_paid: (d as any).total_paid + paymentData.amount, remaining_debt: Math.max(0, d.remaining_debt - paymentData.amount) }
            : d
        ));
      } else {
        await farmerPaymentsService.recordPayment(paymentData);
        queryClient.invalidateQueries({ queryKey: ['farmer-debts', adminId] });
      }
      
      setShowPaymentModal(false);
      setLastPaymentInfo({ name: selectedFarmer.farmer_name, amount: parseFloat(paymentAmount) });
      setPaymentAmount("");
      setPaymentNotes("");
      setShowSuccessModal(true);
    } catch (err: any) {
      console.error("Error recording payment:", err);
      setFormError("Failed to record payment: " + err.message);
    } finally {
      setProcessingPayment(false);
    }
  };

  const viewHistory = (farmer: FarmerDebtSummary) => {
    setSelectedFarmer(farmer);
    setSelectedFarmerId(farmer.farmer_id);
    setShowHistory(true);
  };

  const filteredDebts = debtsList
    .filter(d => d.remaining_debt > 0)
    .filter(d => 
      d.farmer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.village.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const totalDebtValue = debtsList.reduce((sum, d) => sum + d.remaining_debt, 0);

  const handleExport = () => {
    setIsExporting(true);
    
    setTimeout(() => {
      try {
        const csvRows = [];
        csvRows.push(['Outstanding Farmer Debts Report']);
        csvRows.push([`Company: ${company?.name || 'CPMS'}`]);
        csvRows.push([`Generated: ${new Date().toLocaleString()}`]);
        csvRows.push(['']);
        csvRows.push(['Farmer', 'Village', 'Phone', 'Total Value', 'Paid', 'Remaining Debt']);
        
        filteredDebts.forEach(debt => {
          csvRows.push([
            debt.farmer_name,
            debt.village,
            debt.phone,
            debt.total_purchase_value,
            debt.total_cash_paid_at_purchase + debt.total_subsequent_payments + debt.total_advance_deducted,
            debt.remaining_debt
          ]);
        });

        const csvString = csvRows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `Farmer_Debts_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch (err) {
        console.error("Export failed:", err);
      } finally {
        setIsExporting(false);
      }
    }, 100);
  };

  return (
    <Layout breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Farmer Debts" }]}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "Inter, sans-serif" }}>Farmer Debt Management</h1>
          <p className="text-sm text-gray-500 mt-1" style={{ fontFamily: "Inter, sans-serif" }}>Track and settle outstanding balances for your clients</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="bg-amber-50 border border-amber-100 px-4 py-2.5 rounded-2xl flex items-center gap-3 shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center text-white">
              <DollarSign size={18} />
            </div>
            <div>
              <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Total Owed</div>
              <div className="text-lg font-bold text-amber-900">{formatUGX(totalDebtValue)}</div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3 text-red-800 text-sm">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mb-6 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by farmer name or village..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-green-500/10 focus:border-green-500 transition-all text-sm"
          />
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => handlePrint()}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Printer size={16} /> Print
          </button>
          <button 
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {isExporting ? "Exporting..." : "Export"}
          </button>
        </div>
      </div>

      {/* Hidden Print Component */}
      <div className="hidden">
        <FarmerDebtsPrint ref={printRef} debts={filteredDebts} company={company || null} />
      </div>

      {/* Debts Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Farmer</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Total Value</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Paid So Far</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Remaining Debt</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 text-green-600 animate-spin mx-auto mb-3" />
                    <span className="text-gray-400 text-sm italic">Loading debt summaries...</span>
                  </td>
                </tr>
              ) : filteredDebts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-gray-300">
                      <Users size={24} />
                    </div>
                    <span className="text-gray-400 text-sm">No outstanding debts found.</span>
                  </td>
                </tr>
              ) : (
                filteredDebts.map((debt) => (
                  <tr key={debt.farmer_id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-xs uppercase tracking-tight">
                          {debt.farmer_name.slice(0, 2)}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-900">{debt.farmer_name}</div>
                          <div className="text-[10px] text-gray-500">{debt.village} • {debt.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 text-right font-medium">
                      {formatUGX(debt.total_purchase_value)}
                    </td>
                    <td className="px-6 py-4 text-sm text-green-600 text-right font-medium">
                      {formatUGX(debt.total_cash_paid_at_purchase + debt.total_subsequent_payments + debt.total_advance_deducted)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-sm font-black text-red-600 underline decoration-red-100 decoration-2 underline-offset-4">
                        {formatUGX(debt.remaining_debt)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => { setSelectedFarmer(debt); setShowPaymentModal(true); }}
                          className="px-3 py-1.5 bg-green-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-wide hover:bg-green-800 transition-colors shadow-sm"
                        >
                          Record Payment
                        </button>
                        <button 
                          onClick={() => viewHistory(debt)}
                          className="p-1.5 bg-white border border-gray-100 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all"
                          title="Payment History"
                        >
                          <History size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile List View */}
        <div className="md:hidden divide-y divide-gray-50">
          {loading ? (
            <div className="px-6 py-12 text-center">
              <Loader2 className="w-8 h-8 text-green-600 animate-spin mx-auto mb-3" />
              <span className="text-gray-400 text-sm italic">Loading debt summaries...</span>
            </div>
          ) : filteredDebts.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-gray-300">
                <Users size={24} />
              </div>
              <span className="text-gray-400 text-sm">No outstanding debts found.</span>
            </div>
          ) : (
            filteredDebts.map((debt) => (
              <MobileDebtCard 
                key={debt.farmer_id} 
                debt={debt}
                onRecordPayment={() => { setSelectedFarmer(debt); setShowPaymentModal(true); }}
                onViewHistory={() => viewHistory(debt)}
              />
            ))
          )}
        </div>
      </div>

      {/* Payment Recording Modal */}
      {showPaymentModal && selectedFarmer && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="bg-green-700 p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Wallet size={20} />
                  <span className="font-bold tracking-tight">Record Debt Payment</span>
                </div>
                <button onClick={() => setShowPaymentModal(false)} className="hover:bg-white/10 p-1 rounded-lg transition-colors">
                  <MoreHorizontal size={20} />
                </button>
              </div>
              <div className="text-sm opacity-80 mb-1">Paying Farmer</div>
              <div className="text-xl font-bold tracking-tight">{selectedFarmer.farmer_name}</div>
              <div className="mt-4 flex items-center justify-between bg-white/10 rounded-xl p-3">
                <span className="text-xs font-medium">Outstanding Balance</span>
                <span className="text-lg font-black">{formatUGX(selectedFarmer.remaining_debt)}</span>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Amount to Pay (UGX)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">UGX</span>
                  <input 
                    type="number" 
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="0"
                    className="w-full pl-14 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-green-500/10 focus:border-green-500 font-bold transition-all"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Notes (Optional)</label>
                <textarea 
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Partial payment for March harvest"
                  rows={2}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-green-500/10 focus:border-green-500 text-sm transition-all resize-none"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button 
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 py-3.5 bg-gray-50 text-gray-600 rounded-2xl text-sm font-bold hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleRecordPayment}
                  disabled={processingPayment || !paymentAmount}
                  className="flex-[2] py-3.5 bg-green-700 text-white rounded-2xl text-sm font-bold hover:bg-green-800 transition-all shadow-lg shadow-green-900/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {processingPayment ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  Confirm Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && selectedFarmer && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <History size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 leading-tight">Payment History</h3>
                  <p className="text-xs text-gray-500">{selectedFarmer.farmer_name}</p>
                </div>
              </div>
              <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <MoreHorizontal size={20} className="text-gray-400" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {loadingHistory ? (
                <div className="py-12 text-center">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
                  <span className="text-gray-400 text-sm">Loading payment records...</span>
                </div>
              ) : paymentHistory.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed border-gray-50 rounded-3xl">
                  <Calendar size={32} className="text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">No subsequent payments recorded for this farmer yet.</p>
                  <p className="text-[10px] text-gray-300 mt-1 uppercase tracking-wider">Initial purchase payments are tracked in the Purchases section</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {paymentHistory.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex flex-col items-center justify-center leading-none">
                          <span className="text-[9px] font-bold text-blue-600 uppercase mb-0.5">{new Date(p.payment_date).toLocaleString('default', { month: 'short' })}</span>
                          <span className="text-sm font-black text-gray-900">{new Date(p.payment_date).getDate()}</span>
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-900">{formatUGX(p.amount)}</div>
                          {p.notes && <div className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">{p.notes}</div>}
                        </div>
                      </div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-white px-2.5 py-1 rounded-lg border border-gray-100">
                        Paid
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-4 bg-gray-50 border-t border-gray-100 shrink-0">
              <button 
                onClick={() => setShowHistory(false)}
                className="w-full py-3 bg-white border border-gray-200 text-gray-700 rounded-2xl text-sm font-bold hover:bg-gray-100 transition-colors"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Success Modal */}
      {showSuccessModal && lastPaymentInfo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="pt-10 pb-6 flex flex-col items-center text-center px-8">
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6 animate-bounce">
                <div className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-green-500/30">
                  <CheckCircle2 size={32} />
                </div>
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-2">Payment Confirmed!</h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">
                Successfully recorded <span className="font-bold text-green-700">{formatUGX(lastPaymentInfo.amount)}</span> for <span className="font-bold text-gray-900">{lastPaymentInfo.name}</span>.
              </p>
              
              <div className="w-full space-y-3">
                <button 
                  onClick={() => setShowSuccessModal(false)}
                  className="w-full py-4 bg-gray-900 text-white rounded-2xl text-sm font-bold hover:bg-black transition-all shadow-xl shadow-gray-900/10 active:scale-[0.98]"
                >
                  Done
                </button>
              </div>
            </div>
            
            <div className="bg-gray-50 py-4 px-8 border-t border-gray-100 flex justify-center">
               <div className="flex items-center gap-1.5 opacity-40">
                  <Package size={12} />
                  <span className="text-[10px] font-bold uppercase tracking-tighter">Transaction Verified</span>
               </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

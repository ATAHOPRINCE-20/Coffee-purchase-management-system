import React, { useState, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import { Printer, X, Loader2, Coffee, Download } from 'lucide-react';
import { Separator } from "../components/ui/separator";
import { toPng } from 'html-to-image';
import { jsPDF } from "jspdf";
import { settingsService, CompanyProfile } from "../services/settingsService";
import { getEffectiveAdminId } from "../hooks/useAuth";
import { PurchaseReceiptPrint } from "./pos/PurchaseReceiptPrint";

interface PurchaseReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchase: any; // Using any for now to handle the joined data
}

export function PurchaseReceiptModal({ isOpen, onClose, purchase }: PurchaseReceiptModalProps) {
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const componentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && purchase) {
      fetchCompanyDetails();
    }
  }, [isOpen, purchase]);

  const fetchCompanyDetails = async () => {
    const adminId = purchase.admin_id;
    if (!adminId) return;

    setLoading(true);
    try {
      const data = await settingsService.getCompanyProfile(adminId);
      setCompany(data);
    } catch (err) {
      console.error("Failed to load company details for receipt:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Receipt_${purchase?.id?.slice(0, 8)}`,
  });

  const handleDownloadPDF = async () => {
    if (!componentRef.current) return;
    try {
      setIsDownloading(true);
      // Briefly make it visible in typical flow for html-to-image to capture
      const el = componentRef.current;
      el.style.visibility = 'visible';
      el.style.opacity = '1';
      
      // We grab slightly lower resolution for faster generation while maintaining quality
      const dataUrl = await toPng(el, {
        quality: 0.95,
        backgroundColor: '#ffffff',
        width: el.scrollWidth,
        height: el.scrollHeight,
        pixelRatio: 1.5
      });
      
      el.style.visibility = 'hidden';
      el.style.opacity = '0'; // Re-hide it

      const imgProps = { width: el.scrollWidth, height: el.scrollHeight };
      const pdfWidth = 80; // 80mm standard pos width
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [pdfWidth, pdfHeight]
      });
      
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Receipt_${purchase?.id?.slice(0, 8)}.pdf`);
    } catch (err) {
      console.error('Failed to generate receipt PDF:', err);
      alert('Failed to generate PDF. Please try Printing instead.');
    } finally {
      setIsDownloading(false);
    }
  };

  if (!purchase) return null;

  const formatUGX = (v: number) => `UGX ${Math.round(v).toLocaleString()}`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md w-[92vw] max-w-[400px] p-0 overflow-hidden border-none shadow-2xl rounded-2xl bg-white max-h-[90dvh] md:max-h-[85vh]">
        <DialogHeader className="sr-only">
          <DialogTitle>Purchase Receipt</DialogTitle>
          <DialogDescription>
            View and download the receipt for this coffee purchase.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col max-h-[90dvh] md:max-h-[85vh] h-full relative">
          {/* Minimal Close for Screen only */}
          <div className="flex justify-end p-2 no-print absolute right-0 top-0 z-10 w-full pointer-events-none">
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 bg-white/90 shadow-sm m-2 pointer-events-auto border border-gray-100 cursor-pointer">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto w-full no-print bg-white isolate">
            <div className="p-5 md:p-8 space-y-5 pt-14 md:pt-12">
            {/* Receipt Header - Matching Image Style */}
            <div className="text-center space-y-1 pb-4">
              <h2 className="text-xl md:text-2xl font-black text-gray-900 uppercase tracking-tight">
                {company?.name || "Coffee Management System"}
              </h2>
              {company?.location && (
                <p className="text-sm text-gray-700 font-medium">{company.location}</p>
              )}
              {company?.phone && (
                <p className="text-xs text-gray-600 font-medium">{company.phone}</p>
              )}
              {company?.email && (
                <p className="text-xs text-gray-500">Email : {company.email}</p>
              )}
              
              <div className="pt-4 pb-2">
                <div className="h-0.5 bg-gray-900 w-full mb-[1px]" />
                <div className="h-[0.5px] bg-gray-400 w-full" />
              </div>

              <h3 className="text-lg font-bold text-gray-900 uppercase tracking-wide py-1">
                CASH PAYMENT SLIP ({purchase.coffee_type} Supplier)
              </h3>
            </div>

            <div className="space-y-2 text-sm border-y border-gray-100 py-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase font-bold text-gray-600">Date</span>
                <span className="font-bold text-gray-900">{purchase.date}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase font-bold text-gray-600">Serial number</span>
                <span className="font-mono text-[10px] font-bold text-gray-900">
                  {purchase.serial_number 
                    ? String(purchase.serial_number).padStart(4, '0') 
                    : purchase.id.slice(0, 8).toUpperCase()}
                </span>
              </div>
              
              <div className="pt-2">
                <p className="text-[10px] uppercase font-bold text-gray-600 mb-2 underline decoration-gray-200 underline-offset-4">Supplier Information</p>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-semibold text-gray-600 uppercase">Name</span>
                    <span className="font-bold text-gray-900">{((purchase as any).farmers?.name || 'Unknown Farmer')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-semibold text-gray-600 uppercase">Phone</span>
                    <span className="text-gray-700 font-medium">{(purchase as any).farmers?.phone || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-semibold text-gray-600 uppercase">Village</span>
                    <span className="text-gray-700 font-medium">{(purchase as any).farmers?.village || '—'}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-[10px] uppercase font-bold text-gray-600">Coffee Type</span>
                <span className="font-bold text-green-700 text-base uppercase">{purchase.coffee_type}</span>
              </div>
            </div>

            {/* Weights & Calculations */}
            <div className="space-y-3">
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-600 font-medium text-sm">Gross Weight</span>
                <span className="font-bold text-gray-900 text-sm">{purchase.gross_weight.toFixed(1)} kg</span>
              </div>

              {purchase.moisture_content > 0 && (
                <>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-gray-600 font-medium text-sm">Moisture Content</span>
                    <span className="font-bold text-blue-600 text-sm">{purchase.moisture_content}%</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Standard Moisture</span>
                    <span className="text-gray-500 font-bold text-xs">{purchase.standard_moisture}%</span>
                  </div>
                </>
              )}
              
              {purchase.coffee_type === 'Kase' && purchase.deduction_weight > 0 && (
                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-600 font-medium text-sm">Moisture Deduction</span>
                  <span className="font-bold text-red-600 text-sm">−{purchase.deduction_weight.toFixed(1)} kg</span>
                </div>
              )}

              <div className="flex justify-between items-center py-2 bg-gray-50 px-3 rounded-lg border border-gray-100">
                <span className="text-green-800 font-bold text-[10px] uppercase tracking-wider">Net Payable Weight</span>
                <span className="font-black text-green-800 text-base md:text-lg underline decoration-2 underline-offset-4">{purchase.payable_weight.toFixed(1)} kg</span>
              </div>
            </div>

            <Separator />

            {/* Financials */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 text-[10px] uppercase font-bold">Unit Price</span>
                <span className="font-bold text-gray-700 text-sm">{formatUGX(purchase.buying_price)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-900 font-bold text-sm">Total Amount</span>
                <span className="font-black text-gray-900 text-sm">{formatUGX(purchase.total_amount)}</span>
              </div>

              {purchase.advance_deducted > 0 && (
                <div className="flex justify-between items-center py-1 border-t border-dashed border-gray-200 mt-2">
                  <span className="text-red-600 font-medium text-[10px] uppercase tracking-tight italic">Less: Advance Recovered</span>
                  <span className="font-bold text-red-600 text-sm">−{formatUGX(purchase.advance_deducted)}</span>
                </div>
              )}

              {purchase.cash_paid < (purchase.total_amount - (purchase.advance_deducted || 0)) && (
                <div className="flex justify-between items-center py-1 mt-1 border-t border-dashed border-gray-100">
                  <span className="text-red-700 font-bold text-[10px] uppercase tracking-tight">Balance Owed (Debt)</span>
                  <span className="font-bold text-red-700 text-sm">{formatUGX((purchase.total_amount - (purchase.advance_deducted || 0)) - purchase.cash_paid)}</span>
                </div>
              )}
            </div>

            {/* Final Cash */}
            <div className="bg-gray-50 p-4 md:p-5 rounded-2xl flex justify-between items-center border border-gray-100">
              <p className="text-[10px] uppercase font-black tracking-widest text-green-700">Net Cash Paid</p>
              <p className="text-xl md:text-2xl font-black tracking-tighter tabular-nums text-gray-900">{formatUGX(purchase.cash_paid)}</p>
            </div>

            <div className="pt-4 border-t border-gray-50 flex justify-between items-center">
              <p className="text-[10px] text-gray-600 font-bold uppercase">Handled by</p>
              <p className="text-[11px] font-bold text-gray-900">{(purchase as any).profiles?.full_name || 'Staff Member'}</p>
            </div>

            <p className="text-center text-[8px] text-gray-600 font-bold uppercase tracking-[0.2em] pt-4">
              Thank you for choosing us!
            </p>
          </div>
        </div>

        {/* Hidden POS Receipt Component for Printing */}
        <div className="absolute opacity-0 pointer-events-none" style={{ top: '-9999px', left: '-9999px' }}>
          <PurchaseReceiptPrint 
            ref={componentRef} 
            purchase={purchase} 
            company={company} 
          />
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3 no-print shrink-0 relative z-20">
          <button 
            onClick={onClose}
            className="flex py-3 px-4 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-50 transition-colors justify-center"
          >
            Close
          </button>
          <button 
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            className="flex-1 py-3 bg-amber-600 text-white rounded-xl font-bold text-sm hover:bg-amber-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-amber-900/10 disabled:opacity-70"
          >
            {isDownloading ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
            <span className="hidden sm:inline">Save</span> PDF
          </button>
          <button 
            onClick={() => handlePrint()}
            className="flex-1 py-3 bg-green-700 text-white rounded-xl font-bold text-sm hover:bg-green-800 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-900/10"
          >
            <Printer size={16} /> Print
          </button>
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

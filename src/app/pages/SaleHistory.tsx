import React, { useState, useEffect } from "react";
import { Layout } from "../components/Layout";
import { Receipt, Loader2, Calendar, ChevronRight, Download, Printer, Coffee } from "lucide-react";
import { reportService, PostSaleReport } from "../services/reportService";
import { seasonsService, Season } from "../services/seasonsService";
import { useAuth, getEffectiveAdminId } from "../hooks/useAuth";
import { settingsService, CompanyProfile } from "../services/settingsService";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../components/ui/dialog";
import { Badge } from "../components/ui/badge";
import { ScrollArea } from "../components/ui/scroll-area";
import { Separator } from "../components/ui/separator";

export default function SaleHistory() {
  const { profile } = useAuth();
  const [history, setHistory] = useState<PostSaleReport[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<PostSaleReport | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const adminId = getEffectiveAdminId(profile);
        if (!adminId) return;
        const [historyData, seasonsData] = await Promise.all([
          reportService.getHistory(adminId),
          seasonsService.getAll(adminId)
        ]);
        setHistory(historyData);
        setSeasons(seasonsData);
      } catch (err) {
        console.error("Failed to load history data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [profile]);

  if (loading) {
    return (
      <Layout breadcrumbs={[{ label: "History" }]}>
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-green-700 animate-spin mb-4" />
          <p className="text-gray-500 font-medium">Loading history...</p>
        </div>
      </Layout>
    );
  }

  const groupedHistory = seasons.map(season => ({
    season,
    reports: history.filter(h => h.sale.season_id === season.id)
  })).filter(group => group.reports.length > 0);

  const unassignedReports = history.filter(h => !h.sale.season_id || !seasons.find(s => s.id === h.sale.season_id));

  return (
    <Layout breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "History" }]}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sale Report History</h1>
        <p className="text-sm text-gray-500 mt-1">View previous batch profitability and transaction summaries grouped by season</p>
      </div>

      <div className="space-y-12">
        {history.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-gray-200">
            <Receipt className="mx-auto text-gray-300 mb-3" size={40} />
            <p className="text-gray-500">No sale reports found yet.</p>
          </div>
        ) : (
          <>
            {groupedHistory.map(({ season, reports }) => (
              <section key={season.id}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px flex-1 bg-gray-100" />
                  <h2 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Calendar size={14} className="text-gray-300" />
                    {season.name}
                  </h2>
                  <div className="h-px flex-1 bg-gray-100" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {reports.map((h, i) => (
                    <ReportCard key={i} report={h} onClick={() => setSelectedReport(h)} profile={profile} />
                  ))}
                </div>
              </section>
            ))}

            {unassignedReports.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px flex-1 bg-gray-100" />
                  <h2 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Other Reports</h2>
                  <div className="h-px flex-1 bg-gray-100" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {unassignedReports.map((h, i) => (
                    <ReportCard key={i} report={h} onClick={() => setSelectedReport(h)} profile={profile} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      <PostSaleReportModal 
        isOpen={!!selectedReport} 
        onClose={() => setSelectedReport(null)} 
        report={selectedReport} 
      />
    </Layout>
  );
}

function ReportCard({ report, onClick, profile }: { report: PostSaleReport; onClick: () => void; profile: any }) {
  return (
    <button
      onClick={onClick}
      className="group bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all text-left flex flex-col"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center group-hover:bg-green-100 transition-colors">
          <Calendar className="text-green-700" size={18} />
        </div>
        <Badge variant="outline" className="text-[10px] font-bold uppercase">
          {report.sale.coffee_type}
        </Badge>
      </div>
      
      <div className="flex-1">
        <div className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Batch Ended</div>
        <div className="text-lg font-bold text-gray-900 mb-2">{new Date(report.sale.date).toLocaleDateString()}</div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Net Weight</span>
            <span className="font-bold text-gray-700">{report.sale.net_weight.toFixed(1)} kg</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Net Profit</span>
            <span className="font-bold text-green-700">UGX {Math.round(report.summary.netProfit ?? (report.sale.total_amount - (report.summary.totalPurchaseCost || 0) - (report.summary.totalExpenses || 0))).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {profile?.role === 'Super Admin' && (
        <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between text-xs">
          <span className="text-gray-400 font-medium">Branch Admin</span>
          <span className="font-bold text-gray-700">{(report.sale as any).admin?.full_name || 'System'}</span>
        </div>
      )}

      <div className={`mt-4 pt-4 border-t border-gray-50 flex items-center justify-between text-[#14532D] font-bold text-xs ${profile?.role === 'Super Admin' ? 'border-none mt-2 pt-0' : ''}`}>
        View Specifics
        <ChevronRight size={14} />
      </div>
    </button>
  );
}

// Re-using the same modal component structure for consistency
function PostSaleReportModal({ isOpen, onClose, report }: { isOpen: boolean; onClose: () => void; report: PostSaleReport | null }) {
  const { profile } = useAuth();
  const [company, setCompany] = useState<CompanyProfile | null>(null);

  useEffect(() => {
    if (isOpen) {
      const adminId = getEffectiveAdminId(profile);
      if (adminId) {
        settingsService.getCompanyProfile(adminId).then(setCompany);
      }
    }
  }, [isOpen, profile]);

  if (!report) return null;

  const handleDownload = () => reportService.downloadCSV(report);
  const handlePrint = () => window.print();

  const totalCost = (report.summary.totalPurchaseCost || 0) + (report.summary.totalExpenses || 0);
  const grossProfit = report.summary.grossProfit ?? (report.sale.total_amount - (report.summary.totalPurchaseCost || 0));
  const netProfit = report.summary.netProfit ?? (grossProfit - (report.summary.totalExpenses || 0));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden printable-modal">
        <DialogHeader className="p-6 pb-2 flex flex-row items-start justify-between">
          <div className="flex-1">
            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Receipt className="text-green-600" size={24} />
              Post-Sale Transaction Report
            </DialogTitle>
            <DialogDescription>
              Summary of transactions leading up to this sale ({new Date(report.sale.date).toLocaleDateString()})
            </DialogDescription>
          </div>
          <div className="flex items-center gap-2 mt-1 no-print">
            <button 
              onClick={handleDownload}
              className="p-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
              title="Download CSV"
            >
              <Download size={16} />
            </button>
            <button 
              onClick={handlePrint}
              className="p-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
              title="Print Report"
            >
              <Printer size={16} />
            </button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-10 print-content">
          <div className="space-y-8 py-8">
            {/* Header - Matching Image Style */}
            <div className="text-center space-y-1 pb-4">
              <h2 className="text-xl md:text-2xl font-black text-gray-900 uppercase tracking-tight">
                {company?.name || "Coffee Management"}
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
                BATCH SALE REPORT ({report.sale.coffee_type})
              </h3>
            </div>

            {/* Batch Info */}
            <div className="grid grid-cols-2 gap-4 border-y border-gray-100 py-6">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-gray-400 mb-1">Batch Reference</span>
                <span className="font-mono text-[11px] font-bold text-gray-900">{report.sale.id.slice(0, 13).toUpperCase()}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] uppercase font-bold text-gray-400 mb-1">Date Generated</span>
                <span className="font-bold text-gray-900">{new Date(report.sale.created_at || report.sale.date || new Date()).toLocaleDateString()}</span>
              </div>
              {profile?.role === 'Super Admin' && (
                <div className="col-span-2 flex flex-col pt-2 mt-2 border-t border-gray-50">
                  <span className="text-[10px] uppercase font-bold text-gray-400 mb-1">Admin Branch</span>
                  <span className="font-bold text-gray-900">{(report.sale as any).admin?.full_name || 'System'}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100 flex flex-col items-center justify-center">
                <div className="text-[10px] uppercase font-bold text-gray-500 mb-1">Total Input</div>
                <div className="text-[15px] font-bold text-gray-900 tabular-nums">
                  {((report.summary.totalKibokoWeight || 0) + (report.summary.totalRedWeight || 0) + (report.summary.totalKaseWeight || 0)).toFixed(1)} <span className="text-[10px] font-normal">kg</span>
                </div>
              </div>
              <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100 flex flex-col items-center justify-center">
                <div className="text-[10px] uppercase font-bold text-gray-500 mb-1">Conversion</div>
                <div className="text-[15px] font-bold text-blue-600 tabular-nums">
                  {((report.summary.conversionEfficiency || 0) * 100).toFixed(1)}%
                </div>
              </div>
              <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100 flex flex-col items-center justify-center">
                <div className="text-[10px] uppercase font-bold text-gray-500 mb-1">Total Cost</div>
                <div className="text-[15px] font-bold text-red-600 tabular-nums">
                  {Math.round(totalCost).toLocaleString()}
                </div>
              </div>
              <div className="bg-green-50/50 p-3 rounded-xl border border-green-100 flex flex-col items-center justify-center">
                <div className="text-[10px] uppercase font-bold text-green-600 mb-1">Gross Profit</div>
                <div className="text-[15px] font-bold text-green-700 tabular-nums">
                  {Math.round(grossProfit).toLocaleString()}
                </div>
              </div>
              <div className="bg-green-100 p-3 rounded-xl border border-green-200 col-span-2 sm:col-span-1 flex flex-col items-center justify-center">
                <div className="text-[10px] uppercase font-bold text-green-700 mb-1">Net Profit</div>
                <div className="text-[15px] font-bold text-green-900 tabular-nums">
                  {Math.round(netProfit).toLocaleString()}
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center justify-between">
                <span>Recent Purchases</span>
                <Badge variant="outline" className="font-medium text-[10px] no-print">
                  {report.purchases.length} records
                </Badge>
              </h3>
              <div className="space-y-2">
                {report.purchases.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-2">No purchases in this batch.</p>
                ) : report.purchases.map(p => (
                    <div className="flex flex-col flex-1">
                      <div className="flex justify-between items-center text-[10px] uppercase font-bold text-gray-400 mb-1">
                        <span>Farmer</span>
                        <span className="text-gray-900 normal-case">{(p as any).farmers?.name || 'Unknown Farmer'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">{p.date}</span>
                        <div className="text-right">
                          <span className="font-bold text-gray-700">{p.payable_weight.toFixed(1)} kg</span>
                          <span className="text-[10px] text-gray-400 ml-2 uppercase">{p.coffee_type}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center mt-1 border-t border-gray-50 pt-1">
                        <span className="text-[10px] text-gray-400 uppercase font-medium">Total Amount</span>
                        <span className="font-bold text-gray-900">
                          {Math.round(p.total_amount).toLocaleString()} UGX
                        </span>
                      </div>
                    </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center justify-between">
                <span>Batch Expenses</span>
                <Badge variant="outline" className="font-medium text-[10px] no-print">
                  {report.expenses.length} records
                </Badge>
              </h3>
              <div className="space-y-2">
                {report.expenses.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-2">No expenses recorded for this batch.</p>
                ) : report.expenses.map(e => (
                  <div key={e.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-orange-50/30 border border-orange-100/50">
                    <div className="flex flex-col">
                      <span className="font-semibold text-gray-800">{e.type}</span>
                      <span className="text-[10px] text-gray-400">{e.date}</span>
                    </div>
                    <div className="font-bold text-red-700">
                      {Math.round(e.amount).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end no-print">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-[#14532D] text-white rounded-xl font-bold text-sm hover:opacity-90 transition-opacity"
          >
            Done
          </button>
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page { 
              margin: 10mm; 
              size: A4; 
            }
            body > * { display: none !important; }
            body > [data-radix-portal] { display: block !important; position: static !important; }
            
            [data-slot="dialog-overlay"] { display: none !important; }
            
            [data-slot="dialog-content"], .printable-modal {
              display: block !important;
              position: static !important;
              visibility: visible !important;
              width: 100% !important;
              max-width: none !important;
              height: auto !important;
              max-height: none !important;
              margin: 0 !important;
              padding: 0 !important;
              transform: none !important;
              border: none !important;
              box-shadow: none !important;
              background: white !important;
              left: unset !important;
              top: unset !important;
            }

            .no-print, [data-slot="dialog-close"] { 
              display: none !important; 
            }

            * {
              overflow: visible !important;
              max-height: none !important;
              color: #000 !important;
            }

            .print-content { 
              padding: 0 !important;
              width: 100% !important;
              height: auto !important;
              overflow: visible !important;
            }
          }
        `}} />
      </DialogContent>
    </Dialog>
  );
}

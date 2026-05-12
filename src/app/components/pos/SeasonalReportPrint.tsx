import React, { forwardRef } from 'react';
import { CompanyProfile } from "../../services/settingsService";
import { formatCurrency } from "../../utils/formatters";

interface SeasonalReportPrintProps {
  stats: any;
  season: any;
  company: CompanyProfile | null;
  monthlyTrend: any[];
}

export const SeasonalReportPrint = forwardRef<HTMLDivElement, SeasonalReportPrintProps>(({ stats, season, company, monthlyTrend }, ref) => {
  return (
    <div ref={ref} className="p-8 bg-white text-black font-sans min-h-screen">
      {/* Header */}
      <div className="text-center mb-8 border-b-2 border-black pb-4">
        <h1 className="text-2xl font-black uppercase tracking-tight">{company?.name || "Coffee Management System"}</h1>
        <p className="text-lg font-bold mt-1">SEASONAL PERFORMANCE REPORT</p>
        <div className="text-sm mt-2">
          {company?.location && <span>{company.location}</span>}
          {company?.phone && <span className="mx-2">| {company.phone}</span>}
          {company?.email && <span className="mx-2">| {company.email}</span>}
        </div>
        <p className="text-sm font-bold mt-3 uppercase">Season: {season?.name || "Active Season"}</p>
        <p className="text-xs text-gray-500 mt-1">Generated on: {new Date().toLocaleString()}</p>
      </div>

      {/* Aggregated Financials Summary */}
      <div className="mb-8">
        <h2 className="text-sm font-black uppercase border-b border-gray-300 pb-1 mb-4">Financial Overview</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="border p-3 rounded-lg bg-gray-50">
            <p className="text-[10px] font-bold text-gray-500 uppercase">Total Weight Collected</p>
            <p className="text-xl font-black">{stats.totalWeight.toLocaleString()} kg</p>
          </div>
          <div className="border p-3 rounded-lg bg-gray-50">
            <p className="text-[10px] font-bold text-gray-500 uppercase">Total Purchase Value</p>
            <p className="text-xl font-black">{formatCurrency(stats.totalValue)}</p>
          </div>
          <div className="border p-3 rounded-lg bg-gray-50">
            <p className="text-[10px] font-bold text-gray-500 uppercase">Total Advances Issued</p>
            <p className="text-xl font-black">{formatCurrency(stats.totalAdvances)}</p>
          </div>
          <div className="border p-3 rounded-lg bg-gray-50">
            <p className="text-[10px] font-bold text-gray-500 uppercase">Agent Capital Distributed</p>
            <p className="text-xl font-black">{formatCurrency(stats.agentCapitalCost)}</p>
          </div>
        </div>
      </div>

      {/* Type Specific Breakdown */}
      <div className="mb-8">
        <h2 className="text-sm font-black uppercase border-b border-gray-300 pb-1 mb-4">Coffee Type Breakdown</h2>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-2 text-xs font-bold uppercase">Coffee Type</th>
              <th className="p-2 text-xs font-bold uppercase text-right">Volume (kg)</th>
              <th className="p-2 text-xs font-bold uppercase text-right">Batch (kg)</th>
              <th className="p-2 text-xs font-bold uppercase text-right">Total Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {Object.entries(stats.byType).map(([type, data]: [string, any]) => (
              <tr key={type} className="text-sm">
                <td className="p-2 font-bold">{type}</td>
                <td className="p-2 text-right">{data.weight.toLocaleString()}</td>
                <td className="p-2 text-right italic text-gray-500">{data.batchWeight.toLocaleString()}</td>
                <td className="p-2 text-right font-bold">{formatCurrency(data.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Monthly Trend Table */}
      <div className="mb-8">
        <h2 className="text-sm font-black uppercase border-b border-gray-300 pb-1 mb-4">Monthly Performance Trend</h2>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-2 text-xs font-bold uppercase">Month</th>
              <th className="p-2 text-xs font-bold uppercase text-right">Volume (kg)</th>
              <th className="p-2 text-xs font-bold uppercase text-right">Value (UGX)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {monthlyTrend.map((item) => (
              <tr key={item.month} className="text-sm">
                <td className="p-2 font-medium">{item.month}</td>
                <td className="p-2 text-right">{item.weight.toLocaleString()}</td>
                <td className="p-2 text-right font-bold">{formatCurrency(item.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="mt-auto pt-8 border-t border-gray-200 text-center">
        <p className="text-xs text-gray-400 italic">End of Seasonal Performance Report</p>
        <p className="text-[10px] text-gray-300 mt-1 uppercase tracking-widest font-bold">Generated via Coffee Management System</p>
      </div>
    </div>
  );
});

SeasonalReportPrint.displayName = 'SeasonalReportPrint';

import React, { forwardRef } from 'react';
import { CompanyProfile, CapitalLedgerEntry } from "../../services/settingsService";
import { formatCurrency } from "../../utils/formatters";

interface CapitalLedgerPrintProps {
  ledger: CapitalLedgerEntry[];
  company: CompanyProfile | null;
}

export const CapitalLedgerPrint = forwardRef<HTMLDivElement, CapitalLedgerPrintProps>(({ ledger, company }, ref) => {
  return (
    <div ref={ref} className="p-8 bg-white text-black font-sans">
      {/* Header */}
      <div className="text-center mb-8 border-b-2 border-black pb-4">
        <h1 className="text-2xl font-black uppercase tracking-tight">{company?.name || "Coffee Management System"}</h1>
        <p className="text-lg font-bold mt-1">CAPITAL & TRANSACTION LEDGER REPORT</p>
        <div className="text-sm mt-2">
          {company?.location && <span>{company.location}</span>}
          {company?.phone && <span className="mx-2">| {company.phone}</span>}
        </div>
        <p className="text-xs text-gray-500 mt-1">Generated on: {new Date().toLocaleString()}</p>
      </div>

      {/* Summary Stat */}
      <div className="flex justify-between items-center mb-6 bg-gray-100 p-4 rounded-lg border border-gray-200">
        <div>
          <p className="text-xs font-bold text-gray-600 uppercase">Current Capital Balance</p>
          <p className="text-2xl font-black">{formatCurrency(company?.capital || 0)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-gray-600 uppercase">Total Transactions</p>
          <p className="text-xl font-black">{ledger.length}</p>
        </div>
      </div>

      {/* Table */}
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b-2 border-black text-left">
            <th className="py-2 text-xs font-bold uppercase">Date & Time</th>
            <th className="py-2 text-xs font-bold uppercase">Description</th>
            <th className="py-2 text-xs font-bold uppercase">Type</th>
            <th className="py-2 text-xs font-bold uppercase text-right">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {ledger.map((entry) => (
            <tr key={entry.id} className="text-sm">
              <td className="py-3">
                <p className="font-medium">{new Date(entry.created_at).toLocaleDateString()}</p>
                <p className="text-[10px] text-gray-500">{new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              </td>
              <td className="py-3 font-medium">{entry.notes || '-'}</td>
              <td className="py-3 uppercase text-[10px] font-bold">{entry.type}</td>
              <td className={`py-3 text-right font-bold ${entry.amount > 0 ? 'text-green-700' : 'text-red-700'}`}>
                {entry.amount > 0 ? '+' : ''}{formatCurrency(entry.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer */}
      <div className="mt-12 pt-8 border-t border-gray-200 text-center">
        <p className="text-xs text-gray-400 italic">End of Ledger Report</p>
        <p className="text-[10px] text-gray-300 mt-1 uppercase tracking-widest font-bold">Confidential Financial Document</p>
      </div>
    </div>
  );
});

CapitalLedgerPrint.displayName = 'CapitalLedgerPrint';

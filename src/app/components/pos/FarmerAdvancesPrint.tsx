import React, { forwardRef } from 'react';
import { CompanyProfile } from "../../services/settingsService";
import { formatCurrency } from "../../utils/formatters";

interface FarmerAdvancesPrintProps {
  advances: any[];
  company: CompanyProfile | null;
}

export const FarmerAdvancesPrint = forwardRef<HTMLDivElement, FarmerAdvancesPrintProps>(({ advances, company }, ref) => {
  const totalOutstanding = advances.reduce((sum, a) => sum + (a.remaining || 0), 0);
  const totalGiven = advances.reduce((sum, a) => sum + (a.amount || 0), 0);

  return (
    <div ref={ref} className="p-8 bg-white text-black font-sans">
      {/* Header */}
      <div className="text-center mb-8 border-b-2 border-black pb-4">
        <h1 className="text-2xl font-black uppercase tracking-tight">{company?.name || "Coffee Management System"}</h1>
        <p className="text-lg font-bold mt-1">OUTSTANDING FARMER ADVANCES REPORT</p>
        <div className="text-sm mt-2">
          {company?.location && <span>{company.location}</span>}
          {company?.phone && <span className="mx-2">| {company.phone}</span>}
        </div>
        <p className="text-xs text-gray-500 mt-1">Generated on: {new Date().toLocaleString()}</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-100 p-4 rounded-lg border border-gray-200">
          <p className="text-xs font-bold text-gray-600 uppercase">Total Outstanding Balance</p>
          <p className="text-2xl font-black text-red-700">{formatCurrency(totalOutstanding)}</p>
        </div>
        <div className="bg-gray-100 p-4 rounded-lg border border-gray-200 text-right">
          <p className="text-xs font-bold text-gray-600 uppercase">Total Advances Issued</p>
          <p className="text-xl font-black">{formatCurrency(totalGiven)}</p>
        </div>
      </div>

      {/* Table */}
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b-2 border-black text-left">
            <th className="py-2 text-xs font-bold uppercase">Farmer Name</th>
            <th className="py-2 text-xs font-bold uppercase">Date Given</th>
            <th className="py-2 text-xs font-bold uppercase text-right">Amount Given</th>
            <th className="py-2 text-xs font-bold uppercase text-right">Deducted</th>
            <th className="py-2 text-xs font-bold uppercase text-right">Balance</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {advances.filter(a => a.status === 'Active').map((advance) => (
            <tr key={advance.id} className="text-sm">
              <td className="py-3">
                <p className="font-bold">{advance.farmers?.name || "Unknown"}</p>
                <p className="text-[10px] text-gray-500">{advance.farmers?.village || ""}</p>
              </td>
              <td className="py-3">{advance.issue_date}</td>
              <td className="py-3 text-right font-medium">{formatCurrency(advance.amount)}</td>
              <td className="py-3 text-right text-green-700">
                {formatCurrency(advance.deducted || 0)}
              </td>
              <td className="py-3 text-right font-black text-red-600">
                {formatCurrency(advance.remaining)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer */}
      <div className="mt-12 pt-8 border-t border-gray-200 text-center">
        <p className="text-xs text-gray-400 italic">End of Outstanding Advances Report</p>
        <p className="text-[10px] text-gray-300 mt-1 uppercase tracking-widest font-bold">Generated via Coffee Management System</p>
      </div>
    </div>
  );
});

FarmerAdvancesPrint.displayName = 'FarmerAdvancesPrint';

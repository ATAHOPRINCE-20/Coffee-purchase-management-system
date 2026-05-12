import React, { forwardRef } from 'react';
import { CompanyProfile } from "../../services/settingsService";
import { formatCurrency } from "../../utils/formatters";
import { FarmerDebtSummary } from "../../services/farmerPaymentsService";

interface FarmerDebtsPrintProps {
  debts: FarmerDebtSummary[];
  company: CompanyProfile | null;
}

export const FarmerDebtsPrint = forwardRef<HTMLDivElement, FarmerDebtsPrintProps>(({ debts, company }, ref) => {
  const totalOwed = debts.reduce((sum, d) => sum + d.remaining_debt, 0);

  return (
    <div ref={ref} className="p-8 bg-white text-black font-sans">
      {/* Header */}
      <div className="text-center mb-8 border-b-2 border-black pb-4">
        <h1 className="text-2xl font-black uppercase tracking-tight">{company?.name || "Coffee Management System"}</h1>
        <p className="text-lg font-bold mt-1">OUTSTANDING FARMER DEBTS REPORT</p>
        <div className="text-sm mt-2">
          {company?.location && <span>{company.location}</span>}
          {company?.phone && <span className="mx-2">| {company.phone}</span>}
        </div>
        <p className="text-xs text-gray-500 mt-1">Generated on: {new Date().toLocaleString()}</p>
      </div>

      {/* Summary */}
      <div className="flex justify-between items-center mb-6 bg-gray-100 p-4 rounded-lg border border-gray-200">
        <div>
          <p className="text-xs font-bold text-gray-600 uppercase">Total Outstanding Debt</p>
          <p className="text-2xl font-black text-red-700">{formatCurrency(totalOwed)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-gray-600 uppercase">Total Farmers with Debt</p>
          <p className="text-xl font-black">{debts.length}</p>
        </div>
      </div>

      {/* Table */}
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b-2 border-black text-left">
            <th className="py-2 text-xs font-bold uppercase">Farmer Name</th>
            <th className="py-2 text-xs font-bold uppercase">Village</th>
            <th className="py-2 text-xs font-bold uppercase text-right">Total Value</th>
            <th className="py-2 text-xs font-bold uppercase text-right">Paid</th>
            <th className="py-2 text-xs font-bold uppercase text-right">Remaining</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {debts.map((debt) => (
            <tr key={debt.farmer_id} className="text-sm">
              <td className="py-3 font-bold">{debt.farmer_name}</td>
              <td className="py-3">{debt.village}</td>
              <td className="py-3 text-right">{formatCurrency(debt.total_purchase_value)}</td>
              <td className="py-3 text-right text-green-700 font-medium">
                {formatCurrency(debt.total_cash_paid_at_purchase + debt.total_subsequent_payments + debt.total_advance_deducted)}
              </td>
              <td className="py-3 text-right font-black text-red-600">
                {formatCurrency(debt.remaining_debt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer */}
      <div className="mt-12 pt-8 border-t border-gray-200 text-center">
        <p className="text-xs text-gray-400 italic">End of Outstanding Debts Report</p>
        <p className="text-[10px] text-gray-300 mt-1 uppercase tracking-widest font-bold">Generated via Coffee Management System</p>
      </div>
    </div>
  );
});

FarmerDebtsPrint.displayName = 'FarmerDebtsPrint';

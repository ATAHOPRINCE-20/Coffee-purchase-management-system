import React, { forwardRef } from 'react';
import { CompanyProfile } from "../../services/settingsService";

interface PurchaseReceiptPrintProps {
  purchase: any;
  company: CompanyProfile | null;
}

const formatUGX = (v: number) => `UGX ${Math.round(v).toLocaleString()}`;

export const PurchaseReceiptPrint = forwardRef<HTMLDivElement, PurchaseReceiptPrintProps>(({ purchase, company }, ref) => {
  if (!purchase) return null;

  return (
    <div ref={ref} className="receipt-print-wrapper">
      <div className="receipt">
        <div className="receipt-header">
          <h2 className="receipt-title">{company?.name || "Coffee Management System"}</h2>
          {company?.location && <p>{company.location}</p>}
          {company?.phone && <p>{company.phone}</p>}
          {company?.email && <p>Email: {company.email}</p>}
        </div>

        <div className="receipt-divider"></div>

        <div className="receipt-body">
          <h3 className="receipt-subtitle">CASH PAYMENT SLIP</h3>
          <p className="receipt-type">({purchase.coffee_type} Supplier)</p>

          <div className="receipt-divider"></div>

          <div className="receipt-row">
            <span>Date:</span>
            <span>{purchase.date}</span>
          </div>
          <div className="receipt-row">
            <span>No:</span>
            <span className="receipt-mono">{purchase.id.slice(0, 13).toUpperCase()}</span>
          </div>
          <div className="receipt-row">
            <span>Supplier:</span>
            <span>{purchase.farmers?.name || 'Unknown'}</span>
          </div>
          {purchase.farmers?.phone && (
            <div className="receipt-row">
              <span>Phone:</span>
              <span>{purchase.farmers.phone}</span>
            </div>
          )}
          {purchase.farmers?.village && (
            <div className="receipt-row">
              <span>Village:</span>
              <span>{purchase.farmers.village}</span>
            </div>
          )}
          <div className="receipt-row">
            <span>Coffee:</span>
            <span className="receipt-bold">{purchase.coffee_type}</span>
          </div>

          <div className="receipt-divider"></div>

          <div className="receipt-row">
            <span>Gross Weight:</span>
            <span>{purchase.gross_weight.toFixed(1)} kg</span>
          </div>
          {purchase.moisture_content > 0 && (
            <>
              <div className="receipt-row">
                <span>Moisture Content:</span>
                <span>{purchase.moisture_content}%</span>
              </div>
              <div className="receipt-row">
                <span>Standard Moisture:</span>
                <span>{purchase.standard_moisture}%</span>
              </div>
            </>
          )}
          {purchase.deduction_weight >= 0 && (
            <div className="receipt-row">
              <span>Moisture Deduction:</span>
              <span className={purchase.deduction_weight > 0 ? "receipt-bold" : ""}>
                {purchase.deduction_weight > 0 ? "-" : ""}{purchase.deduction_weight.toFixed(1)} kg
              </span>
            </div>
          )}
          <div className="receipt-row receipt-total-row">
            <span>Net Payable Weight:</span>
            <span className="receipt-bold">{purchase.payable_weight.toFixed(1)} kg</span>
          </div>

          <div className="receipt-divider"></div>

          <div className="receipt-row">
            <span>Unit Price:</span>
            <span>{formatUGX(purchase.buying_price)}</span>
          </div>
          <div className="receipt-row">
            <span>Total Amount:</span>
            <span>{formatUGX(purchase.total_amount)}</span>
          </div>
          {purchase.advance_deducted > 0 && (
            <div className="receipt-row">
              <span>Adv Recovery:</span>
              <span>-{formatUGX(purchase.advance_deducted)}</span>
            </div>
          )}

          <div className="receipt-divider"></div>

          <div className="receipt-row receipt-net-cash">
            <span>NET CASH PAID:</span>
            <span>{formatUGX(purchase.cash_paid)}</span>
          </div>

          <div className="receipt-divider"></div>

          <div className="receipt-footer">
            <div className="receipt-row">
              <span>Handled by:</span>
              <span>{purchase.profiles?.full_name || 'Staff'}</span>
            </div>
            <p className="receipt-thanks">Thank you for choosing us!</p>
          </div>
        </div>
      </div>
    </div>
  );
});

PurchaseReceiptPrint.displayName = 'PurchaseReceiptPrint';

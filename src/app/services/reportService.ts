import { supabase } from '../lib/supabase';
import { Sale, salesService } from './salesService';
import { Purchase } from './purchasesService';
import { Expense } from './expensesService';

export interface PostSaleReport {
  sale: Sale;
  purchases: Purchase[];
  expenses: Expense[];
  summary: {
    totalKibokoWeight: number;
    totalRedWeight: number;
    totalKaseWeight: number;
    totalPurchaseCost: number;
    totalExpenses: number;
    grossProfit: number;
    netProfit: number;
    conversionEfficiency: number;
  };
}

export const reportService = {
  async getTransactionsBeforeSale(adminId: string, currentSale: Sale): Promise<PostSaleReport> {
    // 1. Find the previous sale to define the timeframe
    const previousSale = await salesService.getLatestSaleBefore(
      adminId,
      currentSale.coffee_type,
      currentSale.created_at || new Date().toISOString()
    );

    const startTime = previousSale?.created_at || '1970-01-01T00:00:00Z';
    const endTime = currentSale.created_at || new Date().toISOString();

    // 2. Fetch all purchases in the timeframe
    // RLS handles visibility (Pyramid Hierarchy)
    const pQuery = supabase
      .from('purchases')
      .select('*, farmers(name)')
      .gt('created_at', startTime)
      .lte('created_at', endTime);
      
    const { data: purchases, error: pError } = await pQuery;

    if (pError) throw pError;

    // 3. Fetch all expenses:
    // Either already linked to this sale OR unlinked expenses in the timeframe
    // RLS handles visibility (Pyramid Hierarchy)
    const eQuery = supabase
      .from('expenses')
      .select('*')
      .or(`sale_id.eq.${currentSale.id},and(sale_id.is.null,created_at.gt.${startTime},created_at.lte.${endTime})`);

    const { data: expenses, error: eError } = await eQuery;

    if (eError) throw eError;

    // 4. Calculate summary
    const purchasesTyped = (purchases || []) as (Purchase & { farmers: { name: string } })[];
    const expensesTyped = (expenses || []) as Expense[];

    const totalKiboko = purchasesTyped
      .filter(p => p.coffee_type === 'Kiboko')
      .reduce((sum, p) => sum + p.payable_weight, 0);
    
    const totalRed = purchasesTyped
      .filter(p => p.coffee_type === 'Red')
      .reduce((sum, p) => sum + p.payable_weight, 0);
    
    const totalKase = purchasesTyped
      .filter(p => p.coffee_type === 'Kase')
      .reduce((sum, p) => sum + p.payable_weight, 0);

    const totalPurchaseCost = purchasesTyped.reduce((sum, p) => sum + p.total_amount, 0);
    const totalExpenses = expensesTyped.reduce((sum, e) => sum + e.amount, 0);
    
    // Total input weight (Kiboko + Red + Kase)
    const totalInputWeight = totalKiboko + totalRed + totalKase;
    const conversionEfficiency = totalInputWeight > 0 ? (currentSale.net_weight / totalInputWeight) : 0;

    const grossProfit = currentSale.total_amount - totalPurchaseCost;
    const netProfit = grossProfit - totalExpenses;

    return {
      sale: currentSale,
      purchases: purchasesTyped,
      expenses: expensesTyped,
      summary: {
        totalKibokoWeight: totalKiboko,
        totalRedWeight: totalRed,
        totalKaseWeight: totalKase,
        totalPurchaseCost,
        totalExpenses,
        grossProfit,
        netProfit,
        conversionEfficiency
      }
    };
  },

  async saveReport(adminId: string, saleId: string, report: PostSaleReport) {
    const { error } = await supabase
      .from('sale_reports')
      .insert({
        admin_id: adminId,
        sale_id: saleId,
        season_id: report.sale.season_id,
        report_date: report.sale.date,
        coffee_type: report.sale.coffee_type,
        report_data: report
      });

    if (error) throw error;

    // 2. Link all unlinked expenses in this report to the sale
    if (report.expenses.length > 0) {
      const unlinkedIds = report.expenses
        .filter(e => !e.sale_id)
        .map(e => e.id);

      if (unlinkedIds.length > 0) {
        const { error: linkError } = await supabase
          .from('expenses')
          .update({ sale_id: saleId })
          .in('id', unlinkedIds);
        
        if (linkError) console.error("Error bulk-linking expenses:", linkError);
      }
    }
  },

  async getHistory(adminId: string): Promise<PostSaleReport[]> {
    // RLS handles visibility (Pyramid Hierarchy)
    const query = supabase
      .from('sale_reports')
      .select('*')
      .order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;
    return (data || []).map((d: any) => d.report_data as PostSaleReport);
  },

  downloadCSV(report: PostSaleReport) {
    const headers = ['Type', 'Date', 'Entity/Item', 'Weight (kg)', 'Amount (UGX)', 'Notes'];
    const rows: string[][] = [];

    // Sale Info
    rows.push(['SALE', report.sale.date, report.sale.buyer_name || 'N/A', report.sale.net_weight.toString(), report.sale.total_amount.toString(), report.sale.notes || '']);

    // Purchases
    report.purchases.forEach(p => {
      rows.push(['PURCHASE', p.date, (p as any).farmers?.name || 'Unknown', p.payable_weight.toString(), p.total_amount.toString(), '']);
    });

    // Expenses
    report.expenses.forEach(e => {
      rows.push(['EXPENSE', e.date, e.type, '0', e.amount.toString(), e.notes || '']);
    });

    // Summary
    rows.push([]);
    rows.push(['SUMMARY']);
    rows.push(['Total Input Weight', '', '', (report.summary.totalKibokoWeight + report.summary.totalRedWeight + report.summary.totalKaseWeight).toString()]);
    rows.push(['Total Purchase Cost', '', '', '', report.summary.totalPurchaseCost.toString()]);
    rows.push(['Total Expenses', '', '', '', report.summary.totalExpenses.toString()]);
    rows.push(['Gross Profit', '', '', '', report.summary.grossProfit.toString()]);
    rows.push(['Net Profit', '', '', '', report.summary.netProfit.toString()]);
    rows.push(['Conversion Efficiency', '', '', '', `${(report.summary.conversionEfficiency * 100).toFixed(2)}%`]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `sale_report_${report.sale.date}_${report.sale.id.slice(0, 8)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

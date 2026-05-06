/**
 * Formats a number as UGX currency
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    maximumFractionDigits: 0,
  }).format(amount).replace('UGX', 'UGX ');
};

/**
 * Formats a number with commas
 */
export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat().format(num);
};

/**
 * Coffee Processing Conversion Rates
 *
 * These represent the real-world yield of Kase (clean green beans) from each
 * raw input type, based on standard processing:
 *
 *   Red Cherry  → Dry & Mill → Kase:  25%  (100 kg Red → 25 kg Kase)
 *   Kiboko       → Mill       → Kase:  65%  (100 kg Kiboko → 65 kg Kase)
 *   Kase         → (none)     → Kase: 100%  (already clean)
 *
 * Only Kase is sold, so all stock must be expressed as Kase-equivalent weight.
 */
export const COFFEE_CONVERSION_RATES: Record<string, number> = {
  Red: 0.25,
  Kiboko: 0.65,
  Kase: 1.0,
};

/**
 * Calculate the total Kase-equivalent weight from a list of purchases.
 * Applies the correct conversion rate per coffee type.
 */
export function calculateKaseEquivalent(
  purchases: { coffee_type: string; payable_weight: number }[]
): number {
  return purchases.reduce((total, p) => {
    const rate = COFFEE_CONVERSION_RATES[p.coffee_type] ?? 1.0;
    return total + (p.payable_weight || 0) * rate;
  }, 0);
}

/**
 * Get the Kase-equivalent weight for a single purchase.
 */
export function getKaseEquivalent(coffeeType: string, weight: number): number {
  const rate = COFFEE_CONVERSION_RATES[coffeeType] ?? 1.0;
  return weight * rate;
}

/**
 * Get a human-readable label for the conversion rate of a coffee type.
 * e.g. "Red (×25%)"
 */
export function getConversionLabel(coffeeType: string): string {
  const rate = COFFEE_CONVERSION_RATES[coffeeType];
  if (rate === undefined) return coffeeType;
  return `${coffeeType} (×${Math.round(rate * 100)}%)`;
}

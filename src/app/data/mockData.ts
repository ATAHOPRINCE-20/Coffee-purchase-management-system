export const farmers = [
  { id: "F001", name: "John Mugisha", phone: "+256 712 345 678", village: "Kanungu", region: "Western Uganda" },
  { id: "F002", name: "Mary Auma", phone: "+256 782 901 234", village: "Sipi", region: "Eastern Uganda" },
  { id: "F003", name: "Peter Ssemakula", phone: "+256 703 567 890", village: "Masaka", region: "Central Uganda" },
  { id: "F004", name: "Grace Nakato", phone: "+256 756 123 456", village: "Mbale", region: "Eastern Uganda" },
  { id: "F005", name: "David Ochieng", phone: "+256 741 789 012", village: "Gulu", region: "Northern Uganda" },
  { id: "F006", name: "Agnes Namutebi", phone: "+256 771 345 678", village: "Luwero", region: "Central Uganda" },
];

export const purchases = [
  {
    id: "PUR001", farmerId: "F001", farmerName: "John Mugisha", date: "2025-02-15",
    coffeeType: "Robusta", grossWeight: 500, moistureContent: 16, standardMoisture: 12,
    deduction: 23.81, payableWeight: 476.19, buyingPrice: 5200,
    totalAmount: 2476188, advanceDeducted: 500000, cashPaid: 1976188,
  },
  {
    id: "PUR002", farmerId: "F002", farmerName: "Mary Auma", date: "2025-02-14",
    coffeeType: "Arabica", grossWeight: 320, moistureContent: 14, standardMoisture: 12,
    deduction: 7.27, payableWeight: 312.73, buyingPrice: 6800,
    totalAmount: 2126564, advanceDeducted: 300000, cashPaid: 1826564,
  },
  {
    id: "PUR003", farmerId: "F003", farmerName: "Peter Ssemakula", date: "2025-02-13",
    coffeeType: "Robusta", grossWeight: 750, moistureContent: 18, standardMoisture: 12,
    deduction: 51.14, payableWeight: 698.86, buyingPrice: 5200,
    totalAmount: 3634072, advanceDeducted: 0, cashPaid: 3634072,
  },
  {
    id: "PUR004", farmerId: "F001", farmerName: "John Mugisha", date: "2025-02-10",
    coffeeType: "Robusta", grossWeight: 400, moistureContent: 15, standardMoisture: 12,
    deduction: 13.64, payableWeight: 386.36, buyingPrice: 5200,
    totalAmount: 2009072, advanceDeducted: 200000, cashPaid: 1809072,
  },
  {
    id: "PUR005", farmerId: "F004", farmerName: "Grace Nakato", date: "2025-02-08",
    coffeeType: "Arabica", grossWeight: 280, moistureContent: 13, standardMoisture: 12,
    deduction: 3.18, payableWeight: 276.82, buyingPrice: 6800,
    totalAmount: 1882376, advanceDeducted: 150000, cashPaid: 1732376,
  },
  {
    id: "PUR006", farmerId: "F005", farmerName: "David Ochieng", date: "2025-02-05",
    coffeeType: "Robusta", grossWeight: 620, moistureContent: 17, standardMoisture: 12,
    deduction: 39.09, payableWeight: 580.91, buyingPrice: 5200,
    totalAmount: 3020732, advanceDeducted: 400000, cashPaid: 2620732,
  },
];

export const advances = [
  {
    id: "ADV001", farmerId: "F001", farmerName: "John Mugisha", season: "2024/2025",
    amount: 1000000, deducted: 700000, remaining: 300000, status: "Active",
    date: "2025-01-10", notes: "Pre-harvest advance",
  },
  {
    id: "ADV002", farmerId: "F002", farmerName: "Mary Auma", season: "2024/2025",
    amount: 500000, deducted: 500000, remaining: 0, status: "Cleared",
    date: "2025-01-05", notes: "Farming inputs advance",
  },
  {
    id: "ADV003", farmerId: "F003", farmerName: "Peter Ssemakula", season: "2024/2025",
    amount: 750000, deducted: 0, remaining: 750000, status: "Active",
    date: "2025-02-01", notes: "Transport cost advance",
  },
  {
    id: "ADV004", farmerId: "F004", farmerName: "Grace Nakato", season: "2024/2025",
    amount: 300000, deducted: 150000, remaining: 150000, status: "Active",
    date: "2025-01-20", notes: "Pre-harvest advance",
  },
  {
    id: "ADV005", farmerId: "F005", farmerName: "David Ochieng", season: "2024/2025",
    amount: 800000, deducted: 400000, remaining: 400000, status: "Active",
    date: "2025-01-15", notes: "Fertilizer advance",
  },
  {
    id: "ADV006", farmerId: "F006", farmerName: "Agnes Namutebi", season: "2023/2024",
    amount: 600000, deducted: 600000, remaining: 0, status: "Cleared",
    date: "2024-09-10", notes: "Harvest advance",
  },
];

export const buyingPrices = {
  Robusta: 5200,
  Arabica: 6800,
};

export const dashboardStats = {
  totalPurchasesToday: 3,
  totalWeightToday: 1870,
  totalValueToday: 9710000,
  activeFarmers: 42,
  totalAdvancesOutstanding: 1600000,
  monthlyPurchases: 18420,
  monthlyValue: 95760000,
};

export const monthlyTrend = [
  { month: "Sep", weight: 8200, value: 42640000 },
  { month: "Oct", weight: 12400, value: 64480000 },
  { month: "Nov", weight: 15800, value: 82160000 },
  { month: "Dec", weight: 18200, value: 94640000 },
  { month: "Jan", weight: 16500, value: 85800000 },
  { month: "Feb", weight: 18420, value: 95760000 },
];

export const coffeeTypeBreakdown = [
  { type: "Robusta", percentage: 65, weight: 11973 },
  { type: "Arabica", percentage: 35, weight: 6447 },
];

export const farmerSeasonalSummary = [
  { month: "Oct", weight: 450, value: 2340000 },
  { month: "Nov", weight: 620, value: 3224000 },
  { month: "Dec", weight: 500, value: 2600000 },
  { month: "Jan", weight: 380, value: 1976000 },
  { month: "Feb", weight: 400, value: 2080000 },
];

export const dailyPrices = [
  { id: "DP001", date: "2025-02-22", Robusta: 5200, Arabica: 6800, setBy: "James Kato", setAt: "8:30 AM", notes: "Standard market rate" },
  { id: "DP002", date: "2025-02-21", Robusta: 5100, Arabica: 6750, setBy: "James Kato", setAt: "8:15 AM", notes: "" },
  { id: "DP003", date: "2025-02-20", Robusta: 5100, Arabica: 6700, setBy: "James Kato", setAt: "9:00 AM", notes: "Slight dip in Arabica" },
  { id: "DP004", date: "2025-02-19", Robusta: 5200, Arabica: 6800, setBy: "James Kato", setAt: "8:45 AM", notes: "" },
  { id: "DP005", date: "2025-02-18", Robusta: 5150, Arabica: 6750, setBy: "James Kato", setAt: "8:00 AM", notes: "" },
  { id: "DP006", date: "2025-02-17", Robusta: 5000, Arabica: 6600, setBy: "James Kato", setAt: "8:30 AM", notes: "Weekend rates" },
  { id: "DP007", date: "2025-02-16", Robusta: 5000, Arabica: 6600, setBy: "James Kato", setAt: "8:30 AM", notes: "Weekend rates" },
  { id: "DP008", date: "2025-02-15", Robusta: 5200, Arabica: 6800, setBy: "James Kato", setAt: "8:20 AM", notes: "" },
];
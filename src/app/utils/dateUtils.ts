// Pre-instantiate formatter to avoid expensive creation on every call
const eatFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Africa/Nairobi',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

// Cache for the current day's EAT string
let dateCache: { key: string; value: string } | null = null;

export const getEATDateString = (offsetDays: number = 0, baseDate: Date = new Date()): string => {
  // Only cache if it's the default "today" call
  if (offsetDays === 0 && !baseDate.getTime().toString().includes('.')) {
    const todayKey = new Date().toDateString();
    if (dateCache?.key === todayKey) return dateCache.value;
  }

  const d = new Date(baseDate.getTime());
  if (offsetDays !== 0) {
    d.setDate(d.getDate() + offsetDays);
  }
  
  const parts = eatFormatter.formatToParts(d);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  
  const result = `${year}-${month}-${day}`;

  // Update cache if it was a default call
  if (offsetDays === 0) {
    dateCache = { key: new Date().toDateString(), value: result };
  }

  return result;
};

export const getEATGreeting = (): string => {
  // Use a cheaper way to get the hour in Nairobi
  const hour = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Nairobi',
    hour: 'numeric',
    hour12: false
  }).formatToParts(new Date()).find(p => p.type === 'hour')?.value;

  const h = parseInt(hour || '0', 10);
  
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

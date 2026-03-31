export const getEATDateString = (offsetDays: number = 0, baseDate: Date = new Date()): string => {
  const d = new Date(baseDate.getTime());
  if (offsetDays !== 0) {
    d.setDate(d.getDate() + offsetDays);
  }
  
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const parts = formatter.formatToParts(d);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  
  return `${year}-${month}-${day}`;
};

export const getEATGreeting = (): string => {
  const eaDateString = new Date().toLocaleString("en-US", { timeZone: "Africa/Nairobi" });
  const eaDate = new Date(eaDateString);
  const hour = eaDate.getHours();
  
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

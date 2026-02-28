import { useState, useCallback } from "react";
import { dailyPrices as seedPrices } from "../data/mockData";

export interface DailyPriceEntry {
  id: string;
  date: string;
  Robusta: number;
  Arabica: number;
  setBy: string;
  setAt: string;
  notes: string;
}

const STORAGE_KEY = "coffeetrack_daily_prices";

function loadFromStorage(): DailyPriceEntry[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored) as DailyPriceEntry[];
  } catch {}
  return seedPrices as DailyPriceEntry[];
}

function saveToStorage(prices: DailyPriceEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prices));
  } catch {}
}

function formatTime(): string {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m} ${ampm}`;
}

export function useDailyPrices() {
  const [prices, setPrices] = useState<DailyPriceEntry[]>(() => loadFromStorage());

  const today = new Date().toISOString().split("T")[0];

  const todayEntry = prices.find((p) => p.date === today) ?? null;

  const yesterdayDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
  })();
  const yesterdayEntry = prices.find((p) => p.date === yesterdayDate) ?? null;

  const getPriceForDate = useCallback(
    (date: string): DailyPriceEntry | null => {
      return prices.find((p) => p.date === date) ?? null;
    },
    [prices]
  );

  const setTodayPrices = useCallback(
    (robusta: number, arabica: number, notes: string) => {
      const now = formatTime();
      const existing = prices.find((p) => p.date === today);
      let updated: DailyPriceEntry[];
      if (existing) {
        updated = prices.map((p) =>
          p.date === today
            ? { ...p, Robusta: robusta, Arabica: arabica, notes, setAt: now }
            : p
        );
      } else {
        const newEntry: DailyPriceEntry = {
          id: `DP${Date.now()}`,
          date: today,
          Robusta: robusta,
          Arabica: arabica,
          setBy: "James Kato",
          setAt: now,
          notes,
        };
        updated = [newEntry, ...prices];
      }
      updated.sort((a, b) => b.date.localeCompare(a.date));
      setPrices(updated);
      saveToStorage(updated);
    },
    [prices, today]
  );

  return {
    prices,
    todayEntry,
    yesterdayEntry,
    today,
    getPriceForDate,
    setTodayPrices,
  };
}

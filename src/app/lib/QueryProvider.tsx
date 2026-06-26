import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { get, set, del } from 'idb-keyval';
import React from 'react';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,  // 5 minutes — don't refetch if data is fresh
      gcTime: 1000 * 60 * 60 * 2, // 2 hours — reduced from 24h to keep memory lean
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Debounce helper — prevents IDB writes from firing on every real-time event.
// With 10 active Supabase channels, a naive persistClient causes 10+ disk
// writes per second. Debouncing to 3s means at most 1 write per 3 seconds.
function debounce<T extends (...args: any[]) => any>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}

// Custom IndexedDB persister for offline support
const persister = {
  persistClient: debounce(async (client: any) => {
    await set('react-query-cache', client);
  }, 3000), // Write at most once every 3 seconds
  restoreClient: async () => {
    return await get('react-query-cache');
  },
  removeClient: async () => {
    await del('react-query-cache');
  },
};

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 6 }} // 6h max age
    >
      {children}
    </PersistQueryClientProvider>
  );
}

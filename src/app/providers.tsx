/**
 * Providers racine avec React Query configuré pour la performance
 */

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';
import { queryConfig } from '@/lib/query-config';
import { Toaster } from '@/components/ui/sonner';
import { PHProvider } from '@/components/analytics/posthog';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient(queryConfig));

  return (
    <PHProvider>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster position="top-right" richColors closeButton />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </PHProvider>
  );
}

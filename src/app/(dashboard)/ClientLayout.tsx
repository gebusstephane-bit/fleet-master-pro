'use client';

import { UserProvider } from '@/components/providers/user-provider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';
import { queryConfig } from '@/lib/query-config';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  company_id: string;
  companies?: any;
}

interface ClientLayoutProps {
  children: React.ReactNode;
  user: User | null;
}

export function ClientLayout({ children, user }: ClientLayoutProps) {
  const [queryClient] = useState(() => new QueryClient(queryConfig));

  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider user={user}>
        {children}
      </UserProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

'use client';

import { UserProvider } from '@/components/providers/user-provider';
import { SidebarProvider } from '@/components/layout/sidebar-context';
import { PageTransition } from '@/components/layout/page-transition';

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

/**
 * Perf : plus de QueryClient local — on utilise celui du provider racine
 * (src/app/providers.tsx). Deux clients empilés = deux caches séparés qui ne
 * partageaient rien + double ReactQueryDevtools.
 */
export function ClientLayout({ children, user }: ClientLayoutProps) {
  return (
    <UserProvider user={user}>
      <SidebarProvider>
        <PageTransition>
          {children}
        </PageTransition>
      </SidebarProvider>
    </UserProvider>
  );
}

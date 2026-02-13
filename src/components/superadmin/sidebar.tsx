'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Ticket,
  BarChart3,
  Settings,
  Shield,
  ExternalLink,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/superadmin', icon: LayoutDashboard },
  { name: 'Clients', href: '/superadmin/clients', icon: Building2 },
  { name: 'Abonnements', href: '/superadmin/subscriptions', icon: CreditCard },
  { name: 'Support', href: '/superadmin/support', icon: Ticket },
  { name: 'Analytics', href: '/superadmin/analytics', icon: BarChart3 },
  { name: 'Paramètres', href: '/superadmin/settings', icon: Settings },
];

export function SuperAdminSidebar() {
  const pathname = usePathname();

  return (
    <div className="fixed left-0 top-0 bottom-0 w-64 bg-[#111111] border-r border-white/10 z-50">
      {/* Logo Section */}
      <div className="h-16 flex items-center px-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-white">Fleet Master</h1>
            <p className="text-[10px] text-white/50 uppercase tracking-wider">Admin</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-white/10 text-white shadow-lg shadow-white/5'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              )}
            >
              <Icon className={cn('w-4 h-4', isActive ? 'text-purple-400' : 'text-white/40')} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Back to App */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 transition-all"
        >
          <ExternalLink className="w-4 h-4" />
          Retour à l&apos;app
        </Link>
      </div>
    </div>
  );
}

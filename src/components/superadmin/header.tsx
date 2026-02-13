'use client';

import { useState, useEffect } from 'react';
import { Bell, Search, LogOut, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';

interface SuperAdminHeaderProps {
  email: string;
}

export function SuperAdminHeader({ email }: SuperAdminHeaderProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      // Créer le client uniquement côté client
      const supabase = createBrowserClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const initials = email?.charAt(0).toUpperCase() || 'A';

  return (
    <header className="h-16 flex items-center justify-between px-8 border-b border-white/10 bg-[#111111]/80 backdrop-blur-xl">
      {/* Search */}
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="Rechercher un client, un ticket..."
            className="w-full h-10 pl-10 pr-4 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all"
          />
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="relative text-white/60 hover:text-white hover:bg-white/10"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-3 h-10 px-3 text-white hover:bg-white/10"
            >
              <Avatar className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600">
                <AvatarFallback className="bg-transparent text-white text-sm font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start">
                <span className="text-sm font-medium">{email}</span>
                <Badge 
                  variant="secondary" 
                  className="h-4 px-1.5 text-[10px] bg-purple-500/20 text-purple-300 border-0"
                >
                  <Crown className="w-3 h-3 mr-1" />
                  SuperAdmin
                </Badge>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            className="w-56 bg-[#1a1a1a] border-white/10 text-white"
          >
            <div className="px-3 py-2 border-b border-white/10">
              <p className="text-sm font-medium">{email}</p>
              <p className="text-xs text-white/50">Super Administrateur</p>
            </div>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem 
              className="text-red-400 focus:text-red-400 focus:bg-red-500/10 cursor-pointer"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              {isLoggingOut ? 'Déconnexion...' : 'Déconnexion'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Bell,
  Command,
  User,
  ChevronDown,
  LogOut,
  Settings,
  Sun,
  Menu,
} from "lucide-react";
import { CommandPalette } from "@/components/ui/command-palette";
import { cn } from "@/lib/utils";
import { useSidebar } from "./sidebar-context";

function DigitalClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours().toString().padStart(2, "0");
  const minutes = time.getMinutes().toString().padStart(2, "0");

  return (
    <div className="flex items-center gap-1 font-mono text-base font-semibold tracking-wider text-slate-500">
      <span className="text-cyan-400">{hours}</span>
      <span className="animate-pulse text-cyan-500">:</span>
      <span className="text-cyan-400">{minutes}</span>
    </div>
  );
}

function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  const getLabel = (segment: string) => {
    const labels: Record<string, string> = {
      dashboard: "Dashboard",
      vehicles: "Véhicules",
      drivers: "Chauffeurs",
      maintenance: "Maintenance",
      inspections: "Inspections",
      routes: "Tournées",
      agenda: "Agenda",
      alerts: "Alertes",
      settings: "Paramètres",
    };
    return labels[segment] || segment;
  };

  return (
    <nav className="flex items-center gap-2 text-sm">
      <span className="text-[#71717a]">FleetMaster</span>
      {segments.map((segment, index) => (
        <div key={segment} className="flex items-center gap-2">
          <ChevronDown className="h-3 w-3 -rotate-90 text-[#71717a]" />
          <motion.span
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            className={cn(
              "font-medium",
              index === segments.length - 1 ? "text-cyan-400" : "text-slate-500"
            )}
          >
            {getLabel(segment)}
          </motion.span>
        </div>
      ))}
    </nav>
  );
}

interface HeaderProps {
  user?: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    role?: string;
    company_id?: string;
    companies?: {
      name?: string;
      plan?: string;
    } | null;
  } | null;
}

export function Header({ user }: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const queryClient = useQueryClient();
  const { isExpanded, setMobileOpen } = useSidebar();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const userName = user?.first_name && user?.last_name 
    ? `${user.first_name} ${user.last_name}` 
    : user?.email?.split('@')[0] || "Utilisateur";
  const userRole = user?.role || "Admin";
  const companyName = user?.companies?.name || "Transport";
  const planName = user?.companies?.plan || "Pro";

  return (
    <>
      <CommandPalette />
      
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "fixed right-0 top-0 z-30 transition-all duration-300",
          isExpanded ? "md:left-64" : "md:left-20",
          "left-0",
          scrolled
            ? "border-b border-cyan-500/10 bg-[#0a0f1a]/80 backdrop-blur-2xl"
            : "bg-[#0a0f1a]/50"
        )}
      >
        <div className="flex h-16 items-center justify-between px-6">
          {/* Left: Mobile menu button + Breadcrumbs */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg text-[#a1a1aa] hover:text-white hover:bg-cyan-500/10 hover:border-cyan-500/20 border border-transparent transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Breadcrumbs />
          </div>

          {/* Center: Search Bar */}
          <div className="flex-1 max-w-md mx-8">
            <div
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm cursor-pointer",
                "bg-[#0f172a]/60 border border-cyan-500/20",
                "text-slate-400 hover:text-cyan-300 hover:border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.1)]",
                "transition-all duration-200"
              )}
              onClick={() => {
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
              }}
            >
              <Search className="h-4 w-4" />
              <span className="flex-1 text-left">Rechercher...</span>
              <kbd className="flex items-center gap-1 rounded-lg bg-[#27272a] px-2 py-1 text-xs font-medium">
                <Command className="h-3 w-3" />
                <span>K</span>
              </kbd>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            {/* Clock */}
            <DigitalClock />

            {/* Divider */}
            <div className="h-6 w-px bg-white/[0.08] mx-1" />

            {/* Notifications */}
            <button 
              className="relative rounded-xl p-2.5 text-[#a1a1aa] transition-all hover:bg-cyan-500/10 hover:text-cyan-400 active:scale-95"
              onClick={() => window.location.href = '/alerts'}
            >
              <Bell className="h-5 w-5" strokeWidth={1.5} />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-[#0a0f1a]">
                <span className="absolute inset-0 rounded-full bg-amber-500 animate-ping" />
              </span>
            </button>

            {/* Theme Toggle */}
            <button 
              className="rounded-xl p-2.5 text-[#a1a1aa] transition-all hover:bg-cyan-500/10 hover:text-cyan-400 active:scale-95"
              onClick={() => {
                document.documentElement.classList.toggle('light');
              }}
            >
              <Sun className="h-5 w-5" strokeWidth={1.5} />
            </button>

            {/* Divider */}
            <div className="h-6 w-px bg-white/[0.08] mx-1" />

            {/* User Menu */}
            <div className="relative group">
              <button className="flex items-center gap-3 rounded-xl p-1.5 pr-3 transition-all hover:bg-[#27272a]">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-500">
                  <User className="h-4 w-4 text-white" strokeWidth={2} />
                </div>
                <div className="hidden text-left md:block">
                  <div className="text-sm font-medium text-white">{userName}</div>
                  <div className="text-xs text-[#71717a]">{userRole}</div>
                </div>
                <ChevronDown className="h-4 w-4 text-[#71717a]" />
              </button>

              {/* Dropdown */}
              <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-cyan-500/15 bg-[#0f172a]/95 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_20px_rgba(6,182,212,0.1)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="p-2">
                  <div className="px-3 py-2 border-b border-white/[0.08] mb-2">
                    <p className="text-sm font-medium text-white">{companyName}</p>
                    <p className="text-xs text-[#71717a]">Plan {planName}</p>
                  </div>
                  <a href="/settings/profile" className="flex items-center gap-3 px-3 py-2 rounded-lg text-[#a1a1aa] hover:bg-cyan-500/10 hover:text-cyan-300 transition-colors">
                    <User className="h-4 w-4" />
                    <span className="text-sm">Mon profil</span>
                  </a>
                  <a href="/settings" className="flex items-center gap-3 px-3 py-2 rounded-lg text-[#a1a1aa] hover:bg-cyan-500/10 hover:text-cyan-300 transition-colors">
                    <Settings className="h-4 w-4" />
                    <span className="text-sm">Paramètres</span>
                  </a>
                  <div className="border-t border-white/[0.08] mt-2 pt-2">
                    <button 
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors w-full"
                      onClick={async () => {
                        // Vider le cache React Query
                        queryClient.clear();
                        await fetch('/api/auth/logout', { method: 'POST' });
                        window.location.href = '/login';
                      }}
                    >
                      <LogOut className="h-4 w-4" />
                      <span className="text-sm">Déconnexion</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.header>
    </>
  );
}

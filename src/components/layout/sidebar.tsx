"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Car,
  Users,
  Wrench,
  ClipboardCheck,
  Route,
  Calendar,
  Bell,
  Settings,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Véhicules", href: "/vehicles", icon: Car },
  { label: "Chauffeurs", href: "/drivers", icon: Users },
  { label: "Maintenance", href: "/maintenance", icon: Wrench },
  { label: "Inspections", href: "/inspections", icon: ClipboardCheck },
  { label: "Tournées", href: "/routes", icon: Route },
  { label: "Agenda", href: "/agenda", icon: Calendar },
  { label: "Alertes", href: "/alerts", icon: Bell, badge: 3 },
  { label: "Paramètres", href: "/settings", icon: Settings },
];

interface SidebarProps {
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

export function Sidebar({ user }: SidebarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const pathname = usePathname();

  const companyName = user?.companies?.name || user?.first_name || "Transport";
  const companyInitials = companyName.substring(0, 2).toUpperCase();
  const planName = user?.companies?.plan || "Pro";

  return (
    <motion.aside
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r border-white/[0.08] bg-[#09090b]",
        "transition-all duration-300 ease-spring",
        isExpanded ? "w-64" : "w-20"
      )}
    >
      {/* Logo Area */}
      <div className="flex h-16 items-center justify-center border-b border-white/[0.08]">
        <motion.div
          animate={{ scale: isExpanded ? 1 : 0.9 }}
          className="flex items-center gap-3"
        >
          <Logo 
            showText={isExpanded} 
            size="md" 
            variant="light"
            className="hover:opacity-100"
          />
          <AnimatePresence>
            {isExpanded && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="text-[10px] text-[#71717a] -mt-4 ml-10"
              >
                {companyName}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Company Logo Section */}
      <div className="p-3 border-b border-white/[0.08]">
        <div className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-3 bg-[#18181b] border border-white/[0.06]",
          !isExpanded && "justify-center"
        )}>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 shrink-0">
            <span className="text-white font-bold text-sm">{companyInitials}</span>
          </div>
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex-1 min-w-0"
              >
                <p className="text-sm font-medium text-white truncate">{companyName}</p>
                <p className="text-xs text-[#71717a]">Plan {planName}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 p-3">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-3 transition-all duration-200",
                isActive
                  ? "bg-[#27272a] text-white"
                  : "text-[#a1a1aa] hover:bg-[#27272a] hover:text-white"
              )}
            >
              {/* Active Indicator */}
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]"
                />
              )}

              {/* Icon */}
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg transition-all shrink-0",
                  isActive
                    ? "bg-blue-500/20 text-blue-400"
                    : "bg-transparent group-hover:bg-[#3f3f46]"
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={1.5} />
              </div>

              {/* Label */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="flex-1 text-sm font-medium truncate"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>

              {/* Badge */}
              {item.badge && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={cn(
                    "flex h-5 items-center justify-center rounded-full bg-amber-500 text-xs font-semibold text-white shadow-lg shadow-amber-500/30 shrink-0",
                    isExpanded ? "px-1.5 min-w-[20px]" : "w-5"
                  )}
                >
                  {item.badge}
                </motion.span>
              )}

              {/* Chevron on expanded */}
              <AnimatePresence>
                {isExpanded && isActive && (
                  <motion.div
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -5 }}
                    className="shrink-0"
                  >
                    <ChevronRight className="h-4 w-4 text-[#71717a]" />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Tooltip when collapsed */}
              {!isExpanded && (
                <div className="absolute left-full ml-2 hidden rounded-lg bg-[#27272a] px-3 py-2 text-sm text-white opacity-0 shadow-xl transition-opacity group-hover:block group-hover:opacity-100 z-50 whitespace-nowrap">
                  {item.label}
                  {item.badge && (
                    <span className="ml-2 rounded-full bg-amber-500 px-1.5 text-xs">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-white/[0.08] p-3 bg-[#09090b]">
        <Link 
          href="/alerts"
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-[#a1a1aa] transition-all hover:bg-[#27272a] hover:text-white"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/20 shrink-0">
            <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          </div>
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex-1 text-left"
              >
                <div className="text-sm font-medium text-white">3 Alertes</div>
                <div className="text-xs text-[#71717a]">Maintenance due</div>
              </motion.div>
            )}
          </AnimatePresence>
        </Link>
      </div>
    </motion.aside>
  );
}

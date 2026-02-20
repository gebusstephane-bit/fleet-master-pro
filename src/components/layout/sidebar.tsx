"use client";

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
  ChevronRight,
  Siren,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import { useAlerts } from "@/hooks/use-alerts";
import { useSidebar } from "./sidebar-context";

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
  { label: "Alertes", href: "/alerts", icon: Bell },
];

const sosItem: NavItem = { label: "SOS Garage", href: "/sos", icon: Siren };

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
  const { isPinned, isExpanded, isMobileOpen, togglePin, setHovered, setMobileOpen } = useSidebar();
  const pathname = usePathname();
  const { data: alerts } = useAlerts();
  const unreadAlertCount = alerts?.filter((a: any) => !a.read_at)?.length || 0;

  const companyName = user?.companies?.name || user?.first_name || "Transport";
  const companyInitials = companyName.substring(0, 2).toUpperCase();
  const planName = user?.companies?.plan || "Pro";

  const sidebarContent = (
    <>
      {/* Logo Area */}
      <div className="flex h-16 items-center justify-between border-b border-white/[0.08] px-3">
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
        </motion.div>
        {/* Pin/Unpin button - visible when expanded on desktop */}
        <AnimatePresence>
          {isExpanded && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={togglePin}
              className="hidden md:flex h-8 w-8 items-center justify-center rounded-lg text-[#71717a] hover:text-white hover:bg-[#27272a] transition-colors"
              title={isPinned ? "Réduire la sidebar" : "Épingler la sidebar"}
            >
              {isPinned ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeftOpen className="h-4 w-4" />
              )}
            </motion.button>
          )}
        </AnimatePresence>
        {/* Close button on mobile */}
        {isMobileOpen && (
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden flex h-8 w-8 items-center justify-center rounded-lg text-[#71717a] hover:text-white hover:bg-[#27272a] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Company Logo Section */}
      <div className="p-3 border-b border-white/[0.08]">
        <div className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-3 bg-[#0f172a]/60 border border-cyan-500/15 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_20px_rgba(6,182,212,0.1)]",
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
      <nav className="flex flex-col gap-1 p-3 flex-1 overflow-y-auto scrollbar-hide">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href) && item.href !== '/sos';
          const Icon = item.icon;
          const badge = item.href === "/alerts" ? unreadAlertCount : item.badge;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-3 transition-all duration-200",
                isActive
                  ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.15)]"
                  : "text-slate-400 hover:bg-[#0f172a]/80 hover:text-cyan-300"
              )}
            >
              {/* Active Indicator */}
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-gradient-to-b from-cyan-400 to-blue-500 shadow-[0_0_15px_rgba(6,182,212,0.8)]"
                />
              )}

              {/* Icon */}
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg transition-all shrink-0",
                  isActive
                    ? "bg-gradient-to-br from-cyan-500 to-blue-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                    : "bg-transparent group-hover:bg-cyan-500/10 group-hover:text-cyan-400"
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
              {badge !== undefined && badge > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={cn(
                    "flex h-5 items-center justify-center rounded-full bg-amber-500 text-xs font-semibold text-white shadow-lg shadow-amber-500/30 shrink-0",
                    isExpanded ? "px-1.5 min-w-[20px]" : "w-5"
                  )}
                >
                  {badge}
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
                  {badge !== undefined && badge > 0 && (
                    <span className="ml-2 rounded-full bg-amber-500 px-1.5 text-xs">
                      {badge}
                    </span>
                  )}
                </div>
              )}
            </Link>
          );
        })}

        {/* SOS Item - Special styling */}
        {(() => {
          const isActive = pathname.startsWith('/sos');
          const Icon = sosItem.icon;
          return (
            <Link
              key={sosItem.href}
              href={sosItem.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-3 transition-all duration-200",
                isActive
                  ? "bg-red-500/20 text-red-400"
                  : "text-red-400 hover:bg-red-500/10 hover:text-red-300"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sosActiveIndicator"
                  className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]"
                />
              )}
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg transition-all shrink-0",
                  isActive
                    ? "bg-red-500/20 text-red-400"
                    : "bg-transparent group-hover:bg-red-500/20"
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <AnimatePresence>
                {isExpanded && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="flex-1 text-sm font-medium truncate"
                  >
                    {sosItem.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {!isExpanded && (
                <div className="absolute left-full ml-2 hidden rounded-lg bg-red-500/20 px-3 py-2 text-sm text-red-300 opacity-0 shadow-xl transition-opacity group-hover:block group-hover:opacity-100 z-50 whitespace-nowrap">
                  {sosItem.label}
                </div>
              )}
            </Link>
          );
        })()}
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-cyan-500/10 p-3 bg-[#0a0f1a]/50">
        <Link
          href="/alerts"
          onClick={() => setMobileOpen(false)}
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
                <div className="text-sm font-medium text-white">{unreadAlertCount} Alerte{unreadAlertCount !== 1 ? "s" : ""}</div>
                <div className="text-xs text-[#71717a]">{unreadAlertCount > 0 ? "Maintenance due" : "Aucune alerte"}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </Link>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        onMouseEnter={() => !isPinned && setHovered(true)}
        onMouseLeave={() => !isPinned && setHovered(false)}
        className={cn(
          "hidden md:flex fixed left-0 top-0 z-40 h-screen flex-col border-r border-white/[0.08] bg-[#09090b]",
          "transition-all duration-300 ease-spring",
          isExpanded ? "w-64" : "w-20"
        )}
      >
        {sidebarContent}
      </motion.aside>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="md:hidden fixed left-0 top-0 z-50 h-screen w-64 flex flex-col border-r border-cyan-500/10 bg-[#0a0f1a]/95 backdrop-blur-xl"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

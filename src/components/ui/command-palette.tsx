"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Command,
  Search,
  Car,
  Users,
  Wrench,
  ClipboardCheck,
  Route,
  Settings,
  Bell,
  LogOut,
  FileText,
  Gauge,
  Calendar,
} from "lucide-react";

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  href: string;
  shortcut?: string;
}

const commands: CommandItem[] = [
  {
    id: "vehicles",
    title: "Véhicules",
    subtitle: "Gérer la flotte",
    icon: Car,
    href: "/vehicles",
    shortcut: "V",
  },
  {
    id: "drivers",
    title: "Chauffeurs",
    subtitle: "Gérer les conducteurs",
    icon: Users,
    href: "/drivers",
    shortcut: "C",
  },
  {
    id: "maintenance",
    title: "Maintenance",
    subtitle: "Entretiens et réparations",
    icon: Wrench,
    href: "/maintenance",
    shortcut: "M",
  },
  {
    id: "inspections",
    title: "Inspections",
    subtitle: "État des véhicules",
    icon: ClipboardCheck,
    href: "/inspections",
    shortcut: "I",
  },
  {
    id: "routes",
    title: "Tournées",
    subtitle: "Planifier les trajets",
    icon: Route,
    href: "/routes",
    shortcut: "T",
  },
  {
    id: "agenda",
    title: "Agenda",
    subtitle: "Calendrier des interventions",
    icon: Calendar,
    href: "/agenda",
    shortcut: "A",
  },
  {
    id: "alerts",
    title: "Alertes",
    subtitle: "Notifications et alertes",
    icon: Bell,
    href: "/alerts",
    shortcut: "L",
  },
  {
    id: "documents",
    title: "Documents",
    subtitle: "Gestion documentaire",
    icon: FileText,
    href: "/documents",
    shortcut: "D",
  },
  {
    id: "dashboard",
    title: "Tableau de bord",
    subtitle: "Vue d'ensemble",
    icon: Gauge,
    href: "/dashboard",
    shortcut: "B",
  },
  {
    id: "settings",
    title: "Paramètres",
    subtitle: "Configuration",
    icon: Settings,
    href: "/settings",
    shortcut: "P",
  },
];

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();

  const filteredCommands = commands.filter(
    (cmd) =>
      cmd.title.toLowerCase().includes(search.toLowerCase()) ||
      cmd.subtitle?.toLowerCase().includes(search.toLowerCase())
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to open
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }

      // Escape to close
      if (e.key === "Escape") {
        setIsOpen(false);
      }

      if (isOpen) {
        // Navigate down
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredCommands.length - 1 ? prev + 1 : prev
          );
        }
        // Navigate up
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        }
        // Enter to select
        if (e.key === "Enter") {
          const selected = filteredCommands[selectedIndex];
          if (selected) {
            router.push(selected.href);
            setIsOpen(false);
            setSearch("");
            setSelectedIndex(0);
          }
        }
      }
    },
    [isOpen, filteredCommands, selectedIndex, router]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Command Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="fixed left-1/2 top-[20%] z-50 w-full max-w-2xl -translate-x-1/2"
          >
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#18181b]/95 shadow-2xl backdrop-blur-xl">
              {/* Search Input */}
              <div className="flex items-center gap-3 border-b border-white/10 px-4 py-4">
                <Search className="h-5 w-5 text-[#71717a]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher une commande..."
                  className="flex-1 bg-transparent text-lg text-[#fafafa] placeholder-[#71717a] outline-none"
                  autoFocus
                />
                <kbd className="rounded-lg bg-[#27272a] px-2 py-1 text-xs font-medium text-[#71717a]">
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <div className="max-h-[400px] overflow-y-auto p-2">
                {filteredCommands.length === 0 ? (
                  <div className="py-8 text-center text-[#71717a]">
                    Aucun résultat trouvé
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredCommands.map((cmd, index) => (
                      <motion.button
                        key={cmd.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        onClick={() => {
                          router.push(cmd.href);
                          setIsOpen(false);
                          setSearch("");
                        }}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all",
                          index === selectedIndex
                            ? "bg-[#3b82f6] text-white"
                            : "text-[#a1a1aa] hover:bg-[#27272a] hover:text-[#fafafa]"
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-lg",
                            index === selectedIndex
                              ? "bg-white/20"
                              : "bg-[#27272a]"
                          )}
                        >
                          <cmd.icon className="h-5 w-5" strokeWidth={1.5} />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{cmd.title}</div>
                          <div
                            className={cn(
                              "text-xs",
                              index === selectedIndex
                                ? "text-white/70"
                                : "text-[#71717a]"
                            )}
                          >
                            {cmd.subtitle}
                          </div>
                        </div>
                        {cmd.shortcut && (
                          <kbd
                            className={cn(
                              "rounded-lg px-2 py-1 text-xs font-medium",
                              index === selectedIndex
                                ? "bg-white/20 text-white"
                                : "bg-[#27272a] text-[#71717a]"
                            )}
                          >
                            {cmd.shortcut}
                          </kbd>
                        )}
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-white/10 px-4 py-3 text-xs text-[#71717a]">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <kbd className="rounded bg-[#27272a] px-1.5 py-0.5">↑</kbd>
                    <kbd className="rounded bg-[#27272a] px-1.5 py-0.5">↓</kbd>
                    <span className="ml-1">pour naviguer</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="rounded bg-[#27272a] px-1.5 py-0.5">↵</kbd>
                    <span className="ml-1">pour sélectionner</span>
                  </span>
                </div>
                <span>FleetMaster Pro</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

import { cn } from "@/lib/utils";

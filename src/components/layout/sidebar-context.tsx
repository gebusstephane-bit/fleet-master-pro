"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

interface SidebarContextType {
  isPinned: boolean;
  isHovered: boolean;
  isExpanded: boolean;
  isMobileOpen: boolean;
  togglePin: () => void;
  setHovered: (value: boolean) => void;
  setMobileOpen: (value: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | null>(null);

const STORAGE_KEY = "fleetmaster-sidebar-pinned";

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isPinned, setIsPinned] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      setIsPinned(stored === "true");
    }
  }, []);

  const togglePin = useCallback(() => {
    setIsPinned((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  const isExpanded = isPinned || isHovered;

  return (
    <SidebarContext.Provider
      value={{
        isPinned,
        isHovered,
        isExpanded,
        isMobileOpen,
        togglePin,
        setHovered: setIsHovered,
        setMobileOpen: setIsMobileOpen,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within SidebarProvider");
  return ctx;
}

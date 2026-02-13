"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface SidebarProps {
  user?: any;
}

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Véhicules", href: "/vehicles" },
  { label: "Chauffeurs", href: "/drivers" },
  { label: "Maintenance", href: "/maintenance" },
  { label: "Paramètres", href: "/settings" },
];

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-20 bg-[#09090b] border-r border-white/5 z-50 flex flex-col items-center py-6">
      <div className="mb-8">
        <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
          F
        </div>
      </div>
      
      <nav className="flex-1 flex flex-col gap-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center text-sm font-medium transition-colors",
              pathname === item.href
                ? "bg-purple-600 text-white"
                : "text-white/60 hover:bg-white/5 hover:text-white"
            )}
          >
            {item.label.charAt(0)}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

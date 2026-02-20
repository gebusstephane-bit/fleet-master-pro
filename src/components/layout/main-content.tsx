"use client";

import { cn } from "@/lib/utils";
import { useSidebar } from "./sidebar-context";
import { AmbientBackgroundSimple } from "@/components/ui/ambient-background";

export function MainContent({ children }: { children: React.ReactNode }) {
  const { isExpanded } = useSidebar();

  return (
    <main
      className={cn(
        "pt-16 min-h-screen bg-transparent relative z-10 transition-all duration-300",
        isExpanded ? "md:pl-64" : "md:pl-20",
        "pl-0"
      )}
    >
      {/* Fond d'ambiance - positionné dans le flux mais fixed pour couvrir tout */}
      <AmbientBackgroundSimple />
      
      {/* Contenu avec z-index supérieur */}
      <div className="relative z-10 p-6">{children}</div>
    </main>
  );
}

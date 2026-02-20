/**
 * AmbientBackground - Fond d'ambiance pour le dashboard
 * 
 * ⚠️ COMPOSANT PUR - Aucune logique métier
 * - Pas de hooks React (sauf si props passées)
 * - Pas de state
 * - Pas d'effets
 * - Pas de mutations
 * - GPU-friendly (animations CSS légères uniquement)
 */

import Image from "next/image";
import { cn } from "@/lib/utils";

interface AmbientBackgroundProps {
  /** Opacité de l'image (défaut: 0.15) */
  opacity?: 0.1 | 0.15 | 0.2 | 0.25;
  /** Ajouter un overlay de blur (défaut: true) */
  blurOverlay?: boolean;
  /** Direction du masque de gradient (défaut: 'both') */
  gradientMask?: "top" | "bottom" | "both" | "none";
  /** Classes CSS additionnelles */
  className?: string;
}

export function AmbientBackground({
  opacity = 0.15,
  blurOverlay = true,
  gradientMask = "both",
  className,
}: AmbientBackgroundProps) {
  const opacityClass = {
    0.1: "opacity-10",
    0.15: "opacity-[0.15]",
    0.2: "opacity-20",
    0.25: "opacity-25",
  };

  const gradientClass = {
    top: "bg-gradient-to-b from-[#0a0f1a] via-transparent to-transparent",
    bottom: "bg-gradient-to-t from-[#0a0f1a] via-transparent to-transparent",
    both: "bg-gradient-to-b from-[#0a0f1a] via-transparent via-50% to-[#0a0f1a]",
    none: "",
  };

  return (
    <div
      className={cn(
        "fixed inset-0 pointer-events-none select-none",
        "z-0",
        className
      )}
      aria-hidden="true"
    >
      {/* Image de fond */}
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-700",
          opacityClass[opacity]
        )}
      >
        <Image
          src="/images/hero-fleet.jpg"
          alt=""
          fill
          priority={false}
          sizes="100vw"
          className={cn(
            "object-cover object-center",
            blurOverlay && "scale-105" // Évite les bords blancs lors du blur
          )}
          style={{
            filter: blurOverlay ? "blur(2px)" : "none",
          }}
        />
      </div>

      {/* Overlay de couleur pour harmoniser */}
      <div
        className="absolute inset-0 bg-[#0a0f1a]/40"
        style={{
          background: `
            radial-gradient(ellipse at 50% 0%, rgba(6,182,212,0.08) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 100%, rgba(249,115,22,0.05) 0%, transparent 50%),
            rgba(10, 15, 26, 0.4)
          `,
        }}
      />

      {/* Masque de gradient pour la lisibilité */}
      {gradientMask !== "none" && (
        <div className={cn("absolute inset-0", gradientClass[gradientMask])} />
      )}

      {/* Grid pattern subtil */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(6, 182, 212, 1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(6, 182, 212, 1) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />
    </div>
  );
}

/**
 * Version simplifiée sans options - pour utilisation rapide
 */
export function AmbientBackgroundSimple() {
  return (
    <div
      className="fixed inset-0 pointer-events-none select-none z-0"
      aria-hidden="true"
    >
      <div className="absolute inset-0 opacity-[0.12]">
        <Image
          src="/images/hero-fleet.jpg"
          alt=""
          fill
          priority={false}
          sizes="100vw"
          className="object-cover object-center scale-105"
          style={{ filter: "blur(1px)" }}
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0f1a] via-transparent via-40% to-[#0a0f1a]" />
      <div className="absolute inset-0 bg-[#0a0f1a]/50" />
    </div>
  );
}

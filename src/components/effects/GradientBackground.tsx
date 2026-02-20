"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GradientBackgroundProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "hero" | "mesh" | "gradient";
  showGrid?: boolean;
}

export function GradientBackground({
  children,
  className,
  variant = "default",
  showGrid = true,
}: GradientBackgroundProps) {
  const variants = {
    default: "bg-[#0a0f1a]",
    hero: "bg-[#0a0f1a] relative overflow-hidden",
    mesh: "bg-mesh",
    gradient: "bg-gradient-to-br from-[#0a0f1a] via-[#0f172a] to-[#1e293b]",
  };

  return (
    <div className={cn(variants[variant], className)}>
      {/* Mesh Gradient Overlay */}
      {variant === "hero" && (
        <>
          {/* Primary gradient orbs */}
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] bg-orange-500/5 rounded-full blur-[80px] pointer-events-none" />
          
          {/* Radial gradient overlay */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse at top, rgba(6,182,212,0.08) 0%, transparent 50%)`,
            }}
          />
        </>
      )}

      {/* Grid Pattern */}
      {showGrid && (
        <div 
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            backgroundImage: `
              linear-gradient(rgba(6, 182, 212, 0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(6, 182, 212, 0.03) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />
      )}

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

// Animated gradient background
export function AnimatedGradientBackground({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("relative overflow-hidden bg-[#0a0f1a]", className)}>
      {/* Animated mesh gradients */}
      <div className="absolute inset-0">
        <div 
          className="absolute inset-0 animate-gradient-shift"
          style={{
            background: `
              radial-gradient(at 0% 0%, rgba(6,182,212,0.15) 0px, transparent 50%),
              radial-gradient(at 100% 0%, rgba(59,130,246,0.15) 0px, transparent 50%),
              radial-gradient(at 100% 100%, rgba(249,115,22,0.1) 0px, transparent 50%),
              radial-gradient(at 0% 100%, rgba(6,182,212,0.1) 0px, transparent 50%)
            `,
            backgroundSize: "200% 200%",
          }}
        />
      </div>
      
      {children}
    </div>
  );
}

// Simple gradient overlay for sections
export function GradientOverlay({ className }: { className?: string }) {
  return (
    <div 
      className={cn("pointer-events-none", className)}
      style={{
        background: `linear-gradient(180deg, transparent 0%, rgba(10, 15, 26, 0.8) 100%)`,
      }}
    />
  );
}

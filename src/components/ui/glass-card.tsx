"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: "blue" | "emerald" | "amber" | "red" | "violet" | "none";
  delay?: number;
  onClick?: () => void;
}

const glowStyles = {
  blue: "hover:shadow-[0_0_30px_rgba(59,130,246,0.2)]",
  emerald: "hover:shadow-[0_0_30px_rgba(16,185,129,0.2)]",
  amber: "hover:shadow-[0_0_30px_rgba(245,158,11,0.2)]",
  red: "hover:shadow-[0_0_30px_rgba(239,68,68,0.2)]",
  violet: "hover:shadow-[0_0_30px_rgba(139,92,246,0.2)]",
  none: "",
};

export function GlassCard({
  children,
  className,
  hover = true,
  glow = "blue",
  delay = 0,
  onClick,
}: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: delay * 0.1,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={
        hover
          ? {
              y: -4,
              transition: { duration: 0.2 },
            }
          : undefined
      }
      className={cn(
        "relative overflow-hidden rounded-xl",
        "bg-[#18181b]/60 backdrop-blur-xl",
        "border border-white/[0.08]",
        "shadow-[0_8px_32px_rgba(0,0,0,0.4)]",
        hover && "cursor-pointer",
        hover && glowStyles[glow],
        hover && "hover:border-white/[0.15]",
        "transition-colors duration-300",
        className
      )}
      onClick={onClick}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
      
      {/* Content */}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

// Spotlight Card with mouse tracking effect
export function SpotlightCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "group relative overflow-hidden rounded-xl",
        "bg-[#18181b]/60 backdrop-blur-xl",
        "border border-white/[0.08]",
        "transition-all duration-500",
        className
      )}
    >
      {/* Spotlight effect */}
      <div className="absolute -inset-px opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10" />
      </div>
      
      <div className="relative">{children}</div>
    </motion.div>
  );
}

// Metric Card for KPIs
export function MetricCard({
  title,
  value,
  subtitle,
  trend,
  trendUp,
  icon: Icon,
  delay = 0,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: string;
  trendUp?: boolean;
  icon: React.ElementType;
  delay?: number;
}) {
  return (
    <GlassCard delay={delay} className="p-6">
      <div className="flex items-start justify-between">
        <div className="p-2.5 rounded-xl bg-[#27272a] border border-white/[0.06]">
          <Icon className="w-5 h-5 text-[#a1a1aa]" strokeWidth={1.5} />
        </div>
        {trend && (
          <span
            className={cn(
              "text-xs font-medium px-2 py-1 rounded-full",
              trendUp
                ? "bg-emerald-500/15 text-emerald-400"
                : "bg-red-500/15 text-red-400"
            )}
          >
            {trend}
          </span>
        )}
      </div>
      
      <div className="mt-4">
        <h3 className="text-3xl font-bold text-[#fafafa] tracking-tight">
          {value}
        </h3>
        <p className="text-sm font-medium text-[#a1a1aa] mt-1">{title}</p>
        {subtitle && (
          <p className="text-xs text-[#71717a] mt-0.5">{subtitle}</p>
        )}
      </div>
    </GlassCard>
  );
}

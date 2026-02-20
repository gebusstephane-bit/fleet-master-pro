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
  cyan: "hover:shadow-[0_0_30px_rgba(6,182,212,0.3)] hover:border-cyan-500/40",
  blue: "hover:shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:border-blue-500/40",
  orange: "hover:shadow-[0_0_30px_rgba(249,115,22,0.3)] hover:border-orange-500/40",
  emerald: "hover:shadow-[0_0_30px_rgba(16,185,129,0.25)] hover:border-emerald-500/40",
  amber: "hover:shadow-[0_0_30px_rgba(245,158,11,0.25)] hover:border-amber-500/40",
  red: "hover:shadow-[0_0_30px_rgba(239,68,68,0.25)] hover:border-red-500/40",
  violet: "hover:shadow-[0_0_30px_rgba(139,92,246,0.25)] hover:border-violet-500/40",
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
        "bg-[#0f172a]/60 backdrop-blur-xl",
        "border border-cyan-500/15",
        "shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_20px_rgba(6,182,212,0.1)]",
        hover && "cursor-pointer",
        hover && glowStyles[glow],
        hover && "hover:border-cyan-500/30",
        "transition-all duration-300",
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
        "bg-[#0f172a]/60 backdrop-blur-xl",
        "border border-cyan-500/15",
        "shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_20px_rgba(6,182,212,0.1)]",
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
        <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
          <Icon className="w-5 h-5 text-cyan-400" strokeWidth={1.5} />
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
        <h3 className="text-3xl font-bold text-white tracking-tight">
          {value}
        </h3>
        <p className="text-sm font-medium text-cyan-400/70 mt-1">{title}</p>
        {subtitle && (
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        )}
      </div>
    </GlassCard>
  );
}

// Premium Glass Card - Cyan/Blue/Orange Theme
interface GlassCardPremiumProps {
  children: React.ReactNode;
  className?: string;
  float?: boolean;
  glow?: "cyan" | "blue" | "orange" | "none";
  delay?: number;
}

export function GlassCardPremium({
  children,
  className,
  float = false,
  glow = "cyan",
  delay = 0,
}: GlassCardPremiumProps) {
  const glowStyles = {
    cyan: "border-cyan-500/20 hover:border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.1)] hover:shadow-[0_0_30px_rgba(6,182,212,0.2)]",
    blue: "border-blue-500/20 hover:border-blue-500/40 shadow-[0_0_20px_rgba(59,130,246,0.1)] hover:shadow-[0_0_30px_rgba(59,130,246,0.2)]",
    orange: "border-orange-500/20 hover:border-orange-500/40 shadow-[0_0_20px_rgba(249,115,22,0.1)] hover:shadow-[0_0_30px_rgba(249,115,22,0.2)]",
    none: "border-white/10",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: delay * 0.1,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={cn(
        "relative overflow-hidden rounded-2xl",
        "bg-gradient-to-br from-[#0f172a]/80 to-[#1e293b]/60",
        "backdrop-blur-xl border",
        glowStyles[glow],
        float && "animate-float",
        "transition-all duration-500",
        className
      )}
    >
      {/* Inner gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-orange-500/5 pointer-events-none" />
      
      {/* Content */}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

// Feature Card for Landing Page
interface FeatureCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  features?: string[];
  delay?: number;
  variant?: "cyan" | "blue" | "violet" | "emerald";
}

export function FeatureCard({
  icon: Icon,
  title,
  description,
  features,
  delay = 0,
  variant = "cyan",
}: FeatureCardProps) {
  const variants = {
    cyan: { bg: "bg-cyan-500/10", border: "border-cyan-500/20", text: "text-cyan-400", icon: "text-cyan-400" },
    blue: { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-400", icon: "text-blue-400" },
    violet: { bg: "bg-violet-500/10", border: "border-violet-500/20", text: "text-violet-400", icon: "text-violet-400" },
    emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400", icon: "text-emerald-400" },
  };
  
  const v = variants[variant];

  return (
    <GlassCardPremium glow={variant === "cyan" ? "cyan" : variant === "blue" ? "blue" : "none"} delay={delay}>
      <div className="p-8">
        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6", v.bg, v.border)}>
          <Icon className={cn("w-7 h-7", v.icon)} />
        </div>
        
        <h3 className="text-2xl font-bold text-white mb-4">{title}</h3>
        <p className="text-slate-400 text-lg mb-6">{description}</p>
        
        {features && (
          <ul className="space-y-3">
            {features.map((feature, i) => (
              <li key={i} className="flex items-center gap-3 text-slate-300">
                <svg className={cn("w-5 h-5 flex-shrink-0", v.text)} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {feature}
              </li>
            ))}
          </ul>
        )}
      </div>
    </GlassCardPremium>
  );
}

"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ShimmerButtonProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}

export function ShimmerButton({
  children,
  className,
  onClick,
  variant = "primary",
  size = "md",
  disabled = false,
  type = "button",
}: ShimmerButtonProps) {
  const baseStyles = "relative inline-flex items-center justify-center gap-2 font-semibold overflow-hidden transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: cn(
      "text-white rounded-xl",
      "bg-gradient-to-r from-cyan-500 via-blue-500 to-orange-500",
      "shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40",
      "hover:-translate-y-0.5 active:scale-[0.98]",
      "before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent",
      "before:-translate-x-full hover:before:translate-x-full before:transition-transform before:duration-700"
    ),
    secondary: cn(
      "text-white rounded-xl",
      "bg-slate-800/80 border border-cyan-500/20",
      "hover:border-cyan-500/40 hover:bg-slate-800",
      "hover:-translate-y-0.5 active:scale-[0.98]"
    ),
    ghost: cn(
      "text-cyan-400 rounded-xl",
      "bg-transparent border border-transparent",
      "hover:bg-cyan-500/10 hover:text-cyan-300",
      "active:scale-[0.98]"
    ),
  };

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-sm",
    lg: "px-8 py-4 text-base",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
    >
      {variant === "primary" && (
        <>
          {/* Shimmer overlay */}
          <span className="absolute inset-0 overflow-hidden rounded-xl">
            <span 
              className="absolute inset-0 -translate-x-full animate-shimmer-slide"
              style={{
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)",
              }}
            />
          </span>
          {/* Glow effect */}
          <span className="absolute inset-0 rounded-xl opacity-0 hover:opacity-100 transition-opacity duration-300">
            <span className="absolute inset-0 rounded-xl blur-md bg-gradient-to-r from-cyan-400/50 to-blue-500/50" />
          </span>
        </>
      )}
      <span className="relative z-10">{children}</span>
    </button>
  );
}

// Animated button with icon
interface IconButtonProps extends ShimmerButtonProps {
  icon: ReactNode;
  iconPosition?: "left" | "right";
}

export function IconButton({
  children,
  icon,
  iconPosition = "right",
  ...props
}: IconButtonProps) {
  return (
    <ShimmerButton {...props}>
      {iconPosition === "left" && <span className="relative z-10">{icon}</span>}
      <span className="relative z-10">{children}</span>
      {iconPosition === "right" && <span className="relative z-10">{icon}</span>}
    </ShimmerButton>
  );
}

// Premium glass button with gradient border
export function GlassButton({
  children,
  className,
  onClick,
  disabled,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative group px-6 py-3 rounded-xl font-medium text-white",
        "bg-slate-900/50 backdrop-blur-xl",
        "border border-cyan-500/20",
        "hover:border-cyan-500/50",
        "transition-all duration-300",
        "hover:-translate-y-0.5 active:scale-[0.98]",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "overflow-hidden",
        className
      )}
    >
      {/* Gradient border glow */}
      <span className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <span className="absolute inset-[-1px] rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-orange-500 blur-sm" />
      </span>
      
      {/* Inner content */}
      <span className="relative z-10 flex items-center gap-2">
        {children}
      </span>
    </button>
  );
}

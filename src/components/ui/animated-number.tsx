"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

interface AnimatedNumberProps {
  value: number;
  className?: string;
  duration?: number;
  format?: (val: number) => string;
}

export function AnimatedNumber({
  value,
  className,
  duration = 1.5,
  format = (val) => Math.round(val).toString(),
}: AnimatedNumberProps) {
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  
  const spring = useSpring(0, {
    mass: 1,
    stiffness: 75,
    damping: 15,
    duration: duration * 1000,
  });
  
  const display = useTransform(spring, (current) => format(current));
  
  useEffect(() => {
    if (!hasAnimated) {
      spring.set(value);
      setHasAnimated(true);
    } else {
      spring.set(value);
    }
  }, [value, spring, hasAnimated]);

  return (
    <motion.span ref={ref} className={className}>
      {display}
    </motion.span>
  );
}

// Counter with suffix/prefix
export function Counter({
  value,
  prefix = "",
  suffix = "",
  className,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  return (
    <span className={className}>
      {prefix}
      <AnimatedNumber value={value} />
      {suffix}
    </span>
  );
}

// Progress bar with animation
export function AnimatedProgress({
  value,
  max = 100,
  className,
  barClassName,
}: {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
}) {
  const percentage = Math.min((value / max) * 100, 100);
  
  return (
    <div className={cn("h-2 bg-[#27272a] rounded-full overflow-hidden", className)}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{
          duration: 1,
          ease: [0.22, 1, 0.36, 1],
        }}
        className={cn("h-full rounded-full", barClassName)}
      />
    </div>
  );
}

// Circular progress
export function CircularProgress({
  value,
  size = 40,
  strokeWidth = 3,
  className,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;
  
  return (
    <div className={cn("relative", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#27272a"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{
            strokeDasharray: circumference,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-semibold text-[#fafafa]">{value}%</span>
      </div>
    </div>
  );
}

import { cn } from "@/lib/utils";

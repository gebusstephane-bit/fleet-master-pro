"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

// Wrapper qui fait respirer n'importe quel élément
export function Breathing({ 
  children, 
  intensity = 1,
  delay = 0 
}: { 
  children: ReactNode; 
  intensity?: number;
  delay?: number;
}) {
  return (
    <motion.div
      animate={{
        scale: [1, 1 + 0.005 * intensity, 1],
        y: [0, -2 * intensity, 0],
      }}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut",
        delay,
      }}
    >
      {children}
    </motion.div>
  );
}

// Effet de flottement pour les cards
export function Floating({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <motion.div
      animate={{
        y: [0, -10, 0],
        rotate: [0, 1, -1, 0],
      }}
      transition={{
        duration: 6,
        repeat: Infinity,
        ease: "easeInOut",
        delay,
      }}
    >
      {children}
    </motion.div>
  );
}

// Effet de pulsation lumineuse
export function PulseGlow({ children, color = "#00d4ff" }: { children: ReactNode; color?: string }) {
  return (
    <motion.div
      animate={{
        boxShadow: [
          `0 0 20px ${color}20`,
          `0 0 40px ${color}40`,
          `0 0 20px ${color}20`,
        ],
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {children}
    </motion.div>
  );
}

// Effet de scanner (comme dans les films sci-fi)
export function Scanner({ children }: { children: ReactNode }) {
  return (
    <div className="relative overflow-hidden">
      {children}
      <motion.div
        className="absolute inset-0 bg-gradient-to-b from-transparent via-[#00d4ff]/10 to-transparent h-1/3"
        animate={{
          top: ["-100%", "200%"],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "linear",
          repeatDelay: 2,
        }}
      />
    </div>
  );
}

// Effet glitch cyberpunk occasionnel
export function Glitch({ children }: { children: ReactNode }) {
  return (
    <motion.div
      animate={{
        x: [0, -2, 2, -1, 1, 0],
        opacity: [1, 0.8, 1, 0.9, 1],
      }}
      transition={{
        duration: 0.2,
        repeat: Infinity,
        repeatDelay: 8,
        ease: "linear",
      }}
    >
      {children}
    </motion.div>
  );
}

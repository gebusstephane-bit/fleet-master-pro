"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

export function SectionTransition({ color = "#00d4ff" }: { color?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [0, 1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.8, 1, 0.8]);

  return (
    <div ref={ref} className="h-32 relative overflow-hidden">
      <motion.div
        style={{ opacity, scale }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <div 
          className="w-2 h-2 rounded-full blur-xl"
          style={{ background: color, boxShadow: `0 0 100px 50px ${color}40` }}
        />
      </motion.div>
      
      {/* Lignes de connexion */}
      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
        <motion.line
          x1="0"
          y1="50%"
          x2="100%"
          y2="50%"
          stroke={color}
          strokeWidth="1"
          strokeOpacity="0.2"
          style={{
            pathLength: useTransform(scrollYProgress, [0, 0.5], [0, 1]),
          }}
        />
      </svg>
    </div>
  );
}

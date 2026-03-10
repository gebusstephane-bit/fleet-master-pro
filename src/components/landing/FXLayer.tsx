"use client";

import { motion, useScroll, useTransform, useSpring, useMotionValue } from "framer-motion";
import { useRef, useEffect, useState } from "react";

// EFFET 1: PARALLAX 5 COUCHES
export function ParallaxContainer({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"]
  });

  // 5 couches de profondeur
  const y1 = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const y3 = useTransform(scrollYProgress, [0, 1], [0, 300]);
  const y4 = useTransform(scrollYProgress, [0, 1], [0, 400]);

  return (
    <div ref={ref} className="relative">
      {/* Couche 1: Arrière - Nébuleuse */}
      <motion.div 
        className="fixed inset-0 pointer-events-none z-0"
        style={{ y: y1 }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,212,255,0.15)_0%,_transparent_70%)]" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px]" />
      </motion.div>

      {/* Couche 2: Routes lumineuses */}
      <motion.div 
        className="fixed inset-0 pointer-events-none z-10"
        style={{ y: y2 }}
      >
        <HighwayLines />
      </motion.div>

      {/* Couche 3: Véhicules flottants */}
      <motion.div 
        className="fixed inset-0 pointer-events-none z-20"
        style={{ y: y3 }}
      >
        <FloatingVehicles />
      </motion.div>

      {/* Couche 4: Particules rapides */}
      <motion.div 
        className="fixed inset-0 pointer-events-none z-30"
        style={{ y: y4 }}
      >
        <SpeedParticles />
      </motion.div>

      {/* Contenu principal */}
      <div className="relative z-50">
        {children}
      </div>
    </div>
  );
}

// Routes lumineuses en perspective 5D
function HighwayLines() {
  return (
    <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
      {/* Route centrale principale */}
      <motion.line
        x1="50%" y1="100%" x2="50%" y2="-20%"
        stroke="url(#highwayGrad)"
        strokeWidth="4"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.6 }}
        transition={{ duration: 3, ease: "easeOut" }}
      />
      
      {/* Routes latérales */}
      <motion.line
        x1="20%" y1="100%" x2="35%" y2="-20%"
        stroke="url(#highwayGrad2)"
        strokeWidth="2"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.3 }}
        transition={{ duration: 2.5, delay: 0.3, ease: "easeOut" }}
      />
      <motion.line
        x1="80%" y1="100%" x2="65%" y2="-20%"
        stroke="url(#highwayGrad2)"
        strokeWidth="2"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.3 }}
        transition={{ duration: 2.5, delay: 0.5, ease: "easeOut" }}
      />

      {/* Dégradés */}
      <defs>
        <linearGradient id="highwayGrad" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#00d4ff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="highwayGrad2" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// Véhicules qui flottent dans l'espace (5D)
function FloatingVehicles() {
  const vehicles = [
    { x: 15, y: 80, color: "#00d4ff", size: 8 },
    { x: 35, y: 60, color: "#10b981", size: 6 },
    { x: 65, y: 70, color: "#8b5cf6", size: 7 },
    { x: 85, y: 85, color: "#f59e0b", size: 9 },
    { x: 25, y: 40, color: "#ec4899", size: 5 },
    { x: 75, y: 45, color: "#00d4ff", size: 7 },
  ];

  return (
    <div className="absolute inset-0">
      {vehicles.map((v, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${v.x}%`,
            top: `${v.y}%`,
            width: v.size,
            height: v.size,
            background: v.color,
            boxShadow: `0 0 ${v.size * 3}px ${v.color}, 0 0 ${v.size * 6}px ${v.color}50`,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, Math.sin(i) * 20, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 4 + i,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.5,
          }}
        >
          {/* Halo de connexion */}
          <motion.div
            className="absolute inset-0 rounded-full border"
            style={{ borderColor: v.color }}
            animate={{ scale: [1, 4], opacity: [0.8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.div>
      ))}
    </div>
  );
}

// Particules de vitesse (effet warp)
function SpeedParticles() {
  return (
    <div className="absolute inset-0">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-0.5 bg-gradient-to-t from-[#00d4ff] to-transparent"
          style={{
            left: `${Math.random() * 100}%`,
            height: `${20 + Math.random() * 60}px`,
          }}
          initial={{ y: "100vh", opacity: 0 }}
          animate={{ 
            y: "-100px", 
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 1 + Math.random(),
            repeat: Infinity,
            delay: Math.random() * 2,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
}

// EFFET 2: WARP SPEED AU SCROLL
export function WarpEffect() {
  const { scrollY } = useScroll();
  const [isWarping, setIsWarping] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    return scrollY.onChange((latest) => {
      const velocity = Math.abs(latest - lastScrollY.current);
      if (velocity > 50) {
        setIsWarping(true);
        setTimeout(() => setIsWarping(false), 200);
      }
      lastScrollY.current = latest;
    });
  }, [scrollY]);

  if (!isWarping) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[100]">
      <motion.div
        className="absolute inset-0 bg-white"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.05, 0] }}
        transition={{ duration: 0.2 }}
      />
    </div>
  );
}

// EFFET 3: SOURIS QUI DÉFORME L'ESPACE (5D interactif)
export function MouseDistortion({ children }: { children: React.ReactNode }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    mouseX.set((clientX / innerWidth - 0.5) * 20);
    mouseY.set((clientY / innerHeight - 0.5) * 20);
  };

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      style={{
        perspective: 1000,
      }}
    >
      {children}
    </motion.div>
  );
}

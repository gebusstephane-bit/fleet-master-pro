"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Play, Shield, Activity, MapPin, Truck, Navigation } from "lucide-react";

// FOND SPECTACULAIRE - Routes lumineuses 3D
function HighwayBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Gradient de base */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#020617] via-[#0a0f1a] to-[#020617]" />
      
      {/* Routes lumineuses en perspective */}
      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
        {/* Route centrale */}
        <motion.line
          x1="50%" y1="100%" x2="50%" y2="0%"
          stroke="url(#roadGradient)"
          strokeWidth="4"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.6 }}
          transition={{ duration: 2, ease: "easeOut" }}
        />
        
        {/* Routes latérales */}
        <motion.line
          x1="20%" y1="100%" x2="35%" y2="0%"
          stroke="url(#roadGradient2)"
          strokeWidth="2"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.3 }}
          transition={{ duration: 2, delay: 0.3, ease: "easeOut" }}
        />
        <motion.line
          x1="80%" y1="100%" x2="65%" y2="0%"
          stroke="url(#roadGradient2)"
          strokeWidth="2"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.3 }}
          transition={{ duration: 2, delay: 0.5, ease: "easeOut" }}
        />
        
        {/* Lignes de circulation animées */}
        {[...Array(3)].map((_, i) => (
          <motion.circle
            key={i}
            r="3"
            fill="#00d4ff"
            initial={{
              cx: 50 + (Math.random() - 0.5) * 30,
              cy: 100,
              opacity: 0
            }}
            animate={{
              cy: -10,
              opacity: [0, 1, 1, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: i * 0.8,
              ease: "linear"
            }}
          />
        ))}
        
        {/* Dégradés */}
        <defs>
          <linearGradient id="roadGradient" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#00d4ff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="roadGradient2" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      {/* Réseau de connexions (type carte GPS) */}
      <svg className="absolute inset-0 w-full h-full opacity-30">
        {[...Array(4)].map((_, i) => (
          <motion.line
            key={`connection-${i}`}
            x1={`${Math.random() * 100}%`}
            y1={`${Math.random() * 100}%`}
            x2={`${Math.random() * 100}%`}
            y2={`${Math.random() * 100}%`}
            stroke="#00d4ff"
            strokeWidth="1"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.3, 0] }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: i * 0.5,
            }}
          />
        ))}
      </svg>

      {/* Grille perspective sol */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-1/2 opacity-20"
        style={{
          background: `
            linear-gradient(to top, rgba(0,212,255,0.1) 1px, transparent 1px),
            linear-gradient(to right, rgba(0,212,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
          transform: 'perspective(500px) rotateX(60deg)',
          transformOrigin: 'bottom',
        }}
      />
    </div>
  );
}

// Dashboard compact et lisible avec effet scanner
function DashboardPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 50, rotateY: -30 }}
      animate={{ opacity: 1, x: 0, rotateY: 0 }}
      transition={{ duration: 0.8, delay: 0.4, type: "spring" }}
      className="relative w-full max-w-md"
      style={{ transformStyle: "preserve-3d" }}
    >
      {/* Glow animé */}
      <motion.div 
        className="absolute -inset-4 bg-gradient-to-r from-[#00d4ff]/20 to-violet-500/20 rounded-3xl blur-2xl"
        animate={{
          opacity: [0.5, 0.8, 0.5],
          scale: [1, 1.05, 1],
        }}
        transition={{ duration: 4, repeat: Infinity }}
      />
      
      <div className="relative glass-cosmic rounded-2xl p-6 border border-[#00d4ff]/30 overflow-hidden">
        {/* Scanner line effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-b from-transparent via-[#00d4ff]/10 to-transparent h-1/3 pointer-events-none"
          animate={{ top: ["-100%", "200%"] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear", repeatDelay: 3 }}
        />

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <motion.div 
              className="w-2 h-2 rounded-full bg-emerald-400"
              animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className="text-xs uppercase tracking-wider text-emerald-400 font-mono">Système Opérationnel</span>
          </div>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            <Activity className="h-4 w-4 text-[#00d4ff]" />
          </motion.div>
        </div>

        {/* Stats principales */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-3 rounded-lg bg-white/5">
            <div className="text-2xl font-bold text-white font-mono">24</div>
            <div className="text-xs text-slate-400">Véhicules actifs</div>
          </div>
          <div className="p-3 rounded-lg bg-white/5">
            <div className="text-2xl font-bold text-[#00d4ff] font-mono">98.5%</div>
            <div className="text-xs text-slate-400">Conformité</div>
          </div>
        </div>

        {/* Liste véhicules */}
        <div className="space-y-2">
          {[
            { plate: "FR-452-AX", status: "En route", color: "text-emerald-400" },
            { plate: "FR-891-BZ", status: "Maintenance", color: "text-amber-400" },
          ].map((v) => (
            <div key={v.plate} className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-mono text-white">{v.plate}</span>
              </div>
              <span className={`text-xs ${v.color}`}>{v.status}</span>
            </div>
          ))}
        </div>

        {/* Alertes */}
        <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <div className="flex items-center gap-2 text-amber-400 text-xs">
            <Navigation className="h-4 w-4" />
            <span>2 alertes maintenance préventive</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Compteur animé avec respiration
function StatBadge({ value, label, suffix = "" }: { value: string; label: string; suffix?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-cosmic px-4 py-3 rounded-xl text-center relative overflow-hidden"
      whileHover={{ scale: 1.08, boxShadow: "0 0 30px rgba(0,212,255,0.3)" }}
      style={{
        boxShadow: "0 0 20px rgba(0,212,255,0.1)",
      }}
    >
      {/* Glow interne */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-[#00d4ff]/0 via-[#00d4ff]/10 to-[#00d4ff]/0"
        animate={{ x: ["-100%", "100%"] }}
        transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
      />
      <div className="relative">
        <motion.div 
          className="text-xl font-bold text-[#00d4ff] font-mono"
          animate={{ textShadow: ["0 0 10px rgba(0,212,255,0)", "0 0 20px rgba(0,212,255,0.5)", "0 0 10px rgba(0,212,255,0)"] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {value}{suffix}
        </motion.div>
        <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      </div>
    </motion.div>
  );
}

export function HeroFixed() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const y = useTransform(scrollYProgress, [0, 0.5], [0, 100]);

  return (
    <section ref={containerRef} className="relative min-h-screen flex items-center overflow-hidden">
      {/* FOND SPECTACULAIRE */}
      <HighwayBackground />

      {/* Image de fond hero */}
      <div className="absolute inset-0 pointer-events-none">
        <Image
          src="/images/landing/hero-bg.png"
          alt=""
          fill
          className="object-cover"
          style={{ opacity: 0.18 }}
          sizes="100vw"
          quality={75}
          priority
        />
      </div>
      
      <motion.div style={{ opacity, y }} className="relative w-full">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[90vh] py-32">
            
            {/* Colonne Gauche - Contenu */}
            <div className="space-y-8">
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-2 glass-cosmic px-4 py-2 rounded-full border border-[#00d4ff]/30"
              >
                <Shield className="h-4 w-4 text-[#00d4ff]" />
                <span className="text-xs uppercase tracking-wider text-[#00d4ff]">Essai 14 jours — Sans carte bancaire</span>
              </motion.div>

              {/* TITRE PRINCIPAL - STRUCTURÉ CORRECTEMENT AVEC EFFET 5DX */}
              <div className="space-y-2">
                <motion.h1
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-tight"
                  style={{
                    textShadow: "0 0 40px rgba(0,212,255,0.3)",
                  }}
                >
                  Toute votre flotte.
                </motion.h1>
                <motion.h1
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight"
                >
                  <motion.span
                    className="bg-gradient-to-r from-[#00d4ff] to-blue-500 bg-clip-text text-transparent"
                    animate={{
                      backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                    }}
                    transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                    style={{
                      backgroundSize: "200% 200%",
                    }}
                  >
                    Un seul écran.
                  </motion.span>
                </motion.h1>
              </div>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="text-lg text-slate-400 max-w-lg leading-relaxed"
              >
                Conformité, maintenance, carburant, inspections — FleetMaster gère tout
                automatiquement. Fini les CT ratés, les amendes surprises, les pannes imprévues.
              </motion.p>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="flex flex-wrap gap-4"
              >
                <StatBadge value="14 jours" label="Essai gratuit" />
                <StatBadge value="3 min" label="Pour démarrer" />
                <StatBadge value="Sans CB" label="Aucun engagement" />
              </motion.div>

              {/* CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.7 }}
                className="flex flex-col sm:flex-row gap-4"
              >
                <Link href="/register">
                  <motion.button
                    className="btn-cosmic text-base px-8 py-4"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Démarrer mon essai gratuit
                    <ArrowRight className="h-5 w-5" />
                  </motion.button>
                </Link>
                <Link href="#demo">
                  <motion.button
                    className="btn-cosmic-secondary text-base px-8 py-4"
                    whileHover={{ scale: 1.05 }}
                  >
                    <Play className="h-5 w-5" />
                    Voir la démo
                  </motion.button>
                </Link>
              </motion.div>
            </div>

            {/* Colonne Droite - Dashboard */}
            <div className="hidden lg:flex justify-center">
              <DashboardPreview />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="w-6 h-10 border-2 border-[#00d4ff]/30 rounded-full flex justify-center pt-2">
          <motion.div
            className="w-1 h-2 bg-[#00d4ff] rounded-full"
            animate={{ opacity: [1, 0], y: [0, 12] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </div>
      </motion.div>
    </section>
  );
}

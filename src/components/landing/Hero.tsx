"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  PlayCircle,
  Shield,
  QrCode,
  CheckCircle2,
  FileCheck,
  Wrench,
} from "lucide-react";

const keyFeatures = [
  { icon: QrCode, text: "Inspections QR sans app" },
  { icon: FileCheck, text: "Conformité réglementaire auto" },
  { icon: Wrench, text: "Maintenance prédictive" },
];

const criticalVehicles = [
  { plate: "HH-527-AZ", score: 39, status: "CRITIQUE" },
  { plate: "BS-484-RH", score: 68, status: "ATTENTION" },
  { plate: "TL-891-MP", score: 82, status: "OK" },
];

function DashboardMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, rotateX: 20 }}
      animate={{ opacity: 1, y: 0, rotateX: 10 }}
      transition={{ duration: 1, delay: 0.5 }}
      className="glass-cosmic p-6 perspective-cosmic relative"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-[#00d4ff] animate-pulse shadow-[0_0_10px_#00d4ff]" />
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
            Fleet-Master
          </span>
        </div>
        <div className="flex gap-1.5">
          <div className="h-2 w-2 rounded-full bg-[#00d4ff]" />
          <div className="h-2 w-2 rounded-full bg-blue-500" />
          <div className="h-2 w-2 rounded-full bg-violet-500" />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="glass-cosmic p-4 rounded-lg">
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-2">
            Score Flotte
          </p>
          <p className="text-3xl font-bold font-mono text-[#00d4ff] tabular-nums">
            74<span className="text-sm text-slate-400">/100</span>
          </p>
          <div className="h-1 bg-slate-700/50 rounded-full mt-3 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#00d4ff] to-blue-500 rounded-full"
              style={{ width: "74%" }}
            />
          </div>
        </div>
        <div className="glass-cosmic p-4 rounded-lg">
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-2">
            Véhicules
          </p>
          <p className="text-3xl font-bold font-mono text-white tabular-nums">
            24
          </p>
          <div className="flex gap-2 mt-3 text-[10px] font-mono">
            <span className="text-[#00d4ff]">8 OK</span>
            <span className="text-slate-600">|</span>
            <span className="text-yellow-400">12 ATT</span>
            <span className="text-slate-600">|</span>
            <span className="text-red-400">4 CRIT</span>
          </div>
        </div>
      </div>

      {/* Vehicle List */}
      <div className="glass-cosmic rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/10">
          <span className="text-[10px] uppercase tracking-[0.15em] text-slate-400">
            Immatriculation
          </span>
          <span className="text-[10px] uppercase tracking-[0.15em] text-slate-400">
            Score
          </span>
          <span className="text-[10px] uppercase tracking-[0.15em] text-slate-400">
            Status
          </span>
        </div>
        {criticalVehicles.map((v) => (
          <div
            key={v.plate}
            className="flex items-center justify-between px-4 py-3 border-b border-white/5 last:border-b-0 hover:bg-white/5 transition-colors"
          >
            <span className="text-sm font-mono text-slate-300">{v.plate}</span>
            <div className="flex items-center gap-3">
              <div className="h-1.5 w-16 bg-slate-700/50 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    v.score < 50 
                      ? "bg-red-500" 
                      : v.score < 75 
                      ? "bg-yellow-400" 
                      : "bg-[#00d4ff]"
                  }`}
                  style={{ width: `${v.score}%` }}
                />
              </div>
              <span className="text-xs font-mono text-slate-400 w-6">{v.score}</span>
            </div>
            <span
              className={`text-[10px] uppercase tracking-wider font-medium px-2 py-1 rounded-full ${
                v.status === "CRITIQUE"
                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                  : v.status === "ATTENTION"
                  ? "bg-yellow-400/20 text-yellow-400 border border-yellow-400/30"
                  : "bg-[#00d4ff]/20 text-[#00d4ff] border border-[#00d4ff]/30"
              }`}
            >
              {v.status}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      {/* Aurora effect */}
      <div className="absolute inset-0 aurora-bg pointer-events-none" />
      
      <div className="relative mx-auto max-w-7xl px-6 lg:px-8 w-full">
        <div className="grid lg:grid-cols-2 gap-16 items-center min-h-[80vh]">
          
          {/* Left Column — Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="py-12"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="inline-flex items-center gap-3 glass-cosmic px-4 py-2 rounded-full mb-8"
            >
              <Shield className="h-4 w-4 text-[#00d4ff]" />
              <span className="text-xs font-medium uppercase tracking-[0.15em] text-slate-300">
                Essai 14 jours • Sans CB • France
              </span>
            </motion.div>

            {/* H1 — Cosmic Style */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1] mb-6"
            >
              <span className="text-cosmic-display">
                Le Contrôleur
                <br />
                DREAL Débarque
              </span>
              <br />
              <span className="text-cosmic-gradient">Demain.</span>
            </motion.h1>

            {/* Gradient Line */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="line-cosmic w-40 mb-8 origin-left"
            />

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-lg text-slate-400 max-w-lg mb-8 leading-relaxed"
            >
              Fleet-Master centralise vos documents, inspections et maintenances.
              <span className="text-white font-semibold">
                {" "}En 10 secondes, vous savez si chaque véhicule est conforme.
              </span>
            </motion.p>

            {/* Feature Badges */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex flex-wrap gap-3 mb-10"
            >
              {keyFeatures.map((feature) => (
                <div
                  key={feature.text}
                  className="flex items-center gap-2 glass-cosmic px-3 py-1.5 rounded-full"
                >
                  <feature.icon className="h-3.5 w-3.5 text-[#00d4ff]" />
                  <span className="text-[11px] uppercase tracking-wider text-slate-300">
                    {feature.text}
                  </span>
                </div>
              ))}
            </motion.div>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 mb-8"
            >
              <Link href="/register">
                <button className="btn-cosmic">
                  Démarrer Gratuitement
                  <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
              <Link href="#how-it-works">
                <button className="btn-cosmic-secondary">
                  <PlayCircle className="h-4 w-4" />
                  Voir la Démo
                </button>
              </Link>
            </motion.div>

            {/* Trust Items */}
            <motion.ul
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="flex flex-wrap gap-x-6 gap-y-2"
            >
              {["Essai 14 jours gratuit", "Sans carte bancaire", "Données hébergées en France"].map(
                (point) => (
                  <li key={point} className="flex items-center gap-2 text-xs text-slate-500">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#00d4ff]" />
                    <span className="uppercase tracking-wider">{point}</span>
                  </li>
                )
              )}
            </motion.ul>
          </motion.div>

          {/* Right Column — Dashboard */}
          <div className="py-12 hidden lg:block relative">
            {/* Glow behind */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-br from-[#00d4ff]/20 via-blue-500/10 to-violet-500/20 rounded-full blur-[100px] pointer-events-none" />
            
            <DashboardMockup />
            
            {/* Floating alert */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.5 }}
              className="absolute -bottom-4 -left-4 glass-cosmic px-4 py-3 rounded-lg float-cosmic"
            >
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                <div>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500">
                    Alerte Maintenance
                  </p>
                  <p className="text-sm font-mono text-slate-200">HH-527-AZ • Freins</p>
                </div>
              </div>
            </motion.div>

            {/* Floating QR scan */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 1.4, duration: 0.5 }}
              className="absolute -top-4 -right-4 glass-cosmic px-4 py-3 rounded-lg float-cosmic-delayed"
            >
              <div className="flex items-center gap-3">
                <QrCode className="h-4 w-4 text-[#00d4ff]" />
                <div>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500">
                    Inspection scannée
                  </p>
                  <p className="text-sm font-mono text-[#00d4ff]">BS-484-RH • Validée</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

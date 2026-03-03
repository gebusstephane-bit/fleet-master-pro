"use client";

import { motion, type Variants } from "framer-motion";
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
import { Button } from "@/components/ui/button";
import { FloatingParticlesSimple } from "@/components/effects/FloatingParticles";
import { ShimmerButton } from "@/components/effects/ShimmerButton";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.2 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

/** Badges features clés */
const keyFeatures = [
  { icon: QrCode, text: "Inspections QR sans app" },
  { icon: FileCheck, text: "Conformité réglementaire auto" },
  { icon: Wrench, text: "Maintenance prédictive" },
];

/** Véhicules critiques pour le mockup */
const criticalVehicles = [
  { plate: "HH-527-AZ", score: 39, barClass: "bg-red-400" },
  { plate: "BS-484-RH", score: 68, barClass: "bg-yellow-400" },
  { plate: "TL-891-MP", score: 82, barClass: "bg-green-400" },
];

/** Alertes maintenance pour le mockup */
const maintenanceAlerts = [
  {
    name: "Freins — HH-527-AZ",
    status: "CRITIQUE",
    colorClass: "text-red-400",
    bgClass: "bg-red-400/10",
  },
  {
    name: "Vidange — TL-891-MP",
    status: "À PRÉVOIR",
    colorClass: "text-yellow-400",
    bgClass: "bg-yellow-400/10",
  },
];

function DashboardMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-xl border border-white/10 bg-[#0f172a] p-4 shadow-2xl"
    >
      {/* Header mockup */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-white/60">FleetMaster Pro</span>
        </div>
        <div className="flex gap-1">
          <div className="h-2 w-2 rounded-full bg-red-400" />
          <div className="h-2 w-2 rounded-full bg-yellow-400" />
          <div className="h-2 w-2 rounded-full bg-green-400" />
        </div>
      </div>

      {/* Score de fiabilité + véhicules critiques */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="col-span-1 rounded-lg bg-white/5 p-3">
          <p className="text-xs text-white/40 mb-1">Score flotte</p>
          <p className="text-2xl font-bold text-cyan-400">
            74<span className="text-sm">/100</span>
          </p>
          <div className="flex items-center gap-1 mt-1">
            <div className="h-1 flex-1 rounded bg-white/10">
              <div className="h-1 rounded bg-cyan-400" style={{ width: "74%" }} />
            </div>
          </div>
        </div>
        <div className="col-span-2 rounded-lg bg-white/5 p-3">
          <p className="text-xs text-white/40 mb-2">Véhicules critiques</p>
          {criticalVehicles.map((v) => (
            <div key={v.plate} className="flex items-center gap-2 mb-1">
              <div className={`h-1.5 w-1.5 rounded-full ${v.barClass}`} />
              <span className="text-xs text-white/60 w-20">{v.plate}</span>
              <div className="h-1 flex-1 rounded bg-white/10">
                <div
                  className={`h-1 rounded ${v.barClass}`}
                  style={{ width: `${v.score}%` }}
                />
              </div>
              <span className="text-xs text-white/40">{v.score}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Alertes maintenance */}
      <div className="rounded-lg bg-white/5 p-3 mb-2">
        <p className="text-xs text-white/40 mb-2">Maintenances à planifier</p>
        {maintenanceAlerts.map((item) => (
          <div
            key={item.name}
            className={`flex items-center justify-between rounded px-2 py-1 mb-1 ${item.bgClass}`}
          >
            <span className="text-xs text-white/70">{item.name}</span>
            <span className={`text-xs font-medium ${item.colorClass}`}>
              {item.status}
            </span>
          </div>
        ))}
      </div>

      {/* Conformité bar */}
      <div className="rounded-lg bg-white/5 p-3">
        <div className="flex justify-between mb-1">
          <p className="text-xs text-white/40">Conformité flotte</p>
          <p className="text-xs text-green-400">8/9 véhicules ✓</p>
        </div>
        <div className="h-1.5 rounded bg-white/10">
          <div
            className="h-1.5 rounded bg-gradient-to-r from-cyan-400 to-green-400"
            style={{ width: "89%" }}
          />
        </div>
      </div>
    </motion.div>
  );
}

export function Hero() {
  return (
    <section className="relative min-h-screen overflow-hidden bg-[#0a0f1a]">
      {/* ── Grille de fond ── */}
      <div
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage: `
            linear-gradient(rgba(6, 182, 212, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(6, 182, 212, 0.04) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />

      <FloatingParticlesSimple count={18} />

      {/* ── Orbes de lumière ambiante ── */}
      <div className="absolute left-[15%] top-[20%] pointer-events-none">
        <div className="h-[700px] w-[700px] rounded-full bg-cyan-500/[0.07] blur-[140px]" />
      </div>
      <div className="absolute right-[10%] top-[30%] pointer-events-none">
        <div className="h-[500px] w-[500px] rounded-full bg-blue-500/[0.09] blur-[120px]" />
      </div>
      <div className="absolute right-[30%] bottom-[10%] pointer-events-none">
        <div className="h-[400px] w-[400px] rounded-full bg-orange-500/[0.06] blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-32 pb-24">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-12 items-center">

          {/* ══════════════════════════════════════
              Colonne gauche — Contenu principal
          ══════════════════════════════════════ */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="text-center lg:text-left"
          >
            {/* Badge réassurance */}
            <motion.div
              variants={itemVariants}
              className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 px-4 py-2 mb-6"
            >
              <Shield className="h-4 w-4 text-cyan-400" />
              <span className="text-sm font-medium text-cyan-400">
                ✓ Essai 14 jours gratuit · ✓ Sans carte bancaire · ✓ Données hébergées en France
              </span>
            </motion.div>

            {/* ── H1 ── */}
            <motion.h1
              variants={itemVariants}
              className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.05]"
            >
              Le contrôleur DREAL{" "}
              <br className="hidden lg:block" />
              débarque demain.{" "}
              <span
                className="block mt-2 bg-gradient-to-r from-cyan-400 via-blue-400 to-orange-400 bg-clip-text text-transparent"
                style={{ WebkitBackgroundClip: "text" }}
              >
                Êtes-vous prêt ?
              </span>
            </motion.h1>

            {/* ── Sous-titre ── */}
            <motion.p
              variants={itemVariants}
              className="mt-6 text-lg sm:text-xl text-slate-400 max-w-xl mx-auto lg:mx-0 leading-relaxed"
            >
              FleetMaster Pro centralise tous vos documents, inspections et maintenances.{" "}
              <span className="text-white font-semibold">
                En 10 secondes, vous savez si chaque véhicule est conforme ou pas.
              </span>
            </motion.p>

            {/* ── Badges features clés ── */}
            <motion.div
              variants={itemVariants}
              className="mt-6 flex flex-wrap gap-3 justify-center lg:justify-start"
            >
              {keyFeatures.map((feature) => (
                <div
                  key={feature.text}
                  className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-3 py-1.5"
                >
                  <feature.icon className="h-4 w-4 text-cyan-400" />
                  <span className="text-sm text-slate-300">{feature.text}</span>
                </div>
              ))}
            </motion.div>

            {/* ── CTA ── */}
            <motion.div
              variants={itemVariants}
              className="mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
            >
              <Link href="/register">
                <ShimmerButton
                  size="lg"
                  className="w-full sm:w-auto text-base px-8 py-4"
                >
                  Démarrer gratuitement
                  <ArrowRight className="w-5 h-5 ml-2" />
                </ShimmerButton>
              </Link>
              <Link href="#how-it-works">
                <Button
                  variant="ghost"
                  size="lg"
                  className="w-full sm:w-auto text-slate-400 hover:text-white hover:bg-white/5 px-8 py-4 text-base font-medium rounded-xl border border-white/10 gap-2"
                >
                  <PlayCircle className="h-4 w-4 text-cyan-400" />
                  Voir la démo
                </Button>
              </Link>
            </motion.div>

            {/* ── Micro-copy de confiance ── */}
            <motion.ul
              variants={itemVariants}
              className="mt-6 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start"
            >
              {["Essai 14 jours gratuit", "Sans carte bancaire", "Données hébergées en France"].map(
                (point) => (
                  <li
                    key={point}
                    className="flex items-center gap-1.5 text-sm text-slate-500"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                    {point}
                  </li>
                )
              )}
            </motion.ul>
          </motion.div>

          {/* ══════════════════════════════════════
              Colonne droite — Dashboard CSS Mockup
          ══════════════════════════════════════ */}
          <div className="relative hidden lg:block">
            {/* Halo derrière la carte */}
            <div
              className="absolute inset-0 rounded-3xl blur-[60px]"
              style={{
                background:
                  "radial-gradient(ellipse, rgba(6,182,212,0.12) 0%, rgba(59,130,246,0.08) 50%, transparent 80%)",
              }}
            />

            <div className="relative">
              <DashboardMockup />

              {/* Badge flottant — Alerte maintenance */}
              <motion.div
                initial={{ opacity: 0, scale: 0.7, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 1.0, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="absolute -bottom-5 -left-6 bg-[#0f172a] rounded-2xl shadow-2xl border border-amber-500/30 p-4 backdrop-blur-xl"
                style={{
                  boxShadow:
                    "0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(245,158,11,0.15)",
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center flex-shrink-0">
                    <Wrench className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">
                      Maintenance prédictive
                    </p>
                    <p className="text-[10px] text-amber-400">
                      HH-527-AZ · Freins à vérifier
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Badge flottant — Inspection QR */}
              <motion.div
                initial={{ opacity: 0, scale: 0.7, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 1.2, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="absolute -top-4 -right-4 bg-[#0f172a] rounded-2xl shadow-2xl border border-cyan-500/30 p-3 backdrop-blur-xl"
                style={{
                  boxShadow:
                    "0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(6,182,212,0.12)",
                }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                    <QrCode className="h-3.5 w-3.5 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500">Inspection scannée</p>
                    <p className="text-sm font-bold text-cyan-400">
                      BS-484-RH · Validée
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

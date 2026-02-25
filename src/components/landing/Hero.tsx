"use client";

import { motion, type Variants } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  PlayCircle,
  Shield,
  Zap,
  TrendingDown,
  Truck,
  CheckCircle2,
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

/** KPIs affichés dans le mini-dashboard à droite */
const dashboardStats = [
  { icon: Shield, value: "99.9%", label: "Uptime garanti" },
  { icon: TrendingDown, value: "-30%", label: "Coûts réduits" },
  { icon: Zap, value: "14j", label: "Prédiction pannes" },
];

/** Micro-copy de confiance sous les CTA */
const trustPoints = [
  "Aucune carte bancaire requise",
  "14 jours d'essai gratuit",
  "Annulation à tout moment",
];

export function Hero() {
  return (
    <section className="relative min-h-screen overflow-hidden bg-[#0a0f1a]">
      {/* ── Fond image avec overlay ── */}
      <div className="absolute inset-0">
        <Image
          src="/images/hero-fleet.jpg"
          alt="Flotte de camions FleetMaster Pro"
          fill
          priority
          className="object-cover object-center opacity-40"
          sizes="100vw"
        />
        <div
          className="absolute inset-0"
          style={{
            background: `
              linear-gradient(to bottom, rgba(10,15,26,0.72) 0%, rgba(10,15,26,0.35) 40%, rgba(10,15,26,0.90) 100%),
              radial-gradient(at 0% 0%, rgba(6,182,212,0.18) 0px, transparent 50%),
              radial-gradient(at 100% 0%, rgba(59,130,246,0.18) 0px, transparent 50%)
            `,
          }}
        />
      </div>

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
            {/* Badge live */}
            <motion.div
              variants={itemVariants}
              className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 px-4 py-2 mb-8"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
              </span>
              <span className="text-sm font-medium text-cyan-400">
                La solution n°1 des transporteurs · 500+ flottes actives
              </span>
            </motion.div>

            {/* ── H1 ── */}
            <motion.h1
              variants={itemVariants}
              className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.05]"
            >
              Votre flotte.{" "}
              <br className="hidden lg:block" />
              Votre contrôle.{" "}
              <span
                className="block mt-2 bg-gradient-to-r from-cyan-400 via-blue-400 to-orange-400 bg-clip-text text-transparent"
                style={{ WebkitBackgroundClip: "text" }}
              >
                Zéro panne imprévue.
              </span>
            </motion.h1>

            {/* ── Sous-titre ── */}
            <motion.p
              variants={itemVariants}
              className="mt-6 text-lg sm:text-xl text-slate-400 max-w-xl mx-auto lg:mx-0 leading-relaxed"
            >
              FleetMaster Pro transforme la gestion de parc en avantage
              compétitif. Anticipez les pannes, optimisez les tournées,
              maîtrisez vos coûts —{" "}
              <span className="text-white font-semibold">
                tout en temps réel, sur une seule plateforme.
              </span>
            </motion.p>

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
              <Link href="/contact">
                <Button
                  variant="ghost"
                  size="lg"
                  className="w-full sm:w-auto text-slate-400 hover:text-white hover:bg-white/5 px-8 py-4 text-base font-medium rounded-xl border border-white/10 gap-2"
                >
                  <PlayCircle className="h-4 w-4 text-cyan-400" />
                  Demander une démo
                </Button>
              </Link>
            </motion.div>

            {/* ── Micro-copy de confiance ── */}
            <motion.ul
              variants={itemVariants}
              className="mt-6 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start"
            >
              {trustPoints.map((point) => (
                <li
                  key={point}
                  className="flex items-center gap-1.5 text-sm text-slate-500"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                  {point}
                </li>
              ))}
            </motion.ul>

            {/* ── Logos sociaux ── */}
            <motion.div
              variants={itemVariants}
              className="mt-12 pt-8 border-t border-white/[0.08]"
            >
              <p className="text-xs text-slate-600 uppercase tracking-widest mb-4 font-medium">
                Ils nous font confiance
              </p>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2">
                {[
                  "Transports Martin",
                  "LogiPro",
                  "Express Delivery",
                  "EcoFleet",
                  "FastTrack",
                ].map((company) => (
                  <span
                    key={company}
                    className="text-sm font-bold text-slate-500 hover:text-slate-400 transition-colors tracking-tight"
                  >
                    {company}
                  </span>
                ))}
              </div>
            </motion.div>
          </motion.div>

          {/* ══════════════════════════════════════
              Colonne droite — Aperçu dashboard
          ══════════════════════════════════════ */}
          <motion.div
            initial={{ opacity: 0, x: 50, y: 10 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ duration: 0.9, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="relative hidden lg:block"
          >
            {/* Halo derrière la carte */}
            <div
              className="absolute inset-0 rounded-3xl blur-[60px]"
              style={{
                background:
                  "radial-gradient(ellipse, rgba(6,182,212,0.12) 0%, rgba(59,130,246,0.08) 50%, transparent 80%)",
              }}
            />

            {/* ── Fenêtre navigateur (dashboard) ── */}
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-cyan-500/20 bg-[#0f172a]/90 backdrop-blur-xl">
              {/* Barre de navigation */}
              <div className="flex items-center gap-2 px-4 py-3 bg-[#080d18] border-b border-cyan-500/10">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/70" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/70" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/70" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-[#1e293b] rounded-md px-3 py-1 text-center">
                    <span className="text-xs text-slate-500">
                      app.fleetmaster.pro/dashboard
                    </span>
                  </div>
                </div>
              </div>

              {/* Contenu dashboard */}
              <div className="p-5 bg-[#0a0f1a]/60">
                {/* KPIs */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {dashboardStats.map((stat, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 + i * 0.1 }}
                      className="bg-[#0f172a] p-3 rounded-xl border border-cyan-500/10"
                    >
                      <stat.icon className="h-4 w-4 text-cyan-400 mb-2" />
                      <p className="text-xl font-bold text-white">
                        {stat.value}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {stat.label}
                      </p>
                    </motion.div>
                  ))}
                </div>

                {/* Graphique + liste */}
                <div className="grid grid-cols-5 gap-3 mb-4">
                  <div className="col-span-3 bg-[#0f172a] p-3 rounded-xl border border-cyan-500/10">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-medium text-slate-400">
                        Performance flotte
                      </span>
                      <span className="text-xs text-emerald-400 font-semibold bg-emerald-400/10 px-1.5 py-0.5 rounded-full">
                        +12.5%
                      </span>
                    </div>
                    <div className="flex items-end gap-1 h-16">
                      {[35, 58, 42, 75, 50, 88, 65, 80, 55, 70, 45, 92].map(
                        (h, i) => (
                          <motion.div
                            key={i}
                            initial={{ scaleY: 0 }}
                            animate={{ scaleY: 1 }}
                            transition={{ delay: 0.8 + i * 0.04, duration: 0.4 }}
                            className="flex-1 rounded-t origin-bottom"
                            style={{
                              height: `${h}%`,
                              background: `linear-gradient(to top, #0891b2, #06b6d4)`,
                              opacity: 0.7 + i / 24,
                            }}
                          />
                        )
                      )}
                    </div>
                  </div>

                  <div className="col-span-2 bg-[#0f172a] p-3 rounded-xl border border-cyan-500/10">
                    <span className="text-xs font-medium text-slate-400 block mb-2">
                      Véhicules
                    </span>
                    <div className="space-y-2">
                      {[
                        { id: "TRK-01", status: "ok", label: "En route" },
                        { id: "TRK-02", status: "warn", label: "Alerte IA" },
                        { id: "TRK-03", status: "ok", label: "En route" },
                        { id: "TRK-04", status: "ok", label: "Au dépôt" },
                      ].map((v) => (
                        <div key={v.id} className="flex items-center gap-2">
                          <span
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{
                              backgroundColor:
                                v.status === "ok" ? "#10b981" : "#f59e0b",
                              boxShadow: `0 0 4px ${v.status === "ok" ? "#10b981" : "#f59e0b"}`,
                            }}
                          />
                          <span className="text-[10px] text-slate-400 flex-1">
                            {v.id}
                          </span>
                          <span
                            className={`text-[10px] font-medium ${
                              v.status === "ok"
                                ? "text-emerald-400"
                                : "text-amber-400"
                            }`}
                          >
                            {v.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Carte temps réel */}
                <div className="bg-[#0f172a] rounded-xl border border-cyan-500/10 overflow-hidden">
                  <div className="px-3 py-2 border-b border-cyan-500/10 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400">
                      Carte en temps réel
                    </span>
                    <span className="text-[10px] text-cyan-400">
                      12 véhicules actifs
                    </span>
                  </div>
                  <div
                    className="h-24 relative"
                    style={{
                      background:
                        "linear-gradient(135deg, #0a1628 0%, #0f2042 50%, #0a1628 100%)",
                    }}
                  >
                    <div
                      className="absolute inset-0 opacity-20"
                      style={{
                        backgroundImage: `
                          linear-gradient(rgba(6,182,212,0.3) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(6,182,212,0.3) 1px, transparent 1px)
                        `,
                        backgroundSize: "20px 20px",
                      }}
                    />
                    <svg
                      className="absolute inset-0 w-full h-full"
                      viewBox="0 0 300 96"
                    >
                      <path
                        d="M20,70 Q80,20 140,45 T260,30"
                        stroke="rgba(6,182,212,0.5)"
                        strokeWidth="1.5"
                        fill="none"
                        strokeDasharray="4,3"
                      />
                      <path
                        d="M10,50 Q70,80 130,60 T280,70"
                        stroke="rgba(59,130,246,0.4)"
                        strokeWidth="1"
                        fill="none"
                        strokeDasharray="3,4"
                      />
                      {[
                        { cx: 85, cy: 28, color: "#06b6d4" },
                        { cx: 155, cy: 43, color: "#3b82f6" },
                        { cx: 215, cy: 35, color: "#06b6d4" },
                        { cx: 60, cy: 62, color: "#10b981" },
                        { cx: 250, cy: 68, color: "#10b981" },
                      ].map((dot, i) => (
                        <g key={i}>
                          <circle cx={dot.cx} cy={dot.cy} r="4" fill={dot.color} opacity="0.9" />
                          <circle cx={dot.cx} cy={dot.cy} r="8" fill={dot.color} opacity="0.15" />
                        </g>
                      ))}
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Badge flottant — Alerte IA */}
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
                  <Truck className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">
                    Alerte préventive IA
                  </p>
                  <p className="text-[10px] text-amber-400">
                    TRK-07 · Vidange dans 430 km
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Badge flottant — Économies */}
            <motion.div
              initial={{ opacity: 0, scale: 0.7, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="absolute -top-4 -right-4 bg-[#0f172a] rounded-2xl shadow-2xl border border-emerald-500/30 p-3 backdrop-blur-xl"
              style={{
                boxShadow:
                  "0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(16,185,129,0.12)",
              }}
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <TrendingDown className="h-3.5 w-3.5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">Ce mois-ci</p>
                  <p className="text-sm font-bold text-emerald-400">
                    -2 340 € économisés
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

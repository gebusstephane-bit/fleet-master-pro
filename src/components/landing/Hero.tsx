"use client";

import { motion, type Variants } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Play, Shield, Zap, TrendingDown, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FloatingParticlesSimple } from "@/components/effects/FloatingParticles";
import { ShimmerButton } from "@/components/effects/ShimmerButton";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const stats = [
  { icon: Shield, value: "99.9%", label: "Uptime garanti" },
  { icon: TrendingDown, value: "30%", label: "Économies moyennes" },
  { icon: Zap, value: "14j", label: "Prédiction pannes" },
];

export function Hero() {
  return (
    <section className="relative min-h-screen overflow-hidden bg-[#0a0f1a]">
      {/* Animated mesh gradient background */}
      <div className="absolute inset-0">
        <div 
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(at 0% 0%, rgba(6,182,212,0.15) 0px, transparent 50%),
              radial-gradient(at 100% 0%, rgba(59,130,246,0.15) 0px, transparent 50%),
              radial-gradient(at 100% 100%, rgba(249,115,22,0.1) 0px, transparent 50%),
              radial-gradient(at 0% 100%, rgba(6,182,212,0.1) 0px, transparent 50%)
            `,
          }}
        />
        {/* Radial glow from top */}
        <div 
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at 50% 0%, rgba(6,182,212,0.1) 0%, transparent 60%)`,
          }}
        />
      </div>

      {/* Grid pattern */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(rgba(6, 182, 212, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(6, 182, 212, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Floating particles */}
      <FloatingParticlesSimple count={20} />

      {/* Gradient orbs */}
      <div className="absolute left-1/4 top-1/4 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className="h-[600px] w-[600px] rounded-full bg-cyan-500/[0.08] blur-[120px] animate-pulse" />
      </div>
      <div className="absolute right-1/4 top-1/3 translate-x-1/2 pointer-events-none">
        <div className="h-[500px] w-[500px] rounded-full bg-blue-500/[0.08] blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-32 pb-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Left content */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="text-center lg:text-left"
          >
            {/* Badge with animated dot */}
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 px-4 py-2 mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
              </span>
              <span className="text-sm font-medium text-cyan-400">
                Déjà 500+ transporteurs français
              </span>
            </motion.div>

            {/* Headline with gradient text */}
            <motion.h1
              variants={itemVariants}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white"
            >
              La première plateforme de gestion de flotte qui{" "}
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-orange-400 bg-clip-text text-transparent">
                anticipe les pannes
              </span>{" "}
              avant qu&apos;elles n&apos;arrivent
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              variants={itemVariants}
              className="mt-6 text-lg text-slate-400 max-w-2xl mx-auto lg:mx-0"
            >
              Réduisez vos coûts de 30% et dormez tranquille. Notre IA analyse les 
              données moteur et détecte les anomalies 14 jours avant la panne.
            </motion.p>

            {/* CTAs */}
            <motion.div
              variants={itemVariants}
              className="mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
            >
              <Link href="/register">
                <ShimmerButton size="lg" className="w-full sm:w-auto">
                  Démarrer gratuitement
                  <ArrowRight className="w-5 h-5" />
                </ShimmerButton>
              </Link>
              <Link href="#features">
                <Button
                  variant="ghost"
                  size="lg"
                  className="text-slate-400 hover:text-white hover:bg-white/5 px-8 py-6 text-base font-medium rounded-xl border border-white/10"
                >
                  <Play className="mr-2 h-5 w-5 text-cyan-400" />
                  Voir la démo
                </Button>
              </Link>
            </motion.div>

            {/* Trust badges */}
            <motion.div variants={itemVariants} className="mt-12 pt-8 border-t border-white/[0.08]">
              <p className="text-sm text-slate-500 mb-4">Ils nous font confiance</p>
              <div className="flex items-center justify-center lg:justify-start gap-8 opacity-50">
                {["Transports Martin", "LogiPro", "Express Delivery", "EcoFleet", "FastTrack", "CargoPlus"].map((company) => (
                  <span key={company} className="text-sm font-semibold text-slate-400">
                    {company}
                  </span>
                ))}
              </div>
            </motion.div>
          </motion.div>

          {/* Right visual - Dashboard preview */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-cyan-500/20 bg-[#0f172a]/80 backdrop-blur-xl">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-4 py-3 bg-[#0a0f1a] border-b border-cyan-500/10">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/60" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
                </div>
                <div className="flex-1 text-center">
                  <span className="text-xs text-slate-500">app.fleetmaster.pro</span>
                </div>
              </div>

              {/* Dashboard mockup */}
              <div className="p-6 bg-[#0a0f1a]/50">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {stats.map((stat, i) => (
                    <div 
                      key={i} 
                      className="bg-[#0f172a] p-4 rounded-xl border border-cyan-500/10 hover:border-cyan-500/30 transition-colors"
                    >
                      <stat.icon className="h-5 w-5 text-cyan-400 mb-2" />
                      <p className="text-2xl font-bold text-white">{stat.value}</p>
                      <p className="text-xs text-slate-500">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* Chart mockup */}
                <div className="bg-[#0f172a] p-4 rounded-xl border border-cyan-500/10">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-slate-400">Performance flotte</span>
                    <span className="text-xs text-emerald-400 font-medium">+12.5%</span>
                  </div>
                  <div className="flex items-end gap-2 h-24">
                    {[40, 65, 45, 80, 55, 90, 70, 85, 60, 75, 50, 95].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-t opacity-80"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Floating badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 }}
                className="absolute -bottom-4 -left-4 bg-[#0f172a] rounded-xl shadow-xl border border-cyan-500/20 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                    <Truck className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Alerte préventive</p>
                    <p className="text-xs text-slate-500">Vidange dans 500km</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

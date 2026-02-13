"use client";

"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Shield, Zap, TrendingDown } from "lucide-react";
import Image from "next/image";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
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
    <section className="relative min-h-screen overflow-hidden bg-gradient-to-b from-gray-50 via-white to-white">
      {/* Background subtle grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]" />
      
      {/* Gradient orbs */}
      <div className="absolute left-1/4 top-1/4 -translate-x-1/2 -translate-y-1/2">
        <div className="h-[500px] w-[500px] rounded-full bg-blue-500/5 blur-3xl" />
      </div>
      <div className="absolute right-1/4 bottom-1/4 translate-x-1/2 translate-y-1/2">
        <div className="h-[400px] w-[400px] rounded-full bg-indigo-500/5 blur-3xl" />
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
            {/* Badge */}
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600" />
              </span>
              <span className="text-sm font-medium text-blue-700">
                Déjà 200+ transporteurs français
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={itemVariants}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900"
            >
              Maîtrisez votre flotte avec{" "}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                l&apos;intelligence du futur
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              variants={itemVariants}
              className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto lg:mx-0"
            >
              La première plateforme de gestion de flotte qui anticipe les pannes 
              avant qu&apos;elles n&apos;arrivent. Réduisez vos coûts de 30% et dormez tranquille.
            </motion.p>

            {/* CTAs */}
            <motion.div
              variants={itemVariants}
              className="mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
            >
              <Link href="/register">
                <Button
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-base font-semibold rounded-xl shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 transition-all hover:-translate-y-0.5"
                >
                  Démarrer gratuitement
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="#features">
                <Button
                  variant="ghost"
                  size="lg"
                  className="text-gray-700 hover:text-gray-900 px-8 py-6 text-base font-medium"
                >
                  <Play className="mr-2 h-5 w-5" />
                  Voir la démo
                </Button>
              </Link>
            </motion.div>

            {/* Trust badges */}
            <motion.div variants={itemVariants} className="mt-12 pt-8 border-t border-gray-200">
              <p className="text-sm text-gray-500 mb-4">Ils nous font confiance</p>
              <div className="flex items-center justify-center lg:justify-start gap-8 opacity-50 grayscale">
                {["Transports Martin", "LogiPro", "Express Delivery", "EcoFleet"].map((company) => (
                  <span key={company} className="text-sm font-semibold text-gray-700">
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
            <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-gray-900/10 border border-gray-200/50 bg-white">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 text-center">
                  <span className="text-xs text-gray-400">app.fleetmaster.pro</span>
                </div>
              </div>
              
              {/* Dashboard mockup */}
              <div className="p-6 bg-gray-50/50">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {stats.map((stat, i) => (
                    <div key={i} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                      <stat.icon className="h-5 w-5 text-blue-600 mb-2" />
                      <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                      <p className="text-xs text-gray-500">{stat.label}</p>
                    </div>
                  ))}
                </div>
                
                {/* Chart mockup */}
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-gray-700">Performance flotte</span>
                    <span className="text-xs text-green-600 font-medium">+12.5%</span>
                  </div>
                  <div className="flex items-end gap-2 h-24">
                    {[40, 65, 45, 80, 55, 90, 70, 85, 60, 75, 50, 95].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t"
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
                className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-xl border border-gray-100 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <Zap className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Alerte préventive</p>
                    <p className="text-xs text-gray-500">Vidange dans 500km</p>
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

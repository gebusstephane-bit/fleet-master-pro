"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { AlertTriangle, Wrench, QrCode, Fuel } from "lucide-react";

const painPoints = [
  {
    icon: AlertTriangle,
    iconColor: "text-red-400",
    iconBg: "bg-red-400/10 border-red-400/20",
    keyword: "Conformité",
    keywordColor: "text-red-400",
    situation:
      "Le contrôleur DREAL débarque demain matin à l'improviste.",
    resolution:
      "En 10 secondes, FleetMaster vous dit si chaque camion passe ou pas.",
    resolutionColor: "text-cyan-400",
    border: "border-red-500/15",
  },
  {
    icon: Wrench,
    iconColor: "text-orange-400",
    iconBg: "bg-orange-400/10 border-orange-400/20",
    keyword: "Maintenance",
    keywordColor: "text-orange-400",
    situation:
      "La panne sur autoroute ne prévient pas. Et ça tombe toujours au pire moment.",
    resolution:
      "FleetMaster vous prévient 30 jours avant, selon le kilométrage réel de chaque véhicule.",
    resolutionColor: "text-orange-400",
    border: "border-orange-500/15",
  },
  {
    icon: QrCode,
    iconColor: "text-cyan-400",
    iconBg: "bg-cyan-400/10 border-cyan-400/20",
    keyword: "Inspection",
    keywordColor: "text-cyan-400",
    situation:
      "7h du matin. Votre chauffeur est parti sans faire l'inspection. Encore.",
    resolution:
      "Il scanne le QR code collé sur le camion. En 2 minutes : inspection faite, carburant saisi, carnet signé. Sans app, sans login.",
    resolutionColor: "text-cyan-400",
    border: "border-cyan-500/15",
  },
  {
    icon: Fuel,
    iconColor: "text-yellow-400",
    iconBg: "bg-yellow-400/10 border-yellow-400/20",
    keyword: "Carburant",
    keywordColor: "text-yellow-400",
    situation:
      "Le camion 7 consomme 35% de plus que les autres depuis 3 semaines.",
    resolution:
      "FleetMaster détecte l'anomalie en temps réel et vous alerte immédiatement.",
    resolutionColor: "text-yellow-400",
    border: "border-yellow-500/15",
  },
];

export function PainPoints() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="py-24 bg-[#080d18] relative overflow-hidden">
      {/* Fond subtil */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, rgba(6,182,212,0.03) 0%, transparent 60%)`,
        }}
      />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* ── En-tête ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
            Vous reconnaissez l'une de{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              ces situations ?
            </span>
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            FleetMaster Pro a été conçu pour ça.
          </p>
        </motion.div>

        {/* ── Grille 2×2 ── */}
        <div className="grid sm:grid-cols-2 gap-5">
          {painPoints.map((point, index) => (
            <motion.div
              key={point.keyword}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.55,
                delay: index * 0.1,
                ease: [0.22, 1, 0.36, 1],
              }}
              className={`rounded-2xl border ${point.border} bg-white/[0.03] p-6 flex flex-col gap-4`}
            >
              {/* Icône + keyword */}
              <div className="flex items-center gap-3">
                <div
                  className={`inline-flex items-center justify-center w-10 h-10 rounded-xl border ${point.iconBg}`}
                >
                  <point.icon className={`h-5 w-5 ${point.iconColor}`} />
                </div>
                <span className={`text-sm font-bold uppercase tracking-wider ${point.keywordColor}`}>
                  {point.keyword}
                </span>
              </div>

              {/* Situation douleur */}
              <p className="text-slate-300 italic leading-relaxed">
                &ldquo;{point.situation}&rdquo;
              </p>

              {/* Séparateur */}
              <div className="h-px bg-white/[0.06]" />

              {/* Résolution */}
              <p className={`text-sm font-medium ${point.resolutionColor} leading-relaxed`}>
                → {point.resolution}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

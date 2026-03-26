"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { AlertTriangle, Wrench, QrCode, Fuel } from "lucide-react";

const painPoints = [
  {
    icon: AlertTriangle,
    iconColor: "text-red-400",
    gradient: "from-red-500/20 to-orange-500/10",
    keyword: "Conformité",
    keywordColor: "text-red-400",
    situation: "Le contrôleur DREAL débarque demain matin à l'improviste.",
    resolution: "En 10 secondes, FleetMaster vous dit si chaque camion passe ou pas.",
    resolutionColor: "text-[#00d4ff]",
  },
  {
    icon: Wrench,
    iconColor: "text-orange-400",
    gradient: "from-orange-500/20 to-yellow-500/10",
    keyword: "Maintenance",
    keywordColor: "text-orange-400",
    situation: "La panne sur autoroute ne prévient pas. Et ça tombe toujours au pire moment.",
    resolution: "FleetMaster vous prévient 30 jours avant, selon le kilométrage réel de chaque véhicule.",
    resolutionColor: "text-orange-400",
  },
  {
    icon: QrCode,
    iconColor: "text-[#00d4ff]",
    gradient: "from-[#00d4ff]/20 to-blue-500/10",
    keyword: "Inspection",
    keywordColor: "text-[#00d4ff]",
    situation: "7h du matin. Votre chauffeur est parti sans faire l'inspection. Encore.",
    resolution: "Il scanne le QR code collé sur le camion. En 2 minutes : inspection faite, carburant saisi, carnet signé. Sans app, sans login.",
    resolutionColor: "text-[#00d4ff]",
  },
  {
    icon: Fuel,
    iconColor: "text-yellow-400",
    gradient: "from-yellow-500/20 to-amber-500/10",
    keyword: "Carburant",
    keywordColor: "text-yellow-400",
    situation: "Le camion 7 consomme 35% de plus que les autres depuis 3 semaines.",
    resolution: "FleetMaster détecte l'anomalie en temps réel et vous alerte immédiatement.",
    resolutionColor: "text-yellow-400",
  },
];

export function PainPoints() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="py-24 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-blue-500/10 to-transparent rounded-full blur-[100px] pointer-events-none" />
      
      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6">
            <span className="text-cosmic-display">
              Vous reconnaissez l'une de
            </span>
            <br />
            <span className="text-cosmic-gradient">ces situations ?</span>
          </h2>
          <p className="text-lg text-slate-400">
            Fleet-Master a été conçu pour ça.
          </p>
        </motion.div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 gap-6">
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
              className="card-cosmic group"
            >
              {/* Gradient background on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${point.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[inherit]`} />
              
              <div className="relative">
                {/* Icon + Keyword */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                    <point.icon className={`h-5 w-5 ${point.iconColor}`} />
                  </div>
                  <span className={`text-sm font-bold uppercase tracking-[0.1em] ${point.keywordColor}`}>
                    {point.keyword}
                  </span>
                </div>

                {/* Situation */}
                <p className="text-slate-300 italic leading-relaxed mb-4">
                  "{point.situation}"
                </p>

                {/* Separator */}
                <div className="h-px bg-gradient-to-r from-white/10 to-transparent mb-4" />

                {/* Resolution */}
                <p className={`text-sm font-medium leading-relaxed ${point.resolutionColor}`}>
                  → {point.resolution}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

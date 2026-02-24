"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { MapPin, Brain, Route, FileText, CheckCircle2, ArrowRight } from "lucide-react";

const primaryFeature = {
  icon: Brain,
  title: "Maintenance prédictive par IA",
  description:
    "Le cerveau de FleetMaster. Notre modèle d'IA analyse en temps réel les données OBD, température moteur, pression des pneus et vibrations. Il prédit les défaillances 14 jours à l'avance avec 94% de précision.",
  highlights: [
    "Détection anomalies 14j avant panne",
    "Alertes intelligentes par criticité",
    "Planification maintenance automatique",
    "Historique complet par véhicule",
  ],
  variant: "cyan" as const,
  preview: (
    <div className="mt-6 rounded-xl border border-cyan-500/15 bg-[#080d18] overflow-hidden">
      <div className="px-4 py-2.5 border-b border-cyan-500/10 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400">Analyse moteur — TRK-07</span>
        <span className="text-xs text-amber-400 font-semibold bg-amber-400/10 px-2 py-0.5 rounded-full">Attention requise</span>
      </div>
      <div className="p-4 space-y-3">
        {[
          { label: "Température moteur", value: 84, max: 100, color: "from-cyan-500 to-blue-500", status: "normal" },
          { label: "Pression pneumatiques", value: 71, max: 100, color: "from-amber-500 to-orange-500", status: "warn" },
          { label: "Niveau huile", value: 45, max: 100, color: "from-orange-500 to-red-500", status: "alert" },
          { label: "Usure plaquettes", value: 90, max: 100, color: "from-emerald-500 to-teal-500", status: "normal" },
        ].map((item) => (
          <div key={item.label}>
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>{item.label}</span>
              <span className={
                item.status === "alert" ? "text-orange-400" :
                item.status === "warn" ? "text-amber-400" : "text-slate-400"
              }>
                {item.value}%
              </span>
            </div>
            <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${item.color}`}
                style={{ width: `${item.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="px-4 py-3 bg-amber-500/5 border-t border-amber-500/10">
        <p className="text-xs text-amber-400">
          ⚡ Panne probable dans 12 jours — Vidange recommandée avant 2 500 km
        </p>
      </div>
    </div>
  ),
};

const secondaryFeatures = [
  {
    icon: MapPin,
    title: "Géolocalisation temps réel",
    description:
      "Suivez chaque véhicule en direct. Alertes géofencing automatiques, historique des trajets, vitesse et arrêts.",
    highlights: ["Suivi GPS précis au mètre", "Alertes géofencing"],
    variant: "blue" as const,
  },
  {
    icon: Route,
    title: "Optimisation des tournées",
    description:
      "Algorithme d'optimisation qui réduit les kilomètres parcourus de 20% et économise du carburant chaque jour.",
    highlights: ["–20% de km parcourus", "Économies carburant auto"],
    variant: "violet" as const,
  },
  {
    icon: FileText,
    title: "Gestion documentaire",
    description:
      "Assurances, CT, permis conducteurs. Renouvellement automatique et archivage cloud sécurisé.",
    highlights: ["Renouvellement auto", "Archivage cloud illimité"],
    variant: "emerald" as const,
  },
];

const variantStyles = {
  cyan: {
    iconBg: "bg-cyan-500/10 border-cyan-500/20",
    iconColor: "text-cyan-400",
    checkColor: "text-cyan-400",
    border: "border-cyan-500/15 hover:border-cyan-500/30",
    glow: "hover:shadow-[0_0_40px_rgba(6,182,212,0.1)]",
  },
  blue: {
    iconBg: "bg-blue-500/10 border-blue-500/20",
    iconColor: "text-blue-400",
    checkColor: "text-blue-400",
    border: "border-blue-500/15 hover:border-blue-500/30",
    glow: "hover:shadow-[0_0_40px_rgba(59,130,246,0.1)]",
  },
  violet: {
    iconBg: "bg-violet-500/10 border-violet-500/20",
    iconColor: "text-violet-400",
    checkColor: "text-violet-400",
    border: "border-violet-500/15 hover:border-violet-500/30",
    glow: "hover:shadow-[0_0_40px_rgba(139,92,246,0.1)]",
  },
  emerald: {
    iconBg: "bg-emerald-500/10 border-emerald-500/20",
    iconColor: "text-emerald-400",
    checkColor: "text-emerald-400",
    border: "border-emerald-500/15 hover:border-emerald-500/30",
    glow: "hover:shadow-[0_0_40px_rgba(16,185,129,0.1)]",
  },
};

export function Features() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const pv = variantStyles[primaryFeature.variant];

  return (
    <section ref={ref} className="py-24 bg-[#0a0f1a] relative overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 100%, rgba(59,130,246,0.05) 0%, transparent 60%)`,
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block text-sm font-semibold text-cyan-400 uppercase tracking-wider mb-4">
            Fonctionnalités
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
            Tout ce qu&apos;il faut pour{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              gérer votre flotte
            </span>
          </h2>
          <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
            Une suite complète d&apos;outils pensée pour les transporteurs,
            pas pour les geeks.
          </p>
        </motion.div>

        {/* Bento grid — asymmetric layout */}
        <div className="grid lg:grid-cols-2 gap-5">
          {/* Primary feature — large left card */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className={`group rounded-2xl border ${pv.border} bg-[#0f172a]/70 backdrop-blur-sm p-8 transition-all duration-400 ${pv.glow} row-span-1 lg:row-span-2`}
          >
            {/* Icon */}
            <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl border ${pv.iconBg} mb-6 transition-transform group-hover:scale-110 duration-300`}>
              <primaryFeature.icon className={`h-7 w-7 ${pv.iconColor}`} />
            </div>

            <h3 className="text-2xl font-bold text-white mb-3">{primaryFeature.title}</h3>
            <p className="text-slate-400 leading-relaxed mb-5">{primaryFeature.description}</p>

            {/* Highlights */}
            <ul className="space-y-2 mb-2">
              {primaryFeature.highlights.map((h) => (
                <li key={h} className="flex items-center gap-2.5 text-sm text-slate-300">
                  <CheckCircle2 className={`h-4 w-4 flex-shrink-0 ${pv.checkColor}`} />
                  {h}
                </li>
              ))}
            </ul>

            {/* Mini preview */}
            {primaryFeature.preview}
          </motion.div>

          {/* Secondary features — right column */}
          <div className="flex flex-col gap-5">
            {secondaryFeatures.map((feature, index) => {
              const sv = variantStyles[feature.variant];
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, x: 30 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.55, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={{ y: -3 }}
                  className={`group rounded-2xl border ${sv.border} bg-[#0f172a]/70 backdrop-blur-sm p-6 transition-all duration-300 ${sv.glow}`}
                >
                  <div className="flex items-start gap-5">
                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl border ${sv.iconBg} flex-shrink-0 transition-transform group-hover:scale-110 duration-300`}>
                      <feature.icon className={`h-6 w-6 ${sv.iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-white mb-1.5">{feature.title}</h3>
                      <p className="text-slate-500 text-sm leading-relaxed mb-3">{feature.description}</p>
                      <div className="flex flex-wrap gap-2">
                        {feature.highlights.map((h) => (
                          <span
                            key={h}
                            className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-400`}
                          >
                            <ArrowRight className={`h-3 w-3 ${sv.iconColor}`} />
                            {h}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

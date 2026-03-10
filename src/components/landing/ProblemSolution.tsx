"use client";

import { motion, useInView } from "framer-motion";
import { AlertTriangle, TrendingDown, ShieldCheck, ArrowRight } from "lucide-react";
import { useRef } from "react";

const problems = [
  {
    icon: AlertTriangle,
    title: "Arrêtez les pannes surprises",
    stat: "73%",
    statLabel: "évitables",
    description:
      "des pannes sur la route pourraient être évitées avec une maintenance préventive correcte. Chaque arrêt inopiné coûte en moyenne 3 200€.",
    solution: "Notre IA détecte les anomalies moteur 14 jours avant la panne",
    accentFrom: "#f59e0b",
    accentTo: "#f97316",
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-400",
    border: "border-amber-500/15 hover:border-amber-500/35",
    glow: "hover:shadow-[0_0_40px_rgba(245,158,11,0.12)]",
    progressColor: "from-amber-500 to-orange-500",
    progressWidth: "73%",
  },
  {
    icon: TrendingDown,
    title: "Réduisez la consommation",
    stat: "15%",
    statLabel: "économies",
    description:
      "d'économies de carburant en moyenne pour nos clients. L'éco-conduite et les itinéraires optimisés font toute la différence sur l'année.",
    solution: "Optimisation des routes + suivi éco-conduite chauffeur",
    accentFrom: "#06b6d4",
    accentTo: "#3b82f6",
    iconBg: "bg-cyan-500/10",
    iconColor: "text-cyan-400",
    border: "border-cyan-500/15 hover:border-cyan-500/35",
    glow: "hover:shadow-[0_0_40px_rgba(6,182,212,0.12)]",
    progressColor: "from-cyan-500 to-blue-500",
    progressWidth: "85%",
  },
  {
    icon: ShieldCheck,
    title: "Conformité automatique",
    stat: "100%",
    statLabel: "couverture",
    description:
      "de vos documents réglementaires toujours à jour. Contrôle technique, assurances, permis conducteurs — plus aucune amende.",
    solution: "Alertes automatiques et renouvellements en 1 clic",
    accentFrom: "#10b981",
    accentTo: "#059669",
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-400",
    border: "border-emerald-500/15 hover:border-emerald-500/35",
    glow: "hover:shadow-[0_0_40px_rgba(16,185,129,0.12)]",
    progressColor: "from-emerald-500 to-teal-500",
    progressWidth: "100%",
  },
];

export function ProblemSolution() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="py-24 bg-[#09090b] relative overflow-hidden">
      {/* Background accent */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, rgba(6,182,212,0.04) 0%, transparent 60%)`,
        }}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block text-sm font-semibold text-cyan-400 uppercase tracking-wider mb-4">
            Pourquoi FleetMaster
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
            Fini les cauchemars{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              de gestion
            </span>
          </h2>
          <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
            Les transporteurs perdent en moyenne{" "}
            <strong className="text-white">47h par mois</strong> sur des tâches
            administratives évitables. Reprenez le contrôle.
          </p>
        </motion.div>

        {/* Bento cards */}
        <div className="grid md:grid-cols-3 gap-5">
          {problems.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.55, delay: index * 0.12 }}
              whileHover={{ y: -6 }}
              className={`group relative rounded-2xl border ${item.border} bg-[#18181b]/50 backdrop-blur-sm p-8 transition-all duration-400 ${item.glow}`}
            >
              {/* Icon */}
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${item.iconBg} mb-6 transition-transform group-hover:scale-110 duration-300`}>
                <item.icon className={`h-6 w-6 ${item.iconColor}`} />
              </div>

              {/* Big stat */}
              <div className="mb-3">
                <span
                  className="text-5xl font-extrabold bg-clip-text text-transparent"
                  style={{
                    backgroundImage: `linear-gradient(135deg, ${item.accentFrom}, ${item.accentTo})`,
                  }}
                >
                  {item.stat}
                </span>
                <span className="ml-2 text-sm font-semibold text-slate-500 uppercase tracking-wide">
                  {item.statLabel}
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-1 bg-white/[0.06] rounded-full mb-5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={isInView ? { width: item.progressWidth } : { width: 0 }}
                  transition={{ duration: 1.2, delay: 0.4 + index * 0.15, ease: "easeOut" }}
                  className={`h-full rounded-full bg-gradient-to-r ${item.progressColor}`}
                />
              </div>

              {/* Title + description */}
              <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-5">
                {item.description}
              </p>

              {/* Solution */}
              <div className="flex items-start gap-2 pt-4 border-t border-white/[0.05]">
                <ArrowRight
                  className={`h-4 w-4 mt-0.5 flex-shrink-0 ${item.iconColor} transition-transform group-hover:translate-x-1 duration-200`}
                />
                <p className={`text-sm font-medium ${item.iconColor}`}>{item.solution}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

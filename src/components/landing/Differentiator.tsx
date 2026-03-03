"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { TrendingDown, Unlock, ShieldCheck } from "lucide-react";

const pillars = [
  {
    icon: TrendingDown,
    title: "À partir de 29€/mois",
    subtitle: "vs 300–400€ chez Webfleet ou Quartix",
    iconBg: "bg-orange-500/10 border-orange-500/20",
    iconColor: "text-orange-400",
    border: "border-orange-500/15",
  },
  {
    icon: Unlock,
    title: "Sans engagement",
    subtitle: "Résiliable à tout moment, sans frais",
    iconBg: "bg-emerald-500/10 border-emerald-500/20",
    iconColor: "text-emerald-400",
    border: "border-emerald-500/15",
  },
  {
    icon: ShieldCheck,
    title: "Conforme RGPD",
    subtitle: "Pas de traceur GPS sur vos camions",
    iconBg: "bg-cyan-500/10 border-cyan-500/20",
    iconColor: "text-cyan-400",
    border: "border-cyan-500/15",
  },
];

export function Differentiator() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="py-16 bg-[#09090b] relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/15 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Bandeau principal */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <p className="text-lg sm:text-xl font-semibold text-slate-300">
            À 1/10ème du prix de Webfleet ou Quartix
            <span className="mx-3 text-slate-600">—</span>
            Sans contrat
            <span className="mx-3 text-slate-600">—</span>
            Sans boîtier GPS
          </p>
        </motion.div>

        {/* 3 colonnes */}
        <div className="grid md:grid-cols-3 gap-5">
          {pillars.map((pillar, index) => (
            <motion.div
              key={pillar.title}
              initial={{ opacity: 0, y: 24 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.5,
                delay: index * 0.12,
                ease: [0.22, 1, 0.36, 1],
              }}
              className={`rounded-2xl border ${pillar.border} bg-[#0f172a]/50 p-6 flex items-center gap-4`}
            >
              <div
                className={`w-12 h-12 rounded-xl border ${pillar.iconBg} flex items-center justify-center flex-shrink-0`}
              >
                <pillar.icon className={`h-6 w-6 ${pillar.iconColor}`} />
              </div>
              <div>
                <p className="font-bold text-white text-base">{pillar.title}</p>
                <p className="text-sm text-slate-500 mt-0.5">{pillar.subtitle}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

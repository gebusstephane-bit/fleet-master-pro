"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Truck, BarChart3, Building2 } from "lucide-react";

const profiles = [
  {
    icon: Truck,
    range: "1–5 véhicules",
    title: "Transporteur indépendant",
    description:
      "Fini les tableurs Excel et les Post-it. CT, assurances, tachygraphe, permis — toutes vos échéances centralisées. Recevez les alertes avant que ça expire.",
    plan: "Essentiel",
    gradient: "from-[#00d4ff]/20 to-blue-500/10",
    borderColor: "border-[#00d4ff]/30",
    planColor: "text-[#00d4ff]",
  },
  {
    icon: BarChart3,
    range: "5–50 véhicules",
    title: "Gestionnaire de parc",
    description:
      "Pilotez votre flotte avec des indicateurs clairs. Score de fiabilité par véhicule, maintenance prédictive, suivi TCO au km. Anticipez les pannes.",
    plan: "Pro",
    gradient: "from-blue-500/20 to-violet-500/10",
    borderColor: "border-blue-500/30",
    planColor: "text-blue-400",
  },
  {
    icon: Building2,
    range: "50+ véhicules",
    title: "Direction logistique",
    description:
      "API publique pour connecter votre ERP ou TMS. Rapports PDF automatisés. Assistant IA réglementaire. Support prioritaire. Vision consolidée multi-sites.",
    plan: "Unlimited",
    gradient: "from-violet-500/20 to-purple-500/10",
    borderColor: "border-violet-500/30",
    planColor: "text-violet-400",
  },
];

export function TargetAudience() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="py-24 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/5 to-transparent pointer-events-none" />
      
      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 glass-cosmic px-4 py-2 rounded-full text-xs font-medium uppercase tracking-[0.15em] text-[#00d4ff] mb-6">
            Pour qui
          </span>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6">
            <span className="text-cosmic-display">
              Fait pour les
            </span>
            <br />
            <span className="text-cosmic-gradient">professionnels du transport</span>
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            VUL, PL, SPL, frigorifique, remorque — FleetMaster s'adapte à votre
            parc, quelle que soit sa taille.
          </p>
        </motion.div>

        {/* Profiles */}
        <div className="grid md:grid-cols-3 gap-6">
          {profiles.map((profile, index) => (
            <motion.div
              key={profile.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.55,
                delay: index * 0.12,
                ease: [0.22, 1, 0.36, 1],
              }}
              className={`card-cosmic group ${profile.borderColor} border`}
            >
              {/* Gradient background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${profile.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[inherit]`} />
              
              <div className="relative">
                {/* Icon + Plan */}
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-[#00d4ff]/30 group-hover:shadow-[0_0_20px_rgba(0,212,255,0.2)] transition-all duration-300">
                    <profile.icon className="h-6 w-6 text-[#00d4ff]" />
                  </div>
                  <span className={`text-xs font-bold uppercase tracking-[0.1em] px-3 py-1 rounded-full glass-cosmic ${profile.planColor} border border-current opacity-70`}>
                    {profile.plan}
                  </span>
                </div>

                {/* Range */}
                <p className="text-sm text-slate-500 mb-1">{profile.range}</p>

                {/* Title */}
                <h3 className="text-xl font-bold text-white mb-4">
                  {profile.title}
                </h3>

                {/* Description */}
                <p className="text-slate-400 text-sm leading-relaxed">
                  {profile.description}
                </p>

                {/* Hover line */}
                <div className={`mt-6 h-px bg-gradient-to-r ${profile.gradient.replace('/20', '').replace('/10', '')} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

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
      "Fini les tableurs Excel et les Post-it. CT, assurances, tachygraphe, permis — toutes vos échéances centralisées. Recevez les alertes avant que ça expire et arrivez serein aux contrôles routiers.",
    iconBg: "bg-cyan-500/10 border-cyan-500/20",
    iconColor: "text-cyan-400",
    border: "border-cyan-500/15",
    badge: "ESSENTIEL",
    badgeColor: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    gradientFrom: "#06b6d4",
    gradientTo: "#3b82f6",
  },
  {
    icon: BarChart3,
    range: "5–50 véhicules",
    title: "Gestionnaire de parc",
    description:
      "Pilotez votre flotte avec des indicateurs clairs. Score de fiabilité par véhicule, maintenance prédictive, suivi TCO au km. Anticipez les pannes, réduisez les immobilisations et maîtrisez vos coûts.",
    iconBg: "bg-blue-500/10 border-blue-500/20",
    iconColor: "text-blue-400",
    border: "border-blue-500/15",
    badge: "PRO",
    badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    gradientFrom: "#3b82f6",
    gradientTo: "#8b5cf6",
  },
  {
    icon: Building2,
    range: "50+ véhicules",
    title: "Direction logistique",
    description:
      "API publique pour connecter votre ERP ou TMS. Rapports PDF automatisés. Assistant IA réglementaire. Support prioritaire. Vision consolidée sur l'ensemble de votre parc multi-sites.",
    iconBg: "bg-violet-500/10 border-violet-500/20",
    iconColor: "text-violet-400",
    border: "border-violet-500/15",
    badge: "UNLIMITED",
    badgeColor: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    gradientFrom: "#8b5cf6",
    gradientTo: "#6366f1",
  },
];

export function TargetAudience() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="py-24 bg-[#09090b] relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 100%, rgba(59,130,246,0.04) 0%, transparent 60%)`,
        }}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block text-sm font-semibold text-cyan-400 uppercase tracking-wider mb-4">
            Pour qui
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
            Fait pour les{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              professionnels du transport
            </span>
          </h2>
          <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
            VUL, PL, SPL, frigorifique, remorque — FleetMaster s'adapte à votre
            parc, quelle que soit sa taille.
          </p>
        </motion.div>

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
              whileHover={{ y: -4 }}
              className={`group rounded-2xl border ${profile.border} bg-[#0f172a]/70 p-8 flex flex-col transition-all duration-300`}
            >
              {/* Icône + badge plan */}
              <div className="flex items-center justify-between mb-6">
                <div
                  className={`w-12 h-12 rounded-xl border ${profile.iconBg} flex items-center justify-center`}
                >
                  <profile.icon className={`h-6 w-6 ${profile.iconColor}`} />
                </div>
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full border ${profile.badgeColor}`}
                >
                  {profile.badge}
                </span>
              </div>

              {/* Fourchette véhicules */}
              <p className="text-sm text-slate-500 mb-1">{profile.range}</p>

              {/* Titre */}
              <h3 className="text-xl font-bold text-white mb-4">
                {profile.title}
              </h3>

              {/* Description */}
              <p className="text-slate-400 text-sm leading-relaxed flex-1">
                {profile.description}
              </p>

              {/* Ligne de couleur au survol */}
              <div
                className="mt-6 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${profile.gradientFrom}, ${profile.gradientTo})`,
                }}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

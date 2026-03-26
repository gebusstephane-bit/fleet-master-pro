"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  QrCode,
  Brain,
  ShieldCheck,
  TrendingDown,
  Smartphone,
} from "lucide-react";

// =============================================================================
// Données — 5 avantages compétitifs réels
// =============================================================================

const advantages = [
  {
    icon: QrCode,
    title: "Inspections QR sans application",
    description:
      "La seule solution du marché où les chauffeurs scannent un QR avec leur téléphone (sans installer d'app) et remplissent l'inspection dans le navigateur. Zéro friction, 100% adoption.",
    stat: "UNIQUE",
    statLabel: "sur le marché",
    accentColor: "cyan",
    iconBg: "bg-cyan-500/10 border-cyan-500/20",
    iconColor: "text-cyan-400",
    statColor: "text-cyan-400",
    border: "border-cyan-500/15",
    gradientFrom: "#06b6d4",
    gradientTo: "#3b82f6",
  },
  {
    icon: TrendingDown,
    title: "Jusqu'à 10x moins cher",
    description:
      "Pas de boîtier OBD à acheter, pas d'abonnement GPS coûteux. FleetMaster coûte 49€/mois pour 20 véhicules où Webfleet facture 400€+ pour les mêmes fonctionnalités. Le ROI est immédiat.",
    stat: "10x",
    statLabel: "moins cher",
    accentColor: "orange",
    iconBg: "bg-orange-500/10 border-orange-500/20",
    iconColor: "text-orange-400",
    statColor: "text-orange-400",
    border: "border-orange-500/15",
    gradientFrom: "#f97316",
    gradientTo: "#f59e0b",
  },
  {
    icon: ShieldCheck,
    title: "100% conforme RGPD",
    description:
      "Pas de géolocalisation permanente = pas de surveillance des conducteurs. Vos chauffeurs sont tranquilles, vous êtes en règle. Les données sont hébergées en France.",
    stat: "0",
    statLabel: "traqueur GPS",
    accentColor: "emerald",
    iconBg: "bg-emerald-500/10 border-emerald-500/20",
    iconColor: "text-emerald-400",
    statColor: "text-emerald-400",
    border: "border-emerald-500/15",
    gradientFrom: "#10b981",
    gradientTo: "#06b6d4",
  },
  {
    icon: Brain,
    title: "IA embarquée nativement",
    description:
      "Maintenance prédictive qui analyse vos données et anticipe les pannes. SOS Garage intelligent qui trouve le bon garage selon votre situation. Votre flotte devient intelligente.",
    stat: "14j",
    statLabel: "d'anticipation",
    accentColor: "violet",
    iconBg: "bg-violet-500/10 border-violet-500/20",
    iconColor: "text-violet-400",
    statColor: "text-violet-400",
    border: "border-violet-500/15",
    gradientFrom: "#8b5cf6",
    gradientTo: "#6366f1",
  },
  {
    icon: Smartphone,
    title: "Fonctionne sur tous les téléphones",
    description:
      "Chauffeurs avec iPhone, Android, ancien téléphone... Peu importe. Un QR code, un navigateur, c'est tout. Fini les problèmes de compatibilité et de mises à jour forcées.",
    stat: "100%",
    statLabel: "compatible",
    accentColor: "blue",
    iconBg: "bg-blue-500/10 border-blue-500/20",
    iconColor: "text-blue-400",
    statColor: "text-blue-400",
    border: "border-blue-500/15",
    gradientFrom: "#3b82f6",
    gradientTo: "#06b6d4",
  },
];

// =============================================================================
// Composant
// =============================================================================

export function WhyFleetMaster() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="py-24 bg-[#09090b] relative overflow-hidden">
      {/* Fond */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, rgba(6,182,212,0.04) 0%, transparent 60%)`,
        }}
      />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/15 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* ── En-tête ── */}
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
            Ce que les solutions GPS{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              ne font pas
            </span>
          </h2>
          <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
            Fleet-Master n'est pas un traqueur GPS. C'est un outil de gestion 
            complet qui respecte vos chauffeurs et votre budget.
          </p>
        </motion.div>

        {/* ── Grille d'avantages ── */}
        {/* Disposition : 3 cartes en haut + 2 centrées en bas */}
        <div className="grid md:grid-cols-3 gap-5 mb-5">
          {advantages.slice(0, 3).map((adv, index) => (
            <AdvantageCard
              key={adv.title}
              advantage={adv}
              index={index}
              isInView={isInView}
            />
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-5 md:max-w-2xl md:mx-auto">
          {advantages.slice(3).map((adv, index) => (
            <AdvantageCard
              key={adv.title}
              advantage={adv}
              index={index + 3}
              isInView={isInView}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// Sous-composant — Carte d'avantage
// =============================================================================

function AdvantageCard({
  advantage: adv,
  index,
  isInView,
}: {
  advantage: (typeof advantages)[0];
  index: number;
  isInView: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: 0.55,
        delay: index * 0.1,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={{ y: -5 }}
      className={`group relative rounded-2xl border ${adv.border} bg-[#18181b]/50 backdrop-blur-sm p-8 transition-all duration-300 hover:bg-[#18181b]/80`}
    >
      {/* Icône + stat alignés sur la même ligne */}
      <div className="flex items-start justify-between mb-5">
        <div
          className={`inline-flex items-center justify-center w-12 h-12 rounded-xl border ${adv.iconBg} transition-transform group-hover:scale-110 duration-300`}
        >
          <adv.icon className={`h-6 w-6 ${adv.iconColor}`} />
        </div>
        <div className="text-right">
          <span
            className="text-3xl font-extrabold bg-clip-text text-transparent"
            style={{
              backgroundImage: `linear-gradient(135deg, ${adv.gradientFrom}, ${adv.gradientTo})`,
            }}
          >
            {adv.stat}
          </span>
          <p className="text-xs text-slate-600 font-medium mt-0.5">
            {adv.statLabel}
          </p>
        </div>
      </div>

      {/* Titre */}
      <h3 className="text-lg font-bold text-white mb-3">{adv.title}</h3>

      {/* Description */}
      <p className="text-slate-500 text-sm leading-relaxed">{adv.description}</p>

      {/* Ligne de couleur au survol */}
      <div
        className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `linear-gradient(90deg, transparent, ${adv.gradientFrom}, transparent)`,
        }}
      />
    </motion.div>
  );
}

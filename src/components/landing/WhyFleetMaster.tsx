"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  Layers,
  Brain,
  Smartphone,
  ShieldCheck,
  TrendingDown,
} from "lucide-react";

// =============================================================================
// Données — 5 avantages compétitifs
// =============================================================================

const advantages = [
  {
    icon: Layers,
    title: "Tout-en-un, enfin",
    description:
      "Fini les 5 outils différents qui ne se parlent pas. FleetMaster Pro couvre l'intégralité de votre gestion de flotte dans une seule interface intuitive, accessible depuis n'importe quel appareil.",
    stat: "1",
    statLabel: "seule plateforme",
    accentColor: "cyan",
    iconBg: "bg-cyan-500/10 border-cyan-500/20",
    iconColor: "text-cyan-400",
    statColor: "text-cyan-400",
    border: "border-cyan-500/15",
    gradientFrom: "#06b6d4",
    gradientTo: "#3b82f6",
  },
  {
    icon: Brain,
    title: "IA embarquée nativement",
    description:
      "Le seul outil du marché qui prédit vos pannes avant qu'elles surviennent. Une intelligence artificielle propriétaire entraînée sur des millions de données moteur réelles.",
    stat: "14j",
    statLabel: "d'anticipation",
    accentColor: "blue",
    iconBg: "bg-blue-500/10 border-blue-500/20",
    iconColor: "text-blue-400",
    statColor: "text-blue-400",
    border: "border-blue-500/15",
    gradientFrom: "#3b82f6",
    gradientTo: "#8b5cf6",
  },
  {
    icon: Smartphone,
    title: "100% mobile, partout",
    description:
      "Votre bureau de gestion dans votre poche. Interface native optimisée pour smartphone et tablette. Gérez votre flotte 24h/24 depuis le bureau, le dépôt ou la route.",
    stat: "24h",
    statLabel: "disponibilité",
    accentColor: "violet",
    iconBg: "bg-violet-500/10 border-violet-500/20",
    iconColor: "text-violet-400",
    statColor: "text-violet-400",
    border: "border-violet-500/15",
    gradientFrom: "#8b5cf6",
    gradientTo: "#06b6d4",
  },
  {
    icon: ShieldCheck,
    title: "Conformité automatique",
    description:
      "Plus jamais d'amende, plus jamais de PV de contrôle. Chaque document réglementaire — assurance, CT, permis conducteur — est suivi, renouvelé et archivé automatiquement.",
    stat: "0",
    statLabel: "amende oubliée",
    accentColor: "emerald",
    iconBg: "bg-emerald-500/10 border-emerald-500/20",
    iconColor: "text-emerald-400",
    statColor: "text-emerald-400",
    border: "border-emerald-500/15",
    gradientFrom: "#10b981",
    gradientTo: "#06b6d4",
  },
  {
    icon: TrendingDown,
    title: "ROI dès le 1er mois",
    description:
      "Une seule panne évitée rembourse plusieurs mois d'abonnement. Nos clients économisent en moyenne 2 340 € par mois sur leurs coûts d'exploitation et de maintenance.",
    stat: "-30%",
    statLabel: "de coûts en moyenne",
    accentColor: "orange",
    iconBg: "bg-orange-500/10 border-orange-500/20",
    iconColor: "text-orange-400",
    statColor: "text-orange-400",
    border: "border-orange-500/15",
    gradientFrom: "#f97316",
    gradientTo: "#f59e0b",
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
            Ce que les autres outils{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              ne font pas
            </span>
          </h2>
          <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
            FleetMaster Pro n'est pas qu'un tableau de bord. C'est l'outil de
            pilotage que les transporteurs attendaient depuis des années.
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

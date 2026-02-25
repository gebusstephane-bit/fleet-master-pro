"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  LayoutDashboard,
  Truck,
  Brain,
  MapPin,
  Users,
  Navigation,
  ClipboardCheck,
  Fuel,
  FileText,
  Bell,
  Wrench,
  CalendarDays,
  BarChart3,
  Building2,
} from "lucide-react";

// =============================================================================
// Types
// =============================================================================

type ColorVariant =
  | "cyan"
  | "blue"
  | "violet"
  | "emerald"
  | "amber"
  | "orange";

interface Feature {
  icon: React.ElementType;
  title: string;
  description: string;
  variant: ColorVariant;
}

// =============================================================================
// Données — 14 fonctionnalités du projet
// =============================================================================

const features: Feature[] = [
  {
    icon: LayoutDashboard,
    title: "Tableau de bord analytique",
    description:
      "Visualisez en un coup d'œil l'état de toute votre flotte : KPIs en temps réel, alertes actives, coûts du mois. Prenez les bonnes décisions en moins de 30 secondes.",
    variant: "cyan",
  },
  {
    icon: Truck,
    title: "Gestion des véhicules",
    description:
      "Centralisez l'ensemble de votre parc : fiches véhicules complètes, kilométrages, QR codes d'identification et historiques d'entretien détaillés par véhicule.",
    variant: "blue",
  },
  {
    icon: Brain,
    title: "Maintenance prédictive par IA",
    description:
      "Notre IA analyse les données moteur en continu et anticipe les défaillances 14 jours avant qu'elles ne surviennent. Fini les pannes imprévues sur la route.",
    variant: "violet",
  },
  {
    icon: MapPin,
    title: "Géolocalisation temps réel",
    description:
      "Suivez chaque véhicule en direct sur carte interactive Mapbox. Alertes géofencing configurables, historique complet des trajets et suivi de vitesse automatisé.",
    variant: "emerald",
  },
  {
    icon: Users,
    title: "Gestion des chauffeurs",
    description:
      "Profils complets, suivi des permis et habilitations, affectation aux véhicules. Éco-scoring conducteur et alertes automatiques de renouvellement des documents.",
    variant: "cyan",
  },
  {
    icon: Navigation,
    title: "Optimisation des tournées",
    description:
      "Algorithmes de routage intelligents qui réduisent les kilomètres parcourus de 20%. Planification multi-stops et recalcul dynamique des itinéraires en temps réel.",
    variant: "blue",
  },
  {
    icon: ClipboardCheck,
    title: "Inspections numériques",
    description:
      "Checklists de contrôle pré-départ sur smartphone. Rapports photo intégrés, signature électronique et archivage automatique. Conformité garantie à chaque trajet.",
    variant: "emerald",
  },
  {
    icon: Fuel,
    title: "Suivi de la consommation",
    description:
      "Analysez la consommation carburant par véhicule et par conducteur. Détectez les anomalies, calculez vos coûts kilométriques réels et réduisez les gaspillages.",
    variant: "orange",
  },
  {
    icon: FileText,
    title: "Gestion documentaire",
    description:
      "Assurances, contrôles techniques, cartes grises, permis. Alertes automatiques d'expiration et renouvellement en 1 clic. Zéro amende, zéro oubli réglementaire.",
    variant: "cyan",
  },
  {
    icon: Bell,
    title: "Alertes intelligentes",
    description:
      "Recevez les bonnes alertes au bon moment : email, notifications push, SMS. Configurez vos propres seuils et laissez FleetMaster surveiller votre flotte en permanence.",
    variant: "amber",
  },
  {
    icon: Wrench,
    title: "SOS Garage — Assistance IA",
    description:
      "En cas de panne, l'IA analyse les symptômes, identifie le garage partenaire le plus proche et déclenche l'intervention. Votre chauffeur n'est jamais seul.",
    variant: "violet",
  },
  {
    icon: CalendarDays,
    title: "Agenda & planification",
    description:
      "Calendrier centralisé des maintenances, contrôles réglementaires et échéances. Planifiez à l'avance pour éviter les conflits de disponibilité et les doublons.",
    variant: "blue",
  },
  {
    icon: BarChart3,
    title: "Rapports & exports PDF",
    description:
      "Générez des rapports PDF professionnels en un clic : performance de flotte, coûts par véhicule, synthèse mensuelle. Prêts pour vos réunions de direction.",
    variant: "emerald",
  },
  {
    icon: Building2,
    title: "Multi-entreprises",
    description:
      "Gérez plusieurs parcs sous un seul compte. Isolation totale des données, tableau de bord par entité et vision consolidée pour les groupes de transport.",
    variant: "cyan",
  },
];

// =============================================================================
// Styles par variante de couleur
// =============================================================================

const variantStyles: Record<
  ColorVariant,
  {
    iconBg: string;
    iconColor: string;
    border: string;
    glow: string;
    dot: string;
  }
> = {
  cyan: {
    iconBg: "bg-cyan-500/10 border-cyan-500/20",
    iconColor: "text-cyan-400",
    border: "border-cyan-500/15 hover:border-cyan-500/30",
    glow: "hover:shadow-[0_0_30px_rgba(6,182,212,0.08)]",
    dot: "bg-cyan-400",
  },
  blue: {
    iconBg: "bg-blue-500/10 border-blue-500/20",
    iconColor: "text-blue-400",
    border: "border-blue-500/15 hover:border-blue-500/30",
    glow: "hover:shadow-[0_0_30px_rgba(59,130,246,0.08)]",
    dot: "bg-blue-400",
  },
  violet: {
    iconBg: "bg-violet-500/10 border-violet-500/20",
    iconColor: "text-violet-400",
    border: "border-violet-500/15 hover:border-violet-500/30",
    glow: "hover:shadow-[0_0_30px_rgba(139,92,246,0.08)]",
    dot: "bg-violet-400",
  },
  emerald: {
    iconBg: "bg-emerald-500/10 border-emerald-500/20",
    iconColor: "text-emerald-400",
    border: "border-emerald-500/15 hover:border-emerald-500/30",
    glow: "hover:shadow-[0_0_30px_rgba(16,185,129,0.08)]",
    dot: "bg-emerald-400",
  },
  amber: {
    iconBg: "bg-amber-500/10 border-amber-500/20",
    iconColor: "text-amber-400",
    border: "border-amber-500/15 hover:border-amber-500/30",
    glow: "hover:shadow-[0_0_30px_rgba(245,158,11,0.08)]",
    dot: "bg-amber-400",
  },
  orange: {
    iconBg: "bg-orange-500/10 border-orange-500/20",
    iconColor: "text-orange-400",
    border: "border-orange-500/15 hover:border-orange-500/30",
    glow: "hover:shadow-[0_0_30px_rgba(249,115,22,0.08)]",
    dot: "bg-orange-400",
  },
};

// =============================================================================
// Composant
// =============================================================================

export function Features() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="py-24 bg-[#0a0f1a] relative overflow-hidden">
      {/* Fond radial subtil */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 100%, rgba(59,130,246,0.05) 0%, transparent 60%)`,
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* ── En-tête de section ── */}
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
            Une suite complète pour{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              gérer chaque détail
            </span>
          </h2>
          <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
            14 modules intégrés pensés pour les transporteurs et gestionnaires
            de parc — pas pour les développeurs.
          </p>
        </motion.div>

        {/* ── Grille 3 colonnes — toutes les fonctionnalités ── */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, index) => {
            const sv = variantStyles[feature.variant];
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{
                  duration: 0.5,
                  delay: index * 0.06,
                  ease: [0.22, 1, 0.36, 1],
                }}
                whileHover={{ y: -4 }}
                className={`group relative rounded-2xl border ${sv.border} bg-[#0f172a]/70 backdrop-blur-sm p-6 transition-all duration-300 ${sv.glow}`}
              >
                {/* Icône */}
                <div
                  className={`inline-flex items-center justify-center w-12 h-12 rounded-xl border ${sv.iconBg} mb-4 transition-transform group-hover:scale-110 duration-300`}
                >
                  <feature.icon className={`h-6 w-6 ${sv.iconColor}`} />
                </div>

                {/* Titre */}
                <h3 className="text-base font-bold text-white mb-2">
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="text-slate-500 text-sm leading-relaxed">
                  {feature.description}
                </p>

                {/* Accent de couleur en bas de carte */}
                <div
                  className={`absolute bottom-0 left-6 right-6 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                  style={{
                    background: `linear-gradient(90deg, transparent, var(--dot-color, #06b6d4), transparent)`,
                  }}
                />
              </motion.div>
            );
          })}
        </div>

        {/* ── Note de bas de section ── */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center text-sm text-slate-600 mt-12"
        >
          Toutes les fonctionnalités sont incluses dès le plan Essential.{" "}
          <a
            href="#pricing"
            className="text-cyan-500 hover:text-cyan-400 underline underline-offset-4 transition-colors"
          >
            Voir les tarifs →
          </a>
        </motion.p>
      </div>
    </section>
  );
}

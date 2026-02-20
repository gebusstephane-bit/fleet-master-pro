"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import {
  MapPin,
  Brain,
  FileText,
  Route,
} from "lucide-react";
import { FeatureCard } from "@/components/ui/glass-card";

const features = [
  {
    icon: MapPin,
    title: "Géolocalisation temps réel",
    description: "Suivez chaque véhicule en temps réel. Alertes géofencing automatiques quand un camion sort de sa zone.",
    features: ["Suivi GPS précis", "Alertes géofencing", "Historique complet"],
    variant: "cyan" as const,
  },
  {
    icon: Brain,
    title: "Maintenance prédictive IA",
    description: "L'IA analyse les données moteur et détecte les anomalies 14 jours avant la panne. Fini les surprises.",
    features: ["Détection précoce", "Alertes intelligentes", "Planification auto"],
    variant: "blue" as const,
  },
  {
    icon: Route,
    title: "Optimisation des tournées",
    description: "Réduisez vos kilomètres parcourus de 20% avec notre algorithme d'optimisation d'itinéraires.",
    features: ["Routes optimisées", "Économie carburant", "Gain de temps"],
    variant: "violet" as const,
  },
  {
    icon: FileText,
    title: "Gestion documentaire",
    description: "Finis les documents périmés. Renouvellement auto des assurances, contrôles techniques et permis.",
    features: ["Renouvellement auto", "Alertes échéances", "Archivage cloud"],
    variant: "emerald" as const,
  },
];

export function Features() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-24 bg-[#0a0f1a] relative overflow-hidden">
      {/* Background gradient */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 100%, rgba(59,130,246,0.05) 0%, transparent 50%)`,
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <span className="inline-block text-sm font-semibold text-cyan-400 uppercase tracking-wider mb-4">
            Fonctionnalités
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
            Tout ce qu&apos;il faut pour gérer votre flotte
          </h2>
          <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
            Une suite complète d&apos;outils pensée pour les transporteurs,
            pas pour les geeks.
          </p>
        </motion.div>

        {/* Features grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <FeatureCard
              key={feature.title}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              features={feature.features}
              variant={feature.variant}
              delay={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

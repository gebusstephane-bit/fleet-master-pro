"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { UserPlus, Truck, BarChart3, ArrowRight } from "lucide-react";
import Link from "next/link";

// =============================================================================
// Données — 3 étapes
// =============================================================================

const steps = [
  {
    number: "01",
    icon: UserPlus,
    title: "Créez votre compte en 5 minutes",
    description:
      "Inscrivez-vous gratuitement, renseignez votre entreprise et vos premiers véhicules. Notre assistant de démarrage vous guide pas à pas — aucune compétence technique requise.",
    detail: "Paramétrage guidé · Import de données existantes · Accès immédiat",
    gradientFrom: "#06b6d4",
    gradientTo: "#3b82f6",
    iconBg: "bg-cyan-500/10 border-cyan-500/20",
    iconColor: "text-cyan-400",
    numberColor: "text-cyan-500/30",
    connectorColor: "from-cyan-500/30 to-blue-500/30",
  },
  {
    number: "02",
    icon: Truck,
    title: "Connectez et enrichissez votre flotte",
    description:
      "Ajoutez vos véhicules un par un ou importez votre fichier existant. Téléchargez vos documents, affectez vos chauffeurs. FleetMaster commence à analyser vos données immédiatement.",
    detail: "Import CSV · Documents auto-organisés · Alertes actives dès J+1",
    gradientFrom: "#3b82f6",
    gradientTo: "#8b5cf6",
    iconBg: "bg-blue-500/10 border-blue-500/20",
    iconColor: "text-blue-400",
    numberColor: "text-blue-500/30",
    connectorColor: "from-blue-500/30 to-violet-500/30",
  },
  {
    number: "03",
    icon: BarChart3,
    title: "Pilotez et récoltez les économies",
    description:
      "Accédez en temps réel à tous vos indicateurs. Recevez vos premières alertes préventives et mesurez vos économies mois après mois directement sur votre tableau de bord.",
    detail: "ROI mesurable · Rapports automatiques · Support dédié 7j/7",
    gradientFrom: "#10b981",
    gradientTo: "#06b6d4",
    iconBg: "bg-emerald-500/10 border-emerald-500/20",
    iconColor: "text-emerald-400",
    numberColor: "text-emerald-500/30",
    connectorColor: null, // dernière étape — pas de connecteur
  },
];

// =============================================================================
// Composant
// =============================================================================

export function HowItWorks() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="py-24 bg-[#0a0f1a] relative overflow-hidden">
      {/* Fond */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 50%, rgba(6,182,212,0.04) 0%, transparent 65%)`,
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* ── En-tête ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block text-sm font-semibold text-cyan-400 uppercase tracking-wider mb-4">
            Comment ça marche
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
            Opérationnel en{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              moins d'une heure
            </span>
          </h2>
          <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
            Trois étapes suffisent pour transformer la gestion de votre flotte.
            Pas de formation longue, pas d'intégration complexe.
          </p>
        </motion.div>

        {/* ── Étapes — disposition en ligne sur desktop ── */}
        <div className="relative grid md:grid-cols-3 gap-8">

          {/* Ligne de connexion desktop */}
          <div
            className="hidden md:block absolute top-16 left-[16.67%] right-[16.67%] h-px"
            style={{
              background: `linear-gradient(90deg, rgba(6,182,212,0.3), rgba(59,130,246,0.3), rgba(139,92,246,0.3))`,
            }}
          />

          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.6,
                delay: index * 0.18,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="relative flex flex-col items-center text-center"
            >
              {/* Numéro en arrière-plan */}
              <span
                className={`absolute -top-4 text-[120px] font-black leading-none select-none pointer-events-none ${step.numberColor}`}
                aria-hidden="true"
              >
                {step.number}
              </span>

              {/* Icône */}
              <div className="relative z-10 mb-6">
                <div
                  className={`w-16 h-16 rounded-2xl border ${step.iconBg} flex items-center justify-center shadow-lg`}
                  style={{
                    boxShadow: `0 0 30px rgba(6,182,212,0.12)`,
                  }}
                >
                  <step.icon className={`h-8 w-8 ${step.iconColor}`} />
                </div>

                {/* Numéro de badge */}
                <span
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{
                    background: `linear-gradient(135deg, ${step.gradientFrom}, ${step.gradientTo})`,
                  }}
                >
                  {index + 1}
                </span>
              </div>

              {/* Titre */}
              <h3 className="text-lg font-bold text-white mb-3 px-2">
                {step.title}
              </h3>

              {/* Description */}
              <p className="text-slate-400 text-sm leading-relaxed mb-4 max-w-xs mx-auto">
                {step.description}
              </p>

              {/* Détails techniques */}
              <p className="text-xs text-slate-600 font-medium">{step.detail}</p>
            </motion.div>
          ))}
        </div>

        {/* ── CTA sous les étapes ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-center mt-16"
        >
          <Link href="/register">
            <button className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold text-base shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:-translate-y-1 transition-all duration-300">
              Démarrer mon essai gratuit
              <ArrowRight className="h-5 w-5" />
            </button>
          </Link>
          <p className="text-sm text-slate-600 mt-3">
            Aucune carte bancaire · Annulation à tout moment
          </p>
        </motion.div>
      </div>
    </section>
  );
}

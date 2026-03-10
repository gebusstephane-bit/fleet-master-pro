"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { UserPlus, QrCode, BarChart3, ArrowRight } from "lucide-react";
import Link from "next/link";

const steps = [
  {
    number: "01",
    icon: UserPlus,
    title: "Créez votre compte en 5 minutes",
    description:
      "Inscrivez-vous gratuitement, renseignez votre entreprise et vos premiers véhicules. Notre assistant de démarrage vous guide pas à pas.",
    detail: "Essai 14 jours sans CB · Import de données existantes · Accès immédiat",
    gradient: "from-[#00d4ff] to-blue-500",
  },
  {
    number: "02",
    icon: QrCode,
    title: "Générez vos QR codes d'inspection",
    description:
      "Imprimez les QR codes et collez-les sur vos véhicules. Vos chauffeurs scannent avec leur téléphone (sans app à installer) pour remplir les inspections.",
    detail: "QR codes imprimables · Inspections via navigateur · Photos et signatures",
    gradient: "from-blue-500 to-violet-500",
  },
  {
    number: "03",
    icon: BarChart3,
    title: "Pilotez et restez conforme",
    description:
      "Recevez les alertes de documents, anticipez les maintenances avec l'IA, suivez vos coûts. Votre flotte est sous contrôle — sans surveillance GPS.",
    detail: "Alertes auto · Maintenance prédictive · Rapports conformité",
    gradient: "from-violet-500 to-[#00d4ff]",
  },
];

export function HowItWorks() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="py-24 relative overflow-hidden">
      {/* Background aurora */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#00d4ff]/5 to-transparent pointer-events-none" />
      
      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 glass-cosmic px-4 py-2 rounded-full text-xs font-medium uppercase tracking-[0.15em] text-[#00d4ff] mb-6">
            Comment ça marche
          </span>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6">
            <span className="text-cosmic-display">
              Opérationnel en
            </span>
            <span className="text-cosmic-gradient"> 10 minutes</span>
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Trois étapes suffisent pour transformer la gestion de votre flotte.
            Pas d'installation matérielle, pas de formation longue.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative grid md:grid-cols-3 gap-8">
          {/* Connection line */}
          <div className="hidden md:block absolute top-20 left-[16.67%] right-[16.67%] h-px">
            <div className="h-full bg-gradient-to-r from-[#00d4ff]/50 via-blue-500/50 to-violet-500/50" />
          </div>

          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.6,
                delay: index * 0.2,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="relative flex flex-col items-center text-center"
            >
              {/* Number background */}
              <span
                className="absolute -top-4 text-[100px] font-black leading-none select-none pointer-events-none text-white/5"
                aria-hidden="true"
              >
                {step.number}
              </span>

              {/* Icon */}
              <div className="relative z-10 mb-6">
                <div
                  className="w-16 h-16 rounded-2xl glass-cosmic flex items-center justify-center shadow-[0_0_30px_rgba(0,212,255,0.2)]"
                >
                  <step.icon className="h-8 w-8 text-[#00d4ff]" />
                </div>

                {/* Step badge */}
                <span
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-black shadow-lg"
                  style={{
                    background: `linear-gradient(135deg, ${step.gradient.includes('00d4ff') ? '#00d4ff' : step.gradient.includes('blue') ? '#3b82f6' : '#8b5cf6'}, ${step.gradient.includes('violet') ? '#8b5cf6' : step.gradient.includes('00d4ff') ? '#00d4ff' : '#3b82f6'})`,
                  }}
                >
                  {index + 1}
                </span>
              </div>

              {/* Title */}
              <h3 className="text-lg font-bold text-white mb-3 px-2">
                {step.title}
              </h3>

              {/* Description */}
              <p className="text-slate-400 text-sm leading-relaxed mb-4 max-w-xs mx-auto">
                {step.description}
              </p>

              {/* Detail */}
              <p className="text-xs text-slate-600 font-medium">{step.detail}</p>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center mt-16"
        >
          <Link href="/register">
            <button className="btn-cosmic">
              Démarrer mon essai gratuit
              <ArrowRight className="h-4 w-4" />
            </button>
          </Link>
          <p className="text-sm text-slate-600 mt-4">
            Sans carte bancaire · Annulation à tout moment · 14 jours complets
          </p>
        </motion.div>
      </div>
    </section>
  );
}

"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  Shield,
  QrCode,
  Wrench,
  BarChart3,
  Smartphone,
  AlertOctagon,
  BookOpen,
} from "lucide-react";

const features = [
  {
    icon: BarChart3,
    title: "Un score par véhicule. Une décision claire.",
    description:
      "Inspection, maintenance, carburant, conformité — pondérés en un score A à F. Vous savez instantanément quel véhicule demande votre attention.",
    gradient: "from-[#00d4ff]/20 to-blue-500/10",
    borderColor: "border-[#00d4ff]/30",
  },
  {
    icon: Shield,
    title: "Fini les documents expirés.",
    description:
      "CT, Tachygraphe, ATP, Assurance, Permis, FCO, Médical — chaque document a sa date, chaque expiration a son alerte J-30, J-15, J-7.",
    gradient: "from-emerald-500/20 to-teal-500/10",
    borderColor: "border-emerald-500/30",
  },
  {
    icon: QrCode,
    title: "Un QR code. Trois usages. Zéro app.",
    description:
      "Un scan = inspection 32 points avec signature et grade A-F, OU saisie d'un plein de carburant, OU consultation du carnet numérique. Sans compte, sans installation.",
    gradient: "from-violet-500/20 to-purple-500/10",
    borderColor: "border-violet-500/30",
    badge: "★ Triple accès",
  },
  {
    icon: Wrench,
    title: "Anticipez. N'attendez pas la panne.",
    description:
      "Intervalles calculés selon le kilométrage et le type de véhicule — PL, frigorifique, remorque, VUL. Le système vous dit quoi faire et quand.",
    gradient: "from-amber-500/20 to-orange-500/10",
    borderColor: "border-amber-500/30",
  },
  {
    icon: AlertOctagon,
    title: "Une panne ? Votre chauffeur n'est pas seul.",
    description:
      "4 questions → protocole de dépannage adapté au type de panne et à la localisation. Traçabilité assurance automatique.",
    gradient: "from-red-500/20 to-rose-500/10",
    borderColor: "border-red-500/30",
  },
  {
    icon: Smartphone,
    title: "Une app pour vos chauffeurs. Sans installation.",
    description:
      "Inspections, carburant, incident — tout depuis leur téléphone. S'installe en 30 secondes. Fonctionne hors connexion.",
    gradient: "from-pink-500/20 to-fuchsia-500/10",
    borderColor: "border-pink-500/30",
  },
  {
    icon: BookOpen,
    title: "L'historique complet de chaque véhicule. En un scan.",
    description:
      "Carnet d'entretien numérique accessible via QR code : interventions, kilométrages, observations, photos. Opposable lors d'un contrôle ou d'un sinistre.",
    gradient: "from-cyan-500/20 to-[#00d4ff]/10",
    borderColor: "border-cyan-500/30",
  },
];

export function Features() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="py-24 relative overflow-hidden">
      {/* Aurora background */}
      <div className="absolute inset-0 aurora-bg pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-gradient-to-r from-[#00d4ff]/10 via-blue-500/10 to-violet-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 glass-cosmic px-4 py-2 rounded-full text-xs font-medium uppercase tracking-[0.15em] text-[#00d4ff] mb-6">
            Fonctionnalités
          </span>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6">
            <span className="text-cosmic-display">
              Tout ce qu'il faut pour gérer
            </span>
            <br />
            <span className="text-cosmic-gradient">une flotte sérieusement.</span>
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Pensé pour les transporteurs français — PL, SPL, VUL, frigorifique.
            Sans boîtier GPS, 100% conforme RGPD.
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.5,
                delay: index * 0.08,
                ease: [0.22, 1, 0.36, 1],
              }}
              className={`card-cosmic group ${feature.borderColor} border`}
            >
              {/* Gradient background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[inherit]`} />
              
              {/* Badge */}
              {feature.badge && (
                <div className="absolute -top-3 right-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-[#00d4ff] to-blue-500 text-black shadow-[0_0_20px_rgba(0,212,255,0.4)]">
                    {feature.badge}
                  </span>
                </div>
              )}

              <div className="relative">
                {/* Icon */}
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 group-hover:border-[#00d4ff]/30 group-hover:shadow-[0_0_20px_rgba(0,212,255,0.2)] transition-all duration-300">
                  <feature.icon className="h-6 w-6 text-[#00d4ff]" />
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-white mb-3 leading-tight">
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="text-slate-400 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Trust footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm"
        >
          <div className="flex items-center gap-2 text-slate-500">
            <Shield className="h-5 w-5 text-emerald-400" />
            <span>Données hébergées en France</span>
          </div>
          <div className="hidden sm:block w-px h-4 bg-white/10" />
          <div className="flex items-center gap-2 text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>100% conforme RGPD — pas de traqueur GPS</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

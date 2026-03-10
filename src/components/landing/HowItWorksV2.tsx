"use client";

import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { useRef } from "react";
import { Rocket, LineChart, Shield, CheckCircle2 } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Connexion",
    description: "Créez votre compte en 60 secondes. Importez vos données existantes ou démarrez from scratch.",
    icon: Rocket,
    color: "#00d4ff",
    checkpoints: ["Email vérifié", "Entreprise créée", "Premier véhicule ajouté"]
  },
  {
    number: "02",
    title: "Configuration IA",
    description: "Notre algorithme analyse votre flotte et configure automatiquement les alertes et maintenances.",
    icon: LineChart,
    color: "#8b5cf6",
    checkpoints: ["Historique analysé", "Modèle prédictif généré", "Alertes configurées"]
  },
  {
    number: "03",
    title: "Pilotage",
    description: "Votre dashboard temps réel est prêt. Pilotez votre flotte comme un commandant de vaisseau.",
    icon: Shield,
    color: "#10b981",
    checkpoints: ["Dashboard actif", "QR codes générés", "Équipe notifiée"]
  },
];

function StepCard({ step, index }: { step: typeof steps[0]; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);
  
  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, x: index % 2 === 0 ? -100 : 100 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, delay: index * 0.2 }}
      className="relative"
    >
      <div className="glass-cosmic rounded-2xl p-8 border border-white/10 hover:border-white/20 transition-all duration-500 group">
        {/* Header avec numéro */}
        <div className="flex items-center gap-4 mb-6">
          <motion.div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold"
            style={{ 
              background: `linear-gradient(135deg, ${step.color}30 0%, ${step.color}10 100%)`,
              border: `2px solid ${step.color}`,
              color: step.color
            }}
            whileHover={{ scale: 1.1, rotate: 10 }}
          >
            {step.number}
          </motion.div>
          <div>
            <h3 className="text-2xl font-bold text-white">{step.title}</h3>
            <div className="h-0.5 w-12 mt-2" style={{ background: step.color }} />
          </div>
        </div>

        {/* Description */}
        <p className="text-slate-400 mb-6 leading-relaxed">
          {step.description}
        </p>

        {/* Checkpoints */}
        <div className="space-y-3">
          {step.checkpoints.map((checkpoint, i) => (
            <motion.div
              key={checkpoint}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="flex items-center gap-3"
            >
              <motion.div
                className="w-6 h-6 rounded-full flex items-center justify-center"
                style={{ background: `${step.color}20` }}
                whileHover={{ scale: 1.2 }}
              >
                <CheckCircle2 className="h-4 w-4" style={{ color: step.color }} />
              </motion.div>
              <span className="text-sm text-slate-300">{checkpoint}</span>
            </motion.div>
          ))}
        </div>

        {/* Ligne de connexion */}
        {index < steps.length - 1 && (
          <motion.div
            className="absolute top-full left-1/2 w-0.5 h-16 -translate-x-1/2"
            style={{ background: `linear-gradient(to bottom, ${step.color}, ${steps[index + 1].color})` }}
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5, duration: 0.5 }}
          />
        )}
      </div>
    </motion.div>
  );
}

export function HowItWorksV2() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const lineHeight = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  const smoothLineHeight = useSpring(lineHeight, { stiffness: 100, damping: 30 });

  return (
    <section ref={containerRef} className="py-32 relative overflow-hidden">
      {/* Ligne de progression centrale */}
      <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2">
        <div className="absolute inset-0 bg-white/5" />
        <motion.div
          className="absolute top-0 left-0 right-0 bg-gradient-to-b from-[#00d4ff] via-violet-500 to-emerald-500"
          style={{ height: smoothLineHeight }}
        />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-20">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 glass-cosmic px-4 py-2 rounded-full text-xs uppercase tracking-[0.15em] text-[#00d4ff] mb-6"
          >
            Onboarding
          </motion.span>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6"
          >
            <span className="text-cosmic-display">Opérationnel</span>
            <br />
            <span className="text-cosmic-gradient">en 3 minutes</span>
          </motion.h2>
        </div>

        {/* Steps */}
        <div className="space-y-24">
          {steps.map((step, index) => (
            <div key={step.number} className={`flex ${index % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
              <div className="w-full max-w-lg">
                <StepCard step={step} index={index} />
              </div>
            </div>
          ))}
        </div>

        {/* CTA Final */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-24 text-center"
        >
          <motion.button
            className="btn-cosmic text-lg px-10 py-5"
            whileHover={{ scale: 1.05, boxShadow: '0 0 60px rgba(0,212,255,0.5)' }}
            whileTap={{ scale: 0.95 }}
          >
            <Rocket className="h-5 w-5" />
            Démarrer maintenant
          </motion.button>
          <p className="mt-4 text-slate-500 text-sm">Temps moyen d'onboarding : 2min 47s</p>
        </motion.div>
      </div>
    </section>
  );
}

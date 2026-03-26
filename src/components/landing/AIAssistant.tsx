"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Bot, Sparkles, ArrowRight } from "lucide-react";

const topics = [
  "Réglementation tachygraphe et temps de conduite",
  "Obligations ATP pour les véhicules frigorifiques",
  "FIMO, FCO, carte conducteur — qui doit quoi ?",
  "Documents obligatoires lors d'un contrôle routier",
];

export function AIAssistant() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="py-24 relative overflow-hidden">
      {/* Violet aurora background */}
      <div className="absolute inset-0 bg-gradient-to-b from-violet-500/5 via-transparent to-violet-500/5 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-gradient-to-r from-violet-500/20 to-blue-500/20 rounded-full blur-[150px] pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left — Text */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="inline-flex items-center gap-2 glass-cosmic px-4 py-2 rounded-full mb-6">
              <Sparkles className="h-4 w-4 text-violet-400" />
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-violet-400">
                Fonctionnalité Unlimited
              </span>
            </div>

            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-6">
              <span className="text-cosmic-display">
                Assistant IA
              </span>
              <br />
              <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
                réglementaire
              </span>
              <span className="text-cosmic-display"> inclus</span>
            </h2>

            <p className="text-lg text-slate-400 leading-relaxed mb-8">
              Posez vos questions sur la réglementation transport directement
              dans FleetMaster. Temps de conduite, règles d'attelage,
              obligations ATP, formation FCO... Obtenez une réponse précise en
              quelques secondes.
            </p>

            <div className="space-y-3 mb-8">
              {topics.map((topic) => (
                <div key={topic} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-[0_0_10px_rgba(139,92,246,0.5)]">
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  </div>
                  <span className="text-sm text-slate-400">{topic}</span>
                </div>
              ))}
            </div>

            <div className="inline-flex items-center gap-2 text-xs text-slate-500 glass-cosmic rounded-full px-4 py-2">
              <Bot className="h-3.5 w-3.5 text-violet-400" />
              Propulsé par Claude AI (Anthropic) · Plan Unlimited
            </div>
          </motion.div>

          {/* Right — Chat preview */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            {/* Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/30 to-blue-500/20 rounded-3xl blur-[60px] pointer-events-none" />

            <div className="relative glass-cosmic rounded-2xl overflow-hidden border border-violet-500/20">
              {/* Header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10 bg-violet-500/10">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.4)]">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    Assistant IA réglementaire
                  </p>
                  <p className="text-xs text-slate-500">
                    Fleet-Master · Claude AI
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs text-emerald-400">En ligne</span>
                </div>
              </div>

              {/* Chat */}
              <div className="p-5 space-y-4">
                {/* User message */}
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-tr-sm glass-cosmic px-4 py-3 border border-violet-500/20">
                    <p className="text-sm text-slate-300 leading-relaxed">
                      Quelle est la durée maximale de conduite journalière pour un conducteur PL ?
                    </p>
                  </div>
                </div>

                {/* AI message */}
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div className="flex-1 rounded-2xl rounded-tl-sm glass-cosmic px-4 py-3 border border-white/10">
                    <p className="text-sm text-slate-300 leading-relaxed">
                      En transport international, un conducteur PL ne peut conduire plus de 9 heures par jour. Ce temps peut être prolongé à 10 heures deux fois par semaine.
                    </p>
                    <p className="text-xs text-slate-600 mt-2 pt-2 border-t border-white/10">
                      Règlement CE 561/2006 · Réponse indicative
                    </p>
                  </div>
                </div>
              </div>

              {/* Input */}
              <div className="px-5 pb-5">
                <div className="flex items-center gap-3 rounded-xl glass-cosmic px-4 py-3 border border-white/10">
                  <span className="text-sm text-slate-600 flex-1">
                    Posez votre question réglementaire...
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-violet-500/20 flex items-center justify-center border border-violet-500/30">
                    <ArrowRight className="h-3.5 w-3.5 text-violet-400" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

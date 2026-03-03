"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Bot, Sparkles, ArrowRight } from "lucide-react";

const exampleQuestion =
  "Quelle est la durée maximale de conduite journalière pour un conducteur PL en transport international ?";

const exampleAnswer =
  "En transport international, un conducteur PL ne peut conduire plus de 9 heures par jour. Ce temps peut être prolongé à 10 heures deux fois par semaine. La durée de conduite hebdomadaire est limitée à 56 heures, et la durée bihebdomadaire à 90 heures. Ces règles sont définies par le Règlement CE 561/2006.";

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
    <section ref={ref} className="py-24 bg-[#0f172a] relative overflow-hidden">
      {/* Fond violet subtil pour marquer la section premium */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 50%, rgba(139,92,246,0.07) 0%, transparent 65%)`,
        }}
      />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* ── Colonne gauche — texte ── */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-violet-500/10 border border-violet-500/20 px-4 py-2 mb-6">
              <Sparkles className="h-4 w-4 text-violet-400" />
              <span className="text-sm font-semibold text-violet-400">
                Fonctionnalité Unlimited
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
              Assistant IA{" "}
              <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
                réglementaire
              </span>{" "}
              inclus
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
                  <div className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-violet-400" />
                  </div>
                  <span className="text-sm text-slate-400">{topic}</span>
                </div>
              ))}
            </div>

            <div className="inline-flex items-center gap-2 text-xs text-slate-600 bg-[#0a0f1a] rounded-full px-4 py-2 border border-white/[0.06]">
              <Bot className="h-3.5 w-3.5 text-violet-400" />
              Propulsé par Claude AI (Anthropic) · Plan Unlimited
            </div>
          </motion.div>

          {/* ── Colonne droite — exemple d'échange ── */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            {/* Halo violet derrière la carte */}
            <div
              className="absolute inset-0 rounded-3xl blur-[60px] pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse, rgba(139,92,246,0.12) 0%, transparent 70%)",
              }}
            />

            <div className="relative rounded-2xl border border-violet-500/20 bg-[#0a0f1a]/90 backdrop-blur-xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-violet-500/10 bg-violet-500/[0.04]">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    Assistant IA réglementaire
                  </p>
                  <p className="text-xs text-slate-500">
                    FleetMaster Pro · Claude AI (Anthropic)
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs text-emerald-400">En ligne</span>
                </div>
              </div>

              {/* Corps de la conversation */}
              <div className="p-5 space-y-4">
                {/* Question utilisateur */}
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-violet-500/20 border border-violet-500/20 px-4 py-3">
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {exampleQuestion}
                    </p>
                  </div>
                </div>

                {/* Réponse IA */}
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div className="flex-1 rounded-2xl rounded-tl-sm bg-[#0f172a] border border-white/[0.08] px-4 py-3">
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {exampleAnswer}
                    </p>
                    <p className="text-xs text-slate-600 mt-2 pt-2 border-t border-white/[0.06]">
                      Règlement CE 561/2006 · Réponse indicative, non-juridique
                    </p>
                  </div>
                </div>
              </div>

              {/* Champ de saisie fictif */}
              <div className="px-5 pb-5">
                <div className="flex items-center gap-3 rounded-xl bg-[#0f172a] border border-white/[0.08] px-4 py-3">
                  <span className="text-sm text-slate-600 flex-1">
                    Posez votre question réglementaire...
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0">
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

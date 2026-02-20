"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Wrench, Route, Bell, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ONBOARDING_TEXTS } from "@/lib/onboarding/constants";

const iconMap = {
  Wrench,
  Route,
  Bell,
};

interface StepCompleteProps {
  onComplete: () => Promise<void>;
  isLoading: boolean;
  recap: {
    companyName: string;
    hasVehicle: boolean;
    hasDriver: boolean;
  };
}

export function StepComplete({
  onComplete,
  isLoading,
  recap,
}: StepCompleteProps) {
  const texts = ONBOARDING_TEXTS.complete;

  return (
    <div className="space-y-8">
      {/* Header avec animation */}
      <div className="text-center space-y-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="w-20 h-20 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center mx-auto"
        >
          <CheckCircle2 className="w-10 h-10 text-white" />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-3xl font-bold text-white"
        >
          {texts.headline}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-lg text-slate-400"
        >
          {texts.subheadline}
        </motion.p>
      </div>

      {/* Récapitulatif */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50"
      >
        <h3 className="text-sm font-semibold text-slate-400 mb-3">
          {texts.recap.title}
        </h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
            <span className="text-white">{texts.recap.company}</span>
            <span className="text-slate-500">• {recap.companyName}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2
              className={`w-4 h-4 ${
                recap.hasVehicle ? "text-cyan-400" : "text-slate-600"
              }`}
            />
            <span className={recap.hasVehicle ? "text-white" : "text-slate-500"}>
              {texts.recap.vehicle}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2
              className={`w-4 h-4 ${
                recap.hasDriver ? "text-cyan-400" : "text-slate-600"
              }`}
            />
            <span className={recap.hasDriver ? "text-white" : "text-slate-500"}>
              {texts.recap.driver}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Conseils */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="grid gap-3"
      >
        <h3 className="text-sm font-semibold text-slate-400 mb-1">
          Prochaines étapes suggérées
        </h3>
        {texts.tips.map((tip, index) => {
          const Icon = iconMap[tip.icon as keyof typeof iconMap];
          return (
            <div
              key={tip.title}
              className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/30 border border-slate-700/30 hover:border-cyan-500/20 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <h4 className="font-medium text-white text-sm">{tip.title}</h4>
                <p className="text-xs text-slate-400">{tip.description}</p>
              </div>
            </div>
          );
        })}
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="pt-4"
      >
        <Button
          onClick={onComplete}
          disabled={isLoading}
          size="lg"
          className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] text-white border-0"
        >
          {isLoading ? (
            "Chargement..."
          ) : (
            <>
              {texts.cta}
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </motion.div>
    </div>
  );
}

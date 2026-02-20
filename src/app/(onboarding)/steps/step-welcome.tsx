"use client";

import { motion } from "framer-motion";
import { Shield, TrendingDown, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ONBOARDING_TEXTS } from "@/lib/onboarding/constants";
import { SkipButton } from "@/components/onboarding/skip-button";

const iconMap = {
  Shield,
  TrendingDown,
  Clock,
};

interface StepWelcomeProps {
  onNext: () => void;
  onSkip: () => Promise<void>;
  isLoading: boolean;
}

export function StepWelcome({ onNext, onSkip, isLoading }: StepWelcomeProps) {
  const texts = ONBOARDING_TEXTS.welcome;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl sm:text-4xl font-bold"
        >
          <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-orange-400 bg-clip-text text-transparent">
            {texts.headline}
          </span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-lg text-slate-400 max-w-lg mx-auto"
        >
          {texts.subheadline}
        </motion.p>
      </div>

      {/* Features */}
      <div className="grid gap-4 sm:grid-cols-3">
        {texts.features.map((feature, index) => {
          const Icon = iconMap[feature.icon as keyof typeof iconMap];
          return (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-cyan-500/30 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-3">
                <Icon className="w-5 h-5 text-cyan-400" />
              </div>
              <h3 className="font-semibold text-white mb-1">{feature.title}</h3>
              <p className="text-sm text-slate-400">{feature.description}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
      >
        <Button
          onClick={onNext}
          disabled={isLoading}
          size="lg"
          className="w-full sm:w-auto bg-gradient-to-r from-cyan-500 to-blue-500 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] text-white border-0 px-8"
        >
          {texts.cta}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>

        <SkipButton onSkip={onSkip} isLoading={isLoading} />
      </motion.div>

      {/* Info */}
      <p className="text-center text-xs text-slate-500">
        Durée estimée : 5 minutes
      </p>
    </div>
  );
}

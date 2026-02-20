"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { ONBOARDING_STEPS } from "@/lib/onboarding/constants";
import { cn } from "@/lib/utils";

interface StepNavigationProps {
  currentStep: number;
  isLoading?: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSkip?: () => void;
  isLastStep?: boolean;
  nextDisabled?: boolean;
}

export function StepNavigation({
  currentStep,
  isLoading = false,
  onPrevious,
  onNext,
  onSkip,
  isLastStep = false,
  nextDisabled = false,
}: StepNavigationProps) {
  const step = ONBOARDING_STEPS.find((s) => s.id === currentStep);
  const isFirstStep = currentStep === 1;
  // @ts-ignore
  const isOptional = step?.optional;

  return (
    <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-700/50">
      {/* Bouton précédent */}
      <Button
        variant="ghost"
        onClick={onPrevious}
        disabled={isFirstStep || isLoading}
        className={cn(
          "text-slate-400 hover:text-white hover:bg-slate-800",
          isFirstStep && "invisible"
        )}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Précédent
      </Button>

      {/* Centre: Skip optionnel */}
      <div className="flex-1 flex justify-center">
        {isOptional && onSkip && !isLastStep && (
          <button
            onClick={onSkip}
            disabled={isLoading}
            className="text-sm text-slate-500 hover:text-slate-300 transition-colors underline underline-offset-4"
          >
            Passer cette étape
          </button>
        )}
      </div>

      {/* Bouton suivant/terminer */}
      <Button
        onClick={onNext}
        disabled={nextDisabled || isLoading}
        className={cn(
          "bg-gradient-to-r from-cyan-500 to-blue-500 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] text-white border-0",
          nextDisabled && "opacity-50 cursor-not-allowed"
        )}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Chargement...
          </>
        ) : isLastStep ? (
          <>
            Terminer
            <ArrowRight className="w-4 h-4 ml-2" />
          </>
        ) : (
          <>
            Continuer
            <ArrowRight className="w-4 h-4 ml-2" />
          </>
        )}
      </Button>
    </div>
  );
}

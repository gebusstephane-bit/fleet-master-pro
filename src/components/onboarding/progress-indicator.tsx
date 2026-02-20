"use client";

import { motion } from "framer-motion";
import { ONBOARDING_STEPS } from "@/lib/onboarding/constants";
import { cn } from "@/lib/utils";

interface ProgressIndicatorProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export function ProgressIndicator({
  currentStep,
  onStepClick,
}: ProgressIndicatorProps) {
  return (
    <div className="w-full max-w-md mx-auto mb-8">
      {/* Barre de progression */}
      <div className="relative">
        {/* Ligne de fond */}
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-700 -translate-y-1/2" />
        
        {/* Ligne de progression active */}
        <motion.div
          className="absolute top-1/2 left-0 h-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 -translate-y-1/2"
          initial={{ width: "0%" }}
          animate={{
            width: `${((currentStep - 1) / (ONBOARDING_STEPS.length - 1)) * 100}%`,
          }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        />

        {/* Points */}
        <div className="relative flex justify-between">
          {ONBOARDING_STEPS.map((step) => {
            const isCompleted = step.id < currentStep;
            const isCurrent = step.id === currentStep;
            const isPending = step.id > currentStep;

            return (
              <button
                key={step.id}
                onClick={() => onStepClick?.(step.id)}
                disabled={isPending && !onStepClick}
                className={cn(
                  "relative flex flex-col items-center group",
                  isPending && !onStepClick && "cursor-default"
                )}
              >
                {/* Cercle */}
                <motion.div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                    isCompleted &&
                      "bg-gradient-to-r from-cyan-500 to-blue-500 border-cyan-500",
                    isCurrent &&
                      "bg-slate-900 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.5)]",
                    isPending && "bg-slate-800 border-slate-600"
                  )}
                  animate={
                    isCurrent
                      ? {
                          scale: [1, 1.1, 1],
                          boxShadow: [
                            "0 0 15px rgba(6,182,212,0.5)",
                            "0 0 25px rgba(6,182,212,0.8)",
                            "0 0 15px rgba(6,182,212,0.5)",
                          ],
                        }
                      : {}
                  }
                  transition={{
                    duration: 2,
                    repeat: isCurrent ? Infinity : 0,
                  }}
                >
                  {isCompleted ? (
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        isCurrent ? "text-cyan-400" : "text-slate-500"
                      )}
                    >
                      {step.id}
                    </span>
                  )}
                </motion.div>

                {/* Label */}
                <span
                  className={cn(
                    "absolute -bottom-6 text-xs whitespace-nowrap transition-colors",
                    isCurrent
                      ? "text-cyan-400 font-medium"
                      : isCompleted
                      ? "text-slate-300"
                      : "text-slate-500"
                  )}
                >
                  {step.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

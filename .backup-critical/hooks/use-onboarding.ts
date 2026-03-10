"use client";

/**
 * Hook isolé pour la gestion de l'onboarding
 * NE PAS utiliser useUser (critique) - Passer user en prop depuis layout
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { STORAGE_KEY } from "@/lib/onboarding/constants";

interface UseOnboardingProps {
  companyId: string;
  initialStep?: number;
}

interface UseOnboardingReturn {
  currentStep: number;
  isLoading: boolean;
  goToStep: (step: number) => void;
  nextStep: () => void;
  previousStep: () => void;
  completeOnboarding: () => Promise<void>;
  skipOnboarding: () => Promise<void>;
}

export function useOnboarding({
  companyId,
  initialStep = 1,
}: UseOnboardingProps): UseOnboardingReturn {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Récupérer la progression depuis localStorage au mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const saved = localStorage.getItem(`${STORAGE_KEY}_${companyId}`);
    if (saved) {
      const savedStep = parseInt(saved, 10);
      if (savedStep >= 1 && savedStep <= 5) {
        setCurrentStep(savedStep);
      }
    }
  }, [companyId]);

  // Sauvegarder la progression
  const saveProgress = useCallback(
    (step: number) => {
      if (typeof window === "undefined") return;
      localStorage.setItem(`${STORAGE_KEY}_${companyId}`, step.toString());
    },
    [companyId]
  );

  const goToStep = useCallback(
    (step: number) => {
      if (step >= 1 && step <= 5) {
        setCurrentStep(step);
        saveProgress(step);
      }
    },
    [saveProgress]
  );

  const nextStep = useCallback(() => {
    if (currentStep < 5) {
      const next = currentStep + 1;
      setCurrentStep(next);
      saveProgress(next);
    }
  }, [currentStep, saveProgress]);

  const previousStep = useCallback(() => {
    if (currentStep > 1) {
      const prev = currentStep - 1;
      setCurrentStep(prev);
      saveProgress(prev);
    }
  }, [currentStep, saveProgress]);

  const completeOnboarding = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la finalisation");
      }

      // Nettoyer le localStorage
      if (typeof window !== "undefined") {
        localStorage.removeItem(`${STORAGE_KEY}_${companyId}`);
      }

      router.push("/dashboard");
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  const skipOnboarding = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/onboarding/skip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors du saut");
      }

      if (typeof window !== "undefined") {
        localStorage.removeItem(`${STORAGE_KEY}_${companyId}`);
      }

      router.push("/dashboard");
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  return {
    currentStep,
    isLoading,
    goToStep,
    nextStep,
    previousStep,
    completeOnboarding,
    skipOnboarding,
  };
}

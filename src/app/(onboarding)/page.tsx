"use client";

/**
 * Page Onboarding - Router entre les étapes
 * Gère l'état et la navigation du wizard
 */

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { OnboardingLayout } from "@/components/onboarding/onboarding-layout";
import { useOnboarding } from "@/hooks/use-onboarding";
import { StepWelcome } from "./steps/step-welcome";
import { StepCompany } from "./steps/step-company";
import { StepVehicle } from "./steps/step-vehicle";
import { StepDriver } from "./steps/step-driver";
import { StepComplete } from "./steps/step-complete";
import {
  CompanyStepData,
  VehicleStepData,
  DriverStepData,
} from "@/lib/onboarding/validation";

// Données persistantes pendant le wizard
interface WizardData {
  company?: CompanyStepData;
  vehicle?: VehicleStepData;
  driver?: DriverStepData | null;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [companyId, setCompanyId] = useState<string>("");
  const [wizardData, setWizardData] = useState<WizardData>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Hook onboarding - récupère companyId depuis l'API
  const {
    currentStep,
    goToStep,
    nextStep,
    previousStep,
    completeOnboarding,
    skipOnboarding,
    isLoading,
  } = useOnboarding({
    companyId,
    initialStep: 1,
  });

  // Récupérer companyId au mount
  useState(() => {
    fetch("/api/onboarding/status")
      .then((res) => res.json())
      .then((data) => {
        if (data.companyId) {
          setCompanyId(data.companyId);
        }
      })
      .catch(console.error);
  });

  // Étape 2: Soumission entreprise
  const handleCompanySubmit = useCallback(
    async (data: CompanyStepData) => {
      setIsSubmitting(true);
      try {
        const response = await fetch("/api/onboarding/company", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!response.ok) throw new Error("Erreur sauvegarde");

        setWizardData((prev) => ({ ...prev, company: data }));
        nextStep();
      } finally {
        setIsSubmitting(false);
      }
    },
    [nextStep]
  );

  // Étape 3: Soumission véhicule
  const handleVehicleSubmit = useCallback(
    async (data: VehicleStepData) => {
      setIsSubmitting(true);
      try {
        const response = await fetch("/api/onboarding/vehicle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!response.ok) throw new Error("Erreur création véhicule");

        setWizardData((prev) => ({ ...prev, vehicle: data }));
        nextStep();
      } finally {
        setIsSubmitting(false);
      }
    },
    [nextStep]
  );

  // Étape 4: Soumission chauffeur (optionnel)
  const handleDriverSubmit = useCallback(
    async (data: DriverStepData | null) => {
      if (!data) {
        // Skip
        nextStep();
        return;
      }

      setIsSubmitting(true);
      try {
        const response = await fetch("/api/onboarding/driver", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!response.ok) throw new Error("Erreur création chauffeur");

        setWizardData((prev) => ({ ...prev, driver: data }));
        nextStep();
      } finally {
        setIsSubmitting(false);
      }
    },
    [nextStep]
  );

  // Rendu conditionnel selon l'étape
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <StepWelcome
            onNext={nextStep}
            onSkip={skipOnboarding}
            isLoading={isLoading}
          />
        );

      case 2:
        return (
          <StepCompany
            companyId={companyId}
            initialData={wizardData.company}
            onSubmit={handleCompanySubmit}
            onPrevious={previousStep}
            isLoading={isSubmitting}
          />
        );

      case 3:
        return (
          <StepVehicle
            companyId={companyId}
            initialData={wizardData.vehicle}
            onSubmit={handleVehicleSubmit}
            onPrevious={previousStep}
            isLoading={isSubmitting}
          />
        );

      case 4:
        return (
          <StepDriver
            companyId={companyId}
            initialData={wizardData.driver || undefined}
            onSubmit={handleDriverSubmit}
            onPrevious={previousStep}
            onSkip={() => {
              setWizardData((prev) => ({ ...prev, driver: null }));
              nextStep();
            }}
            isLoading={isSubmitting}
          />
        );

      case 5:
        return (
          <StepComplete
            onComplete={completeOnboarding}
            isLoading={isLoading}
            recap={{
              companyName: wizardData.company?.name || "",
              hasVehicle: !!wizardData.vehicle,
              hasDriver: !!wizardData.driver,
            }}
          />
        );

      default:
        return null;
    }
  };

  return (
    <OnboardingLayout currentStep={currentStep} onStepClick={goToStep}>
      {renderStep()}
    </OnboardingLayout>
  );
}

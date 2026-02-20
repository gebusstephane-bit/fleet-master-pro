"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { FloatingParticlesSimple } from "@/components/effects/FloatingParticles";
import { ProgressIndicator } from "./progress-indicator";
import { Logo } from "@/components/layout/logo";
import { ReactNode } from "react";

interface OnboardingLayoutProps {
  children: ReactNode;
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export function OnboardingLayout({
  children,
  currentStep,
  onStepClick,
}: OnboardingLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-[#0a0f1a]">
      {/* Image de fond hero-fleet */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/hero-fleet.jpg"
          alt="Fleet background"
          fill
          className="object-cover opacity-40"
          priority
        />
        {/* Overlay navy */}
        <div className="absolute inset-0 bg-[#0a0f1a]/85" />
        {/* Dégradés subtils */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5" />
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(at 20% 20%, rgba(6,182,212,0.08) 0px, transparent 40%),
              radial-gradient(at 80% 80%, rgba(59,130,246,0.08) 0px, transparent 40%)
            `,
          }}
        />
      </div>

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-20 z-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(6, 182, 212, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(6, 182, 212, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Étoiles flottantes */}
      <FloatingParticlesSimple count={30} />

      {/* Header avec logo */}
      <header className="relative z-10 w-full p-6">
        <div className="max-w-7xl mx-auto flex justify-center">
          <Logo size="lg" variant="light" />
        </div>
      </header>

      {/* Contenu principal */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-8">
        {/* Progress indicator */}
        <div className="w-full max-w-2xl mb-12">
          <ProgressIndicator
            currentStep={currentStep}
            onStepClick={onStepClick}
          />
        </div>

        {/* Carte du formulaire avec animation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-2xl"
        >
          <div className="backdrop-blur-xl bg-[#0f172a]/70 rounded-2xl border border-cyan-500/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_20px_rgba(6,182,212,0.1)] p-8">
            {children}
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full p-6 text-center">
        <p className="text-sm text-slate-500">
          Besoin d'aide ?{" "}
          <a
            href="mailto:support@fleetmaster.pro"
            className="text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            Contactez notre équipe
          </a>
        </p>
      </footer>
    </div>
  );
}

import { Metadata } from "next";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { SocialProof } from "@/components/landing/SocialProof";
import { Features } from "@/components/landing/Features";
import { WhyFleetMaster } from "@/components/landing/WhyFleetMaster";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Testimonials } from "@/components/landing/Testimonials";
import { Pricing } from "@/components/landing/Pricing";
import { CTAFinal } from "@/components/landing/CTAFinal";
import { FAQ } from "@/components/landing/FAQ";
import { Footer } from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "FleetMaster Pro — Gestion de flotte intelligente pour transporteurs",
  description:
    "FleetMaster Pro centralise la gestion de votre parc : maintenance prédictive IA, géolocalisation temps réel, conformité documentaire automatique. Réduisez vos coûts de 30%.",
  keywords: [
    "gestion flotte",
    "transport",
    "logistique",
    "maintenance prédictive",
    "GPS véhicule",
    "gestion parc automobile",
    "SaaS transport",
  ],
  openGraph: {
    title: "FleetMaster Pro — Gestion de flotte intelligente",
    description:
      "La plateforme tout-en-un qui transforme la gestion de parc en avantage compétitif. Anticipez les pannes, réduisez vos coûts de 30%.",
    type: "website",
  },
};

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      {/* Navigation fixe */}
      <Navbar />

      {/* SECTION 1 — Hero : accroche + aperçu dashboard */}
      <Hero />

      {/* SECTION 2 — Chiffres clés / preuves sociales */}
      <SocialProof />

      {/* SECTION 3 — 14 fonctionnalités en grille complète */}
      <section id="features">
        <Features />
      </section>

      {/* SECTION 4 — Pourquoi FleetMaster (5 avantages compétitifs) */}
      <WhyFleetMaster />

      {/* SECTION 5 — Comment ça marche (3 étapes) */}
      <HowItWorks />

      {/* Témoignages clients */}
      <Testimonials />

      {/* Tarifs */}
      <section id="pricing">
        <Pricing />
      </section>

      {/* SECTION 6 — CTA final */}
      <CTAFinal />

      {/* FAQ */}
      <section id="faq">
        <FAQ />
      </section>

      {/* Footer */}
      <Footer />
    </main>
  );
}

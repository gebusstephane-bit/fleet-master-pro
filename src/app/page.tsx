import { Metadata } from "next";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { PainPoints } from "@/components/landing/PainPoints";
import { Features } from "@/components/landing/Features";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { AIAssistant } from "@/components/landing/AIAssistant";
import { TargetAudience } from "@/components/landing/TargetAudience";
import { Testimonials } from "@/components/landing/Testimonials";
import { PricingTeaser } from "@/components/landing/PricingTeaser";
import { CTAFinal } from "@/components/landing/CTAFinal";
import { FAQ } from "@/components/landing/FAQ";
import { Footer } from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "FleetMaster Pro — Conformité et gestion de flotte pour transporteurs",
  description:
    "Centralisez documents, inspections et maintenances de votre flotte. Alertes automatiques, score de fiabilité, inspections QR sans app. Essai 14 jours gratuit.",
  keywords: [
    "gestion flotte",
    "conformité transport",
    "DREAL",
    "maintenance préventive",
    "inspection véhicule",
    "logiciel transport",
  ],
  openGraph: {
    title: "FleetMaster Pro — Conformité et gestion de flotte pour transporteurs",
    description:
      "Centralisez documents, inspections et maintenances de votre flotte. Alertes automatiques, score de fiabilité, inspections QR sans app. Essai 14 jours gratuit.",
    type: "website",
  },
};

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#0a0f1a]">
      {/* Navigation fixe */}
      <Navbar />

      {/* SECTION 1 — Hero */}
      <Hero />

      {/* SECTION 2 — Situations douleur métier */}
      <PainPoints />

      {/* SECTION 3 — 6 fonctionnalités réelles */}
      <section id="features">
        <Features />
      </section>

      {/* Comment ça marche (3 étapes) */}
      <HowItWorks />

      {/* Assistant IA réglementaire */}
      <AIAssistant />

      {/* Pour qui (3 profils cibles) */}
      <TargetAudience />

      {/* SECTION 4 — Témoignages */}
      <Testimonials />

      {/* SECTION 5 — Aperçu tarifs */}
      <section id="pricing">
        <PricingTeaser />
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

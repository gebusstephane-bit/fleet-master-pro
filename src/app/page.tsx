import { Metadata } from "next";
import { Navbar } from "@/components/landing/Navbar";
import { HeroFixed } from "@/components/landing/HeroFixed";
import { FeaturesV2 } from "@/components/landing/FeaturesV2";
import { HowItWorksV2 } from "@/components/landing/HowItWorksV2";
import { PricingTeaser } from "@/components/landing/PricingTeaser";
import { FAQ } from "@/components/landing/FAQ";
import { Footer } from "@/components/landing/Footer";
import { ParallaxContainer, WarpEffect } from "@/components/landing/FXLayer";

export const metadata: Metadata = {
  title: "Logiciel Gestion de Flotte Transport | Suivi Véhicules & Alertes - FleetMaster",
  description: "Fini les fichiers Excel et les oublis d'entretien. Centralisez la gestion de votre flotte (alertes, plannings, coûts) avec un SaaS conçu par des exploitants transport.",
  keywords: ["gestion de flotte", "logiciel transport PME", "suivi véhicules", "alerte contrôle technique", "alternative excel flotte", "FleetMaster"],
  alternates: {
    canonical: "https://fleet-master.fr",
  },
  openGraph: {
    title: "Logiciel Gestion de Flotte Transport | Suivi Véhicules & Alertes - FleetMaster",
    description: "Fini les fichiers Excel et les oublis d'entretien. Centralisez la gestion de votre flotte avec un SaaS conçu par des exploitants.",
    url: "https://fleet-master.fr",
    siteName: "FleetMaster",
    locale: "fr_FR",
    type: "website",
    images: [
      {
        url: "https://fleet-master.fr/og-image.png",
        width: 1200,
        height: 630,
        alt: "FleetMaster - Logiciel gestion de flotte transport PME",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Logiciel Gestion de Flotte Transport | FleetMaster",
    description: "Centralisez la gestion de votre flotte. Alertes automatiques, suivi maintenance, coûts en temps réel.",
    images: ["https://fleet-master.fr/og-image.png"],
  },
};

export default function LandingPage() {
  return (
    <main className="min-h-screen text-white overflow-x-hidden relative bg-[#020617]">
      {/* EFFET WARP AU SCROLL */}
      <WarpEffect />
      
      {/* PARALLAX 5 COUCHES */}
      <ParallaxContainer>
        {/* Navigation */}
        <Navbar />
        
        {/* SECTION 1 — HERO 5DX */}
        <HeroFixed />
        
        {/* SECTION 2 — FEATURES 5DX */}
        <FeaturesV2 />
        
        {/* SECTION 3 — TIMELINE 5DX */}
        <HowItWorksV2 />
        
        {/* SECTION 4 — PRICING 5DX */}
        <section id="pricing">
          <PricingTeaser />
        </section>
        
        {/* SECTION 5 — FAQ */}
        <section id="faq">
          <FAQ />
        </section>
        
        {/* SECTION 6 — FOOTER */}
        <Footer />
      </ParallaxContainer>
    </main>
  );
}

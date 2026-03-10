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
  title: "FleetMaster Pro — Commandez votre flotte | Intelligence Artificielle",
  description:
    "SaaS de gestion de flotte nouvelle génération. IA prédictive, conformité automatique, inspections QR. Pilotez votre flotte comme un commandant.",
  keywords: [
    "gestion flotte",
    "fleet management",
    "intelligence artificielle",
    "maintenance prédictive",
    "conformité transport",
    "DREAL",
  ],
  openGraph: {
    title: "FleetMaster Pro — Commandez votre flotte",
    description: "Intelligence artificielle prédictive pour flottes. Déployez en 3 minutes.",
    type: "website",
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

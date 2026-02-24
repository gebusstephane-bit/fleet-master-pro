import { Metadata } from "next";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { SocialProof } from "@/components/landing/SocialProof";
import { ProblemSolution } from "@/components/landing/ProblemSolution";
import { Features } from "@/components/landing/Features";
import { Testimonials } from "@/components/landing/Testimonials";
import { Pricing } from "@/components/landing/Pricing";
import { FAQ } from "@/components/landing/FAQ";
import { Footer } from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "FleetMaster - Gestion de flotte intelligente",
  description: "La première plateforme de gestion de flotte qui anticipe les pannes avant qu'elles n'arrivent. Réduisez vos coûts de 30%.",
  keywords: ["gestion flotte", "transport", "logistique", "maintenance prédictive", "GPS", "véhicules"],
  openGraph: {
    title: "FleetMaster - Gestion de flotte intelligente",
    description: "La première plateforme de gestion de flotte qui anticipe les pannes avant qu'elles n'arrivent.",
    type: "website",
  },
};

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <SocialProof />
      <ProblemSolution />
      <section id="features">
        <Features />
      </section>
      <Testimonials />
      <section id="pricing">
        <Pricing />
      </section>
      <section id="faq">
        <FAQ />
      </section>
      <Footer />
    </main>
  );
}

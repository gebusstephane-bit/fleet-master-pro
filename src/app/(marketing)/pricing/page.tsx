"use client";

import { motion, useMotionValue, useTransform, useSpring, AnimatePresence } from "framer-motion";
import { useRef, useState } from "react";
import Link from "next/link";
import { Check, ArrowRight, Zap, Crown, Rocket, HelpCircle, Lock, Shield, Headphones } from "lucide-react";
import { Navbar } from "@/components/landing/Navbar";
import { WarpEffect } from "@/components/landing/FXLayer";
import { PLANS, ACTIVE_PLANS, getYearlySavings } from "@/lib/plans";
import type { PlanId } from "@/lib/plans";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// ─── Accents par plan (identiques à PricingTeaser) ──────────────────────────
const PLAN_ACCENTS: Record<string, {
  accent: string;
  glow: string;
  icon: React.ElementType;
}> = {
  essential: {
    accent: "#64748b",
    glow: "rgba(100, 116, 139, 0.6)",
    icon: Zap,
  },
  pro: {
    accent: "#00d4ff",
    glow: "rgba(0, 212, 255, 0.8)",
    icon: Crown,
  },
  unlimited: {
    accent: "#a78bfa",
    glow: "rgba(167, 139, 250, 0.6)",
    icon: Rocket,
  },
};

// ─── Carte pricing avec effet Black Hole (copie exacte de PricingTeaser) ────
function PricingCard({
  planId,
  index,
  yearly,
}: {
  planId: string;
  index: number;
  yearly: boolean;
}) {
  const plan = PLANS[planId as PlanId];
  const pa = PLAN_ACCENTS[planId] || PLAN_ACCENTS.essential;
  const Icon = pa.icon;
  const savings = getYearlySavings(planId as PlanId);
  const displayPrice = yearly ? Math.round(plan.priceYearly / 12) : plan.priceMonthly;

  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  const rotateX = useSpring(useTransform(mouseY, [0, 1], [8, -8]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(mouseX, [0, 1], [-8, 8]), { stiffness: 300, damping: 30 });

  const borderX = useSpring(useTransform(mouseX, [0, 1], [0, 100]), { stiffness: 500, damping: 30 });
  const borderY = useSpring(useTransform(mouseY, [0, 1], [0, 100]), { stiffness: 500, damping: 30 });

  const angle = useTransform(() => {
    const x = mouseX.get();
    const y = mouseY.get();
    return Math.atan2(y - 0.5, x - 0.5) * (180 / Math.PI) + 90;
  });
  const smoothAngle = useSpring(angle, { stiffness: 500, damping: 30 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top) / rect.height);
  };

  const handleMouseLeave = () => {
    mouseX.set(0.5);
    mouseY.set(0.5);
    setIsHovered(false);
  };

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 60, rotateX: 20 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.8, delay: index * 0.15, ease: [0.22, 1, 0.36, 1] }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX: isHovered ? rotateX : 0,
        rotateY: isHovered ? rotateY : 0,
        transformStyle: "preserve-3d",
      }}
      className={`relative group ${plan.popular ? "lg:-mt-6 lg:mb-6 z-20" : "z-10"}`}
    >
      {/* Glow externe au repos */}
      <div
        className="absolute -inset-1 rounded-2xl blur-2xl opacity-0 group-hover:opacity-100 transition-all duration-700"
        style={{ background: `radial-gradient(circle at 50% 50%, ${pa.glow} 0%, transparent 70%)` }}
      />

      {/* Carte principale avec bandeau lumineux */}
      <div className="relative rounded-2xl overflow-hidden" style={{ transformStyle: "preserve-3d" }}>

        {/* BANDEAU LUMINEUX 4D */}
        <motion.div
          className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: `conic-gradient(from ${smoothAngle.get()}deg at ${borderX.get()}% ${borderY.get()}%, transparent 0deg, ${pa.accent} 20deg, ${pa.accent} 40deg, transparent 60deg, transparent 360deg)`,
            filter: "blur(8px)",
          }}
        />

        {/* Bordure fine */}
        <motion.div
          className="absolute inset-[1px] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            background: `conic-gradient(from ${smoothAngle.get()}deg at ${borderX.get()}% ${borderY.get()}%, transparent 0deg, ${pa.accent} 10deg, ${pa.accent} 30deg, transparent 50deg, transparent 360deg)`,
          }}
        />

        {/* Fond */}
        <div
          className="relative h-full rounded-2xl overflow-hidden transition-all duration-500"
          style={{
            background: isHovered
              ? "linear-gradient(135deg, #020617 0%, #0f172a 50%, #020617 100%)"
              : "linear-gradient(135deg, rgba(15, 23, 42, 0.6) 0%, rgba(30, 41, 59, 0.4) 100%)",
            backdropFilter: "blur(20px)",
          }}
        >
          {/* Spotlight interne */}
          <motion.div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            style={{
              background: `radial-gradient(circle at ${borderX.get()}% ${borderY.get()}%, ${pa.glow} 0%, transparent 50%)`,
            }}
          />

          {/* Badge POPULAIRE */}
          {plan.popular && (
            <motion.div
              className="absolute -top-px left-1/2 -translate-x-1/2 z-20"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <div
                className="flex items-center gap-1.5 px-5 py-2 rounded-b-xl font-bold text-xs uppercase tracking-wider shadow-lg"
                style={{
                  background: `linear-gradient(135deg, ${pa.accent} 0%, #3b82f6 100%)`,
                  color: "#000",
                  boxShadow: `0 10px 40px ${pa.glow}`,
                }}
              >
                <Zap className="h-3.5 w-3.5" />
                Le plus choisi
              </div>
            </motion.div>
          )}

          <div className="relative p-8 flex flex-col h-full">
            {/* Icône et nom */}
            <div className="flex items-center gap-3 mb-4">
              <motion.div
                className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300"
                style={{
                  background: isHovered
                    ? `linear-gradient(135deg, ${pa.accent}30 0%, ${pa.accent}10 100%)`
                    : "rgba(255,255,255,0.05)",
                  border: `1px solid ${isHovered ? pa.accent : "rgba(255,255,255,0.1)"}`,
                  boxShadow: isHovered ? `0 0 30px ${pa.glow}` : "none",
                }}
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <Icon className="h-6 w-6 transition-colors duration-300" style={{ color: pa.accent }} />
              </motion.div>
              <div>
                <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                <p className="text-xs uppercase tracking-wider" style={{ color: pa.accent }}>
                  {plan.description}
                </p>
              </div>
            </div>

            {/* Prix */}
            <div className="mb-6">
              <div className="flex items-baseline gap-1">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={`${planId}-${yearly}`}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.2 }}
                    className="text-5xl font-extrabold tabular-nums tracking-tight transition-all duration-300"
                    style={{
                      color: pa.accent,
                      textShadow: isHovered ? `0 0 40px ${pa.glow}` : "none",
                    }}
                  >
                    {displayPrice}€
                  </motion.span>
                </AnimatePresence>
                <span className="text-slate-500 text-sm">/mois</span>
              </div>
              {yearly ? (
                <p className="text-xs text-slate-400 mt-1">
                  {plan.priceYearly}€/an · <span style={{ color: pa.accent }}>Économisez {savings}€</span>
                </p>
              ) : (
                <p className="text-sm text-slate-400 mt-1">{plan.description}</p>
              )}
            </div>

            {/* Features */}
            <ul className="flex-1 space-y-3 mb-8">
              {plan.features.map((feature, i) => (
                <motion.li
                  key={feature}
                  className="flex items-start gap-3"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                >
                  <motion.div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition-all duration-300"
                    style={{
                      background: isHovered ? `${pa.accent}30` : "rgba(255,255,255,0.1)",
                      border: `1px solid ${isHovered ? pa.accent : "transparent"}`,
                    }}
                  >
                    <Check className="h-3 w-3" style={{ color: pa.accent }} />
                  </motion.div>
                  <span className="text-sm text-slate-300">{feature}</span>
                </motion.li>
              ))}
            </ul>

            {/* CTA */}
            <Link
              href={`/register?plan=${planId}&billing=${yearly ? "yearly" : "monthly"}`}
              className="mt-auto"
            >
              <motion.button
                className="w-full py-3.5 rounded-xl font-semibold text-sm relative overflow-hidden transition-all duration-300"
                style={{
                  background: plan.popular
                    ? `linear-gradient(135deg, ${pa.accent} 0%, #3b82f6 100%)`
                    : isHovered
                    ? `linear-gradient(135deg, ${pa.accent}20 0%, ${pa.accent}10 100%)`
                    : "rgba(255,255,255,0.05)",
                  color: plan.popular ? "#000" : isHovered ? "#fff" : "#94a3b8",
                  border: `1px solid ${isHovered || plan.popular ? pa.accent : "rgba(255,255,255,0.1)"}`,
                  boxShadow: isHovered || plan.popular ? `0 0 30px ${pa.glow}` : "none",
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {/* Shimmer */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                  initial={{ x: "-100%" }}
                  whileHover={{ x: "100%" }}
                  transition={{ duration: 0.6 }}
                />
                <span className="relative flex items-center justify-center gap-2">
                  Essai gratuit 14 jours
                  <ArrowRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-1"
                    style={{ color: plan.popular ? "#000" : pa.accent }}
                  />
                </span>
              </motion.button>
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── FAQ ────────────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  {
    question: "L'essai gratuit nécessite-t-il une carte bancaire ?",
    answer: "Non, aucune carte bancaire n'est requise pendant les 14 jours d'essai. Vous pouvez tester toutes les fonctionnalités du plan PRO sans engagement.",
  },
  {
    question: "Que se passe-t-il après l'essai ?",
    answer: "À la fin des 14 jours, vous pouvez choisir le plan qui vous convient. Si vous ne faites pas de choix, votre compte passe automatiquement sur le plan Essential avec 5 véhicules pour garder l'accès à vos données.",
  },
  {
    question: "Puis-je changer de plan ?",
    answer: "Oui, vous pouvez changer de plan à tout moment. Le changement est effectif immédiatement et la facturation est calculée au prorata.",
  },
  {
    question: "Puis-je annuler quand je veux ?",
    answer: "Absolument. Il n'y a aucun engagement de durée. Vous pouvez annuler votre abonnement à tout moment sans frais.",
  },
  {
    question: "Proposez-vous des devis pour les flottes >50 véhicules ?",
    answer: "Oui, pour les grandes flottes nous proposons des tarifs personnalisés. Contactez-nous pour obtenir un devis adapté à vos besoins.",
  },
];

// ─── Page ────────────────────────────────────────────────────────────────────
export default function PricingPage() {
  const [yearly, setYearly] = useState(false);

  return (
    <main className="min-h-screen text-white overflow-x-hidden relative bg-[#020617]">
      {/* Effets de fond identiques à la landing */}
      <WarpEffect />

      {/* Nébuleuse de fond */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,212,255,0.15)_0%,_transparent_70%)]" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px]" />
      </div>

      {/* Navbar identique à la landing */}
      <Navbar />

      {/* Section pricing */}
      <section className="pt-32 pb-24 relative overflow-hidden">
        {/* Background gradient cosmos */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#00d4ff]/5 to-transparent pointer-events-none" />

        {/* Glows massifs */}
        <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#00d4ff]/10 rounded-full blur-[200px] pointer-events-none" />
        <div className="absolute top-1/2 right-1/3 translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-violet-500/10 rounded-full blur-[200px] pointer-events-none" />

        {/* Grid floor */}
        <div
          className="absolute bottom-0 left-0 right-0 h-1/2 bg-[linear-gradient(to_top,rgba(0,212,255,0.03)_1px,transparent_1px),linear-gradient(to_right,rgba(0,212,255,0.03)_1px,transparent_1px)] bg-[size:80px_80px] [transform:perspective(1000px)_rotateX(70deg)] [transform-origin:bottom] opacity-20 pointer-events-none"
          style={{ maskImage: "linear-gradient(to top, black 0%, transparent 100%)" }}
        />

        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <motion.span
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold uppercase tracking-[0.2em] mb-8 border transition-all duration-300"
              style={{
                background: "rgba(0, 212, 255, 0.1)",
                borderColor: "rgba(0, 212, 255, 0.3)",
                color: "#00d4ff",
              }}
              whileHover={{
                scale: 1.05,
                boxShadow: "0 0 40px rgba(0,212,255,0.4)",
                borderColor: "rgba(0, 212, 255, 0.8)",
              }}
            >
              Tarifs
            </motion.span>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6">
              <span className="text-cosmic-display">Transparent.</span>
              <br />
              <span className="text-cosmic-gradient">Sans surprise.</span>
            </h1>

            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Essai gratuit 14 jours sur tous les plans.
              <span className="text-white font-medium"> Sans carte bancaire.</span>
            </p>
          </motion.div>

          {/* Toggle mensuel / annuel */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex items-center justify-center gap-4 mb-16"
          >
            <span className={`text-sm font-medium transition-colors ${!yearly ? "text-white" : "text-slate-500"}`}>
              Mensuel
            </span>
            <button
              onClick={() => setYearly(!yearly)}
              className={`relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none ${yearly ? "bg-[#00d4ff]" : "bg-[#0f172a] border border-white/10"}`}
              aria-label="Basculer facturation annuelle"
            >
              <span
                className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${yearly ? "translate-x-7" : "translate-x-0"}`}
              />
            </button>
            <span className={`text-sm font-medium transition-colors ${yearly ? "text-white" : "text-slate-500"}`}>
              Annuel
            </span>
            <AnimatePresence>
              {yearly && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border"
                  style={{
                    background: "rgba(0, 212, 255, 0.1)",
                    borderColor: "rgba(0, 212, 255, 0.3)",
                    color: "#00d4ff",
                  }}
                >
                  🎉 Économisez jusqu&apos;à 2 mois offerts
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Pricing Cards — 3D Grid */}
          <div className="grid lg:grid-cols-3 gap-8 items-center" style={{ perspective: "1500px" }}>
            {ACTIVE_PLANS.map((planId, index) => (
              <PricingCard key={planId} planId={planId} index={index} yearly={yearly} />
            ))}
          </div>

          {/* Trust row */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-slate-500"
          >
            <span className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-slate-600" />
              Paiement sécurisé Stripe
            </span>
            <span className="hidden sm:block text-slate-700">·</span>
            <span className="flex items-center gap-2">
              <Check className="h-4 w-4 text-slate-600" />
              Annulation à tout moment
            </span>
            <span className="hidden sm:block text-slate-700">·</span>
            <span className="flex items-center gap-2">
              <Headphones className="h-4 w-4 text-slate-600" />
              Support inclus dans chaque plan
            </span>
          </motion.div>
        </div>
      </section>

      {/* Section Pourquoi FleetMaster */}
      <section className="py-20 relative">
        <div className="relative mx-auto max-w-5xl px-6 lg:px-8">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-bold text-white text-center mb-10"
          >
            Pourquoi choisir FleetMaster ?
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Shield,
                color: "#00d4ff",
                title: "Conformité réglementaire intégrée",
                description: "FIMO, FCO, ATP, tachygraphe : toutes vos obligations suivies automatiquement avec alertes avant expiration.",
              },
              {
                icon: Zap,
                color: "#a78bfa",
                title: "Inspections QR sans application",
                description: "Vos conducteurs scannent un QR Code pour déclarer leur inspection. Aucune application à télécharger.",
              },
              {
                icon: Lock,
                color: "#10b981",
                title: "Données hébergées en France",
                description: "Vos données restent sur des serveurs français. Conformité RGPD garantie, sans transfert vers des tiers.",
              },
            ].map(({ icon: Icon, color, title, description }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="card-holographic p-6 group"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-all duration-300"
                  style={{ background: `${color}15`, border: `1px solid ${color}30` }}
                >
                  <Icon className="h-5 w-5" style={{ color }} />
                </div>
                <h3 className="text-sm font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-slate-400">{description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 relative">
        <div className="relative mx-auto max-w-3xl px-6 lg:px-8">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-2xl font-bold text-white text-center mb-10"
          >
            Questions fréquentes
          </motion.h2>
          <Accordion type="single" collapsible className="w-full space-y-2">
            {FAQ_ITEMS.map((item, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="glass-cosmic rounded-xl px-5 border-0"
              >
                <AccordionTrigger className="text-left text-white hover:no-underline py-4">
                  <span className="flex items-center gap-3">
                    <HelpCircle className="h-4 w-4 flex-shrink-0" style={{ color: "#00d4ff" }} />
                    <span className="text-sm font-medium">{item.question}</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-slate-400 text-sm pl-7 pb-4">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 relative">
        <div className="relative mx-auto max-w-3xl px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-cosmic rounded-2xl p-12"
          >
            <h2 className="text-3xl font-extrabold mb-4">
              <span className="text-cosmic-gradient">Prêt à simplifier la gestion</span>
              <br />
              <span className="text-white">de votre flotte ?</span>
            </h2>
            <p className="text-slate-400 mb-8 max-w-xl mx-auto">
              Démarrez en 10 minutes. Sans engagement, sans carte bancaire.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <button className="btn-cosmic">Commencer l&apos;essai gratuit</button>
              </Link>
              <Link href="/#features">
                <button className="btn-cosmic-secondary">Voir les fonctionnalités</button>
              </Link>
            </div>
            <p className="mt-6 text-xs text-slate-600 flex items-center justify-center gap-4 flex-wrap">
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[#00d4ff]" /> Essai 14 jours</span>
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[#00d4ff]" /> Sans engagement</span>
              <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-[#00d4ff]" /> RGPD · Données en France</span>
            </p>
          </motion.div>
        </div>
      </section>
    </main>
  );
}

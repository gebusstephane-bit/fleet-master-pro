"use client";

import { motion, useInView, AnimatePresence } from "framer-motion";
import { useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Zap, Lock, Headphones } from "lucide-react";
import { PLANS, ACTIVE_PLANS, getYearlySavings } from "@/lib/plans";
import type { PlanId } from "@/lib/plans";

const variantAccent: Record<string, { ring: string; badge: string; cta: string; glow: string }> = {
  essential: {
    ring: "border-white/[0.08]",
    badge: "",
    cta: "bg-[#27272a] hover:bg-[#3f3f46] text-white border border-white/10",
    glow: "",
  },
  pro: {
    ring: "border-2 border-blue-500",
    badge: "bg-blue-600 text-white shadow-lg shadow-blue-600/20",
    cta: "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25",
    glow: "shadow-[0_0_60px_rgba(59,130,246,0.15)]",
  },
  unlimited: {
    ring: "border-white/[0.08]",
    badge: "",
    cta: "bg-[#27272a] hover:bg-[#3f3f46] text-white border border-white/10",
    glow: "",
  },
};

const iconsByPlan: Record<string, React.ElementType> = {
  essential: Zap,
  pro: Sparkles,
  unlimited: Lock,
};

export function Pricing() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const [yearly, setYearly] = useState(false);

  return (
    <section ref={ref} className="py-24 bg-[#0e0e10] relative overflow-hidden">
      {/* Glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.06) 0%, transparent 60%)`,
        }}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <span className="inline-block text-sm font-semibold text-blue-400 uppercase tracking-wider mb-4">
            Tarifs
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
            Des prix{" "}
            <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
              transparents
            </span>
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            3 formules pour toutes les tailles de flotte.{" "}
            <span className="text-white font-medium">Essai gratuit 14 jours.</span>
          </p>
        </motion.div>

        {/* Billing toggle */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex items-center justify-center gap-4 mb-12"
        >
          <span className={`text-sm font-medium transition-colors ${!yearly ? "text-white" : "text-slate-500"}`}>
            Mensuel
          </span>
          <button
            onClick={() => setYearly(!yearly)}
            className={`relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none ${
              yearly ? "bg-blue-600" : "bg-[#27272a]"
            }`}
            aria-label="Basculer facturation annuelle"
          >
            <span
              className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${
                yearly ? "translate-x-7" : "translate-x-0"
              }`}
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
                className="inline-flex items-center gap-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 text-xs font-bold px-2.5 py-1 rounded-full"
              >
                🎉 Économisez jusqu&apos;à 2 mois offerts
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-3 gap-6 items-start">
          {ACTIVE_PLANS.map((planId, index) => {
            const plan = PLANS[planId as PlanId];
            const accent = variantAccent[planId] || variantAccent.essential;
            const PlanIcon = iconsByPlan[planId] || Zap;
            const savings = getYearlySavings(planId as PlanId);
            const displayPrice = yearly ? Math.round(plan.priceYearly / 12) : plan.priceMonthly;

            return (
              <motion.div
                key={planId}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`relative rounded-2xl p-8 ${
                  plan.popular ? `bg-[#18181b] ${accent.ring} ${accent.glow}` : "bg-[#18181b]/60 border border-white/[0.08]"
                }`}
              >
                {/* Popular badge */}
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold ${accent.badge}`}>
                      <Sparkles className="h-3.5 w-3.5" />
                      Plus populaire
                    </span>
                  </div>
                )}

                {/* Plan icon + name */}
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${plan.popular ? "bg-blue-500/20" : "bg-white/5"}`}>
                    <PlanIcon className={`h-4.5 w-4.5 ${plan.popular ? "text-blue-400" : "text-slate-400"}`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                    <p className="text-xs text-slate-500">{plan.description}</p>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-2">
                  <div className="flex items-end gap-1">
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={`${planId}-${yearly}`}
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.2 }}
                        className="text-4xl font-extrabold text-white"
                      >
                        {displayPrice}€
                      </motion.span>
                    </AnimatePresence>
                    <span className="text-slate-500 mb-1">/mois</span>
                  </div>
                  {yearly && (
                    <p className="text-xs text-emerald-400 font-medium mt-1">
                      Soit {plan.priceYearly}€/an · Économisez {savings}€
                    </p>
                  )}
                </div>

                {/* CTA */}
                <Link href={`/register?plan=${planId}&billing=${yearly ? "yearly" : "monthly"}`} className="block mt-6 mb-7">
                  <Button className={`w-full py-5 text-sm font-semibold rounded-xl ${accent.cta}`} size="lg">
                    {plan.cta}
                  </Button>
                </Link>

                {/* Divider */}
                <div className="border-t border-white/[0.06] mb-5" />

                {/* Features */}
                <ul className="space-y-3">
                  {plan.features.slice(0, 6).map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-400 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom trust row */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.5 }}
          className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-slate-500"
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
  );
}

"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check, Sparkles } from "lucide-react";
import { PLANS, ACTIVE_PLANS } from "@/lib/plans";

export function Pricing() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-24 bg-[#0e0e10]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block text-sm font-semibold text-blue-400 uppercase tracking-wider mb-4">
            Tarifs
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Des prix transparents
          </h2>
          <p className="mt-4 text-lg text-[#a1a1aa]">
            3 formules pour toutes les tailles de flotte. Essai gratuit de 14 jours.
          </p>
        </motion.div>

        {/* Pricing cards - 3 plans depuis PLANS */}
        <div className="grid md:grid-cols-3 gap-8 items-start">
          {ACTIVE_PLANS.map((planId, index) => {
            const plan = PLANS[planId];
            return (
              <motion.div
                key={planId}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`relative rounded-2xl p-8 ${
                  plan.popular
                    ? "bg-[#18181b] shadow-xl border-2 border-blue-500 scale-105 z-10 shadow-blue-500/10"
                    : "bg-[#18181b]/60 border border-white/[0.08]"
                }`}
              >
                {/* Popular badge */}
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg shadow-blue-600/20">
                      <Sparkles className="h-4 w-4" />
                      Plus populaire
                    </span>
                  </div>
                )}

                {/* Plan name */}
                <h3 className="text-xl font-semibold text-white mb-2">
                  {plan.name}
                </h3>
                <p className="text-[#71717a] text-sm mb-6">{plan.description}</p>

                {/* Price */}
                <div className="mb-6">
                  <span className="text-4xl font-bold text-white">{plan.priceMonthly}€</span>
                  <span className="text-[#71717a] ml-2">/mois</span>
                </div>

                {/* CTA */}
                <Link href={`/register?plan=${planId}`} className="block mb-8">
                  <Button
                    className={`w-full ${
                      plan.popular
                        ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20"
                        : "bg-[#27272a] hover:bg-[#3f3f46] text-white border border-white/[0.08]"
                    }`}
                    size="lg"
                  >
                    {plan.cta}
                  </Button>
                </Link>

                {/* Features */}
                <ul className="space-y-4">
                  {plan.features.slice(0, 6).map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span className="text-[#a1a1aa] text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </div>

        {/* Trust note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.5 }}
          className="text-center text-[#71717a] text-sm mt-12"
        >
          Paiement sécurisé. Annulation à tout moment. Sans engagement.
        </motion.p>
      </div>
    </section>
  );
}

"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check, Sparkles } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: "0€",
    period: "pour commencer",
    description: "Parfait pour tester la plateforme",
    features: [
      "1 véhicule",
      "Géolocalisation de base",
      "Rappels documents",
      "Support email",
    ],
    cta: "Commencer gratuit",
    popular: false,
  },
  {
    name: "Pro",
    price: "29€",
    period: "par véhicule / mois",
    description: "Pour les flottes en croissance",
    features: [
      "Véhicules illimités",
      "Maintenance prédictive IA",
      "Optimisation tournées",
      "Rapports avancés",
      "Support prioritaire",
      "API access",
    ],
    cta: "Essai 14 jours gratuit",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Sur mesure",
    period: "pour grandes flottes",
    description: "Solution clé en main dédiée",
    features: [
      "Tout du plan Pro",
      "Intégrations personnalisées",
      "Account manager dédié",
      "Formation équipe",
      "SLA garanti 99.9%",
      "Hébergement dédié",
    ],
    cta: "Contacter les ventes",
    popular: false,
  },
];

export function Pricing() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-24 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block text-sm font-semibold text-blue-600 uppercase tracking-wider mb-4">
            Tarifs
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Des prix transparents
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Commencez gratuit. Évoluez quand vous êtes prêt.
          </p>
        </motion.div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-3 gap-8 items-start">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`relative rounded-2xl p-8 ${
                plan.popular
                  ? "bg-white shadow-xl border-2 border-blue-500 scale-105 z-10"
                  : "bg-white border border-gray-200 shadow-sm"
              }`}
            >
              {/* Popular badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                    <Sparkles className="h-4 w-4" />
                    Plus populaire
                  </span>
                </div>
              )}

              {/* Plan name */}
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {plan.name}
              </h3>
              <p className="text-gray-500 text-sm mb-6">{plan.description}</p>

              {/* Price */}
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                <span className="text-gray-500 ml-2">{plan.period}</span>
              </div>

              {/* CTA */}
              <Link href={plan.name === "Enterprise" ? "mailto:sales@fleetmaster.pro" : "/register"} className="block mb-8">
                <Button
                  className={`w-full ${
                    plan.popular
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-gray-900 hover:bg-gray-800 text-white"
                  }`}
                  size="lg"
                >
                  {plan.cta}
                </Button>
              </Link>

              {/* Features */}
              <ul className="space-y-4">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-600 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Trust note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.5 }}
          className="text-center text-gray-500 text-sm mt-12"
        >
          Paiement sécurisé. Annulation à tout moment. Sans engagement.
        </motion.p>
      </div>
    </section>
  );
}

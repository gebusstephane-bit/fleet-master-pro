"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";

const plans = [
  {
    name: "Essentiel",
    price: "29",
    highlight: "5 véhicules",
    features: [
      "Conformité complète",
      "Inspections QR",
      "Maintenance prédictive",
    ],
    cta: "Essayer gratuitement",
    highlighted: false,
    badge: null,
  },
  {
    name: "Pro",
    price: "49",
    highlight: "20 véhicules",
    features: [
      "Tout Essentiel +",
      "TCO & Coûts flotte",
      "API & Webhooks",
      "Support email",
    ],
    cta: "Essayer gratuitement",
    highlighted: true,
    badge: "Le plus choisi",
  },
  {
    name: "Unlimited",
    price: "129",
    highlight: "Illimité",
    features: [
      "Tout Pro +",
      "API publique",
      "Assistant IA réglementaire",
      "Support prioritaire",
    ],
    cta: "Essayer gratuitement",
    highlighted: false,
    badge: null,
  },
] as const;

export function PricingTeaser() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="py-24 bg-[#080d18] relative overflow-hidden">
      {/* Fond subtil */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 50%, rgba(6,182,212,0.04) 0%, transparent 60%)`,
        }}
      />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* ── En-tête ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="inline-block text-sm font-semibold text-cyan-400 uppercase tracking-wider mb-4">
            Tarifs
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
            Transparent.{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Sans surprise.
            </span>
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            Essai gratuit 14 jours sur tous les plans. Sans carte bancaire.
          </p>
        </motion.div>

        {/* ── 3 cartes ── */}
        <div className="grid sm:grid-cols-3 gap-5 mb-8">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.55,
                delay: index * 0.1,
                ease: [0.22, 1, 0.36, 1],
              }}
              className={`relative rounded-2xl p-6 flex flex-col ${
                plan.highlighted
                  ? "bg-gradient-to-b from-cyan-500/10 to-blue-500/5 border border-cyan-500/30"
                  : "bg-white/[0.03] border border-white/10"
              }`}
            >
              {/* Badge */}
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-500 text-white whitespace-nowrap">
                    {plan.badge}
                  </span>
                </div>
              )}

              {/* Nom + highlight */}
              <div className="mb-4">
                <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                <p className="text-sm text-slate-400">{plan.highlight}</p>
              </div>

              {/* Prix */}
              <div className="mb-5">
                <span className="text-4xl font-extrabold text-white">{plan.price}€</span>
                <span className="text-slate-500 text-sm ml-1">/mois</span>
              </div>

              {/* Features */}
              <ul className="flex-1 space-y-2 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-cyan-400 flex-shrink-0" />
                    <span className="text-sm text-slate-300">{f}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link href="/register">
                <button
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    plan.highlighted
                      ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:opacity-90"
                      : "bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {plan.cta}
                </button>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* ── Lien vers page pricing complète ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center"
        >
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1.5 text-sm text-cyan-500 hover:text-cyan-400 transition-colors"
          >
            Voir le détail complet des offres
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

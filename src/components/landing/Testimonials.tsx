"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Star, Quote, TrendingDown, Clock, Euro } from "lucide-react";

const featured = {
  name: "Jean-Pierre Martin",
  role: "Directeur Général",
  company: "Transports Martin",
  initials: "JM",
  gradientFrom: "#06b6d4",
  gradientTo: "#3b82f6",
  content:
    "FleetMaster nous a fait économiser 15 000€ dès le premier mois. La maintenance prédictive est bluffante — notre mécanicien a été prévenu 10 jours avant une casse moteur qui aurait coûté 8 000€. En 3 ans de métier, je n'avais jamais vu ça.",
  rating: 5,
  metric: { icon: Euro, value: "15 000€", label: "économisés le 1er mois", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
};

const testimonials = [
  {
    name: "Sophie Dubois",
    role: "Responsable de flotte",
    company: "LogiPro SAS",
    initials: "SD",
    gradientFrom: "#8b5cf6",
    gradientTo: "#6366f1",
    content:
      "Je ne compte plus les heures passées sur Excel avant. Maintenant tout est automatisé, les alertes arrivent par SMS et je gère ma flotte de 23 camions en 30 minutes par jour.",
    rating: 5,
    metric: { icon: Clock, value: "40h", label: "gagnées par mois", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  },
  {
    name: "Marc Lefebvre",
    role: "Gérant",
    company: "Express Delivery",
    initials: "ML",
    gradientFrom: "#f97316",
    gradientTo: "#f59e0b",
    content:
      "L'optimisation des tournées nous a fait gagner 2h par jour par chauffeur. Sur 15 chauffeurs, c'est 30h quotidiennes récupérées. Le ROI a été immédiat.",
    rating: 5,
    metric: { icon: TrendingDown, value: "–22%", label: "de carburant consommé", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  },
];

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
      ))}
    </div>
  );
}

export function Testimonials() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="py-24 bg-[#09090b] relative overflow-hidden">
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 50%, rgba(59,130,246,0.04) 0%, transparent 60%)`,
        }}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block text-sm font-semibold text-blue-400 uppercase tracking-wider mb-4">
            Témoignages clients
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
            Ils ont transformé{" "}
            <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
              leur flotte
            </span>
          </h2>
          <div className="mt-4 flex items-center justify-center gap-3">
            <Stars count={5} />
            <p className="text-lg text-slate-400">
              Note moyenne{" "}
              <span className="font-bold text-white">4.8/5</span>
              {" "}sur Trustpilot
            </p>
          </div>
        </motion.div>

        {/* Layout: featured large + 2 smaller */}
        <div className="grid lg:grid-cols-2 gap-5">
          {/* Featured testimonial */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="relative rounded-2xl border border-white/[0.1] bg-[#18181b]/60 backdrop-blur-sm p-8 flex flex-col"
          >
            {/* Quote icon */}
            <Quote className="absolute top-6 right-6 h-10 w-10 text-white/[0.04]" />

            {/* Stars */}
            <Stars count={featured.rating} />

            {/* Content */}
            <p className="text-slate-300 mt-5 mb-6 leading-relaxed text-lg">
              &ldquo;{featured.content}&rdquo;
            </p>

            {/* Metric highlight */}
            <div className={`inline-flex items-center gap-3 rounded-xl border ${featured.metric.border} ${featured.metric.bg} px-4 py-3 mb-6 self-start`}>
              <featured.metric.icon className={`h-5 w-5 ${featured.metric.color} flex-shrink-0`} />
              <div>
                <p className={`text-xl font-bold ${featured.metric.color}`}>{featured.metric.value}</p>
                <p className="text-xs text-slate-500">{featured.metric.label}</p>
              </div>
            </div>

            {/* Author */}
            <div className="flex items-center gap-4 mt-auto">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${featured.gradientFrom}, ${featured.gradientTo})`,
                }}
              >
                {featured.initials}
              </div>
              <div>
                <p className="font-semibold text-white">{featured.name}</p>
                <p className="text-sm text-slate-500">
                  {featured.role}, {featured.company}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Right column — 2 smaller cards */}
          <div className="flex flex-col gap-5">
            {testimonials.map((t, index) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, x: 30 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.55, delay: 0.15 + index * 0.12, ease: [0.22, 1, 0.36, 1] }}
                className="relative rounded-2xl border border-white/[0.08] bg-[#18181b]/60 backdrop-blur-sm p-6 flex flex-col"
              >
                {/* Quote */}
                <Quote className="absolute top-4 right-4 h-7 w-7 text-white/[0.04]" />

                {/* Stars + metric side by side */}
                <div className="flex items-center justify-between mb-4">
                  <Stars count={t.rating} />
                  <div className={`flex items-center gap-1.5 rounded-full border ${t.metric.border} ${t.metric.bg} px-2.5 py-1`}>
                    <t.metric.icon className={`h-3.5 w-3.5 ${t.metric.color}`} />
                    <span className={`text-xs font-bold ${t.metric.color}`}>{t.metric.value}</span>
                    <span className="text-xs text-slate-600">{t.metric.label}</span>
                  </div>
                </div>

                {/* Content */}
                <p className="text-slate-400 text-sm leading-relaxed mb-5">
                  &ldquo;{t.content}&rdquo;
                </p>

                {/* Author */}
                <div className="flex items-center gap-3 mt-auto">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                    style={{
                      background: `linear-gradient(135deg, ${t.gradientFrom}, ${t.gradientTo})`,
                    }}
                  >
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{t.name}</p>
                    <p className="text-xs text-slate-500">
                      {t.role}, {t.company}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom trust note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.6 }}
          className="mt-10 text-center"
        >
          <p className="text-sm text-slate-600">
            Rejoignez{" "}
            <span className="text-slate-400 font-semibold">500+ transporteurs</span>{" "}
            qui font confiance à FleetMaster Pro chaque jour.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

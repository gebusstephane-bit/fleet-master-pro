"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

const trustItems = [
  "14 jours gratuits",
  "Sans carte bancaire",
  "Données en France",
  "Support en français",
];

export function CTAFinal() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="py-24 relative overflow-hidden">
      {/* Aurora background */}
      <div className="absolute inset-0 aurora-bg pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#00d4ff]/10 via-blue-500/10 to-violet-500/10 pointer-events-none" />
      
      {/* Glows */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[#00d4ff]/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -left-40 top-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-blue-500/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -right-40 top-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-violet-500/20 rounded-full blur-[100px] pointer-events-none" />

      {/* Top/Bottom borders */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00d4ff]/50 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

      <div className="relative mx-auto max-w-4xl px-6 lg:px-8 text-center">
        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0 }}
          className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6"
        >
          <span className="text-cosmic-display">
            Le prochain contrôle DREAL,
          </span>
          <br />
          <span className="text-cosmic-gradient">vous l'attendez sereinement.</span>
        </motion.h2>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Tous vos documents, inspections et maintenances centralisés.
          Configurez votre flotte en 10 minutes. Essai gratuit, sans carte bancaire.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 justify-center mb-8"
        >
          <Link href="/register">
            <button className="btn-cosmic text-base px-8 py-4">
              Démarrer gratuitement — 14 jours
              <ArrowRight className="h-5 w-5" />
            </button>
          </Link>

          <Link href="/pricing">
            <button className="btn-cosmic-secondary text-base px-8 py-4">
              Voir les tarifs
            </button>
          </Link>
        </motion.div>

        {/* Trust items */}
        <motion.ul
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="flex flex-wrap justify-center gap-x-6 gap-y-2"
        >
          {trustItems.map((item) => (
            <li
              key={item}
              className="flex items-center gap-1.5 text-sm text-slate-500"
            >
              <CheckCircle2 className="h-4 w-4 text-[#00d4ff]" />
              {item}
            </li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}

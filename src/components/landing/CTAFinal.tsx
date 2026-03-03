"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

/** Points de réassurance sous les CTA */
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
    <section ref={ref} className="py-24 bg-[#09090b] relative overflow-hidden">
      {/* ── Fond avec orbes lumineux ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Orbe cyan centré */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: "800px",
            height: "400px",
            background:
              "radial-gradient(ellipse, rgba(6,182,212,0.08) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
        {/* Orbe bleu à gauche */}
        <div
          className="absolute -left-20 top-1/2 -translate-y-1/2"
          style={{
            width: "400px",
            height: "400px",
            background: "rgba(59,130,246,0.06)",
            borderRadius: "50%",
            filter: "blur(80px)",
          }}
        />
        {/* Orbe orange à droite */}
        <div
          className="absolute -right-20 top-1/2 -translate-y-1/2"
          style={{
            width: "400px",
            height: "400px",
            background: "rgba(249,115,22,0.05)",
            borderRadius: "50%",
            filter: "blur(80px)",
          }}
        />
      </div>

      {/* Bordures haut/bas */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/25 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />

      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">

        {/* ── Titre principal ── */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.0 }}
          className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight mb-6"
        >
          Le prochain contrôle DREAL,{" "}
          <span
            className="bg-gradient-to-r from-cyan-400 via-blue-400 to-orange-400 bg-clip-text text-transparent"
            style={{ WebkitBackgroundClip: "text" }}
          >
            vous l'attendez sereinement.
          </span>
        </motion.h2>

        {/* ── Sous-titre ── */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Tous vos documents, inspections et maintenances centralisés.
          Configurez votre flotte en 10 minutes. Essai gratuit, sans carte bancaire.
        </motion.p>

        {/* ── Boutons CTA ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 justify-center mb-8"
        >
          {/* CTA principal */}
          <Link href="/register">
            <button className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-base text-white transition-all duration-300 hover:-translate-y-1"
              style={{
                background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
                boxShadow: "0 4px 30px rgba(6,182,212,0.25), 0 0 0 1px rgba(6,182,212,0.2)",
              }}
            >
              Démarrer gratuitement — 14 jours
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </button>
          </Link>

          {/* CTA secondaire */}
          <Link href="/pricing">
            <button className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-base text-slate-300 border border-white/10 bg-white/5 hover:bg-white/10 hover:text-white hover:border-white/20 transition-all duration-300">
              Voir les tarifs
            </button>
          </Link>
        </motion.div>

        {/* ── Points de confiance ── */}
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
              <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
              {item}
            </li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}

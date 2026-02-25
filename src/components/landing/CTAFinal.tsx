"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, MessageSquare } from "lucide-react";

/** Points de réassurance sous les CTA */
const trustItems = [
  "14 jours d'essai gratuit",
  "Aucune carte bancaire requise",
  "Support réactif inclus",
  "Annulation sans engagement",
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

        {/* ── Badge social proof ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-4 py-2 mb-8"
        >
          <span className="flex gap-0.5">
            {[...Array(5)].map((_, i) => (
              <svg
                key={i}
                className="h-3.5 w-3.5 text-amber-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </span>
          <span className="text-sm font-medium text-slate-300">
            Noté 4.9/5 par plus de 500 transporteurs
          </span>
        </motion.div>

        {/* ── Titre principal ── */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight mb-6"
        >
          Prêt à transformer{" "}
          <span
            className="bg-gradient-to-r from-cyan-400 via-blue-400 to-orange-400 bg-clip-text text-transparent"
            style={{ WebkitBackgroundClip: "text" }}
          >
            votre gestion de flotte ?
          </span>
        </motion.h2>

        {/* ── Sous-titre ── */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Rejoignez les transporteurs qui ont déjà éliminé les pannes imprévues,
          réduit leurs coûts d'exploitation et repris le contrôle de leur activité.
          Commencez gratuitement, sans engagement.
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
          <Link href="/contact">
            <button className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-base text-slate-300 border border-white/10 bg-white/5 hover:bg-white/10 hover:text-white hover:border-white/20 transition-all duration-300">
              <MessageSquare className="h-5 w-5 text-cyan-400" />
              Parler à un expert
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

"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { MessageSquare } from "lucide-react";

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
          className="text-center mb-12"
        >
          <span className="inline-block text-sm font-semibold text-blue-400 uppercase tracking-wider mb-4">
            Témoignages
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
            Ils utilisent{" "}
            <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
              FleetMaster Pro
            </span>
          </h2>
          <p className="mt-4 text-lg text-slate-500 italic">
            Bêta en cours — premiers retours à venir
          </p>
        </motion.div>

        {/* Placeholder card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="max-w-2xl mx-auto"
        >
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8 flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-blue-400" />
            </div>
            <p className="text-slate-400 italic text-lg leading-relaxed max-w-lg">
              FleetMaster Pro est actuellement en phase bêta. Les premiers retours
              de nos utilisateurs seront publiés ici.
            </p>
            <p className="text-sm text-slate-600">— L&apos;équipe FleetMaster</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

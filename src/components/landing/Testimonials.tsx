"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { MessageSquare, Quote } from "lucide-react";

export function Testimonials() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="py-24 relative overflow-hidden">
      {/* Background aurora */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 via-transparent to-blue-500/5 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-gradient-to-r from-blue-500/10 to-violet-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="inline-flex items-center gap-2 glass-cosmic px-4 py-2 rounded-full text-xs font-medium uppercase tracking-[0.15em] text-[#00d4ff] mb-6">
            Témoignages
          </span>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6">
            <span className="text-cosmic-display">
              Ils utilisent
            </span>
            <span className="text-cosmic-gradient"> FleetMaster Pro</span>
          </h2>
          <p className="text-lg text-slate-500 italic">
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
          <div className="glass-cosmic rounded-2xl p-8 flex flex-col items-center text-center gap-4 border border-white/10">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00d4ff]/20 to-blue-500/20 flex items-center justify-center border border-[#00d4ff]/30">
              <Quote className="h-6 w-6 text-[#00d4ff]" />
            </div>
            <p className="text-slate-400 italic text-lg leading-relaxed max-w-lg">
              FleetMaster Pro est actuellement en phase bêta. Les premiers retours
              de nos utilisateurs seront publiés ici.
            </p>
            <div className="flex items-center gap-3 mt-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00d4ff] to-blue-500 flex items-center justify-center text-black font-bold text-sm">
                FM
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-white">L'équipe FleetMaster</p>
                <p className="text-xs text-slate-500">À très bientôt</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

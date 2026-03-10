"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Check, X, AlertTriangle } from "lucide-react";

const rows: {
  feature: string;
  fleetmaster: string;
  webfleet: string;
  quartix: string;
}[] = [
  {
    feature: "Prix/mois (10 véhicules)",
    fleetmaster: "49€",
    webfleet: "~400€",
    quartix: "~300€",
  },
  {
    feature: "Conformité réglementaire",
    fleetmaster: "check",
    webfleet: "partial",
    quartix: "cross",
  },
  {
    feature: "Inspections sans app (QR code)",
    fleetmaster: "check",
    webfleet: "cross",
    quartix: "cross",
  },
  {
    feature: "Maintenance prédictive",
    fleetmaster: "check",
    webfleet: "partial",
    quartix: "cross",
  },
  {
    feature: "Assistant IA réglementaire",
    fleetmaster: "check",
    webfleet: "cross",
    quartix: "cross",
  },
  {
    feature: "API & intégrations ERP/TMS",
    fleetmaster: "Inclus PRO",
    webfleet: "Option payante",
    quartix: "Option payante",
  },
  {
    feature: "Sans boîtier GPS obligatoire",
    fleetmaster: "check",
    webfleet: "cross",
    quartix: "cross",
  },
  {
    feature: "Sans engagement",
    fleetmaster: "check",
    webfleet: "cross",
    quartix: "cross",
  },
  {
    feature: "Données hébergées en France",
    fleetmaster: "check",
    webfleet: "partial",
    quartix: "partial",
  },
];

function Cell({
  value,
  isFleetmaster,
}: {
  value: string;
  isFleetmaster?: boolean;
}) {
  if (value === "check")
    return <Check className="h-5 w-5 mx-auto text-emerald-400" />;
  if (value === "cross")
    return <X className="h-5 w-5 mx-auto text-red-400/60" />;
  if (value === "partial")
    return <AlertTriangle className="h-4 w-4 mx-auto text-amber-400" />;
  return (
    <span
      className={`text-sm font-semibold ${isFleetmaster ? "text-white" : "text-slate-400"}`}
    >
      {value}
    </span>
  );
}

export function ComparisonTable() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="py-24 bg-[#0a0f1a] relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, rgba(6,182,212,0.04) 0%, transparent 60%)`,
        }}
      />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block text-sm font-semibold text-cyan-400 uppercase tracking-wider mb-4">
            Comparatif
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
            Pourquoi choisir{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              FleetMaster Pro ?
            </span>
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="rounded-2xl border border-white/[0.08] overflow-hidden"
        >
          {/* En-tête du tableau */}
          <div className="grid grid-cols-4 bg-[#0f172a]">
            <div className="p-5 border-b border-white/[0.08]">
              <span className="text-sm font-semibold text-slate-500">
                Fonctionnalité
              </span>
            </div>
            <div className="p-5 border-b border-cyan-500/20 bg-cyan-500/[0.05] text-center">
              <p className="text-sm font-bold text-white">FleetMaster Pro</p>
              <span className="inline-flex mt-1 items-center px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                <span className="text-[10px] text-cyan-400 font-bold">
                  VOTRE CHOIX
                </span>
              </span>
            </div>
            <div className="p-5 border-b border-white/[0.08] text-center">
              <span className="text-sm font-semibold text-slate-400">
                Webfleet
              </span>
            </div>
            <div className="p-5 border-b border-white/[0.08] text-center">
              <span className="text-sm font-semibold text-slate-400">
                Quartix
              </span>
            </div>
          </div>

          {/* Lignes */}
          {rows.map((row, index) => (
            <div
              key={row.feature}
              className={`grid grid-cols-4 border-b border-white/[0.05] last:border-b-0 ${
                index % 2 === 0 ? "bg-transparent" : "bg-white/[0.01]"
              }`}
            >
              <div className="p-4 flex items-center">
                <span className="text-sm text-slate-400">{row.feature}</span>
              </div>
              <div className="p-4 flex items-center justify-center bg-cyan-500/[0.03] border-x border-cyan-500/10">
                <Cell value={row.fleetmaster} isFleetmaster />
              </div>
              <div className="p-4 flex items-center justify-center">
                <Cell value={row.webfleet} />
              </div>
              <div className="p-4 flex items-center justify-center">
                <Cell value={row.quartix} />
              </div>
            </div>
          ))}
        </motion.div>

        {/* Légende + note GPS */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-6 space-y-3"
        >
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-600">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" /> Partiel
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-400" /> Inclus
            </span>
            <span className="flex items-center gap-1.5">
              <X className="h-3.5 w-3.5 text-red-400/60" /> Non disponible
            </span>
          </div>
          <p className="text-xs text-slate-600 text-center max-w-2xl mx-auto leading-relaxed">
            * FleetMaster Pro ne propose pas de géolocalisation GPS temps réel —
            un choix délibéré pour respecter la vie privée de vos chauffeurs et
            réduire les coûts.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

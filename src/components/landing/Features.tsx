"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  Shield,
  QrCode,
  Wrench,
  BarChart3,
  Smartphone,
  AlertOctagon,
  BookOpen,
} from "lucide-react";

// =============================================================================
// Mini-maquettes CSS — 4 features avec visuels
// =============================================================================

function MockupScore() {
  const vehicles = [
    { label: "BS-484-RH", grade: "A", score: 92, textColor: "text-green-400", barClass: "bg-green-400" },
    { label: "HH-527-AZ", grade: "C", score: 68, textColor: "text-yellow-400", barClass: "bg-yellow-400" },
    { label: "TL-891-MP", grade: "F", score: 31, textColor: "text-red-400", barClass: "bg-red-400" },
  ];
  return (
    <div className="rounded-lg bg-[#0f172a] border border-white/10 p-3 w-48 flex-shrink-0">
      <p className="text-xs text-white/40 mb-2">Score de fiabilité</p>
      {vehicles.map((v) => (
        <div key={v.label} className="flex items-center gap-2 mb-2">
          <span className={`text-sm font-bold w-4 ${v.textColor}`}>{v.grade}</span>
          <span className="text-xs text-white/50 flex-1">{v.label}</span>
          <div className="h-1 w-16 rounded bg-white/10">
            <div className={`h-1 rounded ${v.barClass}`} style={{ width: `${v.score}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function MockupCompliance() {
  const docs = [
    { doc: "Contrôle Technique", days: 451, status: "ok" },
    { doc: "Tachygraphe", days: 12, status: "warning" },
    { doc: "Assurance", days: -3, status: "expired" },
  ] as const;
  return (
    <div className="rounded-lg bg-[#0f172a] border border-white/10 p-3 w-48 flex-shrink-0">
      <p className="text-xs text-white/40 mb-2">Échéances BS-484-RH</p>
      {docs.map((d) => (
        <div key={d.doc} className="flex items-center justify-between mb-2">
          <span className="text-xs text-white/60 truncate mr-2">{d.doc}</span>
          <span
            className={`text-xs font-medium px-1.5 py-0.5 rounded flex-shrink-0 ${
              d.status === "ok"
                ? "bg-green-400/20 text-green-400"
                : d.status === "warning"
                ? "bg-yellow-400/20 text-yellow-400"
                : "bg-red-400/20 text-red-400"
            }`}
          >
            {d.status === "expired" ? "EXPIRÉ" : `J-${d.days}`}
          </span>
        </div>
      ))}
    </div>
  );
}

function MockupQRCode() {
  const accessOptions = [
    { label: "Inspection", color: "bg-cyan-400/20 text-cyan-400", active: true },
    { label: "Carburant", color: "bg-yellow-400/20 text-yellow-400", active: false },
    { label: "Carnet", color: "bg-emerald-400/20 text-emerald-400", active: false },
  ];
  const checks = [
    { item: "Niveaux", ok: true },
    { item: "Éclairage", ok: true },
    { item: "Pneumatiques", ok: false },
    { item: "Freins", ok: true },
  ];
  return (
    <div className="rounded-2xl bg-[#0f172a] border border-white/10 p-3 w-40 mx-auto flex-shrink-0">
      {/* Barre de statut téléphone */}
      <div className="flex justify-between mb-2">
        <span className="text-xs text-white/30">9:41</span>
        <div className="flex gap-1">
          <div className="h-1.5 w-3 bg-white/30 rounded" />
          <div className="h-1.5 w-1.5 bg-white/30 rounded-full" />
        </div>
      </div>
      <p className="text-xs text-white/40 mb-2 text-center">HH-527-AZ · QR scanné</p>
      {/* 3 accès */}
      <div className="flex gap-1 mb-3">
        {accessOptions.map((opt) => (
          <div
            key={opt.label}
            className={`flex-1 rounded text-center py-0.5 text-[9px] font-medium ${
              opt.active ? opt.color : "bg-white/5 text-white/30"
            }`}
          >
            {opt.label}
          </div>
        ))}
      </div>
      {/* Checklist inspection */}
      {checks.map((c) => (
        <div key={c.item} className="flex items-center gap-2 mb-1">
          <div
            className={`h-3 w-3 rounded-sm flex items-center justify-center flex-shrink-0 ${
              c.ok ? "bg-green-400" : "bg-red-400"
            }`}
          >
            <span className="text-white text-[9px]">{c.ok ? "✓" : "!"}</span>
          </div>
          <span className="text-xs text-white/60">{c.item}</span>
        </div>
      ))}
      <div className="mt-2 rounded bg-cyan-400/20 text-center py-1">
        <span className="text-xs text-cyan-400">Grade : B</span>
      </div>
    </div>
  );
}

function MockupMaintenance() {
  const tasks = [
    { task: "Freins PL", pct: 100, status: "CRITIQUE", textColor: "text-red-400", barClass: "bg-red-400" },
    { task: "Vidange", pct: 78, status: "BIENTÔT", textColor: "text-yellow-400", barClass: "bg-yellow-400" },
    { task: "Filtres air", pct: 45, status: "OK", textColor: "text-green-400", barClass: "bg-green-400" },
  ];
  return (
    <div className="rounded-lg bg-[#0f172a] border border-white/10 p-3 w-48 flex-shrink-0">
      <p className="text-xs text-white/40 mb-2">Maintenances prévues</p>
      {tasks.map((m) => (
        <div key={m.task} className="mb-2">
          <div className="flex justify-between mb-0.5">
            <span className="text-xs text-white/60">{m.task}</span>
            <span className={`text-xs ${m.textColor}`}>{m.status}</span>
          </div>
          <div className="h-1 rounded bg-white/10">
            <div className={`h-1 rounded ${m.barClass}`} style={{ width: `${m.pct}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Données — 6 fonctionnalités réelles
// =============================================================================

type FeatureBase = {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  border: string;
  title: string;
  description: string;
  badge?: string;
};

type FeatureWithMockup = FeatureBase & {
  hasMockup: true;
  Mockup: React.ComponentType;
};

type FeatureWithoutMockup = FeatureBase & {
  hasMockup: false;
};

type Feature = FeatureWithMockup | FeatureWithoutMockup;

const features: Feature[] = [
  {
    icon: BarChart3,
    iconBg: "bg-blue-500/10 border-blue-500/20",
    iconColor: "text-blue-400",
    border: "border-blue-500/15",
    title: "Un score par véhicule. Une décision claire.",
    description:
      "Inspection, maintenance, carburant, conformité — pondérés en un score A à F. Vous savez instantanément quel véhicule demande votre attention.",
    hasMockup: true,
    Mockup: MockupScore,
  },
  {
    icon: Shield,
    iconBg: "bg-emerald-500/10 border-emerald-500/20",
    iconColor: "text-emerald-400",
    border: "border-emerald-500/15",
    title: "Fini les documents expirés.",
    description:
      "CT, Tachygraphe, ATP, Assurance, Permis, FCO, Médical — chaque document a sa date, chaque expiration a son alerte J-30, J-15, J-7.",
    hasMockup: true,
    Mockup: MockupCompliance,
  },
  {
    icon: QrCode,
    iconBg: "bg-cyan-500/10 border-cyan-500/20",
    iconColor: "text-cyan-400",
    border: "border-cyan-500/15",
    title: "Un QR code. Trois usages. Zéro app.",
    description:
      "Un scan = inspection 32 points avec signature et grade A-F, OU saisie d'un plein de carburant, OU consultation du carnet numérique. Sans compte, sans installation.",
    badge: "★ Triple accès sans app",
    hasMockup: true,
    Mockup: MockupQRCode,
  },
  {
    icon: Wrench,
    iconBg: "bg-amber-500/10 border-amber-500/20",
    iconColor: "text-amber-400",
    border: "border-amber-500/15",
    title: "Anticipez. N'attendez pas la panne.",
    description:
      "Intervalles calculés selon le kilométrage et le type de véhicule — PL, frigorifique, remorque, VUL. Le système vous dit quoi faire et quand.",
    hasMockup: true,
    Mockup: MockupMaintenance,
  },
  {
    icon: AlertOctagon,
    iconBg: "bg-red-500/10 border-red-500/20",
    iconColor: "text-red-400",
    border: "border-red-500/15",
    title: "Une panne ? Votre chauffeur n'est pas seul.",
    description:
      "4 questions → protocole de dépannage adapté au type de panne et à la localisation. Traçabilité assurance automatique.",
    hasMockup: false,
  },
  {
    icon: Smartphone,
    iconBg: "bg-violet-500/10 border-violet-500/20",
    iconColor: "text-violet-400",
    border: "border-violet-500/15",
    title: "Une app pour vos chauffeurs. Sans installation.",
    description:
      "Inspections, carburant, incident — tout depuis leur téléphone. S'installe en 30 secondes. Fonctionne hors connexion.",
    hasMockup: false,
  },
  {
    icon: BookOpen,
    iconBg: "bg-teal-500/10 border-teal-500/20",
    iconColor: "text-teal-400",
    border: "border-teal-500/15",
    title: "L'historique complet de chaque véhicule. En un scan.",
    description:
      "Carnet d'entretien numérique accessible via QR code : interventions, kilométrages, observations, photos. Opposable lors d'un contrôle ou d'un sinistre.",
    hasMockup: false,
  },
];

// =============================================================================
// Composant
// =============================================================================

export function Features() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  const featuresWithMockup = features.filter((f) => f.hasMockup) as FeatureWithMockup[];
  const featuresWithoutMockup = features.filter((f) => !f.hasMockup) as FeatureWithoutMockup[];

  return (
    <section ref={ref} className="py-24 bg-[#0a0f1a] relative overflow-hidden">
      {/* Fond radial subtil */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 100%, rgba(59,130,246,0.05) 0%, transparent 60%)`,
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* ── En-tête de section ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block text-sm font-semibold text-cyan-400 uppercase tracking-wider mb-4">
            Fonctionnalités
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
            Tout ce qu'il faut pour gérer{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              une flotte sérieusement.
            </span>
          </h2>
          <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
            Pensé pour les transporteurs français — PL, SPL, VUL, frigorifique.
            Sans boîtier GPS, 100% conforme RGPD.
          </p>
        </motion.div>

        {/* ── 4 features avec mini-maquettes CSS ── */}
        <div className="grid sm:grid-cols-2 gap-5 mb-5">
          {featuresWithMockup.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.5,
                delay: index * 0.08,
                ease: [0.22, 1, 0.36, 1],
              }}
              className={`group relative rounded-2xl border ${feature.border} bg-[#0f172a]/70 backdrop-blur-sm p-6 flex flex-col gap-4 transition-all duration-300 hover:-translate-y-1`}
            >
              {/* Badge */}
              {feature.badge && (
                <div className="absolute -top-2 -right-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-cyan-500 to-blue-500 text-white">
                    {feature.badge}
                  </span>
                </div>
              )}

              {/* Contenu texte + mockup */}
              <div className="flex items-start gap-4">
                {/* Texte */}
                <div className="flex-1 min-w-0">
                  <div
                    className={`inline-flex items-center justify-center w-10 h-10 rounded-xl border ${feature.iconBg} mb-3`}
                  >
                    <feature.icon className={`h-5 w-5 ${feature.iconColor}`} />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                {/* Mini-maquette CSS */}
                <div className="hidden sm:block">
                  <feature.Mockup />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── 3 features sans maquette ── */}
        <div className="grid sm:grid-cols-3 gap-5">
          {featuresWithoutMockup.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.5,
                delay: 0.32 + index * 0.08,
                ease: [0.22, 1, 0.36, 1],
              }}
              className={`group relative rounded-2xl border ${feature.border} bg-[#0f172a]/70 backdrop-blur-sm p-6 transition-all duration-300 hover:-translate-y-1`}
            >
              <div
                className={`inline-flex items-center justify-center w-12 h-12 rounded-xl border ${feature.iconBg} mb-4`}
              >
                <feature.icon className={`h-6 w-6 ${feature.iconColor}`} />
              </div>
              <h3 className="text-base font-bold text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* ── Note RGPD en bas ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm"
        >
          <div className="flex items-center gap-2 text-slate-500">
            <Shield className="h-5 w-5 text-emerald-400" />
            <span>Données hébergées en France</span>
          </div>
          <div className="hidden sm:block w-px h-4 bg-slate-700" />
          <div className="flex items-center gap-2 text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>100% conforme RGPD — pas de traqueur GPS</span>
          </div>
          <div className="hidden sm:block w-px h-4 bg-slate-700" />
          <a
            href="#pricing"
            className="text-cyan-500 hover:text-cyan-400 underline underline-offset-4 transition-colors"
          >
            Voir les tarifs →
          </a>
        </motion.div>
      </div>
    </section>
  );
}

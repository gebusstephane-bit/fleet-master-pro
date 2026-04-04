"use client";

import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import {
  Brain,
  Shield,
  QrCode,
  TrendingUp,
  AlertTriangle,
  Clock,
  BarChart3,
  Fuel,
  Wrench
} from "lucide-react";

// Feature avec visualisation de données temps réel
interface FeatureData {
  label: string;
  value: number;
  trend: number;
  color?: string;
}

function RealTimeGraph({ color }: { color: string }) {
  const [points, setPoints] = useState<number[]>([50, 60, 45, 70, 55, 80, 65]);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setPoints(prev => {
        const newValue = 40 + Math.random() * 40;
        return [...prev.slice(1), newValue];
      });
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const path = points.map((p, i) => 
    `${i === 0 ? 'M' : 'L'} ${i * (100 / (points.length - 1))} ${100 - p}`
  ).join(' ');

  return (
    <svg viewBox="0 0 100 100" className="w-full h-24 opacity-50">
      <defs>
        <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.5" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`${path} L 100 100 L 0 100 Z`}
        fill={`url(#gradient-${color})`}
      />
      <motion.path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="2"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5 }}
      />
    </svg>
  );
}

function FeatureCard({ 
  feature, 
  index 
}: { 
  feature: {
    icon: React.ElementType;
    title: string;
    description: string;
    color: string;
    data: FeatureData;
    image?: string;
  };
  index: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50, rotateX: 15 }}
      animate={isInView ? { opacity: 1, y: 0, rotateX: 0 } : {}}
      transition={{ duration: 0.8, delay: index * 0.1, type: "spring" }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="relative group"
      style={{ perspective: 1000 }}
    >
      {/* Glow effect */}
      <motion.div
        className="absolute -inset-px rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: feature.color }}
      />

      <div className="relative h-full rounded-2xl overflow-hidden bg-[#0a0f1a] border border-white/10 hover:border-white/20 transition-all duration-300">
        {/* Graph background */}
        <div className="absolute inset-0 opacity-30">
          <RealTimeGraph color={feature.color} />
        </div>

        {/* Content */}
        <div className="relative p-6 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <motion.div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: `${feature.color}20`, border: `1px solid ${feature.color}40` }}
              animate={{ rotate: isHovered ? 360 : 0 }}
              transition={{ duration: 0.5 }}
            >
              <feature.icon className="h-6 w-6" style={{ color: feature.color }} />
            </motion.div>

            {/* Live data pill */}
            <motion.div
              className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono"
              style={{ background: `${feature.color}20`, color: feature.color }}
              animate={{ scale: isHovered ? 1.1 : 1 }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: feature.color }} />
              {feature.data.value.toLocaleString()} {feature.data.label}
            </motion.div>
          </div>

          {/* Title & Description */}
          <h3 className="text-lg font-bold text-white mb-2 group-hover:text-white transition-colors">
            {feature.title}
          </h3>
          {feature.image && (
            <div className="w-full mb-3 rounded-lg overflow-hidden">
              <Image
                src={feature.image}
                alt={feature.title}
                width={600}
                height={240}
                className="w-full h-40 object-cover rounded-lg"
                sizes="(max-width: 768px) 100vw, 50vw"
                quality={75}
                unoptimized
              />
            </div>
          )}
          <p className="text-sm text-slate-400 mb-4 flex-1">
            {feature.description}
          </p>

          {/* Trend indicator */}
          <div className="flex items-center gap-2 text-xs">
            <TrendingUp className={`h-4 w-4 ${feature.data.trend > 0 ? 'text-emerald-400' : 'text-red-400'}`} />
            <span className={feature.data.trend > 0 ? 'text-emerald-400' : 'text-red-400'}>
              {feature.data.trend > 0 ? '+' : ''}{feature.data.trend}%
            </span>
            <span className="text-slate-500">vs mois dernier</span>
          </div>
        </div>

        {/* Hover spotlight */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 50% 0%, ${feature.color}20 0%, transparent 70%)`,
          }}
          animate={{ opacity: isHovered ? 1 : 0 }}
        />
      </div>
    </motion.div>
  );
}

const features = [
  {
    icon: Shield,
    title: "Conformité Auto",
    description: "CT, assurances, permis — tout est surveillé 24/7. Alertes automatiques J-30, J-15, J-7.",
    color: "#10b981",
    data: { label: "docs suivis", value: 15234, trend: 12 },
    image: "/images/landing/conformite.webp",
  },
  {
    icon: QrCode,
    title: "Inspection QR",
    description: "Scannez, inspectez, signez. Sans application. 32 points de contrôle en 2 minutes avec geolocalisation.",
    color: "#8b5cf6",
    data: { label: "inspections", value: 8932, trend: 45 },
    image: "/images/landing/inspection.webp",
  },
  {
    icon: Wrench,
    title: "Maintenance Proactive",
    description: "Planification automatique selon kilométrage et usage. Réduction des immobilisations de 40%.",
    color: "#f97316",
    data: { label: "interventions", value: 342, trend: -5 },
    image: "/images/landing/maintenance.webp",
  },
  {
    icon: Fuel,
    title: "Optimisation Carburant",
    description: "Détection d'anomalies de consommation, comparaison par véhicule et par chauffeur. Économies moyennes : 15%.",
    color: "#ec4899",
    data: { label: "litres économisés", value: 12847, trend: 15 },
    image: "/images/landing/carburant.webp",
  },
  {
    icon: Brain,
    title: "IA Prédictive",
    description: "Anticipez les pannes 30 jours avant qu'elles n'arrivent. Algorithmes de machine learning entraînés sur 10M+ de véhicules.",
    color: "#00d4ff",
    data: { label: "prédictions", value: 2847, trend: 23 },
    image: "/images/landing/ia-predictive.webp",
  },
  {
    icon: BarChart3,
    title: "Analytics Temps Réel",
    description: "Tableaux de bord live TCO, consommation, efficacité. Exportez vers Excel, PowerBI, ou votre ERP.",
    color: "#f59e0b",
    data: { label: "métriques", value: 456, trend: 8 },
    image: "/images/landing/analytics.webp",
  },
];

export function FeaturesV2() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <section ref={containerRef} id="features" className="py-32 relative overflow-hidden">
      {/* Background animé */}
      <motion.div 
        className="absolute inset-0"
        style={{ y: backgroundY }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[#020617] via-[#0a0f1a] to-[#020617]" />
        {/* Grille perspective */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,212,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.03)_1px,transparent_1px)] bg-[size:100px_100px] [transform:perspective(500px)_rotateX(60deg)] [transform-origin:top] opacity-30" />
      </motion.div>

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 glass-cosmic px-4 py-2 rounded-full mb-6"
          >
            <Clock className="h-4 w-4 text-[#00d4ff]" />
            <span className="text-xs uppercase tracking-[0.15em] text-[#00d4ff]">Données temps réel</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6"
          >
            <span className="text-cosmic-display">Tout ce dont votre flotte</span>
            <br />
            <span className="text-cosmic-gradient">a besoin</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl text-slate-400 max-w-2xl mx-auto"
          >
            Conformité, maintenance, carburant, inspections — chaque outil pensé
            pour les réalités du transport français.
          </motion.p>
        </div>

        {/* Grid de features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </div>

        {/* Alert banner */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="mt-16 glass-cosmic rounded-2xl p-6 border border-amber-500/30 flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center animate-pulse">
            <AlertTriangle className="h-6 w-6 text-amber-400" />
          </div>
          <div className="flex-1">
            <h4 className="text-white font-semibold mb-1">Alerte proactive détectée</h4>
            <p className="text-sm text-slate-400">
              Notre système vient d'identifier un risque de panne moteur sur le véhicule FR-452-AX 
              dans les 15 prochains jours. Maintenance recommandée.
            </p>
          </div>
          <motion.button
            className="px-4 py-2 rounded-lg bg-amber-500/20 text-amber-400 text-sm font-medium hover:bg-amber-500/30 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Voir le rapport
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}

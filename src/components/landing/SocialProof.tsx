"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { TrendingDown, Clock, Shield, Truck } from "lucide-react";

const metrics = [
  {
    icon: Truck,
    value: 500,
    suffix: "+",
    label: "Flottes gérées",
    color: "cyan",
    iconColor: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/20",
  },
  {
    icon: TrendingDown,
    value: 30,
    suffix: "%",
    label: "de réduction des coûts",
    color: "emerald",
    iconColor: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
  },
  {
    icon: Clock,
    value: 47,
    suffix: "h",
    label: "économisées/mois",
    color: "blue",
    iconColor: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
  },
  {
    icon: Shield,
    value: 99.9,
    suffix: "%",
    label: "de disponibilité",
    color: "violet",
    iconColor: "text-violet-400",
    bgColor: "bg-violet-500/10",
    borderColor: "border-violet-500/20",
  },
];

function CountUp({ target, suffix, duration = 1800 }: { target: number; suffix: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const startTime = performance.now();
    const isDecimal = target % 1 !== 0;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = eased * target;
      setCount(isDecimal ? Math.round(current * 10) / 10 : Math.floor(current));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, target, duration]);

  return (
    <span ref={ref}>
      {count % 1 !== 0 ? count.toFixed(1) : count}
      {suffix}
    </span>
  );
}

export function SocialProof() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="py-16 bg-[#09090b] relative overflow-hidden">
      {/* Subtle top border glow */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Metrics grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-12">
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`relative rounded-2xl border ${metric.borderColor} ${metric.bgColor} p-6 text-center backdrop-blur-sm`}
            >
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 ${metric.iconColor} mb-3`}>
                <metric.icon className="h-5 w-5" />
              </div>
              <div className={`text-3xl lg:text-4xl font-extrabold text-white mb-1`}>
                <CountUp target={metric.value} suffix={metric.suffix} />
              </div>
              <p className="text-sm text-slate-500 font-medium">{metric.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Logo band */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center"
        >
          <p className="text-xs text-slate-600 uppercase tracking-widest font-medium mb-6">
            Transporteurs qui ont choisi FleetMaster Pro
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
            {[
              "Transports Martin",
              "LogiPro SAS",
              "Express Delivery",
              "EcoFleet France",
              "FastTrack Group",
              "CargoPlus Méditerranée",
              "Nord Logistique",
            ].map((company, i) => (
              <motion.span
                key={company}
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: 1 } : {}}
                transition={{ delay: 0.5 + i * 0.07 }}
                className="text-sm font-bold text-slate-600 hover:text-slate-400 transition-colors cursor-default tracking-tight"
              >
                {company}
              </motion.span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

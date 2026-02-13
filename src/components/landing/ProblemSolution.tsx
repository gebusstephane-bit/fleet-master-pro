"use client";

import { motion } from "framer-motion";
import { AlertTriangle, TrendingDown, ShieldCheck } from "lucide-react";
import { useInView } from "framer-motion";
import { useRef } from "react";

const problems = [
  {
    icon: AlertTriangle,
    title: "Arrêtez les pannes surprises",
    stat: "73%",
    description: "des pannes pourraient être évitées avec une maintenance préventive",
    solution: "Notre IA détecte les anomalies 14 jours avant la panne",
  },
  {
    icon: TrendingDown,
    title: "Réduisez la consommation",
    stat: "15%",
    description: "d'économies de carburant en moyenne pour nos clients",
    solution: "Optimisation des itinéraires et suivi éco-conduite",
  },
  {
    icon: ShieldCheck,
    title: "Conformité automatique",
    stat: "100%",
    description: "de vos documents réglementaires toujours à jour",
    solution: "Alertes automatiques et renouvellements en 1 clic",
  },
];

export function ProblemSolution() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-24 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Fini les cauchemars de gestion
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Les transporteurs perdent en moyenne 47h par mois sur des tâches administratives. 
            Reprenez le contrôle.
          </p>
        </motion.div>

        {/* Bento grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {problems.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -4 }}
              className="group relative rounded-2xl border border-gray-200 bg-white p-8 shadow-sm hover:shadow-lg hover:border-blue-200 transition-all duration-300"
            >
              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-gray-50 group-hover:bg-blue-50 flex items-center justify-center mb-6 transition-colors">
                <item.icon className="h-6 w-6 text-gray-600 group-hover:text-blue-600 transition-colors" />
              </div>

              {/* Stat highlight */}
              <div className="mb-4">
                <span className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {item.stat}
                </span>
              </div>

              {/* Content */}
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {item.title}
              </h3>
              <p className="text-gray-500 text-sm mb-4">
                {item.description}
              </p>

              {/* Solution highlight */}
              <div className="pt-4 border-t border-gray-100">
                <p className="text-sm font-medium text-blue-600">
                  ✓ {item.solution}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

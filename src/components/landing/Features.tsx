"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { 
  MapPin, 
  Brain, 
  FileText, 
  Route, 
  BarChart3, 
  Bell,
  Clock,
  Users
} from "lucide-react";

const features = [
  {
    icon: MapPin,
    title: "Géolocalisation temps réel",
    description: "Suivez chaque véhicule en temps réel. Alertes géofencing automatiques quand un camion sort de sa zone.",
    image: "map",
    color: "blue",
  },
  {
    icon: Brain,
    title: "Maintenance prédictive",
    description: "L'IA analyse les données moteur et détecte les anomalies 14 jours avant la panne. Fini les surprises.",
    image: "ai",
    color: "indigo",
  },
  {
    icon: Route,
    title: "Optimisation des tournées",
    description: "Réduisez vos kilomètres parcourus de 20% avec notre algorithme d'optimisation d'itinéraires.",
    image: "route",
    color: "violet",
  },
  {
    icon: FileText,
    title: "Gestion documentaire",
    description: "Finis les documents périmés. Renew auto des assurances, contrôles techniques et permis.",
    image: "docs",
    color: "emerald",
  },
];

export function Features() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-24 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <span className="inline-block text-sm font-semibold text-blue-600 uppercase tracking-wider mb-4">
            Fonctionnalités
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Tout ce qu&apos;il faut pour gérer votre flotte
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Une suite complète d&apos;outils pensée pour les transporteurs, 
            pas pour les geeks.
          </p>
        </motion.div>

        {/* Features grid - Z pattern */}
        <div className="space-y-24">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              className={`grid lg:grid-cols-2 gap-12 items-center ${
                index % 2 === 1 ? "lg:flex-row-reverse" : ""
              }`}
            >
              {/* Content */}
              <div className={index % 2 === 1 ? "lg:order-2" : ""}>
                <div className={`w-14 h-14 rounded-2xl bg-${feature.color}-100 flex items-center justify-center mb-6`}>
                  <feature.icon className={`h-7 w-7 text-${feature.color}-600`} />
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
                  {feature.title}
                </h3>
                <p className="text-lg text-gray-600 mb-6">
                  {feature.description}
                </p>
                
                {/* Feature points */}
                <ul className="space-y-3">
                  {[
                    "Alertes en temps réel",
                    "Rapports automatiques",
                    "Export PDF/Excel",
                  ].map((point) => (
                    <li key={point} className="flex items-center gap-3 text-gray-700">
                      <svg className="h-5 w-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Visual */}
              <div className={index % 2 === 1 ? "lg:order-1" : ""}>
                <div className="relative rounded-2xl overflow-hidden bg-white shadow-xl border border-gray-200">
                  {/* Mock feature UI */}
                  <div className="p-6">
                    {feature.image === "map" && (
                      <div className="aspect-video bg-gray-100 rounded-xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50" />
                        {/* Map pins */}
                        <div className="absolute top-1/4 left-1/4 w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg" />
                        <div className="absolute top-1/2 left-1/2 w-4 h-4 bg-green-600 rounded-full border-2 border-white shadow-lg" />
                        <div className="absolute bottom-1/3 right-1/4 w-4 h-4 bg-amber-600 rounded-full border-2 border-white shadow-lg" />
                        {/* Route line */}
                        <svg className="absolute inset-0 w-full h-full">
                          <path d="M 100 80 Q 200 150 300 120" stroke="#3B82F6" strokeWidth="3" fill="none" strokeDasharray="8 4" />
                        </svg>
                        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3">
                          <p className="text-xs font-semibold text-gray-900">3 véhicules en ligne</p>
                          <p className="text-xs text-gray-500">Dernier update: 2 min</p>
                        </div>
                      </div>
                    )}
                    
                    {feature.image === "ai" && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-100">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                              <span className="text-red-600 font-bold">!</span>
                            </div>
                            <div>
                              <p className="font-semibold text-red-900">Risque élevé détecté</p>
                              <p className="text-sm text-red-700">Véhicule AB-123-CD</p>
                            </div>
                          </div>
                          <span className="text-2xl font-bold text-red-600">87%</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-amber-50 rounded-xl border border-amber-100">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                              <span className="text-amber-600 font-bold">!</span>
                            </div>
                            <div>
                              <p className="font-semibold text-amber-900">Maintenance prévue</p>
                              <p className="text-sm text-amber-700">Dans 5 jours</p>
                            </div>
                          </div>
                          <span className="text-2xl font-bold text-amber-600">45%</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-100">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                              <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                            <div>
                              <p className="font-semibold text-green-900">Tout va bien</p>
                              <p className="text-sm text-green-700">12 véhicules</p>
                            </div>
                          </div>
                          <span className="text-2xl font-bold text-green-600">OK</span>
                        </div>
                      </div>
                    )}
                    
                    {feature.image === "route" && (
                      <div className="aspect-video bg-gray-50 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-sm font-medium text-gray-700">Optimisation J+1</span>
                          <span className="text-sm text-green-600 font-semibold">-18% de km</span>
                        </div>
                        <div className="space-y-2">
                          {[
                            { stop: "Dépôt", time: "08:00", color: "blue" },
                            { stop: "Client A - Lyon", time: "09:30", color: "gray" },
                            { stop: "Client B - Grenoble", time: "11:45", color: "gray" },
                            { stop: "Client C - Chambéry", time: "14:00", color: "gray" },
                            { stop: "Retour dépôt", time: "16:30", color: "blue" },
                          ].map((stop, i) => (
                            <div key={i} className="flex items-center gap-3 text-sm">
                              <div className={`w-2 h-2 rounded-full bg-${stop.color}-500`} />
                              <span className="flex-1 text-gray-700">{stop.stop}</span>
                              <span className="text-gray-500">{stop.time}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {feature.image === "docs" && (
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { name: "Assurance flotte", status: "OK", days: 245 },
                          { name: "CT Véhicule AB-123", status: "Alert", days: 15 },
                          { name: "Permis Chauffeur M.", status: "OK", days: 180 },
                          { name: "Contrat maintenance", status: "OK", days: 90 },
                        ].map((doc, i) => (
                          <div key={i} className="p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                              <FileText className="h-4 w-4 text-gray-400" />
                              <span className={`text-xs font-medium ${doc.status === "OK" ? "text-green-600" : "text-amber-600"}`}>
                                {doc.status === "OK" ? "✓" : "⚠"}
                              </span>
                            </div>
                            <p className="text-xs font-medium text-gray-900 truncate">{doc.name}</p>
                            <p className={`text-xs ${doc.days < 30 ? "text-amber-600" : "text-gray-500"}`}>
                              {doc.days} jours restants
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

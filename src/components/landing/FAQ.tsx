"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const faqs = [
  {
    question: "Combien de temps faut-il pour installer FleetMaster ?",
    answer: "Moins de 10 minutes. Connectez-vous, ajoutez vos véhicules et commencez immédiatement. Aucune installation matérielle requise.",
  },
  {
    question: "Mes données sont-elles sécurisées ?",
    answer: "Absolument. Nous utilisons le chiffrement AES-256, les serveurs sont en Europe (France/Allemagne), et nous sommes conformes RGPD. Vos données ne sont jamais revendues.",
  },
  {
    question: "Puis-je migrer depuis mon ancien système ?",
    answer: "Oui ! Notre équipe vous accompagne pour importer vos données existantes (Excel, CSV, ou autre logiciel). La plupart des migrations se font en moins d'une journée.",
  },
  {
    question: "Faut-il installer des boîtiers dans les véhicules ?",
    answer: "Non obligatoire. Pour la géolocalisation basique, utilisez l'app mobile. Pour des données avancées (diagnostic moteur), un boîtier OBD optionnel peut être ajouté.",
  },
  {
    question: "Et si je veux résilier ?",
    answer: "Pas de problème. Vous pouvez exporter toutes vos données à tout moment (format Excel/CSV). Pas de frais cachés, pas de questions posées.",
  },
  {
    question: "Proposez-vous des formations ?",
    answer: "Oui. Tous nos plans incluent des tutoriels vidéo. Le plan Pro ajoute des webinaires mensuels. L'Enterprise inclut une formation sur site de votre équipe.",
  },
];

export function FAQ() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section ref={ref} className="py-24 bg-white">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block text-sm font-semibold text-blue-600 uppercase tracking-wider mb-4">
            FAQ
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Questions fréquentes
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Vous avez d&apos;autres questions ? Contactez-nous à hello@fleetmaster.pro
          </p>
        </motion.div>

        {/* FAQ items */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              className="border border-gray-200 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="font-semibold text-gray-900 pr-8">
                  {faq.question}
                </span>
                <ChevronDown
                  className={cn(
                    "h-5 w-5 text-gray-500 flex-shrink-0 transition-transform duration-200",
                    openIndex === index && "rotate-180"
                  )}
                />
              </button>
              {openIndex === index && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="px-6 pb-6"
                >
                  <p className="text-gray-600 leading-relaxed">
                    {faq.answer}
                  </p>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

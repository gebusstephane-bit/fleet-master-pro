"use client";

import { motion, useInView, AnimatePresence } from "framer-motion";
import { useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const faqs = [
  {
    question: "Pourquoi FleetMaster Pro n'a pas de géolocalisation GPS ?",
    answer: "Nous avons fait le choix de ne pas inclure de traqueur GPS pour trois raisons : (1) Meilleure conformité RGPD — pas de surveillance permanente des chauffeurs, (2) Prix 10x moins cher — pas de boîtier OBD ni d'abonnement GPS coûteux, (3) Simplicité — pas d'installation matérielle. La gestion de flotte n'a pas besoin de savoir où est chaque camion en permanence.",
  },
  {
    question: "Comment fonctionnent les inspections QR sans application ?",
    answer: "Chaque véhicule a un QR code unique. Le chauffeur scanne avec l'appareil photo de son téléphone (n'importe quel téléphone, iPhone ou Android) et accède directement à un formulaire dans son navigateur. Pas besoin d'installer d'application, de créer un compte, ou de se connecter.",
  },
  {
    question: "Combien de temps faut-il pour installer FleetMaster ?",
    answer: "Moins de 10 minutes. Créez votre compte, ajoutez vos véhicules, imprimez les QR codes et collez-les. Aucune installation matérielle, aucun boîtier OBD à brancher.",
  },
  {
    question: "Mes données sont-elles sécurisées ?",
    answer: "Absolument. Nous utilisons le chiffrement AES-256, les serveurs sont hébergés en France (OVH), et nous sommes 100% conformes RGPD. Vos données ne sont jamais revendues.",
  },
  {
    question: "Puis-je migrer depuis mon ancien système ?",
    answer: "Oui ! Notre équipe vous accompagne pour importer vos données existantes (Excel, CSV, ou autre logiciel). La plupart des migrations se font en moins d'une journée.",
  },
  {
    question: "Que se passe-t-il si mon chauffeur n'a pas de smartphone ?",
    answer: "Le QR code fonctionne avec n'importe quel téléphone équipé d'un appareil photo et d'un navigateur — même les vieux smartphones. Si vraiment un chauffeur n'a pas de téléphone, un autre membre de l'équipe peut scanner à sa place.",
  },
  {
    question: "Et si je veux résilier ?",
    answer: "Pas de problème. Vous pouvez exporter toutes vos données à tout moment (format Excel/CSV/PDF). Pas de frais cachés, pas de questions posées.",
  },
  {
    question: "Proposez-vous des formations ?",
    answer: "Oui. Tous nos plans incluent des tutoriels vidéo et une documentation complète. Le plan Pro ajoute un support prioritaire par email. L'Unlimited inclut des sessions de formation personnalisées.",
  },
];

export function FAQ() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section ref={ref} className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-500/5 to-transparent pointer-events-none" />
      
      <div className="relative mx-auto max-w-3xl px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 glass-cosmic px-4 py-2 rounded-full text-xs font-medium uppercase tracking-[0.15em] text-[#00d4ff] mb-6">
            FAQ
          </span>
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-6">
            <span className="text-cosmic-display">
              Questions fréquentes
            </span>
          </h2>
          <p className="text-lg text-slate-400">
            Vous avez d'autres questions ? Contactez-nous à hello@fleetmaster.pro
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
              className="glass-cosmic rounded-xl overflow-hidden border border-white/10 hover:border-[#00d4ff]/30 transition-colors"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-white/5 transition-colors"
              >
                <span className="font-semibold text-white pr-8">
                  {faq.question}
                </span>
                <ChevronDown
                  className={cn(
                    "h-5 w-5 text-[#00d4ff] flex-shrink-0 transition-transform duration-200",
                    openIndex === index && "rotate-180"
                  )}
                />
              </button>
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="px-6 pb-6"
                  >
                    <p className="text-slate-400 leading-relaxed">
                      {faq.answer}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

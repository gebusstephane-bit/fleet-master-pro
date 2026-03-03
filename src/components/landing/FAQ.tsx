"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const faqs = [
  {
    question: "Pourquoi FleetMaster Pro n'a pas de géolocalisation GPS ?",
    answer: "Nous avons fait le choix de ne pas inclure de traqueur GPS pour trois raisons : (1) Meilleure conformité RGPD — pas de surveillance permanente des chauffeurs, (2) Prix 10x moins cher — pas de boîtier OBD ni d'abonnement GPS coûteux, (3) Simplicité — pas d'installation matérielle. La gestion de flotte n'a pas besoin de savoir où est chaque camion en permanence, elle a besoin de conformité, de maintenance et de contrôle des coûts.",
  },
  {
    question: "Comment fonctionnent les inspections QR sans application ?",
    answer: "Chaque véhicule a un QR code unique. Le chauffeur scanne avec l'appareil photo de son téléphone (n'importe quel téléphone, iPhone ou Android) et accède directement à un formulaire dans son navigateur. Pas besoin d'installer d'application, de créer un compte, ou de se connecter. Il remplit l'inspection, ajoute des photos si besoin, signe électroniquement, et c'est envoyé instantanément.",
  },
  {
    question: "Combien de temps faut-il pour installer FleetMaster ?",
    answer: "Moins de 10 minutes. Créez votre compte, ajoutez vos véhicules, imprimez les QR codes et collez-les. Aucune installation matérielle, aucun boîtier OBD à brancher, aucun garage à solliciter. Vos chauffeurs peuvent commencer à inspecter dès aujourd'hui.",
  },
  {
    question: "Mes données sont-elles sécurisées ?",
    answer: "Absolument. Nous utilisons le chiffrement AES-256, les serveurs sont hébergés en France (OVH), et nous sommes 100% conformes RGPD. Vos données ne sont jamais revendues. En tant qu'entreprise française, nous sommes soumis au droit européen strict sur la protection des données.",
  },
  {
    question: "Puis-je migrer depuis mon ancien système ?",
    answer: "Oui ! Notre équipe vous accompagne pour importer vos données existantes (Excel, CSV, ou autre logiciel). La plupart des migrations se font en moins d'une journée. Nous avons même des scripts d'import pour les principaux logiciels de gestion de flotte.",
  },
  {
    question: "Que se passe-t-il si mon chauffeur n'a pas de smartphone ?",
    answer: "Le QR code fonctionne avec n'importe quel téléphone équipé d'un appareil photo et d'un navigateur — même les vieux smartphones. Si vraiment un chauffeur n'a pas de téléphone, un autre membre de l'équipe peut scanner à sa place. L'important est que l'inspection soit faite, pas qui la fait.",
  },
  {
    question: "Et si je veux résilier ?",
    answer: "Pas de problème. Vous pouvez exporter toutes vos données à tout moment (format Excel/CSV/PDF). Pas de frais cachés, pas de questions posées. Vous gardez l'accès à vos données même après résiliation.",
  },
  {
    question: "Proposez-vous des formations ?",
    answer: "Oui. Tous nos plans incluent des tutoriels vidéo et une documentation complète. Le plan Pro ajoute un support prioritaire par email. L'Unlimited inclut des sessions de formation personnalisées pour votre équipe.",
  },
];

export function FAQ() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section ref={ref} className="py-24 bg-[#09090b]">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block text-sm font-semibold text-blue-400 uppercase tracking-wider mb-4">
            FAQ
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Questions fréquentes
          </h2>
          <p className="mt-4 text-lg text-[#a1a1aa]">
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
              className="border border-white/[0.08] rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-white/[0.02] transition-colors"
              >
                <span className="font-semibold text-white pr-8">
                  {faq.question}
                </span>
                <ChevronDown
                  className={cn(
                    "h-5 w-5 text-[#71717a] flex-shrink-0 transition-transform duration-200",
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
                  <p className="text-[#a1a1aa] leading-relaxed">
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

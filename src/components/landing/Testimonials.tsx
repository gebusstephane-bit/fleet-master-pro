"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Jean-Pierre Martin",
    role: "Directeur",
    company: "Transports Martin",
    image: "JM",
    content: "FleetMaster nous a fait économiser 15 000€ le premier mois. La maintenance prédictive est bluffante.",
    rating: 5,
  },
  {
    name: "Sophie Dubois",
    role: "Responsable de flotte",
    company: "LogiPro",
    image: "SD",
    content: "Je ne compte plus les heures passées sur Excel avant. Maintenant tout est automatisé.",
    rating: 5,
  },
  {
    name: "Marc Lefebvre",
    role: "Gérant",
    company: "Express Delivery",
    image: "ML",
    content: "L'optimisation des tournées nous a fait gagner 2h par jour par chauffeur. Incroyable.",
    rating: 5,
  },
];

export function Testimonials() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-24 bg-[#09090b]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block text-sm font-semibold text-blue-400 uppercase tracking-wider mb-4">
            Témoignages
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Ils ont transformé leur flotte
          </h2>
          <p className="mt-4 text-lg text-[#a1a1aa]">
            Note moyenne : <span className="font-semibold text-white">4.8/5</span> sur Trustpilot
          </p>
        </motion.div>

        {/* Testimonials grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative bg-[#18181b]/60 backdrop-blur-sm rounded-2xl p-8 border border-white/[0.08]"
            >
              {/* Quote icon */}
              <Quote className="absolute top-6 right-6 h-8 w-8 text-white/[0.06]" />

              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>

              {/* Content */}
              <p className="text-[#a1a1aa] mb-6 leading-relaxed">
                &ldquo;{testimonial.content}&rdquo;
              </p>

              {/* Author */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold">
                  {testimonial.image}
                </div>
                <div>
                  <p className="font-semibold text-white">{testimonial.name}</p>
                  <p className="text-sm text-[#71717a]">
                    {testimonial.role}, {testimonial.company}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

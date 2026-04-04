"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const testimonials = [
  {
    quote:
      "Avant FleetMaster, j'ai eu une amende parce qu'un CT était expiré depuis 3 semaines. Maintenant je reçois l'alerte un mois avant. Tranquille.",
    author: "Thomas R.",
    initials: "TR",
    avatarColor: "#3B82F6",
    detail: "8 véhicules · Moselle",
  },
  {
    quote:
      "Le tableau de bord carburant m'a permis de repérer un chauffeur qui consommait 20% de plus que les autres. Problème réglé en une semaine.",
    author: "Marc L.",
    initials: "ML",
    avatarColor: "#8B5CF6",
    detail: "14 véhicules · Bas-Rhin",
  },
  {
    quote:
      "Onboarding en 3 minutes chrono. J'ai ajouté mes 6 camions, configuré les alertes, et le lendemain matin j'avais déjà 2 notifications utiles.",
    author: "Sophie D.",
    initials: "SD",
    avatarColor: "#06B6D4",
    detail: "6 véhicules · Meurthe-et-Moselle",
  },
  {
    quote:
      "Mes chauffeurs scannent le QR avant chaque départ. En 2 mois, plus aucune feuille papier. Le contrôleur DREAL a même fait une remarque positive.",
    author: "Karim B.",
    initials: "KB",
    avatarColor: "#10B981",
    detail: "11 véhicules · Seine-et-Marne (77)",
  },
  {
    quote:
      "J'avais des doutes sur la prise en main. La documentation intégrée est vraiment bien faite et Stéphane répond rapidement. Opérationnel en moins d'une heure.",
    author: "Patrick V.",
    initials: "PV",
    avatarColor: "#F59E0B",
    detail: "7 véhicules · Gironde (33)",
    badge: "Bêta testeur",
  },
  {
    quote:
      "On pilote 140 véhicules sur 3 dépôts depuis FleetMaster. Tout est centralisé, les responsables de dépôt ont chacun leur accès. 4 immobilisations évitées en 2 mois.",
    author: "Frédéric M.",
    initials: "FM",
    avatarColor: "#EF4444",
    detail: "140 véhicules · Nord (59)",
    badge: "Bêta testeur",
  },
];

function TestimonialCard({ t }: { t: (typeof testimonials)[number] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0a0f1a] p-8 flex flex-col justify-between h-full">
      <div className="flex gap-0.5 mb-4">
        {[...Array(5)].map((_, i) => (
          <span key={i} className="text-lg" style={{ color: "#F59E0B" }}>
            ★
          </span>
        ))}
      </div>
      <p className="text-slate-300 text-base leading-relaxed mb-6">
        &ldquo;{t.quote}&rdquo;
      </p>
      <div className="flex items-center gap-3">
        <div
          className="flex-shrink-0 flex items-center justify-center rounded-full text-white text-sm font-bold"
          style={{
            width: 40,
            height: 40,
            backgroundColor: t.avatarColor,
          }}
        >
          {t.initials}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-white font-semibold">{t.author}</p>
            {"badge" in t && t.badge && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/10 text-[#00d4ff] border border-[#00d4ff]/20">
                {t.badge}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500">{t.detail}</p>
        </div>
      </div>
    </div>
  );
}

export function TestimonialsCarousel() {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const total = testimonials.length;

  // Desktop shows 3 cards, so max position is total-3
  // Mobile shows 1 card, so max position is total-1
  const maxDesktop = total - 3;
  const maxMobile = total - 1;

  const next = useCallback(() => {
    setCurrent((prev) => (prev >= maxDesktop ? 0 : prev + 1));
  }, [maxDesktop]);

  const prev = useCallback(() => {
    setCurrent((prev) => (prev <= 0 ? maxDesktop : prev - 1));
  }, [maxDesktop]);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(next, 4000);
    return () => clearInterval(timer);
  }, [isPaused, next]);

  // Desktop: each card = 1/3 of the track (33.333%)
  // Mobile: each card = 100% of the track
  const clampedDesktop = Math.min(current, maxDesktop);
  const clampedMobile = Math.min(current, maxMobile);
  const desktopOffset = clampedDesktop * (100 / total);
  const mobileOffset = clampedMobile * 100;

  return (
    <section className="py-32 relative">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white text-center mb-16">
          Ils ont arrêté de gérer leur flotte à la main
        </h2>

        <div
          className="relative"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Desktop: 3 visible, slide track */}
          <div className="hidden md:block overflow-hidden">
            <div
              className="flex gap-8 transition-transform duration-500 ease-in-out"
              style={{
                width: `${(total / 3) * 100}%`,
                transform: `translateX(-${desktopOffset}%)`,
              }}
            >
              {testimonials.map((t) => (
                <div key={t.author} className="flex-shrink-0" style={{ width: `calc(${100 / total}% - ${(8 * 4 * (total - 1)) / total / 4}px)` }}>
                  <TestimonialCard t={t} />
                </div>
              ))}
            </div>
          </div>

          {/* Mobile: 1 visible, slide track */}
          <div className="md:hidden overflow-hidden">
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{
                width: `${total * 100}%`,
                transform: `translateX(-${mobileOffset / total}%)`,
              }}
            >
              {testimonials.map((t) => (
                <div key={t.author} className="flex-shrink-0 px-2" style={{ width: `${100 / total}%` }}>
                  <TestimonialCard t={t} />
                </div>
              ))}
            </div>
          </div>

          {/* Prev/Next buttons */}
          <button
            onClick={prev}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-10 h-10 rounded-full border border-white/10 bg-[#0a0f1a]/80 backdrop-blur flex items-center justify-center text-slate-400 hover:text-white hover:border-white/30 transition-colors z-10"
            aria-label="Précédent"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={next}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-10 h-10 rounded-full border border-white/10 bg-[#0a0f1a]/80 backdrop-blur flex items-center justify-center text-slate-400 hover:text-white hover:border-white/30 transition-colors z-10"
            aria-label="Suivant"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Pagination dots */}
        <div className="flex justify-center gap-2 mt-8">
          {testimonials.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === current
                  ? "bg-[#00d4ff] w-6"
                  : "bg-white/20 hover:bg-white/40 w-2"
              }`}
              aria-label={`Témoignage ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

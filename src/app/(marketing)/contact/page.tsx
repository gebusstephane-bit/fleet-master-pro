"use client";

/**
 * Page Contact — FleetMaster Pro
 * ─────────────────────────────────────────────────────────────────────────────
 * Coordonnées :
 *   Email      : contact@fleet-master.fr
 *   Téléphone  : 06 58 08 27 25
 *   Localisation : Coume, France
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Mail,
  Phone,
  MapPin,
  ArrowRight,
  CheckCircle2,
  Send,
  ChevronLeft,
} from "lucide-react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

// =============================================================================
// Coordonnées de contact
// =============================================================================

const contactDetails = [
  {
    icon: Mail,
    label: "Email",
    value: "contact@fleet-master.fr",
    href: "mailto:contact@fleet-master.fr",
    description: "Réponse sous 24h ouvrées",
    color: "cyan",
    iconBg: "bg-cyan-500/10 border-cyan-500/20",
    iconColor: "text-cyan-400",
  },
  {
    icon: Phone,
    label: "Téléphone",
    value: "06 58 08 27 25",
    href: "tel:+33658082725",
    description: "Lun.–Ven. 9h–18h",
    color: "blue",
    iconBg: "bg-blue-500/10 border-blue-500/20",
    iconColor: "text-blue-400",
  },
  {
    icon: MapPin,
    label: "Localisation",
    value: "Coume, France",
    href: "#",
    description: "Occitanie",
    color: "emerald",
    iconBg: "bg-emerald-500/10 border-emerald-500/20",
    iconColor: "text-emerald-400",
  },
];

/** Sujets disponibles dans le formulaire */
const subjects = [
  "Demande de démo",
  "Question sur les tarifs",
  "Assistance technique",
  "Partenariat",
  "Autre",
];

// =============================================================================
// Composant principal
// =============================================================================

export default function ContactPage() {
  const [formState, setFormState] = useState({
    firstName: "",
    lastName: "",
    email: "",
    company: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) {
    setFormState((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // Simulation d'envoi — à remplacer par l'appel API en production
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setSubmitted(true);
  }

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#0a0f1a] pt-24 pb-24">
        {/* ── Fond ambiant ── */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute left-[20%] top-[15%]"
            style={{
              width: "600px",
              height: "600px",
              background: "rgba(6,182,212,0.05)",
              borderRadius: "50%",
              filter: "blur(120px)",
            }}
          />
          <div
            className="absolute right-[15%] bottom-[20%]"
            style={{
              width: "500px",
              height: "500px",
              background: "rgba(59,130,246,0.05)",
              borderRadius: "50%",
              filter: "blur(100px)",
            }}
          />
        </div>

        {/* ── Grille de fond ── */}
        <div
          className="fixed inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(rgba(6, 182, 212, 0.04) 1px, transparent 1px),
              linear-gradient(90deg, rgba(6, 182, 212, 0.04) 1px, transparent 1px)
            `,
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          {/* ── Fil d'Ariane ── */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-10"
          >
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Retour à l'accueil
            </Link>
          </motion.div>

          {/* ── En-tête de page ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-14 text-center"
          >
            <span className="inline-block text-sm font-semibold text-cyan-400 uppercase tracking-wider mb-4">
              Contact
            </span>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
              Parlons de votre flotte
            </h1>
            <p className="text-lg text-slate-400 max-w-xl mx-auto">
              Une question sur FleetMaster Pro, une demande de démo ou un projet
              de partenariat ? Notre équipe vous répond sous 24h ouvrées.
            </p>
          </motion.div>

          {/* ══════════════════════════════════════════════════════════════════
              Grille principale : Coordonnées (gauche) + Formulaire (droite)
          ══════════════════════════════════════════════════════════════════ */}
          <div className="grid lg:grid-cols-5 gap-10 items-start">

            {/* ─── Colonne gauche — Coordonnées ─── */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="lg:col-span-2 space-y-5"
            >
              <div className="rounded-2xl border border-white/[0.08] bg-[#0f172a]/70 backdrop-blur-sm p-8">
                <h2 className="text-xl font-bold text-white mb-6">
                  Nos coordonnées
                </h2>

                {/* Coordonnées */}
                <div className="space-y-5">
                  {contactDetails.map((item) => (
                    <a
                      key={item.label}
                      href={item.href}
                      className="flex items-start gap-4 group"
                    >
                      <div
                        className={`w-11 h-11 rounded-xl border ${item.iconBg} flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 duration-200`}
                      >
                        <item.icon className={`h-5 w-5 ${item.iconColor}`} />
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 uppercase tracking-wider font-medium mb-0.5">
                          {item.label}
                        </p>
                        <p className="text-white font-semibold group-hover:text-cyan-400 transition-colors">
                          {item.value}
                        </p>
                        <p className="text-sm text-slate-500 mt-0.5">
                          {item.description}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>

                {/* Séparateur */}
                <div className="h-px bg-white/[0.06] my-8" />

                {/* Délais de réponse */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
                    Délais de réponse
                  </h3>
                  <ul className="space-y-2">
                    {[
                      "Demande de démo : sous 4h ouvrées",
                      "Support technique : sous 2h",
                      "Question tarifaire : sous 24h",
                    ].map((item) => (
                      <li
                        key={item}
                        className="flex items-center gap-2 text-sm text-slate-400"
                      >
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Bandeau de confiance */}
              <div className="rounded-2xl border border-cyan-500/15 bg-cyan-500/5 p-6">
                <p className="text-sm text-slate-400 leading-relaxed">
                  <span className="text-white font-semibold">500+ transporteurs</span>{" "}
                  nous font confiance pour gérer leur parc. Rejoignez-les et
                  transformez votre gestion de flotte dès aujourd'hui.
                </p>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-1.5 text-sm text-cyan-400 hover:text-cyan-300 font-medium mt-3 transition-colors"
                >
                  Commencer gratuitement
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </motion.div>

            {/* ─── Colonne droite — Formulaire ─── */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="lg:col-span-3"
            >
              <div className="rounded-2xl border border-white/[0.08] bg-[#0f172a]/70 backdrop-blur-sm p-8">

                {submitted ? (
                  /* ── État succès ── */
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4 }}
                    className="flex flex-col items-center justify-center py-16 text-center"
                  >
                    <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-6">
                      <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3">
                      Message envoyé !
                    </h3>
                    <p className="text-slate-400 max-w-sm mb-8">
                      Merci pour votre message. Notre équipe vous contactera sous
                      24h ouvrées à l'adresse indiquée.
                    </p>
                    <button
                      onClick={() => setSubmitted(false)}
                      className="text-sm text-cyan-400 hover:text-cyan-300 underline underline-offset-4 transition-colors"
                    >
                      Envoyer un autre message
                    </button>
                  </motion.div>
                ) : (
                  /* ── Formulaire ── */
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <h2 className="text-xl font-bold text-white mb-6">
                      Envoyez-nous un message
                    </h2>

                    {/* Prénom + Nom */}
                    <div className="grid sm:grid-cols-2 gap-5">
                      <FormField label="Prénom" required>
                        <input
                          type="text"
                          name="firstName"
                          value={formState.firstName}
                          onChange={handleChange}
                          placeholder="Jean"
                          required
                          className={inputClass}
                        />
                      </FormField>
                      <FormField label="Nom" required>
                        <input
                          type="text"
                          name="lastName"
                          value={formState.lastName}
                          onChange={handleChange}
                          placeholder="Dupont"
                          required
                          className={inputClass}
                        />
                      </FormField>
                    </div>

                    {/* Email + Entreprise */}
                    <div className="grid sm:grid-cols-2 gap-5">
                      <FormField label="Email professionnel" required>
                        <input
                          type="email"
                          name="email"
                          value={formState.email}
                          onChange={handleChange}
                          placeholder="jean@transports-dupont.fr"
                          required
                          className={inputClass}
                        />
                      </FormField>
                      <FormField label="Entreprise">
                        <input
                          type="text"
                          name="company"
                          value={formState.company}
                          onChange={handleChange}
                          placeholder="Transports Dupont SAS"
                          className={inputClass}
                        />
                      </FormField>
                    </div>

                    {/* Téléphone + Sujet */}
                    <div className="grid sm:grid-cols-2 gap-5">
                      <FormField label="Téléphone">
                        <input
                          type="tel"
                          name="phone"
                          value={formState.phone}
                          onChange={handleChange}
                          placeholder="06 XX XX XX XX"
                          className={inputClass}
                        />
                      </FormField>
                      <FormField label="Sujet" required>
                        <select
                          name="subject"
                          value={formState.subject}
                          onChange={handleChange}
                          required
                          className={`${inputClass} appearance-none`}
                        >
                          <option value="" disabled>
                            Sélectionnez un sujet
                          </option>
                          {subjects.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </FormField>
                    </div>

                    {/* Message */}
                    <FormField label="Message" required>
                      <textarea
                        name="message"
                        value={formState.message}
                        onChange={handleChange}
                        placeholder="Décrivez votre besoin, la taille de votre flotte, vos questions..."
                        required
                        rows={5}
                        className={`${inputClass} resize-none`}
                      />
                    </FormField>

                    {/* Bouton d'envoi */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-semibold text-base text-white transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed hover:-translate-y-0.5"
                      style={{
                        background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
                        boxShadow: "0 4px 20px rgba(6,182,212,0.2)",
                      }}
                    >
                      {loading ? (
                        <>
                          <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          Envoi en cours...
                        </>
                      ) : (
                        <>
                          <Send className="h-5 w-5" />
                          Envoyer le message
                        </>
                      )}
                    </button>

                    <p className="text-xs text-slate-600 text-center">
                      En envoyant ce formulaire, vous acceptez notre{" "}
                      <Link
                        href="/politique-confidentialite"
                        className="text-cyan-500 hover:text-cyan-400 underline underline-offset-4"
                      >
                        politique de confidentialité
                      </Link>
                      .
                    </p>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}

// =============================================================================
// Helpers
// =============================================================================

/** Classe CSS unifiée pour les champs de formulaire */
const inputClass = [
  "w-full rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600",
  "bg-[#18181b]/80 border border-white/[0.08]",
  "focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20",
  "hover:border-white/[0.12]",
  "transition-all duration-200",
].join(" ");

/** Wrapper label + field */
function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-400 mb-2">
        {label}
        {required && (
          <span className="text-cyan-500 ml-1" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
    </div>
  );
}

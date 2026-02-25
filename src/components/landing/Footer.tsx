"use client";

import Link from "next/link";
import { Linkedin, Twitter, Mail, Phone, MapPin } from "lucide-react";

const footerLinks = {
  produit: [
    { name: "Fonctionnalités", href: "#features" },
    { name: "Tarifs", href: "#pricing" },
    { name: "Intégrations", href: "#" },
    { name: "API", href: "#" },
    { name: "Sécurité", href: "#" },
  ],
  ressources: [
    { name: "Blog", href: "#" },
    { name: "Guides", href: "#" },
    { name: "Webinaires", href: "#" },
    { name: "Support", href: "#" },
    { name: "Status", href: "#" },
  ],
  legal: [
    { name: "Mentions légales", href: "/mentions-legales" },
    { name: "Confidentialité", href: "/politique-confidentialite" },
    { name: "CGV", href: "/cgv" },
    { name: "Cookies", href: "#" },
  ],
};

/** Coordonnées mises à jour — contact@fleet-master.fr */
const contactInfo = [
  {
    icon: Mail,
    label: "contact@fleet-master.fr",
    href: "mailto:contact@fleet-master.fr",
  },
  {
    icon: Phone,
    label: "06 58 08 27 25",
    href: "tel:+33658082725",
  },
  {
    icon: MapPin,
    label: "Coume, France",
    href: "#",
  },
];

export function Footer() {
  return (
    <footer className="bg-[#09090b] text-[#a1a1aa] border-t border-white/[0.06]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">

          {/* ── Logo & description ── */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none" className="text-white">
                <rect width="32" height="32" rx="8" fill="currentColor"/>
                <g transform="translate(4, 4)">
                  <circle cx="12" cy="12" r="4" fill="#0A0A0A"/>
                  <circle cx="12" cy="2" r="2.5" fill="#0A0A0A"/>
                  <circle cx="21" cy="8" r="2.5" fill="#0A0A0A"/>
                  <circle cx="21" cy="16" r="2.5" fill="#0A0A0A"/>
                  <circle cx="12" cy="22" r="2.5" fill="#0A0A0A"/>
                  <circle cx="3" cy="16" r="2.5" fill="#0A0A0A"/>
                  <circle cx="3" cy="8" r="2.5" fill="#0A0A0A"/>
                  <path d="M12 12L12 4.5" stroke="#0A0A0A" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M12 12L18.5 8" stroke="#0A0A0A" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M12 12L18.5 16" stroke="#0A0A0A" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M12 12L12 19.5" stroke="#0A0A0A" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M12 12L5.5 16" stroke="#0A0A0A" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M12 12L5.5 8" stroke="#0A0A0A" strokeWidth="1.5" strokeLinecap="round"/>
                </g>
              </svg>
              <span className="text-lg font-bold text-white">FleetMaster</span>
            </Link>
            <p className="text-[#71717a] text-sm mb-6 max-w-xs">
              La plateforme de gestion de flotte qui anticipe les pannes et réduit vos coûts d'exploitation.
            </p>
            <div className="flex gap-4">
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-[#27272a] flex items-center justify-center hover:bg-[#3f3f46] transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-[#27272a] flex items-center justify-center hover:bg-[#3f3f46] transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* ── Liens produit ── */}
          <div>
            <h4 className="font-semibold text-white mb-4">Produit</h4>
            <ul className="space-y-3">
              {footerLinks.produit.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="text-sm hover:text-white transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Liens ressources ── */}
          <div>
            <h4 className="font-semibold text-white mb-4">Ressources</h4>
            <ul className="space-y-3">
              {footerLinks.ressources.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="text-sm hover:text-white transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Coordonnées de contact ── */}
          <div>
            <h4 className="font-semibold text-white mb-4">Contact</h4>
            <ul className="space-y-3">
              {contactInfo.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-2 text-sm hover:text-white transition-colors group"
                  >
                    <item.icon className="h-4 w-4 text-cyan-500/60 group-hover:text-cyan-400 flex-shrink-0 transition-colors" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Bas de footer ── */}
        <div className="mt-12 pt-8 border-t border-white/[0.08] flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-[#71717a]">
            © {new Date().getFullYear()} FleetMaster Pro. Tous droits réservés.
          </p>
          <div className="flex gap-6">
            {footerLinks.legal.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-sm text-[#71717a] hover:text-white transition-colors"
              >
                {link.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

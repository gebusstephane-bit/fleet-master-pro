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
    { name: "Cookies", href: "/politique-confidentialite#cookies" },
  ],
};

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
    label: "Metz, Grand Est",
    href: "#",
  },
];

export function Footer() {
  return (
    <footer className="relative border-t border-white/10 bg-black/50 backdrop-blur-xl">
      {/* Top gradient line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00d4ff]/50 to-transparent" />
      
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Logo & description */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-4 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00d4ff] to-blue-500 flex items-center justify-center shadow-[0_0_20px_rgba(0,212,255,0.4)] group-hover:shadow-[0_0_30px_rgba(0,212,255,0.6)] transition-shadow">
                <span className="text-black font-bold text-sm">FM</span>
              </div>
              <span className="text-lg font-bold text-white">FleetMaster</span>
            </Link>
            <p className="text-slate-500 text-sm mb-6 max-w-xs">
              La plateforme de gestion de flotte qui anticipe les pannes et réduit vos coûts d'exploitation.
            </p>
            <div className="flex gap-3">
              <a
                href="#"
                className="w-10 h-10 rounded-lg glass-cosmic flex items-center justify-center hover:border-[#00d4ff]/50 hover:text-[#00d4ff] transition-all"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-lg glass-cosmic flex items-center justify-center hover:border-[#00d4ff]/50 hover:text-[#00d4ff] transition-all"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">Produit</h4>
            <ul className="space-y-3">
              {footerLinks.produit.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="text-sm text-slate-500 hover:text-[#00d4ff] transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">Ressources</h4>
            <ul className="space-y-3">
              {footerLinks.ressources.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="text-sm text-slate-500 hover:text-[#00d4ff] transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">Contact</h4>
            <ul className="space-y-3">
              {contactInfo.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-2 text-sm text-slate-500 hover:text-[#00d4ff] transition-colors group"
                  >
                    <item.icon className="h-4 w-4 text-slate-600 group-hover:text-[#00d4ff] transition-colors" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-slate-600">
            © {new Date().getFullYear()} Fleet-Master. Tous droits réservés.
          </p>
          <div className="flex flex-wrap gap-6">
            {footerLinks.legal.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-sm text-slate-600 hover:text-[#00d4ff] transition-colors"
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

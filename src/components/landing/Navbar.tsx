"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  { name: "Fonctionnalités", href: "#features" },
  { name: "Tarifs", href: "#pricing" },
  { name: "FAQ", href: "#faq" },
];

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "glass-cosmic border-b border-white/10"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00d4ff] to-blue-500 flex items-center justify-center shadow-[0_0_20px_rgba(0,212,255,0.4)] group-hover:shadow-[0_0_30px_rgba(0,212,255,0.6)] transition-shadow">
                <span className="text-black font-bold text-sm">FM</span>
              </div>
              <span className="text-sm font-bold text-white tracking-wide">
                FleetMaster
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="text-sm font-medium text-slate-400 hover:text-[#00d4ff] transition-colors duration-300"
                >
                  {link.name}
                </Link>
              ))}
            </nav>

            {/* CTAs */}
            <div className="hidden md:flex items-center gap-4">
              <Link
                href="/login"
                className="text-sm font-medium text-slate-400 hover:text-white transition-colors duration-300"
              >
                Connexion
              </Link>
              <Link href="/register">
                <button className="btn-cosmic text-xs py-2 px-4">
                  Essai Gratuit
                </button>
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 glass-cosmic rounded-lg"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5 text-white" />
              ) : (
                <Menu className="h-5 w-5 text-white" />
              )}
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 top-16 z-40 glass-cosmic border-b border-white/10 md:hidden"
          >
            <div className="px-6 py-8 space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="block text-sm font-medium text-slate-300 hover:text-[#00d4ff]"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
              <div className="h-px bg-white/10 my-4" />
              <Link
                href="/login"
                className="block text-sm font-medium text-slate-300 hover:text-white"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Connexion
              </Link>
              <Link href="/register" onClick={() => setIsMobileMenuOpen(false)}>
                <button className="btn-cosmic w-full mt-2">
                  Essai Gratuit
                </button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/ui/logo";

const navLinks = [
  { name: "Fonctionnalités", href: "#features" },
  { name: "Tarifs", href: "#pricing" },
  { name: "FAQ", href: "#faq" },
];

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
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
            ? "bg-white/80 backdrop-blur-xl shadow-sm border-b border-gray-200/50"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Logo variant="auto" size="md" />

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`text-sm font-medium transition-colors hover:text-blue-600 ${
                    isScrolled ? "text-gray-600" : "text-gray-600"
                  }`}
                >
                  {link.name}
                </Link>
              ))}
            </nav>

            {/* CTAs */}
            <div className="hidden md:flex items-center gap-4">
              <Link
                href="/login"
                className={`text-sm font-medium transition-colors hover:text-blue-600 ${
                  isScrolled ? "text-gray-600" : "text-gray-600"
                }`}
              >
                Connexion
              </Link>
              <Link href="/register">
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  Essai gratuit
                </Button>
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6 text-gray-900" />
              ) : (
                <Menu className="h-6 w-6 text-gray-900" />
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
            className="fixed inset-x-0 top-16 z-40 bg-white border-b border-gray-200 shadow-lg md:hidden"
          >
            <div className="px-4 py-6 space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="block text-base font-medium text-gray-900 hover:text-blue-600"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
              <hr className="border-gray-200" />
              <Link
                href="/login"
                className="block text-base font-medium text-gray-600 hover:text-blue-600"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Connexion
              </Link>
              <Link href="/register" className="block" onClick={() => setIsMobileMenuOpen(false)}>
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  Essai gratuit
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

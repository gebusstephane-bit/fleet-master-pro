"use client";

/**
 * Layout Authentification
 * Layout plein écran avec image hero-fleet et formulaire centré flottant
 */

import Image from 'next/image';
import { Logo } from '@/components/layout/logo';
import { FloatingParticlesSimple } from '@/components/effects/FloatingParticles';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Image de fond hero-fleet - pleine page */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/hero-fleet.jpg"
          alt="Fleet background"
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        {/* Overlay navy pour lisibilité */}
        <div className="absolute inset-0 bg-[#0a0f1a]/80" />
        {/* Dégradé subtil pour la profondeur */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5" />
      </div>

      {/* Fond avec dégradés (comme la partie droite avant) */}
      <div className="absolute inset-0 z-0">
        <div 
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(at 20% 20%, rgba(6,182,212,0.12) 0px, transparent 40%),
              radial-gradient(at 80% 20%, rgba(59,130,246,0.12) 0px, transparent 40%),
              radial-gradient(at 80% 80%, rgba(249,115,22,0.08) 0px, transparent 40%),
              radial-gradient(at 20% 80%, rgba(6,182,212,0.08) 0px, transparent 40%)
            `,
          }}
        />
        {/* Radial glow from center */}
        <div 
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at 50% 30%, rgba(6,182,212,0.08) 0%, transparent 50%)`,
          }}
        />
      </div>

      {/* Grid pattern subtile */}
      <div 
        className="absolute inset-0 opacity-20 z-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(6, 182, 212, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(6, 182, 212, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Étoiles flottantes */}
      <FloatingParticlesSimple count={40} />

      {/* Gradient orbs */}
      <div className="absolute left-1/4 top-1/4 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0">
        <div className="h-[600px] w-[600px] rounded-full bg-cyan-500/[0.06] blur-[120px] animate-pulse" />
      </div>
      <div className="absolute right-1/4 bottom-1/4 translate-x-1/2 translate-y-1/2 pointer-events-none z-0">
        <div className="h-[500px] w-[500px] rounded-full bg-blue-500/[0.06] blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Contenu du formulaire - centré */}
      <div className="w-full max-w-md px-4 sm:px-6 relative z-10">
        <div className="flex justify-center mb-8">
          <Logo size="lg" variant="light" />
        </div>
        
        {/* Formulaire flottant avec animation */}
        <div className="animate-float">
          {children}
        </div>
      </div>
    </div>
  );
}

"use client";

import { motion, useScroll, useTransform, useSpring, useMotionValue } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Play, Shield, Activity, MapPin, Zap } from "lucide-react";

// Système de particules connectées (réseau fleet)
function ParticleNetwork() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dimensions.width === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Points représentant les véhicules
    const particles: { x: number; y: number; vx: number; vy: number; size: number; color: string }[] = [];
    const particleCount = 25;
    const colors = ['#00d4ff', '#3b82f6', '#8b5cf6', '#10b981'];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * dimensions.width,
        y: Math.random() * dimensions.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 3 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    let animationId: number;
    const animate = () => {
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);

      // Mettre à jour et dessiner les particules
      particles.forEach((particle, i) => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Rebond sur les bords
        if (particle.x < 0 || particle.x > dimensions.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > dimensions.height) particle.vy *= -1;

        // Dessiner le point (véhicule)
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.fill();

        // Glow
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = particle.color + '20';
        ctx.fill();

        // Lignes de connexion (comme un réseau fleet)
        particles.forEach((other, j) => {
          if (i === j) return;
          const dx = particle.x - other.x;
          const dy = particle.y - other.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 150) {
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(other.x, other.y);
            ctx.strokeStyle = `rgba(0, 212, 255, ${0.2 * (1 - distance / 150)})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        });
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animationId);
  }, [dimensions]);

  return (
    <canvas
      ref={canvasRef}
      width={dimensions.width}
      height={dimensions.height}
      className="absolute inset-0 pointer-events-none"
      style={{ opacity: 0.6 }}
    />
  );
}

// Compteur animé type "dashboard temps réel"
function LiveCounter({ value, label, suffix = "" }: { value: number; label: string; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const increment = value / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  // Animation continue subtile
  useEffect(() => {
    if (!isHovered) return;
    const interval = setInterval(() => {
      setDisplayValue(v => v + Math.floor(Math.random() * 3) - 1);
    }, 2000);
    return () => clearInterval(interval);
  }, [isHovered]);

  return (
    <motion.div
      className="glass-cosmic px-4 py-3 rounded-xl cursor-pointer"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(0,212,255,0.3)' }}
    >
      <div className="text-2xl font-bold font-mono text-[#00d4ff] tabular-nums">
        {displayValue.toLocaleString()}{suffix}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      {isHovered && (
        <motion.div
          className="absolute -top-1 -right-1 w-2 h-2 bg-[#00d4ff] rounded-full"
          animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
}

// Dashboard 3D holographique
function HolographicDashboard() {
  return (
    <motion.div
      className="relative w-full max-w-lg"
      initial={{ opacity: 0, rotateX: 45, z: -100 }}
      animate={{ opacity: 1, rotateX: 15, z: 0 }}
      transition={{ duration: 1.2, delay: 0.5, type: "spring" }}
      style={{ transformStyle: "preserve-3d", perspective: 1000 }}
    >
      {/* Base holographique */}
      <div className="absolute -inset-4 bg-gradient-to-t from-[#00d4ff]/20 to-transparent rounded-3xl blur-2xl" />
      
      {/* Conteneur principal */}
      <div className="relative glass-cosmic rounded-2xl p-6 border border-[#00d4ff]/30">
        {/* Scan line animation */}
        <motion.div
          className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, transparent 50%, rgba(0,212,255,0.05) 50%)', backgroundSize: '100% 4px' }}
        />
        
        {/* Header avec status live */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse" />
              <div className="absolute inset-0 w-3 h-3 bg-emerald-400 rounded-full animate-ping" />
            </div>
            <span className="text-xs uppercase tracking-[0.2em] text-emerald-400 font-mono">Système Opérationnel</span>
          </div>
          <div className="flex gap-1">
            {[1, 2, 3].map(i => (
              <motion.div
                key={i}
                className="w-1 h-4 bg-[#00d4ff] rounded-full"
                animate={{ height: [4, 16, 4] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
        </div>

        {/* Grid de métriques */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="space-y-2">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Flotte Active</div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-white font-mono">24</span>
              <span className="text-xs text-emerald-400 mb-1">↑ 12%</span>
            </div>
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-emerald-400 to-[#00d4ff]"
                initial={{ width: 0 }}
                animate={{ width: '85%' }}
                transition={{ duration: 1.5, delay: 1 }}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Conformité</div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-white font-mono">98.5</span>
              <span className="text-xs text-[#00d4ff] mb-1">%</span>
            </div>
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-[#00d4ff] to-blue-500"
                initial={{ width: 0 }}
                animate={{ width: '98.5%' }}
                transition={{ duration: 1.5, delay: 1.2 }}
              />
            </div>
          </div>
        </div>

        {/* Liste véhicules avec status */}
        <div className="space-y-2">
          {[
            { plate: "FR-452-AX", status: "En route", color: "emerald", progress: 75 },
            { plate: "FR-891-BZ", status: "Maintenance", color: "amber", progress: 30 },
            { plate: "FR-123-CY", status: "Inspection", color: "cyan", progress: 100 },
          ].map((v, i) => (
            <motion.div
              key={v.plate}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.5 + i * 0.1 }}
              className="flex items-center gap-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group cursor-pointer"
            >
              <MapPin className={`h-4 w-4 text-${v.color}-400`} />
              <span className="text-sm font-mono text-slate-300 flex-1">{v.plate}</span>
              <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
                <div className={`h-full bg-${v.color}-400`} style={{ width: `${v.progress}%` }} />
              </div>
              <span className={`text-[10px] uppercase text-${v.color}-400`}>{v.status}</span>
            </motion.div>
          ))}
        </div>

        {/* Footer avec alertes */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex items-center gap-2 text-xs text-amber-400">
            <Zap className="h-3.5 w-3.5 animate-pulse" />
            <span>2 alertes maintenance préventive</span>
          </div>
        </div>
      </div>

      {/* Reflet au sol */}
      <div className="absolute -bottom-8 left-0 right-0 h-16 bg-gradient-to-b from-[#00d4ff]/10 to-transparent blur-xl transform scale-y-50" />
    </motion.div>
  );
}

export function HeroV2() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <section ref={containerRef} className="relative min-h-screen flex items-center overflow-hidden">
      {/* Réseau de particules (fond) */}
      <ParticleNetwork />
      
      {/* Gradient de fond */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#020617] via-[#0a0f1a] to-[#020617]" />
      
      {/* Aurora */}
      <div className="absolute inset-0 aurora-bg pointer-events-none" />

      <motion.div style={{ y, opacity }} className="relative w-full">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center min-h-[90vh] py-32">
            
            {/* Colonne Gauche — Contenu */}
            <div className="space-y-8">
              {/* Badge animé */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="inline-flex"
              >
                <div className="glass-cosmic px-4 py-2 rounded-full flex items-center gap-2 border border-[#00d4ff]/30">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  >
                    <Activity className="h-4 w-4 text-[#00d4ff]" />
                  </motion.div>
                  <span className="text-xs uppercase tracking-[0.15em] text-[#00d4ff]">Fleet OS v3.0</span>
                </div>
              </motion.div>

              {/* Titre principal avec animation lettre par lettre */}
              <div className="space-y-2">
                <motion.h1
                  className="text-6xl sm:text-7xl lg:text-8xl font-extrabold tracking-tight"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                >
                  {"COMMANDEZ".split("").map((letter, i) => (
                    <motion.span
                      key={i}
                      className="inline-block text-white"
                      initial={{ opacity: 0, y: 50 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.3 + i * 0.05 }}
                    >
                      {letter}
                    </motion.span>
                  ))}
                </motion.h1>
                <motion.h1
                  className="text-6xl sm:text-7xl lg:text-8xl font-extrabold tracking-tight"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                >
                  {"VOTRE FLOTTE".split("").map((letter, i) => (
                    <motion.span
                      key={i}
                      className="inline-block bg-gradient-to-r from-[#00d4ff] to-blue-600 bg-clip-text text-transparent"
                      initial={{ opacity: 0, y: 50 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.6 + i * 0.05 }}
                    >
                      {letter}
                    </motion.span>
                  ))}
                </motion.h1>
              </div>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1 }}
                className="text-xl text-slate-400 max-w-lg leading-relaxed"
              >
                Intelligence artificielle prédictive, conformité automatique, 
                et pilotage temps réel de votre flotte sur un seul écran.
              </motion.p>

              {/* Counters live */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.2 }}
                className="flex gap-4"
              >
                <LiveCounter value={2847} label="Véhicules gérés" />
                <LiveCounter value={99.9} label="% Uptime" suffix="%" />
                <LiveCounter value={0} label="Pannes évitées" />
              </motion.div>

              {/* CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.4 }}
                className="flex flex-col sm:flex-row gap-4 pt-4"
              >
                <Link href="/register">
                  <motion.button
                    className="btn-cosmic px-8 py-4 text-base"
                    whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(0,212,255,0.5)' }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Shield className="h-5 w-5" />
                    Lancer la console
                    <ArrowRight className="h-5 w-5" />
                  </motion.button>
                </Link>
                <Link href="#demo">
                  <motion.button
                    className="btn-cosmic-secondary px-8 py-4 text-base"
                    whileHover={{ scale: 1.05 }}
                  >
                    <Play className="h-5 w-5" />
                    Voir la démo
                  </motion.button>
                </Link>
              </motion.div>
            </div>

            {/* Colonne Droite — Dashboard Holographique */}
            <motion.div
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, delay: 0.5 }}
              className="hidden lg:flex justify-center items-center"
            >
              <HolographicDashboard />
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="w-6 h-10 border-2 border-[#00d4ff]/30 rounded-full flex justify-center pt-2">
          <motion.div
            className="w-1 h-2 bg-[#00d4ff] rounded-full"
            animate={{ opacity: [1, 0], y: [0, 12] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </div>
      </motion.div>
    </section>
  );
}

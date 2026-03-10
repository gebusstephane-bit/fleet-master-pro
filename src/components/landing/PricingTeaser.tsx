"use client";

import { motion, useInView, useMotionValue, useTransform, useSpring } from "framer-motion";
import { useRef, useState } from "react";
import Link from "next/link";
import { Check, ArrowRight, Zap, Crown, Rocket } from "lucide-react";

const plans = [
  {
    id: "essentiel",
    name: "Essentiel",
    price: "29",
    highlight: "5 véhicules",
    description: "Parfait pour démarrer",
    features: [
      "Conformité complète",
      "Inspections QR illimitées",
      "Maintenance prédictive",
      "Support par email",
    ],
    cta: "Essayer gratuitement",
    icon: Zap,
    accent: "#64748b", // Slate
    glow: "rgba(100, 116, 139, 0.6)",
    gradient: "from-slate-400 to-slate-600",
  },
  {
    id: "pro",
    name: "Pro",
    price: "49",
    highlight: "20 véhicules",
    description: "Le plus populaire",
    features: [
      "Tout Essentiel +",
      "TCO & Coûts flotte avancés",
      "API & Webhooks",
      "Support email prioritaire",
      "Rapports personnalisés",
    ],
    cta: "Essayer gratuitement",
    icon: Crown,
    popular: true,
    accent: "#00d4ff", // Cyan
    glow: "rgba(0, 212, 255, 0.8)",
    gradient: "from-cyan-400 to-blue-500",
  },
  {
    id: "unlimited",
    name: "Unlimited",
    price: "129",
    highlight: "Illimité",
    description: "Pour les entreprises",
    features: [
      "Tout Pro +",
      "API publique complète",
      "Assistant IA réglementaire",
      "Support prioritaire 24/7",
      "Formation personnalisée",
      "Account manager dédié",
    ],
    cta: "Contacter l'équipe",
    icon: Rocket,
    accent: "#a78bfa", // Violet
    glow: "rgba(167, 139, 250, 0.6)",
    gradient: "from-violet-400 to-purple-600",
  },
];

// Carte avec effet "Black Hole" - Bandeau lumineux 4D
function PricingCard({ plan, index }: { plan: typeof plans[0]; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  
  // Motion values pour le tilt et le bandeau
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  
  // Transformations fluides
  const rotateX = useSpring(useTransform(mouseY, [0, 1], [8, -8]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(mouseX, [0, 1], [-8, 8]), { stiffness: 300, damping: 30 });
  
  // Position du bandeau lumineux (en pourcentage pour conic-gradient)
  const borderX = useSpring(useTransform(mouseX, [0, 1], [0, 100]), { stiffness: 500, damping: 30 });
  const borderY = useSpring(useTransform(mouseY, [0, 1], [0, 100]), { stiffness: 500, damping: 30 });
  
  // Angle de rotation pour le bandeau
  const angle = useTransform(() => {
    const x = mouseX.get();
    const y = mouseY.get();
    return Math.atan2(y - 0.5, x - 0.5) * (180 / Math.PI) + 90;
  });
  const smoothAngle = useSpring(angle, { stiffness: 500, damping: 30 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0.5);
    mouseY.set(0.5);
    setIsHovered(false);
  };

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 60, rotateX: 20 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ 
        duration: 0.8, 
        delay: index * 0.15,
        ease: [0.22, 1, 0.36, 1]
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX: isHovered ? rotateX : 0,
        rotateY: isHovered ? rotateY : 0,
        transformStyle: "preserve-3d",
      }}
      className={`relative group ${plan.popular ? 'lg:-mt-6 lg:mb-6 z-20' : 'z-10'}`}
    >
      {/* Glow externe au repos */}
      <div 
        className="absolute -inset-1 rounded-2xl blur-2xl opacity-0 group-hover:opacity-100 transition-all duration-700"
        style={{ 
          background: `radial-gradient(circle at 50% 50%, ${plan.glow} 0%, transparent 70%)`,
        }}
      />
      
      {/* Carte principale avec bandeau lumineux */}
      <div className="relative rounded-2xl overflow-hidden" style={{ transformStyle: "preserve-3d" }}>
        
        {/* BANDEAU LUMINEUX 4D - Suit la souris */}
        <motion.div
          className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: `conic-gradient(from ${smoothAngle.get()}deg at ${borderX.get()}% ${borderY.get()}%, 
              transparent 0deg, 
              ${plan.accent} 20deg, 
              ${plan.accent} 40deg, 
              transparent 60deg,
              transparent 360deg)`,
            filter: 'blur(8px)',
          }}
        />
        
        {/* Bordure fine qui suit aussi */}
        <motion.div
          className="absolute inset-[1px] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            background: `conic-gradient(from ${smoothAngle.get()}deg at ${borderX.get()}% ${borderY.get()}%, 
              transparent 0deg, 
              ${plan.accent} 10deg, 
              ${plan.accent} 30deg, 
              transparent 50deg,
              transparent 360deg)`,
          }}
        />
        
        {/* Fond qui devient NOIR au survol */}
        <div 
          className="relative h-full rounded-2xl overflow-hidden transition-all duration-500"
          style={{
            background: isHovered 
              ? 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #020617 100%)' // Noir profond au hover
              : 'linear-gradient(135deg, rgba(15, 23, 42, 0.6) 0%, rgba(30, 41, 59, 0.4) 100%)', // Glass normal
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Spotlight interne */}
          <motion.div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            style={{
              background: `radial-gradient(circle at ${borderX.get()}% ${borderY.get()}%, ${plan.glow} 0%, transparent 50%)`,
            }}
          />

          {/* Badge POPULAIRE */}
          {plan.popular && (
            <motion.div 
              className="absolute -top-px left-1/2 -translate-x-1/2 z-20"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <div 
                className="flex items-center gap-1.5 px-5 py-2 rounded-b-xl font-bold text-xs uppercase tracking-wider shadow-lg"
                style={{
                  background: `linear-gradient(135deg, ${plan.accent} 0%, #3b82f6 100%)`,
                  color: '#000',
                  boxShadow: `0 10px 40px ${plan.glow}`,
                }}
              >
                <Zap className="h-3.5 w-3.5" />
                Le plus choisi
              </div>
            </motion.div>
          )}

          <div className="relative p-8 flex flex-col h-full">
            {/* Icône et nom */}
            <div className="flex items-center gap-3 mb-4">
              <motion.div 
                className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300"
                style={{ 
                  background: isHovered 
                    ? `linear-gradient(135deg, ${plan.accent}30 0%, ${plan.accent}10 100%)`
                    : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${isHovered ? plan.accent : 'rgba(255,255,255,0.1)'}`,
                  boxShadow: isHovered ? `0 0 30px ${plan.glow}` : 'none',
                }}
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <plan.icon 
                  className="h-6 w-6 transition-colors duration-300"
                  style={{ color: plan.accent }}
                />
              </motion.div>
              <div>
                <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                <p className="text-xs uppercase tracking-wider" style={{ color: plan.accent }}>
                  {plan.highlight}
                </p>
              </div>
            </div>

            {/* Prix */}
            <div className="mb-6">
              <div className="flex items-baseline gap-1">
                <motion.span 
                  className="text-5xl font-extrabold tabular-nums tracking-tight transition-all duration-300"
                  style={{ 
                    color: plan.accent,
                    textShadow: isHovered ? `0 0 40px ${plan.glow}` : 'none',
                  }}
                  animate={{ scale: isHovered ? 1.05 : 1 }}
                >
                  {plan.price}€
                </motion.span>
                <span className="text-slate-500 text-sm">/mois</span>
              </div>
              <p className="text-sm text-slate-400 mt-1">{plan.description}</p>
            </div>

            {/* Features */}
            <ul className="flex-1 space-y-3 mb-8">
              {plan.features.map((feature, i) => (
                <motion.li 
                  key={feature} 
                  className="flex items-start gap-3"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                >
                  <motion.div 
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition-all duration-300"
                    style={{ 
                      background: isHovered ? `${plan.accent}30` : 'rgba(255,255,255,0.1)',
                      border: `1px solid ${isHovered ? plan.accent : 'transparent'}`,
                    }}
                  >
                    <Check 
                      className="h-3 w-3"
                      style={{ color: plan.accent }}
                    />
                  </motion.div>
                  <span className="text-sm text-slate-300">{feature}</span>
                </motion.li>
              ))}
            </ul>

            {/* CTA Button */}
            <Link href="/register" className="mt-auto">
              <motion.button
                className="w-full py-3.5 rounded-xl font-semibold text-sm relative overflow-hidden transition-all duration-300"
                style={{
                  background: plan.popular 
                    ? `linear-gradient(135deg, ${plan.accent} 0%, #3b82f6 100%)`
                    : isHovered 
                      ? `linear-gradient(135deg, ${plan.accent}20 0%, ${plan.accent}10 100%)`
                      : 'rgba(255,255,255,0.05)',
                  color: plan.popular ? '#000' : isHovered ? '#fff' : '#94a3b8',
                  border: `1px solid ${isHovered || plan.popular ? plan.accent : 'rgba(255,255,255,0.1)'}`,
                  boxShadow: isHovered || plan.popular ? `0 0 30px ${plan.glow}` : 'none',
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {/* Shimmer effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                  initial={{ x: '-100%' }}
                  whileHover={{ x: '100%' }}
                  transition={{ duration: 0.6 }}
                />
                <span className="relative flex items-center justify-center gap-2">
                  {plan.cta}
                  <ArrowRight 
                    className="h-4 w-4 transition-transform group-hover:translate-x-1" 
                    style={{ color: plan.popular ? '#000' : plan.accent }}
                  />
                </span>
              </motion.button>
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function PricingTeaser() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} id="pricing" className="py-32 relative overflow-hidden">
      {/* Background gradient cosmos */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#00d4ff]/5 to-transparent pointer-events-none" />
      
      {/* Glows massive */}
      <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#00d4ff]/10 rounded-full blur-[200px] pointer-events-none" />
      <div className="absolute top-1/2 right-1/3 translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-violet-500/10 rounded-full blur-[200px] pointer-events-none" />
      
      {/* Grid floor */}
      <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-[linear-gradient(to_top,rgba(0,212,255,0.03)_1px,transparent_1px),linear-gradient(to_right,rgba(0,212,255,0.03)_1px,transparent_1px)] bg-[size:80px_80px] [transform:perspective(1000px)_rotateX(70deg)] [transform-origin:bottom] opacity-20 pointer-events-none" 
        style={{ maskImage: 'linear-gradient(to top, black 0%, transparent 100%)' }}
      />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <motion.span 
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold uppercase tracking-[0.2em] mb-8 border transition-all duration-300"
            style={{
              background: 'rgba(0, 212, 255, 0.1)',
              borderColor: 'rgba(0, 212, 255, 0.3)',
              color: '#00d4ff',
            }}
            whileHover={{ 
              scale: 1.05, 
              boxShadow: '0 0 40px rgba(0,212,255,0.4)',
              borderColor: 'rgba(0, 212, 255, 0.8)',
            }}
          >
            Tarifs
          </motion.span>
          
          <h2 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6">
            <span className="text-cosmic-display">
              Transparent.
            </span>
            <br />
            <span className="text-cosmic-gradient">Sans surprise.</span>
          </h2>
          
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Essai gratuit 14 jours sur tous les plans.
            <span className="text-white font-medium"> Sans carte bancaire.</span>
          </p>
        </motion.div>

        {/* Pricing Cards - 3D Grid */}
        <div 
          className="grid lg:grid-cols-3 gap-8 items-center"
          style={{ perspective: '1500px' }}
        >
          {plans.map((plan, index) => (
            <PricingCard key={plan.id} plan={plan} index={index} />
          ))}
        </div>

        {/* Bottom link */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center mt-16"
        >
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 text-[#00d4ff] hover:text-white transition-colors group"
          >
            <span className="text-sm font-medium">Voir le détail complet des offres</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-2" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

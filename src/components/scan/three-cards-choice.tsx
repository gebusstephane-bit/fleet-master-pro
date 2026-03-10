'use client';

import { motion } from 'framer-motion';
import { 
  ClipboardCheck, 
  Fuel, 
  BookOpen, 
  Lock,
  Truck,
  ArrowRight 
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface ThreeCardsChoiceProps {
  vehicleId: string;
  accessToken: string;
  vehicleInfo: {
    registration_number: string;
    brand?: string;
    model?: string;
    type?: string;
  };
  isAuthenticated?: boolean;
  userRole?: string | null;
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.4,
      ease: [0.25, 0.1, 0.25, 1],
    },
  }),
} as any;

export function ThreeCardsChoice({
  vehicleId,
  accessToken,
  vehicleInfo,
  isAuthenticated = false,
  userRole = null,
}: ThreeCardsChoiceProps) {
  // Determine if user can access carnet
  const canAccessCarnet = isAuthenticated && 
    ['ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC'].includes(userRole || '');

  const baseUrl = `/scan/${vehicleId}`;
  const queryParams = `?token=${accessToken}`;

  const cards = [
    {
      id: 'inspection',
      title: 'Inspection pré-départ',
      description: 'Contrôlez l\'état du véhicule avant de prendre la route',
      icon: ClipboardCheck,
      href: `${baseUrl}/inspection${queryParams}`,
      color: 'from-blue-500/20 to-cyan-500/20',
      iconColor: 'text-blue-400',
      borderColor: 'border-blue-500/30',
      badge: 'Conducteur',
      enabled: true,
    },
    {
      id: 'fuel',
      title: 'Saisir un plein',
      description: 'Enregistrez un ravitaillement en carburant',
      icon: Fuel,
      href: `${baseUrl}/fuel${queryParams}`,
      color: 'from-green-500/20 to-emerald-500/20',
      iconColor: 'text-green-400',
      borderColor: 'border-green-500/30',
      badge: 'Conducteur',
      enabled: true,
    },
    {
      id: 'carnet',
      title: 'Carnet d\'entretien',
      description: 'Consultez l\'historique complet du véhicule',
      icon: BookOpen,
      href: `${baseUrl}/carnet${queryParams}`,
      color: 'from-purple-500/20 to-violet-500/20',
      iconColor: canAccessCarnet ? 'text-purple-400' : 'text-gray-500',
      borderColor: canAccessCarnet ? 'border-purple-500/30' : 'border-gray-700',
      badge: 'Gestionnaire',
      enabled: canAccessCarnet,
      locked: !canAccessCarnet,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 md:mb-12"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 mb-4">
            <Truck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            {vehicleInfo.brand} {vehicleInfo.model}
          </h1>
          <p className="text-slate-400 text-lg">
            {vehicleInfo.registration_number}
          </p>
          {!isAuthenticated && (
            <p className="text-slate-500 text-sm mt-2">
              Mode conducteur • Certains accès nécessitent une connexion
            </p>
          )}
        </motion.div>

        {/* Cards Grid */}
        <div className="grid gap-4 md:gap-6 md:grid-cols-3">
          {cards.map((card, index) => (
            <motion.div
              key={card.id}
              custom={index}
              initial="hidden"
              animate="visible"
              variants={cardVariants}
            >
              {card.enabled ? (
                <Link href={card.href} className="block h-full">
                  <Card className={`group relative h-full p-6 bg-gradient-to-br ${card.color} border ${card.borderColor} backdrop-blur-sm hover:scale-[1.02] transition-all duration-300 cursor-pointer overflow-hidden`}>
                    {/* Background glow */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    <div className="relative z-10">
                      {/* Badge */}
                      <Badge 
                        variant="secondary" 
                        className="mb-4 bg-black/30 text-slate-300 border-0"
                      >
                        {card.badge}
                      </Badge>

                      {/* Icon */}
                      <div className={`w-12 h-12 rounded-xl bg-black/30 flex items-center justify-center mb-4 ${card.iconColor}`}>
                        <card.icon className="w-6 h-6" />
                      </div>

                      {/* Content */}
                      <h2 className="text-lg font-semibold text-white mb-2">
                        {card.title}
                      </h2>
                      <p className="text-slate-400 text-sm mb-4">
                        {card.description}
                      </p>

                      {/* Arrow */}
                      <div className="flex items-center text-sm font-medium text-white/70 group-hover:text-white transition-colors">
                        <span>Accéder</span>
                        <ArrowRight className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Card>
                </Link>
              ) : (
                <Card className={`h-full p-6 bg-slate-800/50 border ${card.borderColor} opacity-75`}>
                  {/* Badge */}
                  <Badge 
                    variant="secondary" 
                    className="mb-4 bg-black/30 text-slate-500 border-0"
                  >
                    {card.badge}
                  </Badge>

                  {/* Icon with lock */}
                  <div className={`w-12 h-12 rounded-xl bg-black/20 flex items-center justify-center mb-4 ${card.iconColor}`}>
                    <card.icon className="w-6 h-6" />
                  </div>

                  {/* Content */}
                  <h2 className="text-lg font-semibold text-slate-400 mb-2">
                    {card.title}
                  </h2>
                  <p className="text-slate-500 text-sm mb-4">
                    {card.description}
                  </p>

                  {/* Lock indicator */}
                  <div className="flex items-center text-sm text-slate-500">
                    <Lock className="w-4 h-4 mr-1" />
                    <span>Connexion requise</span>
                  </div>
                </Card>
              )}
            </motion.div>
          ))}
        </div>

        {/* Footer info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center"
        >
          <p className="text-slate-500 text-xs">
            Scan sécurisé • Données cryptées • Accès traçable
          </p>
          {isAuthenticated && !canAccessCarnet && (
            <p className="text-amber-500/80 text-xs mt-2">
              Contactez votre administrateur pour accéder au carnet d&apos;entretien
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
}

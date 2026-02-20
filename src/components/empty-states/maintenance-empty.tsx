'use client';

import { motion } from 'framer-motion';
import { Wrench, Plus, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function MaintenanceEmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring' }}
        className="w-24 h-24 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 flex items-center justify-center mb-6 border border-orange-500/20"
      >
        <Wrench className="w-12 h-12 text-orange-400" />
      </motion.div>
      
      <h3 className="text-2xl font-bold text-white mb-3">
        Maintenez votre flotte en état
      </h3>
      
      <p className="text-slate-400 max-w-md mb-8 leading-relaxed">
        Planifiez vos entretiens préventifs et suivez l'historique 
        de maintenance de chaque véhicule.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-3">
        <Button asChild className="btn-primary gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400">
          <Link href="/maintenance/new">
            <Plus className="w-4 h-4" />
            Nouvelle intervention
          </Link>
        </Button>
        
        <Button variant="outline" className="glass-button gap-2">
          <Calendar className="w-4 h-4" />
          Voir le calendrier
        </Button>
      </div>
    </motion.div>
  );
}

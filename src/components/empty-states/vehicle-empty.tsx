'use client';

import { motion } from 'framer-motion';
import { Truck, Plus, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function VehicleEmptyState() {
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
        className="w-24 h-24 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 flex items-center justify-center mb-6 border border-cyan-500/20"
      >
        <Truck className="w-12 h-12 text-cyan-400" />
      </motion.div>
      
      <h3 className="text-2xl font-bold text-white mb-3">
        Votre flotte vous attend
      </h3>
      
      <p className="text-slate-400 max-w-md mb-8 leading-relaxed">
        Commencez par ajouter votre premier véhicule pour suivre 
        vos maintenances, tournées et conformité réglementaire.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-3">
        <Button asChild className="btn-primary gap-2">
          <Link href="/vehicles/new">
            <Plus className="w-4 h-4" />
            Ajouter un véhicule
          </Link>
        </Button>
        
        <Button variant="outline" className="glass-button gap-2">
          <Eye className="w-4 h-4" />
          Voir un exemple
        </Button>
      </div>
    </motion.div>
  );
}

'use client';

import { motion } from 'framer-motion';
import { Users, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function DriverEmptyState() {
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
        className="w-24 h-24 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/10 flex items-center justify-center mb-6 border border-violet-500/20"
      >
        <Users className="w-12 h-12 text-violet-400" />
      </motion.div>
      
      <h3 className="text-2xl font-bold text-white mb-3">
        Constituez votre équipe
      </h3>
      
      <p className="text-slate-400 max-w-md mb-8 leading-relaxed">
        Ajoutez vos conducteurs pour planifier les tournées, 
        suivre les heures et gérer les documents.
      </p>
      
      <Button asChild className="btn-primary gap-2">
        <Link href="/drivers/new">
          <Plus className="w-4 h-4" />
          Ajouter un conducteur
        </Link>
      </Button>
    </motion.div>
  );
}

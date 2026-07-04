'use client';

import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';

/**
 * Transition d'entrée légère uniquement.
 * Perf : pas d'AnimatePresence mode="wait" (bloquait chaque navigation ~250 ms
 * le temps de l'animation de sortie) — la nouvelle page monte immédiatement.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="min-h-full"
    >
      {children}
    </motion.div>
  );
}

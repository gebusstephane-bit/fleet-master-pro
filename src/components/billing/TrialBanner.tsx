'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { X, Clock, AlertTriangle, AlertCircle } from 'lucide-react';

interface TrialBannerProps {
  trialEndsAt: string;
  companyId: string;
}

// Clé pour le localStorage (avec date pour réapparaître le lendemain)
const getStorageKey = (companyId: string) => `trial_banner_dismissed_${companyId}`;

export function TrialBanner({ trialEndsAt, companyId }: TrialBannerProps) {
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [urgencyLevel, setUrgencyLevel] = useState<'low' | 'medium' | 'high'>('low');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculer les jours restants et le niveau d'urgence
  useEffect(() => {
    if (!mounted) return;

    const calculateRemaining = () => {
      const endDate = new Date(trialEndsAt);
      const now = new Date();
      const diffTime = endDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      setDaysRemaining(Math.max(0, diffDays));

      if (diffDays > 7) {
        setUrgencyLevel('low');
      } else if (diffDays >= 3) {
        setUrgencyLevel('medium');
      } else {
        setUrgencyLevel('high');
      }
    };

    calculateRemaining();
    // Recalculer toutes les minutes
    const interval = setInterval(calculateRemaining, 60000);
    return () => clearInterval(interval);
  }, [trialEndsAt, mounted]);

  // Vérifier si le bandeau a été fermé aujourd'hui
  useEffect(() => {
    if (!mounted) return;

    const storageKey = getStorageKey(companyId);
    const dismissedData = localStorage.getItem(storageKey);

    if (dismissedData) {
      try {
        const { date } = JSON.parse(dismissedData);
        const dismissedDate = new Date(date);
        const today = new Date();

        // Réinitialiser si c'est un nouveau jour
        if (
          dismissedDate.getDate() !== today.getDate() ||
          dismissedDate.getMonth() !== today.getMonth() ||
          dismissedDate.getFullYear() !== today.getFullYear()
        ) {
          localStorage.removeItem(storageKey);
          setIsVisible(true);
        } else {
          setIsVisible(false);
        }
      } catch {
        setIsVisible(true);
      }
    }
  }, [companyId, mounted]);

  if (!mounted) return null;

  // Fermer le bandeau (réapparaît demain)
  const handleDismiss = useCallback(() => {
    const storageKey = getStorageKey(companyId);
    localStorage.setItem(storageKey, JSON.stringify({ date: new Date().toISOString() }));
    setIsVisible(false);
  }, [companyId]);

  if (!isVisible || daysRemaining <= 0) {
    return null;
  }

  // Configuration selon le niveau d'urgence
  const config = {
    low: {
      bgColor: 'bg-blue-600',
      icon: Clock,
      message: `Essai gratuit — ${daysRemaining} jours restants`,
    },
    medium: {
      bgColor: 'bg-orange-500',
      icon: AlertTriangle,
      message: `⚠️ Essai — Plus que ${daysRemaining} jours`,
    },
    high: {
      bgColor: 'bg-red-600',
      icon: AlertCircle,
      message: `🔴 Essai — Derniers jours !`,
    },
  };

  const { bgColor, icon: Icon, message } = config[urgencyLevel];

  return (
    <div className={`${bgColor} text-white sticky top-0 z-50`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center gap-3 py-2.5 text-sm">
          <Icon className="h-4 w-4 flex-shrink-0" />
          <span className="font-medium">{message}</span>
          <Button
            size="sm"
            variant="outline"
            className="h-7 border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white ml-2"
            asChild
          >
            <Link href="/settings/billing">Choisir mon plan</Link>
          </Button>
          <button
            onClick={handleDismiss}
            className="ml-2 p-1 opacity-70 hover:opacity-100 transition-opacity"
            aria-label="Fermer"
            title="Masquer jusqu'à demain"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

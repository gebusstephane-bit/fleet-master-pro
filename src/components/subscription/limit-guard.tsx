/**
 * Composant pour protéger les actions selon les limites d'abonnement
 */

'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { useSubscriptionLimits } from '@/hooks/use-subscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Car, Users, AlertTriangle, ArrowRight } from 'lucide-react';

interface LimitGuardProps {
  type: 'vehicle' | 'user';
  children: ReactNode;
  fallback?: ReactNode;
}

export function LimitGuard({ type, children, fallback }: LimitGuardProps) {
  const { data: limits, isLoading } = useSubscriptionLimits();

  if (isLoading) {
    return <div className="animate-pulse bg-gray-200 h-20 rounded-lg" />;
  }

  const canAdd = type === 'vehicle' ? limits?.canAddVehicle : limits?.canAddUser;
  const currentCount = type === 'vehicle' ? limits?.vehicleCount : limits?.userCount;
  const limit = type === 'vehicle' ? limits?.vehicleLimit : limits?.userLimit;
  const plan = limits?.plan;

  if (canAdd) {
    return <>{children}</>;
  }

  // Si un fallback personnalisé est fourni
  if (fallback) {
    return <>{fallback}</>;
  }

  // Message par défaut
  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-800">
          <AlertTriangle className="h-5 w-5" />
          Limite atteinte
        </CardTitle>
        <CardDescription className="text-amber-700">
          Vous avez atteint la limite de {type === 'vehicle' ? 'véhicules' : 'utilisateurs'} 
          pour le plan {plan} ({currentCount}/{limit}).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button asChild className="bg-amber-600 hover:bg-amber-700">
            <Link href="/settings/billing">
              Upgrader mon plan
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/pricing">Voir les tarifs</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Composant pour afficher le badge de limite
export function LimitBadge({ type }: { type: 'vehicle' | 'user' }) {
  const { data: limits } = useSubscriptionLimits();
  
  const currentCount = type === 'vehicle' ? limits?.vehicleCount : limits?.userCount;
  const limit = type === 'vehicle' ? limits?.vehicleLimit : limits?.userLimit;
  
  const percentage = limit ? (currentCount || 0) / limit * 100 : 0;
  const isNearLimit = percentage >= 80;
  
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
      isNearLimit ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'
    }`}>
      {type === 'vehicle' ? <Car className="h-4 w-4" /> : <Users className="h-4 w-4" />}
      <span className="font-medium">{currentCount || 0}/{limit || 0}</span>
      {isNearLimit && <span className="text-xs">(proche de la limite)</span>}
    </div>
  );
}

// Composant pour le bouton d'ajout avec vérification
interface AddButtonProps {
  type: 'vehicle' | 'user';
  href: string;
  label: string;
}

export function AddButtonWithLimit({ type, href, label }: AddButtonProps) {
  const { data: limits } = useSubscriptionLimits();
  const canAdd = type === 'vehicle' ? limits?.canAddVehicle : limits?.canAddUser;
  
  if (!canAdd) {
    return (
      <Button 
        variant="outline" 
        disabled
        className="opacity-50 cursor-not-allowed"
        title="Limite atteinte - Upgrader votre plan"
      >
        {label} (limité)
      </Button>
    );
  }
  
  return (
    <Button asChild>
      <Link href={href}>{label}</Link>
    </Button>
  );
}

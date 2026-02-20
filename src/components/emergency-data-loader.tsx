'use client';

import { useEffect, useState } from 'react';
import { useVehicles } from '@/hooks/use-vehicles';
import { useDrivers } from '@/hooks/use-drivers';
import { useRoutes } from '@/hooks/use-routes';
import { 
  useEmergencyVehicles, 
  useEmergencyDrivers, 
  useEmergencyRoutes 
} from '@/hooks/use-emergency-fetch';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';

interface EmergencyDataLoaderProps {
  children: React.ReactNode;
  type: 'vehicles' | 'drivers' | 'routes';
  onDataLoaded?: (data: any[]) => void;
}

export function EmergencyDataLoader({ children, type, onDataLoaded }: EmergencyDataLoaderProps) {
  const [useEmergency, setUseEmergency] = useState(false);
  
  // Hooks normaux
  const normalVehicles = useVehicles({ enabled: !useEmergency && type === 'vehicles' });
  const normalDrivers = useDrivers({ enabled: !useEmergency && type === 'drivers' });
  const normalRoutes = useRoutes({ enabled: !useEmergency && type === 'routes' });
  
  // Hooks d'urgence
  const emergencyVehicles = useEmergencyVehicles();
  const emergencyDrivers = useEmergencyDrivers();
  const emergencyRoutes = useEmergencyRoutes();

  // Détecter les erreurs RLS et basculer en mode urgence
  useEffect(() => {
    const checkForRLSError = () => {
      let error = null;
      
      if (type === 'vehicles') error = normalVehicles.error;
      if (type === 'drivers') error = normalDrivers.error;
      if (type === 'routes') error = normalRoutes.error;
      
      if (error) {
        const errorMsg = (error as any)?.message || '';
        const errorCode = (error as any)?.code || '';
        
        if (errorCode === '42P17' || errorMsg.includes('infinite recursion')) {
          logger.warn('RLS recursion detected, switching to emergency mode');
          setUseEmergency(true);
        }
      }
    };
    
    checkForRLSError();
  }, [normalVehicles.error, normalDrivers.error, normalRoutes.error, type]);

  // Notifier le parent quand les données sont chargées
  useEffect(() => {
    let data = null;
    
    if (useEmergency) {
      if (type === 'vehicles') data = emergencyVehicles.data;
      if (type === 'drivers') data = emergencyDrivers.data;
      if (type === 'routes') data = emergencyRoutes.data;
    } else {
      if (type === 'vehicles') data = normalVehicles.data;
      if (type === 'drivers') data = normalDrivers.data;
      if (type === 'routes') data = normalRoutes.data;
    }
    
    if (data && onDataLoaded) {
      onDataLoaded(data);
    }
  }, [
    useEmergency,
    emergencyVehicles.data, emergencyDrivers.data, emergencyRoutes.data,
    normalVehicles.data, normalDrivers.data, normalRoutes.data,
    type, onDataLoaded
  ]);

  // Déterminer l'état actuel
  const isLoading = useEmergency 
    ? (type === 'vehicles' ? emergencyVehicles.isLoading : type === 'drivers' ? emergencyDrivers.isLoading : emergencyRoutes.isLoading)
    : (type === 'vehicles' ? normalVehicles.isLoading : type === 'drivers' ? normalDrivers.isLoading : normalRoutes.isLoading);
    
  const error = useEmergency
    ? (type === 'vehicles' ? emergencyVehicles.error : type === 'drivers' ? emergencyDrivers.error : emergencyRoutes.error)
    : (type === 'vehicles' ? normalVehicles.error : type === 'drivers' ? normalDrivers.error : normalRoutes.error);

  // Si en mode urgence, afficher une bannière
  if (useEmergency) {
    return (
      <div className="relative">
        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-amber-200">
              Mode récupération activé : Certaines fonctionnalités de sécurité sont contournées temporairement.
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.location.reload()}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Réessayer
          </Button>
        </div>
        {children}
      </div>
    );
  }

  // Si erreur critique (pas RLS)
  if (error && !useEmergency) {
    const errorMsg = (error as any)?.message || '';
    const isRLSError = errorMsg.includes('infinite recursion') || (error as any)?.code === '42P17';
    
    if (!isRLSError) {
      return (
        <div className="p-6 text-center">
          <p className="text-red-400">Erreur de chargement</p>
          <p className="text-sm text-slate-400 mt-2">{errorMsg}</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Réessayer
          </Button>
        </div>
      );
    }
  }

  return <>{children}</>;
}

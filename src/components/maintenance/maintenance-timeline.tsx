'use client';

import { CheckCircle2, Clock, Circle, XCircle, Calendar, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TimelineStep {
  status: string;
  label: string;
  date?: string;
  user?: { first_name: string; last_name: string };
  icon: React.ReactNode;
}

interface MaintenanceTimelineProps {
  currentStatus: string;
  history: {
    old_status: string;
    new_status: string;
    changed_at: string;
    user?: { first_name: string; last_name: string };
  }[];
}

const steps = [
  { key: 'DEMANDE_CREEE', label: 'Demande créée', icon: Circle },
  { key: 'VALIDEE', label: 'Validée', icon: CheckCircle2 },
  { key: 'VALIDEE_DIRECTEUR', label: 'Validée', icon: CheckCircle2 },
  { key: 'RDV_PRIS', label: 'RDV pris', icon: Calendar },
  { key: 'EN_COURS', label: 'En cours', icon: Wrench },
  { key: 'TERMINEE', label: 'Terminée', icon: CheckCircle2 },
  { key: 'REFUSEE', label: 'Refusée', icon: XCircle },
];

export function MaintenanceTimeline({ currentStatus, history }: MaintenanceTimelineProps) {
  // Normaliser le statut pour la comparaison
  const normalizedStatus = currentStatus === 'VALIDEE_DIRECTEUR' ? 'VALIDEE' : currentStatus;
  
  // Filtrer les étapes selon le workflow
  const workflowSteps = [
    steps[0], // DEMANDE_CREEE
    steps[1], // VALIDEE (prend en compte VALIDEE_DIRECTEUR aussi)
    steps[3], // RDV_PRIS
    steps[4], // EN_COURS
    steps[5], // TERMINEE
  ];
  
  const currentStepIndex = workflowSteps.findIndex(s => 
    s.key === currentStatus || (currentStatus === 'VALIDEE_DIRECTEUR' && s.key === 'VALIDEE')
  );
  
  const getStepDate = (stepKey: string) => {
    // Chercher dans l'historique en tenant compte de la normalisation
    const entry = history.find(h => {
      if (stepKey === 'VALIDEE') {
        return h.new_status === 'VALIDEE' || h.new_status === 'VALIDEE_DIRECTEUR';
      }
      return h.new_status === stepKey;
    });
    return entry?.changed_at;
  };

  const getStepUser = (stepKey: string) => {
    const entry = history.find(h => {
      if (stepKey === 'VALIDEE') {
        return h.new_status === 'VALIDEE' || h.new_status === 'VALIDEE_DIRECTEUR';
      }
      return h.new_status === stepKey;
    });
    return entry?.user;
  };

  // Si refusé, montrer un état spécial
  if (currentStatus === 'REFUSEE') {
    return (
      <div className="py-4">
        <div className="flex items-center justify-center">
          <div className="flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-full flex items-center justify-center border-2 bg-red-500 border-red-500 text-white">
              <XCircle className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-red-500 mt-2">Demande refusée</p>
            {getStepDate('REFUSEE') && (
              <p className="text-xs text-gray-400 mt-0.5">
                {format(new Date(getStepDate('REFUSEE')!), 'dd/MM/yyyy HH:mm', { locale: fr })}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-4">
      <div className="flex items-start justify-between relative">
        {/* Ligne de connexion */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-700 -z-10" />
        
        {workflowSteps.map((step, index) => {
          const isCompleted = index <= currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const date = getStepDate(step.key);
          const user = getStepUser(step.key);
          const Icon = step.icon;
          
          return (
            <div key={step.key} className="flex flex-col items-center text-center flex-1 px-1">
              {/* Icône */}
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors',
                  isCompleted
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'bg-gray-800 border-gray-600 text-gray-500',
                  isCurrent && 'ring-4 ring-emerald-500/30'
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              
              {/* Label */}
              <div className="mt-2">
                <p
                  className={cn(
                    'text-xs font-medium',
                    isCompleted ? 'text-white' : 'text-gray-500'
                  )}
                >
                  {step.label}
                </p>
                
                {date && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {format(new Date(date), 'dd/MM/yyyy', { locale: fr })}
                  </p>
                )}
                
                {user && (
                  <p className="text-xs text-gray-500">
                    {user.first_name} {user.last_name}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

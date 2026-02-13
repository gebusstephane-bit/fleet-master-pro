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
  { key: 'VALIDEE_DIRECTEUR', label: 'Validée par le directeur', icon: CheckCircle2 },
  { key: 'RDV_PRIS', label: 'RDV pris', icon: Calendar },
  { key: 'EN_COURS', label: 'En cours', icon: Wrench },
  { key: 'TERMINEE', label: 'Terminée', icon: CheckCircle2 },
];

export function MaintenanceTimeline({ currentStatus, history }: MaintenanceTimelineProps) {
  const currentStepIndex = steps.findIndex(s => s.key === currentStatus);
  
  const getStepDate = (stepKey: string) => {
    const entry = history.find(h => h.new_status === stepKey);
    return entry?.changed_at;
  };

  const getStepUser = (stepKey: string) => {
    const entry = history.find(h => h.new_status === stepKey);
    return entry?.user;
  };

  return (
    <div className="py-4">
      <div className="flex items-start justify-between relative">
        {/* Ligne de connexion */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 -z-10" />
        
        {steps.map((step, index) => {
          const isCompleted = index <= currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const date = getStepDate(step.key);
          const user = getStepUser(step.key);
          const Icon = step.icon;
          
          return (
            <div key={step.key} className="flex flex-col items-center text-center flex-1">
              {/* Icône */}
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors',
                  isCompleted
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'bg-white border-gray-300 text-gray-300',
                  isCurrent && 'ring-4 ring-emerald-100'
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              
              {/* Label */}
              <div className="mt-2">
                <p
                  className={cn(
                    'text-sm font-medium',
                    isCompleted ? 'text-white' : 'text-gray-300'
                  )}
                >
                  {step.label}
                </p>
                
                {date && (
                  <p className="text-xs text-gray-300 mt-0.5">
                    {format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: fr })}
                  </p>
                )}
                
                {user && (
                  <p className="text-xs text-gray-300">
                    par {user.first_name} {user.last_name}
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

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ClipboardCheck, Plus, FileCheck, Clock, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useUserContext } from '@/components/providers/user-provider';

// ============================================================================
// PAGE INSPECTION - Interface simplifiée
// ============================================================================

interface Inspection {
  id: string;
  date: string;
  type: 'daily' | 'weekly' | 'monthly';
  status: 'completed' | 'pending' | 'has_issues';
  score: number;
}

const mockInspections: Inspection[] = [
  { id: '1', date: '2025-02-28', type: 'daily', status: 'completed', score: 95 },
  { id: '2', date: '2025-02-27', type: 'daily', status: 'completed', score: 88 },
  { id: '3', date: '2025-02-26', type: 'daily', status: 'has_issues', score: 72 },
];

export default function DriverInspectionPage() {
  const router = useRouter();
  const { user } = useUserContext();
  const [isLoading, setIsLoading] = useState(false);
  
  const handleNewInspection = () => {
    // Rediriger vers le flow d'inspection existant
    // Note: Adapter l'URL selon le système d'inspection existant
    router.push('/inspection/manual');
  };
  
  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-10 w-10" asChild>
          <Link href="/driver-app">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold text-white">Inspections</h1>
          <p className="text-xs text-slate-400">Vérifications et rapports</p>
        </div>
      </div>
      
      {/* Bouton nouvelle inspection */}
      <Button 
        onClick={handleNewInspection}
        className="w-full h-14 text-base bg-blue-600 hover:bg-blue-500 flex items-center gap-2"
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Plus className="h-5 w-5" />
        )}
        Nouvelle inspection
      </Button>
      
      {/* Types d'inspection disponibles */}
      <div className="grid grid-cols-2 gap-3">
        <InspectionTypeCard 
          type="daily"
          title="Quotidienne"
          description="Points essentiels"
          duration="5 min"
          onClick={handleNewInspection}
        />
        <InspectionTypeCard 
          type="weekly"
          title="Hebdomadaire"
          description="Contrôle approfondi"
          duration="15 min"
          onClick={handleNewInspection}
        />
      </div>
      
      {/* Historique */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-400" />
            Historique récent
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {mockInspections.map((inspection) => (
            <InspectionHistoryItem key={inspection.id} inspection={inspection} />
          ))}
        </CardContent>
      </Card>
      
      {/* Guide rapide */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Points de contrôle quotidiens</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-slate-400">
            <li className="flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-green-500" />
              Niveau de carburant
            </li>
            <li className="flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-green-500" />
              Pression des pneus (visuelle)
            </li>
            <li className="flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-green-500" />
              Éclairage et clignotants
            </li>
            <li className="flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-green-500" />
              État des freins
            </li>
            <li className="flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-green-500" />
              Rétroviseurs et essuie-glaces
            </li>
            <li className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              Signaler tout problème
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// SOUS-COMPOSANTS
// ============================================================================

function InspectionTypeCard({ 
  type, 
  title, 
  description, 
  duration,
  onClick 
}: { 
  type: string;
  title: string; 
  description: string; 
  duration: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-blue-500/50 hover:bg-slate-800 transition-all text-left"
    >
      <div className="flex items-start justify-between mb-2">
        <ClipboardCheck className="h-6 w-6 text-blue-400" />
        <span className="text-xs text-slate-500">{duration}</span>
      </div>
      <p className="font-medium text-white text-sm">{title}</p>
      <p className="text-xs text-slate-400">{description}</p>
    </button>
  );
}

function InspectionHistoryItem({ inspection }: { inspection: Inspection }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50">
      <div className="flex items-center gap-3">
        <div className={cn(
          'h-10 w-10 rounded-lg flex items-center justify-center',
          inspection.status === 'completed' && 'bg-green-500/20',
          inspection.status === 'has_issues' && 'bg-amber-500/20',
          inspection.status === 'pending' && 'bg-slate-700',
        )}>
          <ClipboardCheck className={cn(
            'h-5 w-5',
            inspection.status === 'completed' && 'text-green-500',
            inspection.status === 'has_issues' && 'text-amber-500',
            inspection.status === 'pending' && 'text-slate-400',
          )} />
        </div>
        <div>
          <p className="font-medium text-sm text-white">
            Inspection {inspection.type === 'daily' ? 'quotidienne' : 'hebdomadaire'}
          </p>
          <p className="text-xs text-slate-400">
            {format(new Date(inspection.date), 'dd MMM yyyy', { locale: fr })}
          </p>
        </div>
      </div>
      <Badge 
        variant="outline" 
        className={cn(
          inspection.score >= 80 
            ? 'border-green-500/50 text-green-400' 
            : 'border-amber-500/50 text-amber-400'
        )}
      >
        {inspection.score}/100
      </Badge>
    </div>
  );
}

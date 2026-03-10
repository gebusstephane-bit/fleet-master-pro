'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Activity, History, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useVehicleCurrentActivity, useAssignVehicleActivity, useEndVehicleActivity } from '@/hooks/use-vehicle-activities';
import { useCompanyActivities } from '@/hooks/use-company-activities';
import { TransportActivity } from '@/actions/vehicle-activities';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface VehicleActivityManagerProps {
  vehicleId: string;
}

const activityLabels: Record<TransportActivity, string> = {
  MARCHANDISES_GENERALES: 'Marchandises Générales',
  FRIGORIFIQUE: 'Frigorifique',
  ADR_COLIS: 'ADR Colis',
  ADR_CITERNE: 'ADR Citerne',
  CONVOI_EXCEPTIONNEL: 'Convoi Exceptionnel',
  BENNE_TRAVAUX_PUBLICS: 'Benne TP',
  ANIMAUX_VIVANTS: 'Animaux Vivants',
};

const activityColors: Record<TransportActivity, string> = {
  MARCHANDISES_GENERALES: 'bg-blue-100 text-blue-800',
  FRIGORIFIQUE: 'bg-cyan-100 text-cyan-800',
  ADR_COLIS: 'bg-orange-100 text-orange-800',
  ADR_CITERNE: 'bg-red-100 text-red-800',
  CONVOI_EXCEPTIONNEL: 'bg-purple-100 text-purple-800',
  BENNE_TRAVAUX_PUBLICS: 'bg-yellow-100 text-yellow-800',
  ANIMAUX_VIVANTS: 'bg-green-100 text-green-800',
};

export function VehicleActivityManager({ vehicleId }: VehicleActivityManagerProps) {
  const [selectedActivity, setSelectedActivity] = useState<TransportActivity | ''>('');
  
  const { data: currentActivity, isLoading: isLoadingCurrent } = useVehicleCurrentActivity(vehicleId);
  const { data: companyActivities, isLoading: isLoadingCompany } = useCompanyActivities();
  
  const assignMutation = useAssignVehicleActivity();
  const endMutation = useEndVehicleActivity();

  const handleAssignActivity = async () => {
    if (!selectedActivity) return;
    
    try {
      await assignMutation.mutateAsync({
        vehicleId,
        activity: selectedActivity,
      });
      setSelectedActivity('');
    } catch (error) {
      // Error already handled by mutation
    }
  };

  const handleEndActivity = async () => {
    if (!currentActivity?.activity) return;
    
    if (!confirm(`Êtes-vous sûr de vouloir terminer l'activité "${activityLabels[currentActivity.activity]}" pour ce véhicule ?`)) {
      return;
    }
    
    try {
      await endMutation.mutateAsync({ vehicleId });
    } catch (error) {
      // Error already handled by mutation
    }
  };

  const isLoading = isLoadingCurrent || isLoadingCompany;

  // Filtrer les activités autorisées pour l'entreprise
  const availableActivities = companyActivities?.map(ca => ca.activity) || [];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Chargement...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5 text-cyan-600" />
          Activité de Transport
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Activité actuelle */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Activité actuelle</h4>
          {currentActivity?.activity ? (
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge className={activityColors[currentActivity.activity]}>
                    {activityLabels[currentActivity.activity]}
                  </Badge>
                  {currentActivity.activity !== 'MARCHANDISES_GENERALES' && (
                    <Badge variant="outline" className="text-xs">Spécialisé</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Depuis le {format(new Date(currentActivity.start_date), 'dd MMMM yyyy', { locale: fr })}
                </p>
                {currentActivity.notes && (
                  <p className="text-xs text-slate-600 mt-1">{currentActivity.notes}</p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleEndActivity}
                disabled={endMutation.isPending}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                {endMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Terminer'
                )}
              </Button>
            </div>
          ) : (
            <Alert className="bg-amber-50 border-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                Aucune activité assignée. Le véhicule est considéré comme inactif.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Changer d'activité */}
        <div className="space-y-3 pt-4 border-t">
          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <History className="h-4 w-4" />
            Changer d'activité
          </h4>
          
          <div className="flex gap-3">
            <Select
              value={selectedActivity}
              onValueChange={(value) => setSelectedActivity(value as TransportActivity)}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Sélectionner une nouvelle activité..." />
              </SelectTrigger>
              <SelectContent>
                {availableActivities.map((activity) => (
                  <SelectItem key={activity} value={activity}>
                    <div className="flex items-center gap-2">
                      <span>{activityLabels[activity]}</span>
                      {currentActivity?.activity === activity && (
                        <Badge variant="outline" className="text-xs">Actuel</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button
              onClick={handleAssignActivity}
              disabled={!selectedActivity || selectedActivity === currentActivity?.activity || assignMutation.isPending}
            >
              {assignMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Assigner
            </Button>
          </div>
          
          {selectedActivity && selectedActivity === currentActivity?.activity && (
            <p className="text-xs text-amber-600">
              Cette activité est déjà assignée à ce véhicule.
            </p>
          )}
        </div>

        {/* Info complémentaire */}
        <div className="text-xs text-muted-foreground pt-2 border-t">
          <p>
            L'activité détermine les documents réglementaires requis et les échéances de conformité.
            L'historique des activités est conservé pour la traçabilité.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

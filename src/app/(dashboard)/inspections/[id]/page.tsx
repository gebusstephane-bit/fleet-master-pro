'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, Car, Truck, Calendar, User, MapPin, 
  Gauge, Fuel, CheckCircle2, XCircle, AlertTriangle,
  Wrench, AlertOctagon, Droplets, FileText, Star,
  ThermometerSnowflake, Thermometer, ThumbsUp, ThumbsDown
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { validateInspection, rejectInspection } from '@/actions/inspections-safe';
import { useUserContext } from '@/components/providers/user-provider';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface Inspection {
  id: string;
  vehicle_id: string;
  company_id: string;
  mileage: number;
  fuel_level: number;
  adblue_level?: number;
  gnr_level?: number;
  score: number;
  grade: string;
  defects_count: number;
  driver_name: string;
  location: string;
  inspector_notes: string;
  reported_defects: any[];
  tires_condition: any;
  compartment_c1_temp?: number;
  compartment_c2_temp?: number;
  status: string;
  created_at: string;
  created_by?: string;
  validated_by?: string;
  validated_at?: string;
  vehicle?: {
    registration_number: string;
    brand: string;
    model: string;
    type: string;
    mileage: number;
  };
}

const statusConfig = {
  COMPLETED: { label: 'Contrôle validé', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2 },
  ISSUES_FOUND: { label: 'Anomalies détectées', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: AlertTriangle },
  CRITICAL_ISSUES: { label: 'Problèmes critiques', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
  PENDING: { label: 'En attente de validation', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: FileText },
  REFUSEE: { label: 'Contrôle refusé', color: 'bg-slate-100 text-slate-800 border-slate-200', icon: XCircle },
};

const gradeColors: Record<string, string> = {
  A: 'bg-green-100 text-green-800 border-green-300',
  B: 'bg-blue-100 text-blue-800 border-blue-300',
  C: 'bg-amber-100 text-amber-800 border-amber-300',
  D: 'bg-red-100 text-red-800 border-red-300',
};

export default function InspectionDetailPage() {
  const params = useParams();
  const inspectionId = params.id as string;
  const { user } = useUserContext();
  
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [validating, setValidating] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'DIRECTEUR';

  useEffect(() => {
    fetchInspection();
  }, [inspectionId]);

  const fetchInspection = async () => {
    const supabase = getSupabaseClient();
    
    const { data: inspectionData, error: inspectionError } = await supabase
      .from('vehicle_inspections')
      .select('*')
      .eq('id', inspectionId)
      .single();
    
    if (inspectionError || !inspectionData) {
      setError('Inspection non trouvée');
      setLoading(false);
      return;
    }
    
    const { data: vehicleData } = await supabase
      .from('vehicles')
      .select('registration_number, brand, model, type, mileage')
      .eq('id', inspectionData.vehicle_id)
      .single();
    
    setInspection({
      ...inspectionData,
      vehicle: vehicleData || null
    });
    setLoading(false);
  };

  const handleValidate = async () => {
    setValidating(true);
    const result = await validateInspection(inspectionId);
    if (result.error) {
      setError(result.error);
    } else {
      await fetchInspection();
    }
    setValidating(false);
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setValidating(true);
    const result = await rejectInspection(inspectionId, rejectReason);
    if (result.error) {
      setError(result.error);
    } else {
      setShowRejectDialog(false);
      await fetchInspection();
    }
    setValidating(false);
  };

  if (loading) {
    return <InspectionDetailSkeleton />;
  }

  if (!inspection || error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error || 'Inspection non trouvée'}</AlertDescription>
        </Alert>
        <Button asChild variant="outline">
          <Link href="/inspections">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à la liste
          </Link>
        </Button>
      </div>
    );
  }

  const status = statusConfig[inspection.status as keyof typeof statusConfig] || statusConfig.COMPLETED;
  const StatusIcon = status.icon;
  const isPL = inspection.vehicle?.type === 'POIDS_LOURD' || inspection.vehicle?.type === 'POIDS_LOURD_FRIGO';
  const isPLFrigo = inspection.vehicle?.type === 'POIDS_LOURD_FRIGO';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/inspections">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">Contrôle #{inspection.id.slice(0, 8)}</h1>
              <Badge className={status.color}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {status.label}
              </Badge>
              <Badge className={gradeColors[inspection.grade]}>
                <Star className="h-3 w-3 mr-1" />
                Note {inspection.grade}
              </Badge>
            </div>
            <p className="text-gray-400">
              {inspection.vehicle?.registration_number} • {format(new Date(inspection.created_at), 'PPp', { locale: fr })}
            </p>
          </div>
        </div>
        
        {/* BOUTONS DE VALIDATION BIEN VISIBLES */}
        {inspection.status === 'PENDING' && (
          <div className="flex gap-3">
            <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="lg" className="gap-2">
                  <ThumbsDown className="h-4 w-4" />
                  Refuser
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Refuser le contrôle</DialogTitle>
                  <DialogDescription>
                    Indiquez la raison du refus. Le conducteur sera notifié.
                  </DialogDescription>
                </DialogHeader>
                <Textarea
                  placeholder="Raison du refus..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                    Annuler
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleReject}
                    disabled={!rejectReason.trim() || validating}
                  >
                    {validating ? 'Traitement...' : 'Confirmer le refus'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            <Button 
              size="lg" 
              className="gap-2 bg-green-600 hover:bg-green-700"
              onClick={handleValidate}
              disabled={validating}
            >
              <ThumbsUp className="h-4 w-4" />
              {validating ? 'Validation...' : 'Valider le contrôle'}
            </Button>
          </div>
        )}
        
        {inspection.status !== 'PENDING' && inspection.validated_at && (
          <div className="text-right text-sm text-gray-400">
            <p>Validé par un responsable</p>
            <p>{format(new Date(inspection.validated_at), 'PPp', { locale: fr })}</p>
          </div>
        )}
      </div>

      {/* ALERTE INFO POUR PENDING */}
      {inspection.status === 'PENDING' && (
        <Alert className="bg-blue-50 border-blue-200">
          <FileText className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            Ce contrôle est en attente de validation par un administrateur ou un responsable.
            {isAdmin && " Vous pouvez le valider ou le refuser en utilisant les boutons ci-dessus."}
          </AlertDescription>
        </Alert>
      )}

      {/* Score */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-sm text-gray-400 mb-1">Note globale</p>
              <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full text-3xl font-bold ${gradeColors[inspection.grade]}`}>
                {inspection.grade}
              </div>
              <p className="text-2xl font-bold mt-2">{inspection.score}%</p>
            </div>
            
            <div className="col-span-2">
              <p className="text-sm text-gray-400 mb-2">Détail du score</p>
              <Progress value={inspection.score} className="h-4 mb-4" />
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-sm text-slate-600">Points contrôlés OK</p>
                  <p className="text-xl font-semibold text-green-700">
                    {Math.max(0, 10 - (inspection.reported_defects?.length || 0))}/10
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${inspection.defects_count > 0 ? 'bg-amber-50' : 'bg-green-50'}`}>
                  <p className="text-sm text-slate-600">Défauts signalés</p>
                  <p className={`text-xl font-semibold ${inspection.defects_count > 0 ? 'text-amber-700' : 'text-green-700'}`}>
                    {inspection.defects_count}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Véhicule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Car className="h-5 w-5" />
              Véhicule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                {inspection.vehicle?.type === 'VOITURE' ? (
                  <Car className="h-6 w-6 text-slate-600" />
                ) : (
                  <Truck className="h-6 w-6 text-slate-600" />
                )}
              </div>
              <div>
                <p className="font-semibold text-lg">{inspection.vehicle?.brand} {inspection.vehicle?.model}</p>
                <p className="text-gray-400">{inspection.vehicle?.registration_number}</p>
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400">Kilométrage contrôle</p>
                <p className="font-semibold">{inspection.mileage.toLocaleString('fr-FR')} km</p>
              </div>
              <div>
                <p className="text-gray-400">Dernier km connu</p>
                <p className="font-semibold">{inspection.vehicle?.mileage?.toLocaleString('fr-FR')} km</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Conducteur */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5" />
              Intervention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-400">Conducteur</p>
                <p className="font-medium">{inspection.driver_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-400">Lieu du contrôle</p>
                <p className="font-medium">{inspection.location}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-400">Date et heure</p>
                <p className="font-medium">{format(new Date(inspection.created_at), 'PPp', { locale: fr })}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Niveaux */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Gauge className="h-5 w-5" />
            Niveaux et mesures
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Fuel className="h-5 w-5 text-red-500" />
                <span className="font-medium">Carburant</span>
              </div>
              <div className="relative h-4 bg-slate-200 rounded-full overflow-hidden">
                <div className="absolute inset-y-0 left-0 bg-red-500 transition-all" style={{ width: `${inspection.fuel_level}%` }} />
              </div>
              <p className="text-sm text-slate-600">{inspection.fuel_level}%</p>
            </div>

            {isPL && inspection.adblue_level !== undefined && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Droplets className="h-5 w-5 text-blue-500" />
                  <span className="font-medium">AdBlue</span>
                </div>
                <div className="relative h-4 bg-slate-200 rounded-full overflow-hidden">
                  <div className="absolute inset-y-0 left-0 bg-blue-500 transition-all" style={{ width: `${inspection.adblue_level}%` }} />
                </div>
                <p className="text-sm text-slate-600">{inspection.adblue_level}%</p>
              </div>
            )}

            {isPLFrigo && inspection.gnr_level !== undefined && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <ThermometerSnowflake className="h-5 w-5 text-green-500" />
                  <span className="font-medium">GNR (Frigo)</span>
                </div>
                <div className="relative h-4 bg-slate-200 rounded-full overflow-hidden">
                  <div className="absolute inset-y-0 left-0 bg-green-500 transition-all" style={{ width: `${inspection.gnr_level}%` }} />
                </div>
                <p className="text-sm text-slate-600">{inspection.gnr_level}%</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Défauts */}
      {inspection.reported_defects && inspection.reported_defects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertOctagon className="h-5 w-5 text-red-600" />
              Défauts et anomalies ({inspection.reported_defects.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {inspection.reported_defects.map((defect, index) => (
                <div 
                  key={index}
                  className={`p-4 rounded-lg border-l-4 ${
                    defect.severity === 'CRITIQUE' 
                      ? 'bg-red-50 border-red-500' 
                      : defect.severity === 'MAJEUR'
                        ? 'bg-amber-50 border-amber-500'
                        : 'bg-blue-50 border-blue-500'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={defect.severity === 'CRITIQUE' ? 'destructive' : defect.severity === 'MAJEUR' ? 'default' : 'secondary'}>
                          {defect.severity}
                        </Badge>
                        {defect.category && <span className="text-sm text-slate-600">{defect.category}</span>}
                      </div>
                      <p className="text-slate-700">{defect.description}</p>
                    </div>
                    {defect.requiresImmediateMaintenance && (
                      <Badge variant="destructive" className="gap-1">
                        <Wrench className="h-3 w-3" />
                        Maintenance créée
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {inspection.inspector_notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notes de l&apos;inspecteur</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-slate-700 whitespace-pre-wrap">{inspection.inspector_notes}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" asChild>
          <Link href="/inspections">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à la liste
          </Link>
        </Button>
        
        <Button variant="outline" asChild>
          <Link href={`/vehicles/${inspection.vehicle_id}`}>
            <Car className="h-4 w-4 mr-2" />
            Voir la fiche véhicule
          </Link>
        </Button>
        
        {inspection.status === 'CRITICAL_ISSUES' && (
          <Button asChild>
            <Link href="/maintenance">
              <Wrench className="h-4 w-4 mr-2" />
              Voir les maintenances
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

function InspectionDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <Skeleton className="h-32" />
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}

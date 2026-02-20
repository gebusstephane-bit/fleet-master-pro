'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { getSupabaseClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Star, CheckCircle2, AlertTriangle, XCircle, 
  ArrowRight, Plus, ClipboardCheck
} from 'lucide-react';

interface Inspection {
  id: string;
  score: number;
  grade: string;
  defects_count: number;
  mileage: number;
  driver_name: string;
  location: string;
  status: string;
  created_at: string;
}

const statusConfig: Record<string, any> = {
  COMPLETED: { label: 'OK', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  ISSUES_FOUND: { label: 'Anomalies', color: 'bg-amber-100 text-amber-800', icon: AlertTriangle },
  CRITICAL_ISSUES: { label: 'Critique', color: 'bg-red-100 text-red-800', icon: XCircle },
  PENDING: { label: 'En attente', color: 'bg-blue-100 text-blue-800', icon: ClipboardCheck },
};

const gradeColors: Record<string, string> = {
  A: 'text-green-600',
  B: 'text-blue-600',
  C: 'text-amber-600',
  D: 'text-red-600',
};

interface VehicleInspectionsProps {
  vehicleId: string;
}

export function VehicleInspections({ vehicleId }: VehicleInspectionsProps) {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInspections = async () => {
      const supabase = getSupabaseClient();
      
      const { data, error } = await supabase
        .from('vehicle_inspections')
        .select('id, score, grade, defects_count, mileage, driver_name, location, status, created_at')
        .eq('vehicle_id', vehicleId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (!error && data) {
        // @ts-ignore
        setInspections(data);
      }
      setLoading(false);
    };
    
    fetchInspections();
  }, [vehicleId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (inspections.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <ClipboardCheck className="h-12 w-12 mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">Aucun contrôle</h3>
          <p className="text-slate-500 mb-4">Ce véhicule n&apos;a pas encore fait l&apos;objet d&apos;un contrôle technique.</p>
          <Button asChild>
            <Link href={`/inspection/${vehicleId}`}>
              <Plus className="h-4 w-4 mr-2" />
              Faire un contrôle
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const lastInspection = inspections[0];
  const averageScore = Math.round(inspections.reduce((acc, i) => acc + i.score, 0) / inspections.length);
  const criticalCount = inspections.filter((i: any) => i.status === 'CRITICAL_ISSUES').length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Total contrôles</p>
            <p className="text-2xl font-bold">{inspections.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Moyenne</p>
            <p className={`text-2xl font-bold ${gradeColors[
              averageScore >= 90 ? 'A' : averageScore >= 75 ? 'B' : averageScore >= 60 ? 'C' : 'D'
            ]}`}>
              {averageScore}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Problèmes critiques</p>
            <p className={`text-2xl font-bold ${criticalCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {criticalCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Dernier contrôle */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Dernier contrôle
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold ${
                lastInspection.grade === 'A' ? 'bg-green-100 text-green-700' :
                lastInspection.grade === 'B' ? 'bg-blue-100 text-blue-700' :
                lastInspection.grade === 'C' ? 'bg-amber-100 text-amber-700' :
                'bg-red-100 text-red-700'
              }`}>
                {lastInspection.grade}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{lastInspection.score}%</span>
                  <Badge className={statusConfig[lastInspection.status]?.color || 'bg-gray-100'}>
                    {statusConfig[lastInspection.status]?.label || lastInspection.status}
                  </Badge>
                </div>
                <p className="text-sm text-slate-500">
                  {format(new Date(lastInspection.created_at), 'PPp', { locale: fr })}
                </p>
                <p className="text-sm text-slate-600">
                  Conducteur: {lastInspection.driver_name} • {lastInspection.mileage.toLocaleString('fr-FR')} km
                </p>
                {lastInspection.defects_count > 0 && (
                  <p className="text-sm text-amber-600 mt-1">
                    {lastInspection.defects_count} défaut(s) signalé(s)
                  </p>
                )}
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/inspections/${lastInspection.id}`}>
                Voir détail
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Historique */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Historique des contrôles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {inspections.map((inspection) => {
              const status = statusConfig[inspection.status];
              const StatusIcon = status?.icon || ClipboardCheck;
              
              return (
                <div 
                  key={inspection.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                      inspection.grade === 'A' ? 'bg-green-100 text-green-700' :
                      inspection.grade === 'B' ? 'bg-blue-100 text-blue-700' :
                      inspection.grade === 'C' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {inspection.grade}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{inspection.score}%</span>
                        <Badge variant="outline" className={status?.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {status?.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-500">
                        {format(new Date(inspection.created_at), 'PP', { locale: fr })} • {inspection.driver_name}
                      </p>
                      {inspection.defects_count > 0 && (
                        <p className="text-xs text-amber-600">
                          {inspection.defects_count} défaut(s)
                        </p>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/inspections/${inspection.id}`}>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Action */}
      <div className="flex justify-end">
        <Button asChild>
          <Link href={`/inspection/${vehicleId}`}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau contrôle
          </Link>
        </Button>
      </div>
    </div>
  );
}

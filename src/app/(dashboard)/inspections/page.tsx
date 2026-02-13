'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, Search, Filter, QrCode, Car, Truck, 
  CheckCircle2, AlertTriangle, XCircle, Calendar,
  Star, ArrowRight
} from 'lucide-react';
import { useUserContext } from '@/components/providers/user-provider';
import { getSupabaseClient } from '@/lib/supabase/client';
import { getInspectionsSafe } from '@/actions/inspections-safe';
import { Skeleton } from '@/components/ui/skeleton';

interface Inspection {
  id: string;
  vehicle_id: string;
  status: 'COMPLETED' | 'ISSUES_FOUND' | 'CRITICAL_ISSUES' | 'PENDING' | 'REFUSEE';
  score: number;
  grade: string;
  defects_count: number;
  mileage: number;
  driver_name: string;
  location: string;
  created_at: string;
  vehicle?: {
    registration_number: string;
    brand: string;
    model: string;
    type: string;
  };
}

const statusConfig = {
  COMPLETED: { label: 'Terminé', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2 },
  ISSUES_FOUND: { label: 'Anomalies', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: AlertTriangle },
  CRITICAL_ISSUES: { label: 'Critique', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
  PENDING: { label: 'En attente', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: CheckCircle2 },
  REFUSEE: { label: 'Refusé', color: 'bg-slate-100 text-slate-800 border-slate-200', icon: XCircle },
};

const gradeColors: Record<string, string> = {
  A: 'text-green-600 bg-green-50',
  B: 'text-yellow-600 bg-yellow-50',
  C: 'text-orange-600 bg-orange-50',
  D: 'text-red-600 bg-red-50',
};

// Composant qui utilise useSearchParams
function InspectionsContent() {
  const searchParams = useSearchParams();
  const success = searchParams.get('success');
  const { user } = useUserContext();
  
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showSuccess, setShowSuccess] = useState(!!success);

  useEffect(() => {
    if (success) {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    const fetchInspections = async () => {
      const result = await getInspectionsSafe(user?.company_id);
      
      if (!result.error && result.data) {
        setInspections(result.data);
      } else if (result.error) {
        console.error('Error fetching inspections:', result.error);
      }
      setLoading(false);
    };
    
    fetchInspections();
  }, [user?.company_id]);

  const filteredInspections = inspections.filter((inspection) => {
    const matchesSearch = 
      inspection.vehicle?.registration_number?.toLowerCase().includes(search.toLowerCase()) ||
      inspection.driver_name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || inspection.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));
  };

  const getVehicleIcon = (type: string) => {
    if (type === 'VOITURE') return <Car className="h-4 w-4" />;
    return <Truck className="h-4 w-4" />;
  };

  const stats = {
    total: inspections.length,
    completed: inspections.filter(i => i.status === 'COMPLETED').length,
    issues: inspections.filter(i => i.status === 'ISSUES_FOUND').length,
    critical: inspections.filter(i => i.status === 'CRITICAL_ISSUES').length,
  };

  if (loading) {
    return <InspectionsSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contrôles d&apos;état</h1>
          <p className="text-muted-foreground mt-1">
            Historique des inspections véhicules
          </p>
        </div>
        <Button asChild>
          <Link href="/inspection">
            <QrCode className="h-4 w-4 mr-2" />
            Nouveau contrôle
          </Link>
        </Button>
      </div>

      {/* Success message */}
      {showSuccess && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Contrôle enregistré avec succès !
          </AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total ce mois</CardDescription>
            <CardTitle className="text-2xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Contrôles OK</CardDescription>
            <CardTitle className="text-2xl text-green-600">{stats.completed}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Anomalies</CardDescription>
            <CardTitle className="text-2xl text-amber-600">{stats.issues}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Critiques</CardDescription>
            <CardTitle className="text-2xl text-red-600">{stats.critical}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par plaque ou conducteur..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
              >
                Tous
              </Button>
              <Button 
                variant={statusFilter === 'COMPLETED' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('COMPLETED')}
              >
                <CheckCircle2 className="h-3 w-3 mr-1" />
                OK
              </Button>
              <Button 
                variant={statusFilter === 'ISSUES_FOUND' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('ISSUES_FOUND')}
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                Anomalies
              </Button>
              <Button 
                variant={statusFilter === 'CRITICAL_ISSUES' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('CRITICAL_ISSUES')}
              >
                <XCircle className="h-3 w-3 mr-1" />
                Critiques
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des inspections */}
      <div className="grid gap-4">
        {filteredInspections.map((inspection) => {
          const status = statusConfig[inspection.status];
          const StatusIcon = status.icon;
          
          return (
            <Card key={inspection.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                      {getVehicleIcon(inspection.vehicle?.type || '')}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{inspection.vehicle?.registration_number}</h3>
                        <Badge className={status.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {status.label}
                        </Badge>
                        <Badge className={gradeColors[inspection.grade]}>
                          <Star className="h-3 w-3 mr-1" />
                          {inspection.grade}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {inspection.vehicle?.brand} {inspection.vehicle?.model} • {inspection.mileage?.toLocaleString('fr-FR')} km
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{inspection.driver_name}</p>
                    <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(inspection.created_at)}
                    </p>
                    {inspection.defects_count > 0 && (
                      <p className="text-xs text-amber-600 mt-1">
                        {inspection.defects_count} défaut(s)
                      </p>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/inspections/${inspection.id}`}>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filteredInspections.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <QrCode className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-1">Aucun contrôle trouvé</h3>
              <p className="text-muted-foreground mb-4">
                Aucune inspection ne correspond à vos critères de recherche.
              </p>
              <Button asChild>
                <Link href="/inspection">
                  <Plus className="h-4 w-4 mr-2" />
                  Faire un contrôle
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function InspectionsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

// Export avec Suspense
export default function InspectionsPage() {
  return (
    <Suspense fallback={<InspectionsSkeleton />}>
      <InspectionsContent />
    </Suspense>
  );
}

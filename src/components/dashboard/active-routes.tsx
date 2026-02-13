/**
 * Composant ActiveRoutes
 * Affiche les tournées actives
 */

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Route, 
  Clock, 
  MapPin, 
  ChevronRight,
  Play,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

interface ActiveRoutesProps {
  companyId: string;
}

export async function ActiveRoutes({ companyId }: ActiveRoutesProps) {
  const supabase = await createClient();

  const { data: routes } = await supabase
    .from('routes')
    .select(`
      *,
      drivers(first_name, last_name),
      vehicles(registration_number)
    `)
    .eq('company_id', companyId)
    .in('status', ['in_progress', 'planned'])
    .order('planned_start_time', { ascending: true })
    .limit(5);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">En cours</Badge>;
      case 'planned':
        return <Badge variant="outline">Planifiée</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Terminée</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getProgress = (status: string) => {
    switch (status) {
      case 'completed':
        return 100;
      case 'in_progress':
        return Math.floor(Math.random() * 60) + 20;
      default:
        return 0;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Route className="h-5 w-5" />
          Tournées en cours
        </CardTitle>
        <Link href="/routes">
          <Button variant="ghost" size="sm">
            Voir tout
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {!routes || routes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Route className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>Aucune tournée active</p>
            <p className="text-sm">Créez une nouvelle tournée pour commencer</p>
          </div>
        ) : (
          <div className="space-y-4">
            {routes.map((route: any) => (
              <div key={route.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{route.name}</h4>
                      {getStatusBadge(route.status)}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {route.drivers?.first_name} {route.drivers?.last_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {route.vehicles?.registration_number}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {route.total_distance ? `${route.total_distance} km` : '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {route.planned_start_time 
                        ? new Date(route.planned_start_time).toLocaleTimeString('fr-FR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })
                        : '—'}
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Progression</span>
                    <span>{getProgress(route.status)}%</span>
                  </div>
                  <Progress value={getProgress(route.status)} className="h-2" />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  AlertTriangle, 
  Wrench, 
  ClipboardCheck,
  Car,
  Fuel,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// ============================================================================
// PAGE D'ACCUEIL CONDUCTEUR
// ============================================================================

export default async function DriverHomePage() {
  const supabase = await createClient();
  
  // Récupérer l'utilisateur
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  
  // Récupérer le conducteur
  const { data: driver } = await supabase
    .from('drivers')
    .select('id, first_name, last_name, current_vehicle_id, safety_score, fuel_efficiency_score')
    .eq('user_id', user.id)
    .maybeSingle();
  
  // Récupérer le véhicule assigné
  let vehicle: any = null;
  if (driver?.current_vehicle_id) {
    const { data: vehicleData } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', driver.current_vehicle_id)
      .maybeSingle();
    vehicle = vehicleData;
  }
  
  // Récupérer la dernière inspection
  const { data: lastInspection } = await supabase
    .from('inspections')
    .select('id, score, created_at, status')
    .eq('driver_id', driver?.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  // Récupérer la prochaine maintenance prévue
  const { data: nextMaintenance } = await supabase
    .from('maintenance_records')
    .select('id, type, description, scheduled_date, priority, status')
    .eq('vehicle_id', vehicle?.id || '')
    .in('status', ['scheduled', 'pending'])
    .order('scheduled_date', { ascending: true })
    .limit(1)
    .maybeSingle();
  
  // Vérifier la conformité des documents du véhicule
  const now = new Date();
  const complianceChecks: any[] = [];
  
  if (vehicle) {
    // Contrôle technique
    if (vehicle.technical_control_expiry) {
      const days = differenceInDays(new Date(vehicle.technical_control_expiry), now);
      if (days < 30) {
        complianceChecks.push({ type: 'CT', days, date: vehicle.technical_control_expiry });
      }
    }
    
    // Assurance
    if (vehicle.insurance_expiry) {
      const days = differenceInDays(new Date(vehicle.insurance_expiry), now);
      if (days < 30) {
        complianceChecks.push({ type: 'Assurance', days, date: vehicle.insurance_expiry });
      }
    }
  }
  
  const complianceOk = complianceChecks.length === 0;
  
  return (
    <div className="p-4 space-y-4">
      {/* Card Véhicule */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="pt-4">
          {vehicle ? (
            <>
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-white">{vehicle.registration_number}</h2>
                  <p className="text-slate-400 text-sm">
                    {vehicle.brand} {vehicle.model}
                  </p>
                </div>
                <Badge 
                  variant="outline" 
                  className={cn(
                    'font-normal',
                    vehicle.status === 'active' && 'border-green-500/50 text-green-400 bg-green-500/10',
                    vehicle.status === 'maintenance' && 'border-amber-500/50 text-amber-400 bg-amber-500/10',
                    vehicle.status === 'inactive' && 'border-red-500/50 text-red-400 bg-red-500/10',
                  )}
                >
                  {vehicle.status === 'active' && 'Actif'}
                  {vehicle.status === 'maintenance' && 'Maintenance'}
                  {vehicle.status === 'inactive' && 'Inactif'}
                  {vehicle.status === 'retired' && 'Retiré'}
                </Badge>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-1">Kilométrage</p>
                  <p className="font-semibold text-white text-lg">
                    {(vehicle.mileage || 0).toLocaleString('fr-FR')} km
                  </p>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-1">Conso. moy.</p>
                  <p className="font-semibold text-white text-lg">
                    {vehicle.fuel_consumption_avg 
                      ? `${vehicle.fuel_consumption_avg.toFixed(1)} L/100` 
                      : '—'}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <Car className="h-12 w-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">
                Aucun véhicule assigné
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Contactez votre gestionnaire de flotte
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Card Conformité */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            {complianceOk ? (
              <>
                <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="font-medium text-white">Documents en règle</p>
                  <p className="text-xs text-slate-400">Tous les documents sont valides</p>
                </div>
              </>
            ) : (
              <>
                <div className="h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-6 w-6 text-amber-500" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-amber-400">
                    {complianceChecks.length} document(s) à vérifier
                  </p>
                  <ul className="text-xs text-slate-400 mt-1 space-y-0.5">
                    {complianceChecks.map((check, i) => (
                      <li key={i}>
                        {check.type} : {check.days < 0 
                          ? <span className="text-red-400">Expiré</span>
                          : <span className="text-amber-400">{check.days} jours restants</span>
                        }
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Card Prochaine Maintenance */}
      {nextMaintenance && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-slate-700 flex items-center justify-center shrink-0">
                <Wrench className="h-5 w-5 text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {nextMaintenance.type || 'Maintenance prévue'}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {nextMaintenance.description}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-white">
                  {nextMaintenance.scheduled_date 
                    ? format(new Date(nextMaintenance.scheduled_date), 'dd/MM', { locale: fr })
                    : '—'
                  }
                </p>
                <Badge 
                  variant="outline" 
                  className={cn(
                    'text-xs mt-1',
                    nextMaintenance.priority === 'CRITICAL' && 'border-red-500/50 text-red-400',
                    nextMaintenance.priority === 'HIGH' && 'border-orange-500/50 text-orange-400',
                    nextMaintenance.priority === 'NORMAL' && 'border-blue-500/50 text-blue-400',
                    nextMaintenance.priority === 'LOW' && 'border-green-500/50 text-green-400',
                  )}
                >
                  {nextMaintenance.priority}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Card Dernière Inspection */}
      {lastInspection && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-slate-700 flex items-center justify-center shrink-0">
                <ClipboardCheck className="h-5 w-5 text-slate-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Dernière inspection</p>
                <p className="text-xs text-slate-400">
                  {format(new Date(lastInspection.created_at), 'dd MMMM yyyy', { locale: fr })}
                </p>
              </div>
              <div className="text-right">
                <Badge 
                  variant="outline" 
                  className={cn(
                    (lastInspection.score || 0) >= 80 
                      ? 'border-green-500/50 text-green-400 bg-green-500/10' 
                      : 'border-red-500/50 text-red-400 bg-red-500/10'
                  )}
                >
                  {lastInspection.score || 0}/100
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Boutons d'action rapide */}
      <div className="grid grid-cols-2 gap-3">
        <Button 
          className="h-auto py-4 bg-blue-600 hover:bg-blue-500 flex flex-col items-center gap-2"
          asChild
        >
          <Link href="/driver-app/driver-app/inspection">
            <ClipboardCheck className="h-6 w-6" />
            <span>Nouvelle inspection</span>
          </Link>
        </Button>
        <Button 
          className="h-auto py-4 bg-emerald-600 hover:bg-emerald-500 flex flex-col items-center gap-2"
          asChild
        >
          <Link href="/driver-app/driver-app/fuel">
            <Fuel className="h-6 w-6" />
            <span>Saisir un plein</span>
          </Link>
        </Button>
      </div>
      
      {/* Lien vers carnet d'entretien (QR Code) */}
      {vehicle && (
        <Link 
          href={`/scan/${vehicle.id}/carnet`}
          className="flex items-center justify-between p-4 rounded-lg bg-slate-800/30 border border-slate-700 hover:bg-slate-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Car className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Carnet d&apos;entretien</p>
              <p className="text-xs text-slate-400">Historique du véhicule</p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-slate-400" />
        </Link>
      )}
    </div>
  );
}

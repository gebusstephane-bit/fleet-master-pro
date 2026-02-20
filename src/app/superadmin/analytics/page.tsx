/**
 * Analytics - SuperAdmin
 * Statistiques et métriques de la plateforme
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { BarChart3, TrendingUp, Users, Activity, Car, Wrench, ClipboardCheck } from 'lucide-react';

export const metadata = {
  title: 'Analytics | SuperAdmin',
};

export default async function AnalyticsPage() {
  const supabase = createAdminClient();

  const { count: totalUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
  const { count: totalVehicles } = await supabase.from('vehicles').select('*', { count: 'exact', head: true });
  const { count: totalInspections } = await supabase.from('inspections').select('*', { count: 'exact', head: true });
  // @ts-ignore
  const { count: totalMaintenance } = await (supabase.from('maintenance') as any).select('*', { count: 'exact', head: true });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Analytics</h1>
        <p className="text-white/50 mt-1">Statistiques et métriques de la plateforme</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-sm text-white/50">Utilisateurs</span>
          </div>
          <p className="text-3xl font-bold text-white">{totalUsers || 0}</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Car className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-sm text-white/50">Véhicules</span>
          </div>
          <p className="text-3xl font-bold text-white">{totalVehicles || 0}</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-sm text-white/50">Inspections</span>
          </div>
          <p className="text-3xl font-bold text-white">{totalInspections || 0}</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
              <Wrench className="w-5 h-5 text-orange-400" />
            </div>
            <span className="text-sm text-white/50">Maintenances</span>
          </div>
          <p className="text-3xl font-bold text-white">{totalMaintenance || 0}</p>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
        <BarChart3 className="w-16 h-16 mx-auto mb-4 text-white/20" />
        <h3 className="text-lg font-medium text-white mb-2">Analytics avancés</h3>
        <p className="text-white/50 max-w-md mx-auto">
          Les graphiques et analyses détaillées seront disponibles prochainement.
          Utilisez Stripe Dashboard pour les métriques de revenus.
        </p>
      </div>
    </div>
  );
}

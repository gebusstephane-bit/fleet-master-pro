'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useUserContext } from '@/components/providers/user-provider';
import { logger } from '@/lib/logger';

export function DataDebugger() {
  const { user } = useUserContext();
  const [debug, setDebug] = useState<any>({});

  useEffect(() => {
    async function testQueries() {
      const supabase = getSupabaseClient();
      const results: any = {
        user,
        timestamp: new Date().toISOString(),
      };

      // Test véhicules
      try {
        const { data: vehicles, error: vError } = await supabase
          .from('vehicles')
          .select('id, registration_number, company_id')
          .limit(5);
        results.vehicles = { count: vehicles?.length, error: vError?.message, data: vehicles };
      } catch (e: any) {
        results.vehicles = { error: e.message };
      }

      // Test chauffeurs
      try {
        const { data: drivers, error: dError } = await supabase
          .from('drivers')
          .select('id, first_name, company_id')
          .limit(5);
        results.drivers = { count: drivers?.length, error: dError?.message, data: drivers };
      } catch (e: any) {
        results.drivers = { error: e.message };
      }

      // Test routes
      try {
        const { data: routes, error: rError } = await supabase
          .from('routes')
          .select('id, name, company_id')
          .limit(5);
        results.routes = { count: routes?.length, error: rError?.message, data: routes };
      } catch (e: any) {
        results.routes = { error: e.message };
      }

      // Test maintenance
      try {
        const { data: maintenance, error: mError } = await supabase
          .from('maintenance_records')
          .select('id, title, company_id')
          .limit(5);
        results.maintenance = { count: maintenance?.length, error: mError?.message, data: maintenance };
      } catch (e: any) {
        results.maintenance = { error: e.message };
      }

      setDebug(results);
      logger.info('Debug results', results);
    }

    testQueries();
  }, [user]);

  if (process.env.NODE_ENV === 'production') return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md bg-slate-900/95 border border-cyan-500/30 rounded-lg p-4 text-xs font-mono shadow-2xl backdrop-blur-xl">
      <h4 className="font-bold text-cyan-400 mb-2">Data Debugger</h4>
      <div className="space-y-2 text-slate-300">
        <div>User ID: {user?.id?.slice(0, 8)}...</div>
        <div>Company ID: {user?.company_id || 'NON DÉFINI ⚠️'}</div>
        
        <div className="mt-3 space-y-1">
          <div className="flex justify-between">
            <span>Véhicules:</span>
            <span className={debug.vehicles?.error ? 'text-red-400' : 'text-emerald-400'}>
              {debug.vehicles?.error ? `❌ ${debug.vehicles.error}` : `✅ ${debug.vehicles?.count || 0}`}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Chauffeurs:</span>
            <span className={debug.drivers?.error ? 'text-red-400' : 'text-emerald-400'}>
              {debug.drivers?.error ? `❌ ${debug.drivers.error}` : `✅ ${debug.drivers?.count || 0}`}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Tournées:</span>
            <span className={debug.routes?.error ? 'text-red-400' : 'text-emerald-400'}>
              {debug.routes?.error ? `❌ ${debug.routes.error}` : `✅ ${debug.routes?.count || 0}`}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Maintenance:</span>
            <span className={debug.maintenance?.error ? 'text-red-400' : 'text-emerald-400'}>
              {debug.maintenance?.error ? `❌ ${debug.maintenance.error}` : `✅ ${debug.maintenance?.count || 0}`}
            </span>
          </div>
        </div>

        {debug.vehicles?.data && (
          <details className="mt-2">
            <summary className="cursor-pointer text-cyan-400">Voir données véhicules</summary>
            <pre className="mt-1 p-2 bg-slate-800 rounded overflow-auto max-h-32">
              {JSON.stringify(debug.vehicles.data, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

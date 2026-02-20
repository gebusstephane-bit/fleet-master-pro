'use client';

import { useEffect, useState } from 'react';
import { useUserContext } from '@/components/providers/user-provider';
import { getSupabaseClient } from '@/lib/supabase/client';

export function VehiclesDebug() {
  const { user } = useUserContext();
  const [logs, setLogs] = useState<string[]>([]);
  const [results, setResults] = useState<any>({});

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  useEffect(() => {
    async function runDiagnostics() {
      addLog('=== DÉMARRAGE DIAGNOSTIC ===');
      addLog(`User ID: ${user?.id?.slice(0, 8)}...`);
      addLog(`Company ID: ${user?.company_id?.slice(0, 8)}...`);

      if (!user?.company_id) {
        addLog('❌ ERREUR: Pas de company_id !');
        return;
      }

      const supabase = getSupabaseClient();
      const companyId = user.company_id;

      // Test 1: Requête directe véhicules
      addLog('--- Test 1: Requête directe véhicules ---');
      try {
        const { data: vData, error: vError } = await supabase
          .from('vehicles')
          .select('id, registration_number, company_id')
          .eq('company_id', companyId)
          .limit(5);

        if (vError) {
          addLog(`❌ Erreur: ${vError.code} - ${vError.message?.slice(0, 50)}`);
        } else {
          addLog(`✅ Succès: ${vData?.length || 0} véhicules trouvés`);
          if (vData && vData.length > 0) {
            addLog(`   Premier: ${vData[0].registration_number}`);
          }
        }
        
        setResults(prev => ({ ...prev, vehicles: { data: vData, error: vError } }));
      } catch (e: any) {
        addLog(`❌ Exception: ${e.message}`);
      }

      // Test 2: Requête directe chauffeurs
      addLog('--- Test 2: Requête directe chauffeurs ---');
      try {
        const { data: dData, error: dError } = await supabase
          .from('drivers')
          .select('id, first_name, company_id')
          .eq('company_id', companyId)
          .limit(5);

        if (dError) {
          addLog(`❌ Erreur: ${dError.code} - ${dError.message?.slice(0, 50)}`);
        } else {
          addLog(`✅ Succès: ${dData?.length || 0} chauffeurs trouvés`);
          if (dData && dData.length > 0) {
            addLog(`   Premier: ${dData[0].first_name}`);
          }
        }
        
        setResults(prev => ({ ...prev, drivers: { data: dData, error: dError } }));
      } catch (e: any) {
        addLog(`❌ Exception: ${e.message}`);
      }

      // Test 3: Requête sans filtre (test RLS)
      addLog('--- Test 3: Requête sans filtre (test RLS) ---');
      try {
        const { data: allVData, error: allVError } = await supabase
          .from('vehicles')
          .select('id, registration_number, company_id')
          .limit(10);

        if (allVError) {
          addLog(`❌ Erreur RLS: ${allVError.code} - ${allVError.message?.slice(0, 50)}`);
          if (allVError.code === '42P17') {
            addLog('   ⚠️ BOUCLE INFINIE RLS DÉTECTÉE !');
          }
        } else {
          addLog(`✅ Succès: ${allVData?.length || 0} véhicules total`);
          const matching = allVData?.filter((v: any) => v.company_id === companyId).length || 0;
          addLog(`   Dont ${matching} avec votre company_id`);
        }
        
        setResults(prev => ({ ...prev, allVehicles: { data: allVData, error: allVError } }));
      } catch (e: any) {
        addLog(`❌ Exception: ${e.message}`);
      }

      // Test 4: Compter tous les véhicules
      addLog('--- Test 4: Compter tous les véhicules ---');
      try {
        const { count, error: countError } = await supabase
          .from('vehicles')
          .select('*', { count: 'exact', head: true });

        if (countError) {
          addLog(`❌ Erreur: ${countError.message?.slice(0, 50)}`);
        } else {
          addLog(`✅ Total véhicules dans la base: ${count}`);
        }
      } catch (e: any) {
        addLog(`❌ Exception: ${e.message}`);
      }

      addLog('=== FIN DIAGNOSTIC ===');
    }

    runDiagnostics();
  }, [user]);

  if (process.env.NODE_ENV === 'production') return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-[80vh] overflow-auto bg-slate-900/95 border border-cyan-500/30 rounded-lg p-4 text-xs font-mono shadow-2xl backdrop-blur-xl">
      <h4 className="font-bold text-cyan-400 mb-2">🔍 Diagnostic Vehicles/Drivers</h4>
      
      <div className="space-y-1 text-slate-300 max-h-48 overflow-auto">
        {logs.map((log, i) => (
          <div key={i} className={`
            ${log.includes('❌') ? 'text-red-400' : ''}
            ${log.includes('✅') ? 'text-emerald-400' : ''}
            ${log.includes('⚠️') ? 'text-amber-400' : ''}
          `}>
            {log}
          </div>
        ))}
      </div>

      {results.vehicles?.error?.code === '42P17' && (
        <div className="mt-3 p-2 bg-red-500/20 border border-red-500/30 rounded text-red-200">
          <strong>Problème identifié :</strong> Boucle infinie RLS sur vehicles.<br/>
          Exécutez le SQL dans FIX_RLS_DEFINITIF.sql
        </div>
      )}

      {results.drivers?.error?.code === '42P17' && (
        <div className="mt-3 p-2 bg-red-500/20 border border-red-500/30 rounded text-red-200">
          <strong>Problème identifié :</strong> Boucle infinie RLS sur drivers.<br/>
          Exécutez le SQL dans FIX_RLS_DEFINITIF.sql
        </div>
      )}

      {results.vehicles?.data?.length === 0 && !results.vehicles?.error && (
        <div className="mt-3 p-2 bg-amber-500/20 border border-amber-500/30 rounded text-amber-200">
          <strong>Aucun véhicule trouvé</strong> avec company_id: {user?.company_id?.slice(0, 8)}...<br/>
          Vérifiez que les véhicules ont le bon company_id dans Supabase.
        </div>
      )}

      <button 
        onClick={() => window.location.reload()}
        className="mt-3 w-full py-1 px-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 rounded text-cyan-300 transition-colors"
      >
        🔄 Rafraîchir
      </button>
    </div>
  );
}

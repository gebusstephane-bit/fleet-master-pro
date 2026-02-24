/**
 * Page de test du dashboard
 * Pour déboguer les problèmes de récupération de données
 * PROTÉGÉ: Uniquement accessible en développement
 */

'use client';

import { notFound } from 'next/navigation';

import { useEffect, useState } from 'react';
import { getSimpleKPIs, getKPIsWithFallback } from '@/actions/dashboard-simple';
import { getDashboardKPIs } from '@/actions/dashboard-production';

export default function DashboardTestPage() {
  // Protection: page uniquement accessible en développement
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }
  
  const [results, setResults] = useState<{
    simple?: any;
    fallback?: any;
    production?: any;
  }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function testAll() {
      console.log('🧪 [TEST] Démarrage des tests...');
      
      // Test 1: Simple (sans filtre)
      console.log('🧪 [TEST] Test getSimpleKPIs...');
      const simple = await getSimpleKPIs();
      console.log('🧪 [TEST] Résultat simple:', simple);
      
      // Test 2: Avec fallback
      console.log('🧪 [TEST] Test getKPIsWithFallback...');
      const fallback = await getKPIsWithFallback();
      console.log('🧪 [TEST] Résultat fallback:', fallback);
      
      // Test 3: Production
      console.log('🧪 [TEST] Test getDashboardKPIs...');
      const production = await getDashboardKPIs();
      console.log('🧪 [TEST] Résultat production:', production);
      
      setResults({ simple, fallback, production });
      setLoading(false);
    }
    
    testAll();
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🧪 Test Dashboard - Debug</h1>
      
      {loading ? (
        <div className="text-lg">Chargement des tests...</div>
      ) : (
        <div className="space-y-6">
          {/* Test Simple */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h2 className="font-bold text-green-800 mb-2">1. getSimpleKPIs (sans filtre)</h2>
            <pre className="bg-white p-3 rounded text-sm overflow-auto">
              {JSON.stringify(results.simple, null, 2)}
            </pre>
          </div>
          
          {/* Test Fallback */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h2 className="font-bold text-blue-800 mb-2">2. getKPIsWithFallback (company_id auto)</h2>
            <pre className="bg-white p-3 rounded text-sm overflow-auto">
              {JSON.stringify(results.fallback, null, 2)}
            </pre>
          </div>
          
          {/* Test Production */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h2 className="font-bold text-purple-800 mb-2">3. getDashboardKPIs (production)</h2>
            <pre className="bg-white p-3 rounded text-sm overflow-auto">
              {JSON.stringify(results.production, null, 2)}
            </pre>
          </div>
          
          {/* Résumé */}
          <div className="bg-slate-100 border border-slate-300 rounded-lg p-4">
            <h2 className="font-bold text-slate-800 mb-2">📊 Résumé</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Méthode</th>
                  <th className="text-right py-2">Véhicules</th>
                  <th className="text-right py-2">Chauffeurs</th>
                  <th className="text-right py-2">Maintenances</th>
                  <th className="text-right py-2">Inspections</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2">Simple (sans filtre)</td>
                  <td className="text-right font-mono">{results.simple?.data?.vehicles ?? 'ERR'}</td>
                  <td className="text-right font-mono">{results.simple?.data?.drivers ?? 'ERR'}</td>
                  <td className="text-right font-mono">{results.simple?.data?.maintenances ?? 'ERR'}</td>
                  <td className="text-right font-mono">{results.simple?.data?.inspections ?? 'ERR'}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">Fallback (auto company_id)</td>
                  <td className="text-right font-mono">{results.fallback?.data?.vehicles ?? 'ERR'}</td>
                  <td className="text-right font-mono">{results.fallback?.data?.drivers ?? 'ERR'}</td>
                  <td className="text-right font-mono">{results.fallback?.data?.maintenances ?? 'ERR'}</td>
                  <td className="text-right font-mono">{results.fallback?.data?.inspections ?? 'ERR'}</td>
                </tr>
                <tr>
                  <td className="py-2">Production (profil utilisateur)</td>
                  <td className="text-right font-mono">{results.production?.data?.vehicles?.total ?? 'ERR'}</td>
                  <td className="text-right font-mono">{results.production?.data?.drivers?.total ?? 'ERR'}</td>
                  <td className="text-right font-mono">{results.production?.data?.maintenances?.urgent ?? 'ERR'}</td>
                  <td className="text-right font-mono">{results.production?.data?.inspections?.pending ?? 'ERR'}</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div className="text-sm text-slate-500 mt-4">
            <p>Ouvrez la console (F12) pour voir les logs détaillés.</p>
            <p>Si &quot;Simple&quot; fonctionne mais &quot;Production&quot; non =&gt; problème de company_id</p>
            <p>Si tous retournent 0 =&gt; problème de connexion Supabase ou tables vides</p>
          </div>
        </div>
      )}
    </div>
  );
}

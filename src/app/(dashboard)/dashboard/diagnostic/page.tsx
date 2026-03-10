/**
 * Page de diagnostic avec admin client
 * Bypass RLS pour vérifier les données réelles
 * PROTÉGÉ: Uniquement accessible en développement
 */

'use client';

import { notFound } from 'next/navigation';

import { useEffect, useState } from 'react';

// Fonction pour appeler l'API de test
async function testConnection() {
  const response = await fetch('/api/test-dashboard-data');
  return response.json();
}

export default function DiagnosticPage() {
  // Protection: page uniquement accessible en développement
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }
  
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function runTest() {
      try {
        const data = await testConnection();
        setResults(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    
    runTest();
  }, []);

  if (loading) {
    return <div className="p-8">Chargement du diagnostic...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-600">Erreur: {error}</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">🔍 Diagnostic Admin (Bypass RLS)</h1>
      
      {results?.error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded text-red-700">
          {results.error}
        </div>
      )}

      {results?.companyId && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded">
          <p className="font-medium">Company ID: <code className="bg-white px-2 py-1 rounded">{results.companyId}</code></p>
        </div>
      )}

      {/* Résultats */}
      {results?.data && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 border border-green-200 p-4 rounded">
            <h3 className="font-bold text-green-800">Véhicules</h3>
            <p className="text-3xl font-mono">{results.data.vehicles}</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded">
            <h3 className="font-bold text-emerald-800">Chauffeurs</h3>
            <p className="text-3xl font-mono">{results.data.drivers}</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 p-4 rounded">
            <h3 className="font-bold text-amber-800">Maintenances</h3>
            <p className="text-3xl font-mono">{results.data.maintenances}</p>
          </div>
          <div className="bg-purple-50 border border-purple-200 p-4 rounded">
            <h3 className="font-bold text-purple-800">Inspections</h3>
            <p className="text-3xl font-mono">{results.data.inspections}</p>
          </div>
          <div className="bg-pink-50 border border-pink-200 p-4 rounded">
            <h3 className="font-bold text-pink-800">Prédictions IA</h3>
            <p className="text-3xl font-mono">{results.data.predictions}</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 p-4 rounded">
            <h3 className="font-bold text-slate-800">Activity Logs</h3>
            <p className="text-3xl font-mono">{results.data.activities}</p>
          </div>
        </div>
      )}

      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded text-sm">
        <p className="font-medium mb-2">ℹ️ Interprétation:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Si tous les nombres sont &gt; 0: Les données existent, le dashboard devrait fonctionner</li>
          <li>Si certains sont à 0: Les tables existent mais sont vides pour ce company_id</li>
          <li>Si erreur &quot;infinite recursion&quot;: Exécutez la migration SQL fix_rls_recursion.sql</li>
        </ul>
      </div>

      <div className="flex gap-4">
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          🔄 Rafraîchir
        </button>
        <a 
          href="/dashboard"
          className="px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-700"
        >
          ← Retour au dashboard
        </a>
      </div>
    </div>
  );
}

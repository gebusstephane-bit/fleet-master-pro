'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Settings, Plus } from 'lucide-react';

export function NoProviderWarning() {
  const router = useRouter();

  return (
    <Card className="border-amber-200">
      <CardHeader className="bg-amber-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <CardTitle className="text-amber-900">Aucun prestataire configuré</CardTitle>
            <p className="text-sm text-amber-700">
              L&apos;assistant IA ne peut pas vous aider sans garages partenaires
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        <p className="text-gray-600">
          Pour utiliser la fonction SOS Garage, vous devez d&apos;abord ajouter au moins un garage 
          partenaire dans les paramètres. L&apos;IA pourra alors analyser votre panne et vous 
          recommander le meilleur prestataire disponible.
        </p>

        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
          <p className="font-medium text-gray-900 mb-2">Pourquoi ajouter des prestataires ?</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>Recommandation IA personnalisée selon le type de panne</li>
            <li>Calcul automatique des distances et temps d&apos;intervention</li>
            <li>Prise en compte des spécialités (frigo, moteur, 24/7...)</li>
            <li>Accès rapide au contact du garage recommandé</li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={() => router.push('/sos/parametres')}
            className="flex-1"
          >
            <Settings className="h-4 w-4 mr-2" />
            Configurer mes prestataires
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

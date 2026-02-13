'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUserContext } from '@/components/providers/user-provider';
import { ArrowLeft, Plug, Link2, FileText, CreditCard, MapPinned, Cloud, CheckCircle2, AlertCircle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: 'Télématique' | 'Facturation' | 'Navigation' | 'Stockage';
  status: 'connected' | 'disconnected' | 'coming_soon';
}

const integrations: Integration[] = [
  {
    id: 'geotab',
    name: 'Geotab',
    description: 'Suivi GPS et télématique avancée',
    icon: <MapPinned className="h-8 w-8 text-blue-600" />,
    category: 'Télématique',
    status: 'disconnected',
  },
  {
    id: 'verizon',
    name: 'Verizon Connect',
    description: 'Gestion de flotte en temps réel',
    icon: <MapPinned className="h-8 w-8 text-red-600" />,
    category: 'Télématique',
    status: 'disconnected',
  },
  {
    id: 'samsara',
    name: 'Samsara',
    description: 'IoT pour véhicules et équipements',
    icon: <MapPinned className="h-8 w-8 text-green-600" />,
    category: 'Télématique',
    status: 'coming_soon',
  },
  {
    id: 'quickbooks',
    name: 'QuickBooks',
    description: 'Synchronisation comptable',
    icon: <CreditCard className="h-8 w-8 text-green-600" />,
    category: 'Facturation',
    status: 'disconnected',
  },
  {
    id: 'google_maps',
    name: 'Google Maps',
    description: 'Navigation et calcul d&apos;itinéraires',
    icon: <MapPinned className="h-8 w-8 text-blue-500" />,
    category: 'Navigation',
    status: 'connected',
  },
  {
    id: 'onedrive',
    name: 'OneDrive',
    description: 'Stockage cloud des documents',
    icon: <Cloud className="h-8 w-8 text-blue-400" />,
    category: 'Stockage',
    status: 'disconnected',
  },
];

export default function IntegrationsPage() {
  const { user } = useUserContext();
  const [integrationStates, setIntegrationStates] = useState<Record<string, boolean>>({
    google_maps: true,
  });

  const toggleIntegration = (id: string) => {
    setIntegrationStates(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const getStatusIcon = (status: Integration['status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'disconnected':
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
      case 'coming_soon':
        return <span className="text-xs px-2 py-1 bg-slate-200 rounded-full">Bientôt</span>;
    }
  };

  const categories = ['Télématique', 'Facturation', 'Navigation', 'Stockage'];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/settings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Intégrations</h1>
          <p className="text-muted-foreground">Connectez vos outils tiers</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug className="h-5 w-5" />
            API
          </CardTitle>
          <CardDescription>Gérez vos clés API pour les intégrations</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full">
            <Link2 className="h-4 w-4 mr-2" />
            Générer une clé API
          </Button>
        </CardContent>
      </Card>

      {categories.map(category => {
        const categoryIntegrations = integrations.filter(i => i.category === category);
        if (categoryIntegrations.length === 0) return null;

        return (
          <div key={category}>
            <h2 className="text-lg font-semibold mb-4">{category}</h2>
            <div className="space-y-4">
              {categoryIntegrations.map(integration => (
                <Card key={integration.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-slate-50 rounded-lg">
                        {integration.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{integration.name}</p>
                          {getStatusIcon(integration.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {integration.description}
                        </p>
                      </div>
                      <Switch
                        checked={integrationStates[integration.id] || false}
                        onCheckedChange={() => toggleIntegration(integration.id)}
                        disabled={integration.status === 'coming_soon'}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

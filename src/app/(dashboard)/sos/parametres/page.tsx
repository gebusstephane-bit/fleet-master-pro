'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Trash2, 
  MapPin, 
  Phone, 
  Mail, 
  Wrench,
  Car,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { ProviderDialog } from '@/components/sos/ProviderDialog';
import { DeleteProviderDialog } from '@/components/sos/DeleteProviderDialog';
import type { ProviderFormData, Provider } from '@/components/sos/ProviderDialog';
import { ProtocolDialog } from '@/components/sos/ProtocolDialog';
import { DeleteProtocolDialog } from '@/components/sos/DeleteProtocolDialog';
import type { Protocol, ProtocolFormData } from '@/components/sos/ProtocolDialog';
import { toast } from 'sonner';

export default function SOSParametresPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProtocols, setLoadingProtocols] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isProtocolDialogOpen, setIsProtocolDialogOpen] = useState(false);
  const [providerToDelete, setProviderToDelete] = useState<Provider | null>(null);
  const [protocolToDelete, setProtocolToDelete] = useState<Protocol | null>(null);

  const fetchProviders = useCallback(async () => {
    try {
      const response = await fetch('/api/sos/providers');
      const data = await response.json();
      if (data.success) {
        setProviders(data.providers);
      }
    } catch (error) {
      toast.error('Erreur lors du chargement des prestataires');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const handleAddProvider = async (data: ProviderFormData) => {
    try {
      const response = await fetch('/api/sos/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Prestataire ajouté avec succès');
        setIsAddDialogOpen(false);
        fetchProviders();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'ajout');
      throw error;
    }
  };

  const handleDeleteProvider = async (id: string) => {
    try {
      const response = await fetch(`/api/sos/providers/${id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Prestataire supprimé');
        setProviderToDelete(null);
        fetchProviders();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la suppression');
    }
  };

  // Fetch des protocoles d'urgence
  const fetchProtocols = useCallback(async () => {
    try {
      const response = await fetch('/api/sos/protocols');
      const data = await response.json();
      if (data.success) {
        setProtocols(data.protocols);
      }
    } catch (error) {
      console.error('Erreur chargement protocoles:', error);
    } finally {
      setLoadingProtocols(false);
    }
  }, []);

  useEffect(() => {
    fetchProtocols();
  }, [fetchProtocols]);

  const handleAddProtocol = async (data: ProtocolFormData) => {
    try {
      const response = await fetch('/api/sos/protocols', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Protocole ajouté avec succès');
        setIsProtocolDialogOpen(false);
        fetchProtocols();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'ajout');
      throw error;
    }
  };

  const handleDeleteProtocol = async (id: string) => {
    try {
      const response = await fetch(`/api/sos/protocols/${id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Protocole supprimé');
        setProtocolToDelete(null);
        fetchProtocols();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la suppression');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Paramètres SOS Garage</h1>
          <p className="text-gray-500">
            Gérez vos prestataires de réparation partenaires
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un prestataire
        </Button>
      </div>

      {/* Alert si aucun prestataire */}
      {providers.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-amber-900">Aucun prestataire configuré</h3>
            <p className="text-sm text-amber-800 mt-1">
              Ajoutez au moins un garage partenaire pour utiliser la fonction SOS. 
              Sinon, l&apos;assistant IA ne pourra pas vous recommander de réparateur.
            </p>
          </div>
        </div>
      )}

      {/* Compteur */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-blue-600">{providers.length}</div>
            <p className="text-sm text-gray-500">Prestataires enregistrés</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-green-600">
              {providers.filter(p => p.is_active).length}
            </div>
            <p className="text-sm text-gray-500">Actifs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-purple-600">
              {providers.filter(p => p.specialties?.includes('24_7')).length}
            </div>
            <p className="text-sm text-gray-500">Disponibles 24/7</p>
          </CardContent>
        </Card>
      </div>

      {/* Liste des prestataires */}
      <div className="grid gap-4">
        {providers.map((provider) => (
          <Card key={provider.id} className={!provider.is_active ? 'opacity-60' : ''}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg">{provider.name}</h3>
                    {!provider.is_active && (
                      <Badge variant="secondary">Inactif</Badge>
                    )}
                    {provider.priority > 0 && (
                      <Badge className="bg-amber-100 text-amber-800">
                        Priorité {provider.priority}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {provider.address}, {provider.city}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      {provider.phone}
                    </span>
                    {provider.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        {provider.email}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <Car className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {provider.vehicle_types_supported?.join(' + ')}
                    </span>
                    <span className="text-gray-300">|</span>
                    <span className="text-sm text-gray-600">
                      Rayon: {provider.intervention_radius_km} km
                    </span>
                    {provider.max_tonnage && (
                      <>
                        <span className="text-gray-300">|</span>
                        <span className="text-sm text-gray-600">
                          Jusqu&apos;à {provider.max_tonnage} tonnes
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    {provider.specialties?.map((specialty) => (
                      <Badge key={specialty} variant="outline" className="flex items-center gap-1">
                        <Wrench className="h-3 w-3" />
                        {specialty === '24_7' ? '24h/24 7j/7' : 
                         specialty === 'FRIGO_CARRIER' ? 'Frigo/Carrier' :
                         specialty === 'MOTEUR' ? 'Moteur' :
                         specialty === 'PNEU' ? 'Pneumatique' :
                         specialty === 'ELECTRIQUE' ? 'Électrique' :
                         specialty === 'CARROSSERIE' ? 'Carrosserie' :
                         specialty}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => setProviderToDelete(provider)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Section: Protocoles d'urgence V3.1 */}
      <div className="mt-12 pt-8 border-t">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Protocoles d&apos;urgence automatiques
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              Définissez des règles prioritaires qui s&apos;appliquent avant la recherche de garages
            </p>
          </div>
          <Button onClick={() => setIsProtocolDialogOpen(true)} variant="destructive">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un protocole
          </Button>
        </div>

        {loadingProtocols ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : protocols.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
            <AlertTriangle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">Aucun protocole configuré</p>
            <p className="text-sm text-gray-500 mt-1">
              Les protocoles permettent de définir des numéros d&apos;urgence prioritaires
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {protocols.map((protocol) => (
              <Card key={protocol.id} className="border-red-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-red-100 text-red-800">
                          Priorité {protocol.priority}
                        </Badge>
                        <h3 className="font-semibold">{protocol.name}</h3>
                        {!protocol.is_active && (
                          <Badge variant="secondary">Inactif</Badge>
                        )}
                      </div>

                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Si:</span>{' '}
                        {protocol.condition_type === 'distance' && `Distance ${protocol.condition_value} du garage référence`}
                        {protocol.condition_type === 'location_type' && `Type de lieu = ${protocol.condition_value}`}
                        {protocol.condition_type === 'breakdown_type' && `Type de panne = ${protocol.condition_value}`}
                        {protocol.condition_type === 'brand_specific' && `Marque = ${protocol.condition_value}`}
                        {protocol.condition_type === 'severity' && `Gravité = ${protocol.condition_value}`}
                      </div>

                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Alors:</span> Appeler{' '}
                        <span className="font-mono bg-gray-100 px-1 rounded">
                          {protocol.phone_number}
                        </span>
                      </div>

                      <div className="text-sm text-gray-500 bg-gray-50 p-2 rounded">
                        {protocol.instructions}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setProtocolToDelete(protocol)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <ProviderDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSubmit={handleAddProvider}
      />

      <DeleteProviderDialog
        provider={providerToDelete}
        onClose={() => setProviderToDelete(null)}
        onConfirm={handleDeleteProvider}
      />

      <ProtocolDialog
        open={isProtocolDialogOpen}
        onOpenChange={setIsProtocolDialogOpen}
        onSubmit={handleAddProtocol}
        providers={providers}
      />

      <DeleteProtocolDialog
        protocol={protocolToDelete}
        onClose={() => setProtocolToDelete(null)}
        onConfirm={handleDeleteProtocol}
      />
    </div>
  );
}

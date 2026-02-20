'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Check, Phone, Loader2, AlertCircle } from 'lucide-react';
import { InternalPartnerCard, InternalPartner } from '@/components/sos/InternalPartnerCard';
import { ExternalGarageCard, ExternalGarage } from '@/components/sos/ExternalGarageCard';
import { EmergencyProtocolCard, EmergencyProtocol } from '@/components/sos/EmergencyProtocolCard';
import { toast } from 'sonner';

interface Suggestions {
  googleSearchUrl: string;
  searchQuery: string;
  tips: string[];
}

interface ManualSearch {
  query: string;
  googleSearchUrl: string;
  tips: string[];
}

interface SmartSearchResult {
  level: 'internal_partner' | 'external_network' | 'none' | 'emergency_protocol' | 'manual_fallback';
  source?: 'cache' | 'apify';
  vehicle: {
    id: string;
    brand: string;
    model: string;
    registration_number: string;
    category: 'PL' | 'VL';
  };
  breakdown: {
    type: string;
    address: string;
  };
  recommendations?: (InternalPartner | ExternalGarage)[];
  protocol?: EmergencyProtocol;
  fallback_search_available?: boolean;
  searchBrand?: string;
  disclaimer?: string;
  error?: string;
  message?: string;
  suggestions?: Suggestions;
  manualSearch?: ManualSearch;
  warning?: string;
  search_id?: string;
}

export default function SOSResultatPage() {
  const router = useRouter();
  const [results, setResults] = useState<SmartSearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [callingPhone, setCallingPhone] = useState<string | null>(null);

  useEffect(() => {
    const storedResults = localStorage.getItem('sos_results');

    if (!storedResults) {
      router.push('/sos/selection');
      return;
    }

    setResults(JSON.parse(storedResults));
    setLoading(false);
  }, [router]);

  const handleCall = async (phone: string, isExternal: boolean = false) => {
    setCallingPhone(phone);

    try {
      // Enregistrer le contact dans l'historique
      if (results?.search_id) {
        await fetch('/api/sos/mark-contacted', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            searchId: results.search_id,
            phone
          })
        });
      }

      // Ouvrir l'appel téléphonique
      window.location.href = `tel:${phone}`;
    } catch (error) {
      console.error('Error marking as contacted:', error);
    } finally {
      setCallingPhone(null);
    }
  };

  const handleAddToPartners = async (garage: ExternalGarage) => {
    try {
      const response = await fetch('/api/sos/add-external-to-partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: garage.name,
          address: garage.address,
          city: garage.city,
          phone: garage.phone,
          lat: garage.location?.lat,
          lng: garage.location?.lng,
          vehicleBrands: results?.searchBrand ? [results.searchBrand] : [],
          specialties: garage.specialties,
          isAuthorizedDealer: garage.isAuthorizedDealer
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Garage ajouté à vos partenaires !');
      } else {
        throw new Error(data.error || 'Erreur lors de l\'ajout');
      }
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'ajout');
    }
  };

  const handleNewSearch = () => {
    localStorage.removeItem('sos_vehicle');
    localStorage.removeItem('sos_location');
    localStorage.removeItem('sos_results');
    router.push('/sos');
  };

  // Relancer la recherche V3 normale (quand on clique "Voir quand même" sur un protocole)
  const handleSearchAnyway = async () => {
    if (!results?.vehicle || !results?.breakdown) return;
    
    setLoading(true);
    try {
      // Récupérer les données de localisation du localStorage
      const locationData = localStorage.getItem('sos_location');
      const location = locationData ? JSON.parse(locationData) : null;
      
      const response = await fetch('/api/sos/smart-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId: results.vehicle.id,
          breakdownType: results.breakdown.type,
          coordinates: location ? { lat: location.lat, lng: location.lng } : undefined,
          address: results.breakdown.address,
          severity: 'normal',
          skipProtocols: true // Ignorer les protocoles cette fois
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem('sos_results', JSON.stringify(data));
        setResults(data);
      } else {
        toast.error('Erreur lors de la recherche');
      }
    } catch (error) {
      toast.error('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!results) return null;

  // Cas: Aucun résultat ou fallback manuel
  if (results.level === 'none' || results.level === 'manual_fallback' || results.error) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-red-200">
          <CardHeader className="bg-red-50">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-8 w-8 text-red-600" />
              <div>
                <CardTitle className="text-red-900">Aucun garage trouvé</CardTitle>
                <p className="text-red-700 text-sm">
                  {results.message || 'Nous n\'avons trouvé aucun garage dans votre zone'}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-700">
                <strong>Véhicule:</strong> {results.vehicle?.brand} {results.vehicle?.model} ({results.vehicle?.registration_number})
              </p>
              <p className="text-gray-700 mt-2">
                <strong>Type de panne:</strong> {results.breakdown?.type}
              </p>
              <p className="text-gray-700 mt-2">
                <strong>Localisation:</strong> {results.breakdown?.address}
              </p>
            </div>
            
            {/* Suggestions de recherche manuelle (legacy) */}
            {results.suggestions && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">
                  Recherche manuelle recommandée
                </h4>
                <p className="text-blue-800 text-sm mb-3">
                  La recherche automatique est temporairement indisponible. 
                  Utilisez Google Maps pour trouver un garage :
                </p>
                
                <div className="bg-white rounded p-3 mb-3">
                  <p className="text-sm font-mono text-gray-700">
                    Recherche: <strong>{results.suggestions.searchQuery}</strong>
                  </p>
                </div>
                
                <a 
                  href={results.suggestions.googleSearchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  🔍 Ouvrir Google Maps
                </a>
                
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-blue-900">Conseils :</p>
                  <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    {results.suggestions.tips.map((tip, idx) => (
                      <li key={idx}>{tip}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            
            {/* Nouveau: Manual Search (fallback Apify) */}
            {results.manualSearch && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Recherche manuelle Google Maps
                </h4>
                <p className="text-amber-800 text-sm mb-3">
                  {results.message || 'La recherche automatique est temporairement indisponible.'}
                </p>
                
                <div className="bg-white rounded p-3 mb-3 border border-amber-200">
                  <p className="text-sm text-gray-700 mb-1">Recherche suggérée :</p>
                  <p className="text-sm font-mono text-gray-900 font-medium">
                    {results.manualSearch.query}
                  </p>
                </div>
                
                <a 
                  href={results.manualSearch.googleSearchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors w-full justify-center"
                >
                  🔍 Ouvrir Google Maps
                </a>
                
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-amber-900">Conseils :</p>
                  <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
                    {results.manualSearch.tips.map((tip, idx) => (
                      <li key={idx}>{tip}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => router.push('/sos/localisation')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Modifier la recherche
              </Button>
              <Button onClick={() => router.push('/sos/parametres')}>
                Ajouter un partenaire
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Cas: Protocole d'urgence déclenché
  if (results.level === 'emergency_protocol' && results.protocol) {
    return (
      <div className="max-w-3xl mx-auto">
        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-red-600">🚨 PROTOCOLE D'URGENCE</span>
            <span className="text-sm text-gray-500">Priorité haute</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-red-600 h-2 rounded-full" style={{ width: '100%' }}></div>
          </div>
        </div>

        <EmergencyProtocolCard
          protocol={results.protocol}
          onSearchAnyway={handleSearchAnyway}
          warning={results.warning}
        />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-green-600">Étape 3 sur 3</span>
          <span className="text-sm text-gray-500">
            {results.level === 'internal_partner' ? 'Votre réseau partenaire' : 'Réseau constructeur'}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-green-600 h-2 rounded-full" style={{ width: '100%' }}></div>
        </div>
      </div>

      {/* Header avec info véhicule */}
      <Card className="mb-4">
        <CardHeader className="bg-gray-50">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              results.level === 'internal_partner' ? 'bg-green-600' : 'bg-yellow-600'
            }`}>
              <Check className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">
                {results.level === 'internal_partner' 
                  ? 'Partenaires trouvés dans votre réseau'
                  : `Réseau ${results.searchBrand} trouvé`
                }
              </CardTitle>
              <p className="text-sm text-gray-600">
                {results.vehicle.brand} {results.vehicle.model} • {results.vehicle.category} • {results.breakdown.type}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Résultats */}
      <div className="space-y-4">
        {results.level === 'internal_partner' ? (
          // NIVEAU 1: Partenaires internes (vert)
          (results as any)?.recommendations?.map((partner: any, index: number) => (
            <InternalPartnerCard
              key={(partner as InternalPartner).id}
              partner={partner as InternalPartner}
              rank={index + 1}
              onCall={(phone) => handleCall(phone, false)}
              isCalling={callingPhone === (partner as InternalPartner).phone}
            />
          ))
        ) : (
          // NIVEAU 2: Réseau externe (jaune)
          <>
            {results.disclaimer && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                {results.disclaimer}
                {results.source === 'cache' && (
                  <span className="ml-2 text-xs text-yellow-600">(résultats mis en cache)</span>
                )}
              </div>
            )}
            
            {(results as any)?.recommendations?.map((garage: any, index: number) => (
              <ExternalGarageCard
                key={(garage as ExternalGarage).placeId}
                garage={garage as ExternalGarage}
                rank={index + 1}
                searchBrand={results.searchBrand || ''}
                onCall={(phone) => handleCall(phone, true)}
                onAddToPartners={handleAddToPartners}
                isCalling={callingPhone === (garage as ExternalGarage).phone}
              />
            ))}
          </>
        )}
      </div>

      {/* Actions finales */}
      <div className="flex flex-col sm:flex-row justify-between gap-3 pt-6 mt-6 border-t">
        <Button 
          variant="outline"
          onClick={() => router.push('/sos/localisation')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Modifier la recherche
        </Button>
        
        <Button 
          variant="outline"
          onClick={handleNewSearch}
        >
          Nouvelle recherche
        </Button>
      </div>

      {/* Info complémentaire */}
      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 mt-6">
        <p className="font-medium text-gray-900 mb-2">Informations importantes :</p>
        <ul className="space-y-1 list-disc list-inside">
          {results.level === 'internal_partner' ? (
            <>
              <li>Ces garages font partie de votre réseau de partenaires sous contrat</li>
              <li>Les tarifs sont négociés selon vos accords commerciaux</li>
            </>
          ) : (
            <>
              <li>Ces garages ont été trouvés via le réseau {results.searchBrand}</li>
              <li>Vérifiez toujours la disponibilité et le tarif avant de vous déplacer</li>
              <li>Vous pouvez ajouter un garage à vos partenaires pour les futures recherches</li>
            </>
          )}
          <li>En cas d'urgence grave (accident), appelez le 112</li>
          <li>Gardez votre calme et mettez-vous en sécurité</li>
        </ul>
      </div>
    </div>
  );
}

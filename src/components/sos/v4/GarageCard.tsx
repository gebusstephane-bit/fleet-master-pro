/**
 * GarageCard - Carte Type C: Garage (Bleu)
 * Affiche un garage partenaire ou une recherche externe
 * Aligné Design System Fleet-Master
 */

'use client';

import { Phone, MapPin, Wrench, ExternalLink, Building2, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface GarageCardProps {
  data: {
    id?: string;
    name: string;
    specialty?: string;
    phone?: string;
    city?: string;
    address?: string;
    maxDistance?: number;
    has24h?: boolean;
    searchQuery?: string;
  };
  type: 'garage_partner' | 'garage_external';
  message?: string;
}

export function GarageCard({ data, type, message }: GarageCardProps) {
  const handleCall = () => {
    if (data.phone) {
      window.location.href = `tel:${data.phone.replace(/\D/g, '')}`;
    }
  };

  const handleSearch = () => {
    const query = data.searchQuery || `${data.name}`;
    window.open(
      `https://www.google.com/maps/search/${encodeURIComponent(query)}`,
      '_blank'
    );
  };

  const getSpecialtyLabel = (spec?: string) => {
    const labels: Record<string, string> = {
      'pneu': 'Pneumatique',
      'mecanique': 'Mécanique',
      'frigo': 'Frigo',
      'carrosserie': 'Carrosserie',
      'general': 'Généraliste',
    };
    return labels[spec || ''] || 'Garage';
  };

  // Garage partenaire interne
  if (type === 'garage_partner') {
    return (
      <Card className="border-cyan-500/30 bg-[#0f172a]/60 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_20px_rgba(6,182,212,0.1)]">
        <CardHeader className="bg-cyan-500/10 border-b border-cyan-500/20 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/20 rounded-lg border border-cyan-500/30">
                <Building2 className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground">{data.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                    Votre partenaire
                  </Badge>
                  {data.specialty && (
                    <Badge variant="outline" className="text-xs border-cyan-500/30 text-cyan-400">
                      {getSpecialtyLabel(data.specialty)}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            {data.has24h && (
              <div className="p-1 bg-emerald-500/20 rounded-full border border-emerald-500/30" title="Service 24/24">
                <Clock className="w-5 h-5 text-emerald-400" />
              </div>
            )}
          </div>
          
          {message && (
            <p className="text-cyan-400 text-sm mt-3 bg-cyan-500/10 p-2 rounded border border-cyan-500/20">
              {message}
            </p>
          )}
        </CardHeader>

        <CardContent className="p-6 space-y-4">
          {/* Coordonnées */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-foreground">
              <MapPin className="w-5 h-5 text-cyan-400" />
              <span>{data.city}</span>
              {data.maxDistance && (
                <Badge variant="outline" className="text-xs border-cyan-500/30 text-cyan-400">
                  Rayon: {data.maxDistance} km
                </Badge>
              )}
            </div>
            {data.address && (
              <p className="text-sm text-muted-foreground ml-7">{data.address}</p>
            )}
          </div>

          {/* Téléphone */}
          {data.phone && (
            <div className="bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl p-5 text-white shadow-[0_0_20px_rgba(6,182,212,0.3)]">
              <div className="text-cyan-100 text-sm mb-1">Téléphone</div>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{data.phone}</div>
                <Button 
                  onClick={handleCall}
                  size="lg"
                  className="bg-white text-cyan-600 hover:bg-cyan-50"
                >
                  <Phone className="w-5 h-5 mr-2" />
                  Appeler
                </Button>
              </div>
            </div>
          )}

          {/* Conseils */}
          <div className="bg-[#0f172a]/40 rounded-lg p-4 text-sm text-muted-foreground border border-cyan-500/20">
            <p className="font-medium text-foreground mb-2">Avant de vous déplacer :</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Appelez pour vérifier la disponibilité</li>
              <li>Demandez un devis estimatif</li>
              <li>Vérifiez que le garage prend votre type de véhicule</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Garage externe (fallback Google Maps)
  return (
    <Card className="border-slate-500/30 bg-[#0f172a]/60 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_20px_rgba(100,116,139,0.1)]">
      <CardHeader className="bg-slate-500/10 border-b border-slate-500/20 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-500/20 rounded-lg border border-slate-500/30">
              <Wrench className="w-6 h-6 text-slate-400" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-foreground">{data.name}</h3>
              <Badge variant="outline" className="border-slate-500/30 text-slate-400">
                Recherche externe
              </Badge>
            </div>
          </div>
        </div>
        
        {message && (
          <p className="text-slate-400 text-sm mt-3 bg-amber-500/10 p-2 rounded border border-amber-500/20">
            {message}
          </p>
        )}
      </CardHeader>

      <CardContent className="p-6 space-y-4">
        {/* Info */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">💡</div>
            <div className="text-sm text-amber-400">
              <p className="font-semibold">Aucun garage partenaire trouvé</p>
              <p className="mt-1">
                Nous vous suggérons de rechercher un garage sur Google Maps. 
                Vérifiez bien l'agrément et la disponibilité avant de vous déplacer.
              </p>
            </div>
          </div>
        </div>

        {/* Bouton recherche */}
        <Button 
          onClick={handleSearch}
          size="lg"
          className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:shadow-[0_0_30px_rgba(6,182,212,0.5)]"
        >
          <ExternalLink className="w-5 h-5 mr-2" />
          Rechercher sur Google Maps
        </Button>

        {/* Conseils de sécurité */}
        <div className="bg-[#0f172a]/40 rounded-lg p-4 text-sm text-muted-foreground border border-cyan-500/20">
          <p className="font-medium text-foreground mb-2">⚠️ Points de vigilance :</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>Vérifiez l'agrément du garage</li>
            <li>Demandez une estimation avant travaux</li>
            <li>Demandez une facture détaillée</li>
            <li>Vérifiez les délais de réparation</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

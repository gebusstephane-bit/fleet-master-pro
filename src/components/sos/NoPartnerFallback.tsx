/**
 * NoPartnerFallback - Affiché quand aucun garage partenaire n'est trouvé
 * Version améliorée avec warning, tips et lien Google Maps
 */

'use client';

import { MapPin, Search, AlertTriangle, ExternalLink, Phone } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface NoPartnerFallbackProps {
  message: string;
  searchSuggestion?: string;
  googleSearchUrl?: string;
  warning?: string;
  tips?: string[];
}

export function NoPartnerFallback({ 
  message, 
  searchSuggestion, 
  googleSearchUrl, 
  warning,
  tips 
}: NoPartnerFallbackProps) {
  const defaultUrl = searchSuggestion 
    ? `https://www.google.com/maps/search/${encodeURIComponent(searchSuggestion)}`
    : null;

  const searchUrl = googleSearchUrl || defaultUrl;

  return (
    <Card className="border-amber-400 bg-amber-50/50">
      <CardContent className="p-6 space-y-4">
        {/* Titre et warning */}
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-amber-900">{message}</h3>
            {warning && (
              <p className="text-amber-800 text-sm mt-2 font-medium">
                {warning}
              </p>
            )}
          </div>
        </div>

        {/* Recherche suggérée */}
        {searchSuggestion && (
          <div className="bg-white rounded-lg p-4 border border-amber-200">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <Search className="w-4 h-4" />
              <span>Recherche suggérée :</span>
            </div>
            <p className="font-mono text-sm text-gray-900">{searchSuggestion}</p>
          </div>
        )}

        {/* Bouton Google Maps */}
        {searchUrl && (
          <a
            href={searchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <Button className="w-full bg-amber-600 hover:bg-amber-700">
              <MapPin className="w-4 h-4 mr-2" />
              Ouvrir Google Maps
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </a>
        )}

        {/* Numéro d'urgence si vraiment rien */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Phone className="w-5 h-5 text-red-600" />
            <span className="font-semibold text-red-800">En cas de danger</span>
          </div>
          <p className="text-red-700 text-sm">
            Si vous êtes en danger ou sur autoroute, appelez le{' '}
            <a href="tel:112" className="font-bold text-red-800 underline">
              112
            </a>{' '}
            (numéro d'urgence européen)
          </p>
        </div>

        {/* Tips */}
        {tips && tips.length > 0 && (
          <div className="bg-white rounded-lg p-4 border border-amber-200">
            <p className="font-medium text-amber-900 mb-2">Conseils :</p>
            <ul className="text-sm text-amber-800 space-y-2">
              {tips.map((tip, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

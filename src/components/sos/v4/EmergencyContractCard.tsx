/**
 * EmergencyContractCard - Carte Type A: Contrat 24/24 (Vert)
 * Affiche un contrat d'urgence avec numéro prioritaire
 * Aligné Design System Fleet-Master
 */

'use client';

import { Phone, Clock, FileText, MapPin, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface EmergencyContractCardProps {
  data: {
    id: string;
    name: string;
    serviceType: string;
    phone: string;
    contractRef?: string;
    instructions?: string;
    forDistance?: string;
    forImmobilized?: boolean | null;
  };
  message?: string;
}

export function EmergencyContractCard({ data, message }: EmergencyContractCardProps) {
  const handleCall = () => {
    window.location.href = `tel:${data.phone.replace(/\D/g, '')}`;
  };

  const getServiceLabel = (type: string) => {
    const labels: Record<string, string> = {
      'pneu_24h': 'Dépannage pneu 24/24',
      'frigo_assistance': 'Assistance frigo',
      'mecanique_24h': 'Mécanique 24/24',
      'remorquage': 'Remorquage',
    };
    return labels[type] || 'Service d\'urgence';
  };

  return (
    <Card className="border-emerald-500/30 bg-[#0f172a]/60 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_20px_rgba(16,185,129,0.1)]">
      {/* Header emerald */}
      <CardHeader className="bg-emerald-500/10 border-b border-emerald-500/20 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg border border-emerald-500/30">
              <Clock className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-foreground">{data.name}</h3>
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 mt-1">
                {getServiceLabel(data.serviceType)}
              </Badge>
            </div>
          </div>
          <CheckCircle className="w-6 h-6 text-emerald-400" />
        </div>
        
        {message && (
          <p className="text-emerald-400 text-sm mt-3 bg-emerald-500/10 p-2 rounded border border-emerald-500/20">
            {message}
          </p>
        )}
      </CardHeader>

      <CardContent className="p-6 space-y-4">
        {/* Numéro principal */}
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl p-5 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]">
          <div className="text-emerald-100 text-sm mb-1">Numéro d'urgence</div>
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold">{data.phone}</div>
            <Button 
              onClick={handleCall}
              size="lg"
              className="bg-white text-emerald-600 hover:bg-emerald-50"
            >
              <Phone className="w-5 h-5 mr-2" />
              Appeler
            </Button>
          </div>
        </div>

        {/* Référence contrat */}
        {data.contractRef && (
          <div className="flex items-center gap-2 text-muted-foreground bg-[#0f172a]/40 p-3 rounded-lg border border-cyan-500/20">
            <FileText className="w-5 h-5 text-cyan-400" />
            <span className="text-sm">
              Référence contrat : <strong className="text-foreground">{data.contractRef}</strong>
            </span>
          </div>
        )}

        {/* Instructions */}
        {data.instructions && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
            <h4 className="font-semibold text-amber-400 mb-2 flex items-center gap-2">
              <span>📝</span> Instructions
            </h4>
            <div className="text-sm text-amber-400/90 whitespace-pre-line">
              {data.instructions}
            </div>
          </div>
        )}

        {/* Badges conditions */}
        <div className="flex flex-wrap gap-2">
          {data.forDistance && data.forDistance !== 'both' && (
            <Badge variant="outline" className="text-xs border-cyan-500/30 text-cyan-400">
              <MapPin className="w-3 h-3 mr-1" />
              {data.forDistance === 'close' ? 'Moins de 50 km' : 'Plus de 50 km'}
            </Badge>
          )}
          {data.forImmobilized !== null && (
            <Badge variant="outline" className="text-xs border-cyan-500/30 text-cyan-400">
              {data.forImmobilized ? 'Immobilisé uniquement' : 'Roulant uniquement'}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

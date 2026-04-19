'use client';

/**
 * InsuranceCard - Carte Type B: Assurance (Orange)
 * Affiche les informations d'assurance pour remorquage
 * Aligné Design System Fleet-Master
 */

import { Phone, Shield, AlertTriangle, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface InsuranceCardProps {
  data: {
    id: string;
    name: string;
    serviceType: string;
    phone: string;
    contractRef?: string;
    instructions?: string;
  };
  message?: string;
}

export function InsuranceCard({ data, message }: InsuranceCardProps) {
  const handleCall = () => {
    window.location.href = `tel:${data.phone.replace(/\D/g, '')}`;
  };

  return (
    <Card className="border-orange-500/30 bg-[#0f172a]/60 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_20px_rgba(249,115,22,0.1)]">
      {/* Header orange */}
      <CardHeader className="bg-orange-500/10 border-b border-orange-500/20 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/20 rounded-lg border border-orange-500/30">
              <Shield className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-foreground">{data.name}</h3>
              <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 mt-1">
                Assurance sinistres
              </Badge>
            </div>
          </div>
          <AlertTriangle className="w-6 h-6 text-orange-400" />
        </div>
        
        {message && (
          <p className="text-orange-400 text-sm mt-3 bg-orange-500/10 p-2 rounded border border-orange-500/20">
            {message}
          </p>
        )}
      </CardHeader>

      <CardContent className="p-6 space-y-4">
        {/* Avertissement important */}
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-400">
              <p className="font-semibold">Remorquage nécessaire</p>
              <p className="mt-1">
                Votre véhicule est immobilisé ou hors périmètre. Contactez votre assurance pour organiser le remorquage.
              </p>
            </div>
          </div>
        </div>

        {/* Numéro principal */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-5 text-white shadow-[0_0_20px_rgba(249,115,22,0.3)]">
          <div className="text-orange-100 text-sm mb-1">Numéro sinistres</div>
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold">{data.phone}</div>
            <Button 
              onClick={handleCall}
              size="lg"
              className="bg-white text-orange-600 hover:bg-orange-50"
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
              Numéro de contrat à indiquer : <strong className="text-foreground">{data.contractRef}</strong>
            </span>
          </div>
        )}

        {/* Instructions */}
        {data.instructions && (
          <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
            <h4 className="font-semibold text-cyan-400 mb-2">Conseils</h4>
            <div className="text-sm text-cyan-400/90 whitespace-pre-line">
              {data.instructions}
            </div>
          </div>
        )}

        {/* Info complémentaire */}
        <div className="text-xs text-muted-foreground">
          <p>💡 Le remorquage peut être pris en charge selon les conditions de votre contrat d'assurance.</p>
        </div>
      </CardContent>
    </Card>
  );
}

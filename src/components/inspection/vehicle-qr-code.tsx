'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Printer, QrCode, Link2, ExternalLink } from 'lucide-react';
import { generateInspectionToken } from '@/actions/inspections';

interface VehicleQRCodeProps {
  vehicleId: string;
  registration: string;
}

export function VehicleQRCode({ vehicleId, registration }: VehicleQRCodeProps) {
  const [qrData, setQrData] = useState<{ url: string; token: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const generateQR = async () => {
    setLoading(true);
    try {
      const result = await generateInspectionToken({ vehicleId });
      if (result?.data?.success) {
        setQrData({
          url: result.data.qrCodeUrl,
          token: result.data.token,
        });
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <QrCode className="h-5 w-5 text-blue-500" />
          Contrôle d&apos;état
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!qrData ? (
          <div className="text-center py-6">
            <p className="text-sm text-slate-500 mb-4">
              Générez un QR Code pour permettre le contrôle rapide de ce véhicule
            </p>
            <Button onClick={generateQR} disabled={loading} className="w-full">
              {loading ? 'Génération...' : 'Générer QR Code'}
            </Button>
          </div>
        ) : (
          <>
            {/* QR Code */}
            <div className="flex justify-center p-4 bg-white rounded-lg border">
              {/* Ici on intègrera un vrai composant QR Code */}
              <div className="w-48 h-48 bg-slate-100 flex items-center justify-center text-slate-400">
                <QrCode className="w-24 h-24" />
              </div>
            </div>

            <div className="text-center space-y-2">
              <p className="text-sm text-slate-500">Scannez pour contrôler ce véhicule</p>
              <p className="text-xs text-slate-400 break-all font-mono">{qrData.url}</p>
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1" 
                onClick={() => window.print()}
              >
                <Printer className="w-4 h-4 mr-2" />
                Imprimer
              </Button>
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => navigator.clipboard.writeText(qrData.url)}
              >
                <Link2 className="w-4 h-4 mr-2" />
                Copier lien
              </Button>
            </div>
          </>
        )}

        {/* Accès manuel */}
        <div className="pt-4 border-t">
          <p className="text-sm font-medium mb-2">Accès manuel (sans QR) :</p>
          <div className="flex gap-2">
            <Input value={registration} readOnly className="font-mono text-sm" />
            <Button asChild size="sm">
              <Link href={`/inspection/manual?vehicle=${registration}`}>
                <ExternalLink className="w-4 h-4 mr-1" />
                Ouvrir
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

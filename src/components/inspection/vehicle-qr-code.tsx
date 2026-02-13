'use client';

import { useState } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Printer, QrCode, Link2, ExternalLink, Download } from 'lucide-react';

interface VehicleQRCodeProps {
  vehicleId: string;
  registration: string;
}

export function VehicleQRCode({ vehicleId, registration }: VehicleQRCodeProps) {
  const [showQR, setShowQR] = useState(false);

  // URL publique complete pour le QR code
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  const qrUrl = `${baseUrl}/inspection/${vehicleId}`;

  const handleDownload = () => {
    const svg = document.getElementById(`qr-inspection-${vehicleId}`);
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      
      const downloadLink = document.createElement('a');
      downloadLink.download = `qr-code-${registration}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
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
        {!showQR ? (
          <div className="text-center py-6">
            <p className="text-sm text-slate-500 mb-4">
              Générez un QR Code pour permettre le contrôle rapide de ce véhicule
            </p>
            <Button onClick={() => setShowQR(true)} className="w-full">
              Générer QR Code
            </Button>
          </div>
        ) : (
          <>
            {/* QR Code */}
            <div className="flex justify-center p-4 bg-white rounded-lg border">
              <QRCodeSVG
                id={`qr-inspection-${vehicleId}`}
                value={qrUrl}
                size={200}
                level="M"
                includeMargin={true}
                imageSettings={{
                  src: '/logo.png',
                  x: undefined,
                  y: undefined,
                  height: 24,
                  width: 24,
                  excavate: true,
                }}
              />
            </div>

            <div className="text-center space-y-2">
              <p className="text-sm text-slate-500">Scannez pour contrôler ce véhicule</p>
              <p className="text-xs text-slate-400 break-all font-mono">{qrUrl}</p>
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
                onClick={handleDownload}
              >
                <Download className="w-4 h-4 mr-2" />
                PNG
              </Button>
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => navigator.clipboard.writeText(qrUrl)}
              >
                <Link2 className="w-4 h-4 mr-2" />
                Copier
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

'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Printer, Download, QrCode, Share2 } from 'lucide-react';

interface VehicleQRCodeProps {
  vehicleId: string;
  registrationNumber: string;
  brand?: string;
  model?: string;
  size?: number;
}

export function VehicleQRCode({ 
  vehicleId, 
  registrationNumber, 
  brand, 
  model,
  size = 200 
}: VehicleQRCodeProps) {
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  
  // URL publique complete pour le QR code (doit etre une URL web valide)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  const vehicleUrl = `${baseUrl}/inspection/${vehicleId}`;
  
  // Les donnees du QR code = URL publique directement (pas de schema personnalise)
  const qrData = vehicleUrl;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const vehicleInfo = `${brand || ''} ${model || ''}`.trim();
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${registrationNumber}</title>
          <style>
            @page { size: 10cm 10cm; margin: 0; }
            body { 
              display: flex; 
              flex-direction: column;
              align-items: center; 
              justify-content: center; 
              height: 100vh; 
              margin: 0;
              font-family: Arial, sans-serif;
            }
            .qr-container {
              text-align: center;
              padding: 20px;
            }
            .vehicle-info {
              margin-top: 15px;
              font-size: 14px;
              font-weight: bold;
            }
            .plate {
              font-size: 18px;
              color: #333;
              margin-top: 5px;
              padding: 5px 10px;
              border: 2px solid #333;
              border-radius: 4px;
              display: inline-block;
            }
            .instruction {
              margin-top: 15px;
              font-size: 11px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <div id="qrcode"></div>
            ${vehicleInfo ? `<div class="vehicle-info">${vehicleInfo}</div>` : ''}
            <div class="plate">${registrationNumber}</div>
            <div class="instruction">Scannez pour faire un controle</div>
          </div>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
          <script>
            new QRCode(document.getElementById('qrcode'), {
              text: '${qrData}',
              width: 200,
              height: 200,
              colorDark: '#000000',
              colorLight: '#ffffff',
              correctLevel: QRCode.CorrectLevel.M
            });
            setTimeout(() => window.print(), 500);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownload = () => {
    const svg = document.getElementById(`qr-${vehicleId}`);
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
      downloadLink.download = `qr-code-${registrationNumber}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Vehicule ${registrationNumber}`,
          text: `Scannez ce QR code pour faire un controle du vehicule ${registrationNumber}`,
          url: vehicleUrl,
        });
      } catch (err) {
        console.log('Partage annule');
      }
    } else {
      // Copier dans le presse-papier
      navigator.clipboard.writeText(vehicleUrl);
      alert('URL copiee dans le presse-papier!');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          QR Code Inspection
        </CardTitle>
        <CardDescription>
          Code unique pour ce vehicule
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* QR Code */}
        <div className="flex justify-center p-4 bg-white rounded-lg border">
          <QRCodeSVG
            id={`qr-${vehicleId}`}
            value={qrData}
            size={size}
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

        {/* Info du vehicule */}
        <div className="text-center space-y-1">
          <p className="font-semibold text-white">{brand} {model}</p>
          <p className="text-sm text-gray-400">{registrationNumber}</p>
          <p className="text-xs text-gray-500 font-mono break-all">
            {qrData}
          </p>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" />
            Imprimer
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-1" />
            PNG
          </Button>
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-1" />
            Partager
          </Button>
        </div>

        {/* Instructions */}
        <div className="text-xs bg-zinc-800 p-3 rounded border border-zinc-700">
          <p className="font-medium mb-1 text-gray-200">Comment utiliser:</p>
          <ol className="list-decimal list-inside space-y-1 text-gray-400">
            <li>Imprimez ce QR code</li>
            <li>Collez-le sur le pare-brise du vehicule</li>
            <li>Le conducteur le scanne pour faire un controle</li>
          </ol>
        </div>

        {/* Apercu du lien */}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full">
              Voir le lien de scan
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Lien de scan</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Ce lien redirige vers le formulaire d&apos;inspection:
              </p>
              <code className="block p-3 bg-slate-100 rounded text-sm break-all text-gray-900">
                {vehicleUrl}
              </code>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigator.clipboard.writeText(vehicleUrl)}
              >
                Copier le lien
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

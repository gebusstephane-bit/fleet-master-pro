'use client';

import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Printer, Download, QrCode, Share2, RefreshCw, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

interface VehicleQRCodeProps {
  vehicleId: string;
  registrationNumber: string;
  brand?: string;
  model?: string;
  qrCodeData?: string | null;
  size?: number;
}

export function VehicleQRCode({ 
  vehicleId, 
  registrationNumber, 
  brand, 
  model,
  qrCodeData: initialQrCodeData,
  size = 200 
}: VehicleQRCodeProps) {
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(initialQrCodeData || null);
  const [loading, setLoading] = useState(!initialQrCodeData);
  const [error, setError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  
  // Récupérer le qr_code_data si non fourni
  useEffect(() => {
    if (!qrCodeData && vehicleId) {
      fetchQrCodeData();
    }
  }, [vehicleId]);
  
  const fetchQrCodeData = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from('vehicles')
        .select('qr_code_data')
        .eq('id', vehicleId)
        .single();
      
      if (error) throw error;
      
      if (data?.qr_code_data) {
        setQrCodeData(data.qr_code_data);
      } else {
        // Si pas de token, en générer un nouveau
        await regenerateToken();
      }
    } catch (err: any) {
      setError('Erreur lors du chargement du QR Code');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  const regenerateToken = async () => {
    try {
      setRegenerating(true);
      const supabase = createClient();
      
      // Générer un nouveau token UUID
      const { data, error } = await supabase
        .from('vehicles')
        .update({ qr_code_data: crypto.randomUUID() })
        .eq('id', vehicleId)
        .select('qr_code_data')
        .single();
      
      if (error) throw error;
      
      setQrCodeData(data.qr_code_data);
      setError(null);
    } catch (err: any) {
      setError('Erreur lors de la régénération du token');
      console.error(err);
    } finally {
      setRegenerating(false);
    }
  };
  
  // URL complète avec token pour le QR code (format TEXT)
  const vehicleUrl = qrCodeData 
    ? `${baseUrl}/scan/${vehicleId}?token=${encodeURIComponent(qrCodeData)}`
    : null;
  
  const qrData = vehicleUrl || '';

  const handlePrint = () => {
    if (!vehicleUrl) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const vehicleInfo = `${brand || ''} ${model || ''}`.trim();
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${registrationNumber}</title>
          <style>
            @page { size: 10cm 12cm; margin: 0; }
            body { 
              display: flex; 
              flex-direction: column;
              align-items: center; 
              justify-content: center; 
              height: 100vh; 
              margin: 0;
              font-family: Arial, sans-serif;
              background: #fff;
            }
            .qr-container {
              text-align: center;
              padding: 20px;
              border: 2px dashed #ccc;
              border-radius: 10px;
            }
            .vehicle-info {
              margin-top: 15px;
              font-size: 16px;
              font-weight: bold;
              color: #333;
            }
            .plate {
              font-size: 20px;
              color: #333;
              margin-top: 5px;
              padding: 8px 15px;
              border: 2px solid #333;
              border-radius: 4px;
              display: inline-block;
              font-weight: bold;
            }
            .instructions {
              margin-top: 20px;
              font-size: 12px;
              color: #666;
              text-align: left;
              padding: 0 10px;
            }
            .instruction-item {
              margin: 5px 0;
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <div id="qrcode"></div>
            ${vehicleInfo ? `<div class="vehicle-info">${vehicleInfo}</div>` : ''}
            <div class="plate">${registrationNumber}</div>
            <div class="instructions">
              <p class="instruction-item">📱 Scannez pour :</p>
              <p class="instruction-item">• Faire un contrôle</p>
              <p class="instruction-item">• Saisir un plein</p>
              <p class="instruction-item">• Voir le carnet</p>
            </div>
          </div>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
          <script>
            new QRCode(document.getElementById('qrcode'), {
              text: '${qrData}',
              width: 180,
              height: 180,
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
    if (!vehicleUrl) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Véhicule ${registrationNumber}`,
          text: `Scannez ce QR code pour accéder au véhicule ${registrationNumber}`,
          url: vehicleUrl,
        });
      } catch (err) {
        logger.debug('Partage annulé');
      }
    } else {
      // Copier dans le presse-papier
      navigator.clipboard.writeText(vehicleUrl);
      alert('URL copiée dans le presse-papier!');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-slate-600 border-t-transparent rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          QR Code Véhicule
        </CardTitle>
        <CardDescription>
          Triple accès : Inspection, Carburant, Carnet
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive" className="text-sm">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {/* QR Code */}
        {vehicleUrl ? (
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
        ) : (
          <div className="flex justify-center p-4 bg-slate-800 rounded-lg border border-slate-700">
            <p className="text-slate-500">QR Code non disponible</p>
          </div>
        )}

        {/* Info du vehicule */}
        <div className="text-center space-y-1">
          <p className="font-semibold text-white">{brand} {model}</p>
          <p className="text-sm text-gray-400">{registrationNumber}</p>
          {qrCodeData && (
            <p className="text-xs text-gray-600 font-mono">
              Token: {qrCodeData.slice(0, 8)}...
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-3 gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handlePrint}
            disabled={!vehicleUrl}
          >
            <Printer className="h-4 w-4 mr-1" />
            Imprimer
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDownload}
            disabled={!vehicleUrl}
          >
            <Download className="h-4 w-4 mr-1" />
            PNG
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleShare}
            disabled={!vehicleUrl}
          >
            <Share2 className="h-4 w-4 mr-1" />
            Partager
          </Button>
        </div>
        
        {/* Régénérer token */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-slate-500 hover:text-slate-300"
          onClick={regenerateToken}
          disabled={regenerating}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${regenerating ? 'animate-spin' : ''}`} />
          Régénérer le token
        </Button>

        {/* Instructions */}
        <div className="text-xs bg-zinc-800 p-3 rounded border border-zinc-700">
          <p className="font-medium mb-2 text-gray-200">Triple accès via QR Code :</p>
          <ol className="list-decimal list-inside space-y-1 text-gray-400">
            <li><strong className="text-blue-400">Inspection</strong> - Contrôle pré-départ</li>
            <li><strong className="text-green-400">Carburant</strong> - Saisie de plein</li>
            <li><strong className="text-purple-400">Carnet</strong> - Historique (gestionnaires)</li>
          </ol>
          <p className="mt-2 text-gray-500">
            🔒 Accès sécurisé • Rate limité • Traçable
          </p>
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
              <DialogTitle>Lien de scan sécurisé</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Ce lien donne accès aux trois fonctionnalités du véhicule:
              </p>
              <code className="block p-3 bg-slate-100 rounded text-sm break-all text-gray-900">
                {vehicleUrl || 'Non disponible'}
              </code>
              <div className="text-xs text-slate-500 space-y-1">
                <p>• Les conducteurs peuvent faire des inspections et saisir des pleins</p>
                <p>• Le carnet digital nécessite une connexion gestionnaire</p>
                <p>• Chaque accès est enregistré et tracé</p>
              </div>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => vehicleUrl && navigator.clipboard.writeText(vehicleUrl)}
                disabled={!vehicleUrl}
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

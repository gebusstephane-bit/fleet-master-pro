'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Printer, QrCode, Link2, ExternalLink, Download, RefreshCw, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface VehicleQRCodeProps {
  vehicleId: string;
  registration: string;
}

export function VehicleQRCode({ vehicleId, registration }: VehicleQRCodeProps) {
  const [showQR, setShowQR] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');

  // Récupérer le qr_code_data quand on affiche le QR
  useEffect(() => {
    if (showQR && !qrCodeData) {
      fetchQrCodeData();
    }
  }, [showQR]);

  const fetchQrCodeData = async () => {
    try {
      setLoading(true);
      setError(null);
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
      setLoading(false);
    }
  };

  // URL avec token pour le QR code (format TEXT)
  const qrUrl = qrCodeData
    ? `${baseUrl}/scan/${vehicleId}?token=${encodeURIComponent(qrCodeData)}`
    : null;

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
          Contrôle QR Code
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
            {error && (
              <Alert variant="destructive" className="text-sm">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {loading ? (
              <div className="flex items-center justify-center h-48">
                <div className="w-8 h-8 border-4 border-slate-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {/* QR Code */}
                {qrUrl ? (
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
                ) : (
                  <div className="flex justify-center p-4 bg-slate-800 rounded-lg border border-slate-700">
                    <p className="text-slate-500">QR Code non disponible</p>
                  </div>
                )}

                <div className="text-center space-y-2">
                  <p className="text-sm text-slate-500">Scannez pour accéder au véhicule</p>
                  <p className="text-xs text-slate-400">
                    Triple accès : Inspection, Carburant, Carnet
                  </p>
                  {qrCodeData && (
                    <p className="text-xs text-slate-600 font-mono">
                      Token: {qrCodeData.slice(0, 8)}...
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => window.print()}
                    disabled={!qrUrl}
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Imprimer
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleDownload}
                    disabled={!qrUrl}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    PNG
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => qrUrl && navigator.clipboard.writeText(qrUrl)}
                    disabled={!qrUrl}
                  >
                    <Link2 className="w-4 h-4 mr-2" />
                    Copier
                  </Button>
                </div>

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
              </>
            )}
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

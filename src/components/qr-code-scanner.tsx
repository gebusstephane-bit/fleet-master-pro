'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Camera, CameraOff, RefreshCw } from 'lucide-react';

interface QRCodeScannerProps {
  onScan: (decodedText: string) => void;
  onError?: (error: string) => void;
}

export function QRCodeScanner({ onScan, onError }: QRCodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [error, setError] = useState<string>('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Vérifier les permissions et lister les caméras
  useEffect(() => {
    checkPermissions();
    return () => {
      stopScanning();
    };
  }, []);

  const checkPermissions = async () => {
    try {
      // Demander la permission d'accès à la caméra
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      setHasPermission(true);
      
      // Lister les caméras disponibles
      await listCameras();
    } catch (err: any) {
      setHasPermission(false);
      setError('Accès à la caméra refusé. Veuillez autoriser l\'accès dans les paramètres de votre navigateur.');
      if (onError) onError(err.message);
    }
  };

  const listCameras = async () => {
    try {
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        setCameras(devices);
        // Sélectionner la caméra arrière par défaut si disponible
        const backCamera = devices.find(cam => 
          cam.label.toLowerCase().includes('back') || 
          cam.label.toLowerCase().includes('arrière') ||
          cam.label.toLowerCase().includes('environment')
        );
        setSelectedCamera(backCamera?.id || devices[0].id);
      } else {
        setError('Aucune caméra trouvée sur cet appareil.');
      }
    } catch (err: any) {
      setError('Impossible de lister les caméras: ' + err.message);
    }
  };

  const startScanning = async () => {
    if (!selectedCamera || !containerRef.current) return;

    try {
      setError('');
      setIsScanning(true);

      scannerRef.current = new Html5Qrcode('qr-reader');
      
      await scannerRef.current.start(
        selectedCamera,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        },
        (decodedText) => {
          // QR Code décodé avec succès
          onScan(decodedText);
          stopScanning();
        },
        (errorMessage) => {
          // Erreur de scan (ignorée - c'est normal quand aucun QR n'est détecté)
          console.log('QR Scan error:', errorMessage);
        }
      );
    } catch (err: any) {
      setError('Erreur lors du démarrage du scanner: ' + err.message);
      setIsScanning(false);
      if (onError) onError(err.message);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        // Ignorer les erreurs d'arrêt
      }
    }
    scannerRef.current = null;
    setIsScanning(false);
  };

  const toggleScanning = () => {
    if (isScanning) {
      stopScanning();
    } else {
      startScanning();
    }
  };

  // Si pas de permission
  if (hasPermission === false) {
    return (
      <Card className="p-6 text-center">
        <CameraOff className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="font-semibold mb-2">Accès caméra requis</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Veuillez autoriser l&apos;accès à la caméra pour scanner les QR codes.
        </p>
        <Button onClick={checkPermissions} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Réessayer
        </Button>
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sélecteur de caméra */}
      {cameras.length > 1 && (
        <div className="flex gap-2">
          <select
            value={selectedCamera}
            onChange={(e) => {
              setSelectedCamera(e.target.value);
              if (isScanning) {
                stopScanning();
                setTimeout(startScanning, 100);
              }
            }}
            className="flex-1 p-2 border rounded-md text-sm"
            disabled={isScanning}
          >
            {cameras.map((camera) => (
              <option key={camera.id} value={camera.id}>
                {camera.label || `Caméra ${camera.id.slice(0, 8)}...`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Zone de scan */}
      <div className="relative">
        <div 
          ref={containerRef}
          id="qr-reader" 
          className={`w-full aspect-square bg-black rounded-lg overflow-hidden ${
            isScanning ? 'block' : 'hidden'
          }`}
        />
        
        {!isScanning && (
          <div className="aspect-square bg-slate-100 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-slate-300">
            <Camera className="h-16 w-16 text-slate-400 mb-4" />
            <p className="text-slate-500 text-center px-4">
              Cliquez sur le bouton ci-dessous pour activer le scanner
            </p>
          </div>
        )}

        {/* Overlay de scan actif */}
        {isScanning && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Coin supérieur gauche */}
            <div className="absolute top-4 left-4 w-8 h-8 border-l-4 border-t-4 border-blue-500 rounded-tl-lg" />
            {/* Coin supérieur droit */}
            <div className="absolute top-4 right-4 w-8 h-8 border-r-4 border-t-4 border-blue-500 rounded-tr-lg" />
            {/* Coin inférieur gauche */}
            <div className="absolute bottom-4 left-4 w-8 h-8 border-l-4 border-b-4 border-blue-500 rounded-bl-lg" />
            {/* Coin inférieur droit */}
            <div className="absolute bottom-4 right-4 w-8 h-8 border-r-4 border-b-4 border-blue-500 rounded-br-lg" />
            
            {/* Ligne de scan animée */}
            <div className="absolute left-0 right-0 h-0.5 bg-blue-500/50 animate-scan-line" 
                 style={{ top: '50%', animation: 'scan 2s linear infinite' }} />
            
            {/* Texte d'instruction */}
            <div className="absolute bottom-8 left-0 right-0 text-center">
              <p className="text-white text-sm bg-black/50 inline-block px-3 py-1 rounded">
                Placez le QR code dans le cadre
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bouton de contrôle */}
      <Button 
        onClick={toggleScanning} 
        className="w-full"
        variant={isScanning ? 'destructive' : 'default'}
        disabled={hasPermission === null || cameras.length === 0}
      >
        {isScanning ? (
          <>
            <CameraOff className="h-4 w-4 mr-2" />
            Arrêter le scan
          </>
        ) : hasPermission === null ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Chargement...
          </>
        ) : (
          <>
            <Camera className="h-4 w-4 mr-2" />
            Activer le scanner
          </>
        )}
      </Button>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <style jsx>{`
        @keyframes scan {
          0% { top: 10%; }
          50% { top: 90%; }
          100% { top: 10%; }
        }
      `}</style>
    </div>
  );
}

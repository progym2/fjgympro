import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { Camera, XCircle, AlertCircle, RotateCcw, Flashlight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface QRCameraReaderProps {
  onScan: (result: string, parsedData?: any) => void;
  onClose: () => void;
  title?: string;
}

const QRCameraReader: React.FC<QRCameraReaderProps> = ({ 
  onScan, 
  onClose,
  title = "SCANNER DE CÂMERA"
}) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === Html5QrcodeScannerState.SCANNING) {
          await scannerRef.current.stop();
        }
      } catch (e) {
        console.error('Error stopping scanner:', e);
      }
    }
    setIsScanning(false);
  }, []);

  const startScanner = useCallback(async (cameraId: string) => {
    if (!scannerRef.current || !cameraId) return;

    await stopScanner();

    try {
      setIsScanning(true);
      await scannerRef.current.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        (decodedText) => {
          // Parse QR code data
          let parsedData = null;
          let searchCode = decodedText;

          try {
            parsedData = JSON.parse(decodedText);
            // Extract the most useful identifier
            if (parsedData.profile_id) {
              searchCode = parsedData.profile_id;
            } else if (parsedData.username) {
              searchCode = parsedData.username;
            } else if (parsedData.id) {
              searchCode = parsedData.id;
            }
          } catch {
            // Not JSON, use raw text
            searchCode = decodedText;
          }

          // Play success feedback
          if (navigator.vibrate) {
            navigator.vibrate(100);
          }

          toast.success('QR Code lido com sucesso!');
          stopScanner();
          onScan(searchCode, parsedData);
        },
        () => {
          // Scan failure - ignore, just means no QR in frame
        }
      );
    } catch (err: any) {
      console.error('Error starting scanner:', err);
      setError(err?.message || 'Erro ao iniciar câmera');
      setIsScanning(false);
    }
  }, [onScan, stopScanner]);

  useEffect(() => {
    const initScanner = async () => {
      try {
        // Get available cameras
        const devices = await Html5Qrcode.getCameras();
        
        if (!devices || devices.length === 0) {
          setError('Nenhuma câmera encontrada. Verifique as permissões do navegador.');
          return;
        }

        setCameras(devices);
        
        // Prefer back camera for mobile
        const backCamera = devices.find(d => 
          d.label.toLowerCase().includes('back') || 
          d.label.toLowerCase().includes('traseira') ||
          d.label.toLowerCase().includes('environment')
        );
        
        const cameraToUse = backCamera?.id || devices[0].id;
        setSelectedCamera(cameraToUse);

        // Initialize scanner
        scannerRef.current = new Html5Qrcode('qr-camera-reader');
        
        // Start scanning
        await startScanner(cameraToUse);
      } catch (err: any) {
        console.error('Error initializing scanner:', err);
        if (err?.name === 'NotAllowedError') {
          setError('Permissão de câmera negada. Habilite o acesso à câmera nas configurações do navegador.');
        } else {
          setError(err?.message || 'Não foi possível iniciar a câmera.');
        }
      }
    };

    initScanner();

    return () => {
      stopScanner();
      if (scannerRef.current) {
        try {
          scannerRef.current.clear();
        } catch (e) {
          console.error('Error clearing scanner:', e);
        }
      }
    };
  }, []);

  const handleCameraChange = async (cameraId: string) => {
    setSelectedCamera(cameraId);
    await startScanner(cameraId);
  };

  const handleRetry = async () => {
    setError('');
    if (selectedCamera) {
      await startScanner(selectedCamera);
    }
  };

  return (
    <div className="relative bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bebas text-lg tracking-wider flex items-center gap-2">
          <Camera className="w-5 h-5 text-primary" />
          {title}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            stopScanner();
            onClose();
          }}
          className="text-muted-foreground hover:text-destructive"
        >
          <XCircle className="w-5 h-5" />
        </Button>
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <AlertCircle className="w-12 h-12 text-destructive mb-4" />
          <p className="text-sm text-destructive mb-4">{error}</p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Tentar Novamente
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              Fechar
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Camera selector */}
          {cameras.length > 1 && (
            <div className="mb-3">
              <select
                value={selectedCamera}
                onChange={(e) => handleCameraChange(e.target.value)}
                className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-sm"
              >
                {cameras.map((camera) => (
                  <option key={camera.id} value={camera.id}>
                    {camera.label || `Câmera ${camera.id}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Scanner container */}
          <div 
            ref={containerRef}
            className="relative rounded-lg overflow-hidden bg-black"
          >
            <div 
              id="qr-camera-reader" 
              className="w-full"
              style={{ minHeight: '300px' }}
            />
            
            {/* Scanning overlay */}
            {isScanning && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-64 h-64 border-2 border-primary rounded-lg relative">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
                    
                    {/* Scanning line animation */}
                    <div className="absolute inset-x-4 h-0.5 bg-primary/80 animate-pulse" 
                      style={{ 
                        top: '50%',
                        boxShadow: '0 0 10px hsl(var(--primary))'
                      }} 
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 text-center">
            <p className="text-xs text-muted-foreground">
              Posicione o QR Code dentro do quadrado
            </p>
            {isScanning && (
              <p className="text-xs text-primary mt-1 animate-pulse">
                Escaneando...
              </p>
            )}
          </div>
        </>
      )}

      <style>{`
        #qr-camera-reader video {
          width: 100% !important;
          height: auto !important;
          border-radius: 8px;
        }
        #qr-camera-reader img {
          display: none !important;
        }
      `}</style>
    </div>
  );
};

export default QRCameraReader;

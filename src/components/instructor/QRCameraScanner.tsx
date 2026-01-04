import React from 'react';
import QRCameraReader from '@/components/shared/QRCameraReader';

interface QRCameraScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

const QRCameraScanner: React.FC<QRCameraScannerProps> = ({ onScan, onClose }) => {
  return (
    <QRCameraReader
      onScan={onScan}
      onClose={onClose}
      title="SCANNER DE CÂMERA"
    />
  );
};

export default QRCameraScanner;

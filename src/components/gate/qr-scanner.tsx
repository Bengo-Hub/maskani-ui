'use client';

import { useEffect, useRef, useState } from 'react';
import { CameraOff } from 'lucide-react';

interface DetectedBarcode { rawValue: string }
interface BarcodeDetectorLike { detect(source: CanvasImageSource): Promise<DetectedBarcode[]> }
declare global {
  interface Window { BarcodeDetector?: new (opts?: { formats?: string[] }) => BarcodeDetectorLike }
}

/** True when this browser can scan QR codes natively (Chrome on Android, the gate tablet target). */
export function canScanQr(): boolean {
  return typeof window !== 'undefined' && !!window.BarcodeDetector && !!navigator.mediaDevices?.getUserMedia;
}

/**
 * Rear-camera QR scanner using the browser's BarcodeDetector. Calls onScan once per QR and stops
 * the camera on unmount. Where the browser cannot scan, the guard types the 6-digit code instead.
 */
export function QrScanner({ onScan }: { onScan: (value: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const done = useRef(false);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const [error, setError] = useState('');

  useEffect(() => {
    if (!canScanQr()) { setError('This device cannot scan QR codes. Type the 6-digit code instead.'); return; }
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    const detector = new window.BarcodeDetector!({ formats: ['qr_code'] });
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        if (stopped || !video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        const tick = async () => {
          if (stopped || done.current || !video.current) return;
          try {
            const codes = await detector.detect(video.current);
            if (codes[0]?.rawValue) {
              done.current = true;
              onScanRef.current(codes[0].rawValue);
              return;
            }
          } catch { /* frame not ready */ }
          raf = requestAnimationFrame(() => void tick());
        };
        raf = requestAnimationFrame(() => void tick());
      } catch {
        setError('Camera not available. Allow camera access, or type the code.');
      }
    })();
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  if (error) {
    return <div className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground"><CameraOff className="h-10 w-10" /><p>{error}</p></div>;
  }
  return (
    <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-2xl bg-black">
      <video ref={video} className="h-full w-full object-cover" playsInline muted />
      <div className="pointer-events-none absolute inset-10 rounded-xl border-4 border-white/80" />
    </div>
  );
}

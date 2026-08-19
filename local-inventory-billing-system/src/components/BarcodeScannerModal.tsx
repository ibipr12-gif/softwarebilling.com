import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface Props {
  title?: string;
  onDetected: (code: string) => void;
  onClose: () => void;
}

const REGION_ID = 'barcode-scan-region';

const BarcodeScannerModal: React.FC<Props> = ({ title = 'Scan Barcode', onDetected, onClose }) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string>('');
  const [starting, setStarting] = useState(true);
  const detectedOnce = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const scanner = new Html5Qrcode(REGION_ID, {
      formatsToSupport: [
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.CODE_93,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.ITF,
        Html5QrcodeSupportedFormats.CODABAR,
      ],
      verbose: false,
    });
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 260, height: 160 } },
        (decodedText) => {
          if (detectedOnce.current || cancelled) return;
          detectedOnce.current = true;
          onDetected(decodedText);
        },
        () => {
          /* ignore per-frame scan errors */
        }
      )
      .then(() => {
        if (!cancelled) setStarting(false);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            'Could not access camera. Please allow camera permission in your browser settings, and make sure no other app is using the camera.'
          );
          setStarting(false);
        }
        console.error(err);
      });

    return () => {
      cancelled = true;
      const s = scannerRef.current;
      if (s) {
        s.stop()
          .then(() => s.clear())
          .catch(() => {
            try {
              s.clear();
            } catch {
              /* noop */
            }
          });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-200"
          >
            ✕ Close
          </button>
        </div>

        {error ? (
          <div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
        ) : (
          <>
            {starting && (
              <p className="mb-2 text-center text-sm text-slate-500">Starting camera…</p>
            )}
            <div id={REGION_ID} className="mx-auto overflow-hidden rounded-xl bg-slate-900" />
            <p className="mt-3 text-center text-sm text-slate-500">
              Point your camera at the product's barcode. It will be scanned automatically.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default BarcodeScannerModal;

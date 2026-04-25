import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { generateQRCodeUrl } from '../../lib/qr';
import { useMobileSync, useListingImages } from '../../hooks/useMobileSync';
import { Copy, Check, Wifi, WifiOff } from 'lucide-react';

interface DesktopQRGeneratorProps {
  listingId: string;
  onImagesUpdate?: (images: Array<{ id: string; url: string }>) => void;
}

export const DesktopQRGenerator = ({ listingId, onImagesUpdate }: DesktopQRGeneratorProps) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [mobileUrl, setMobileUrl] = useState<string>('');

  // Realtime sync hook
  const { isConnected, newImages } = useMobileSync(listingId);

  // Fetch existing images
  const { images } = useListingImages(listingId);

  // Generate QR code on mount
  useEffect(() => {
    const uploadUrl = `${window.location.origin}/m/upload?session=${listingId}`;
    setMobileUrl(uploadUrl);

    const qrUrl = generateQRCodeUrl(uploadUrl, {
      size: 300,
      errorCorrection: 'H',
      margin: 2,
    });
    setQrCodeUrl(qrUrl);
  }, [listingId]);

  // Notify parent when new images arrive
  useEffect(() => {
    if (newImages.length > 0 && onImagesUpdate) {
      onImagesUpdate(images);
    }
  }, [newImages, images, onImagesUpdate]);

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(mobileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400 mb-4">
          Učitaj slike sa telefona
        </h3>
        <p className="text-xs text-neutral-500">
          Skeniraj QR kod ili koristi link za brzo učitavanje slika direktno sa mobilnog uređaja.
        </p>
      </div>

      {/* QR Code Section */}
      <div className="flex flex-col items-center gap-6">
        {/* QR Code Frame - Minimalist */}
        <div className="border-2 border-white/20 rounded-none p-8 bg-black hover:border-white/40 transition-all duration-300">
          {qrCodeUrl && (
            <img
              src={qrCodeUrl}
              alt="QR Code for mobile upload"
              className="w-64 h-64 object-contain"
            />
          )}
        </div>

        {/* Instructions */}
        <div className="text-center space-y-3">
          <p className="text-xs font-black uppercase tracking-widest text-white">
            Skeniraj QR kod sa telefona
          </p>
          <p className="text-xs text-neutral-400">
            Ili kopiraj link ispod
          </p>
        </div>

        {/* Copy Link Button */}
        <button
          onClick={handleCopyLink}
          className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black rounded-none font-black uppercase tracking-widest text-xs hover:bg-neutral-200 transition-all"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" strokeWidth={3} />
              Kopirano!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" strokeWidth={2} />
              Kopiraj link
            </>
          )}
        </button>
      </div>

      {/* Connection Status - Pulse Indicator */}
      <div className="flex items-center gap-3 p-4 border border-white/10 rounded-none bg-black/40">
        <motion.div
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="flex items-center gap-2"
        >
          {isConnected ? (
            <>
              <Wifi className="w-4 h-4 text-green-400" strokeWidth={2} />
              <span className="text-xs font-black uppercase tracking-widest text-green-400">
                Čeka se mobilna konekcija...
              </span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-neutral-400" strokeWidth={2} />
              <span className="text-xs font-black uppercase tracking-widest text-neutral-400">
                Inicijalizacija...
              </span>
            </>
          )}
        </motion.div>
      </div>

      {/* New Images Notification */}
      {newImages.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="p-4 border border-green-500/30 bg-green-500/5 rounded-none"
        >
          <p className="text-xs font-black uppercase tracking-widest text-green-400">
            ✓ {newImages.length} nova slika primljena
          </p>
        </motion.div>
      )}

      {/* Image Count */}
      <div className="text-center">
        <p className="text-xs text-neutral-400">
          Ukupno slika: <span className="font-black text-white">{images.length}</span>
        </p>
      </div>
    </div>
  );
};

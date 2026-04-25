/**
 * QR Code generation utility using QR Server API
 * No external library needed - uses free QR code API
 */

export interface QRCodeOptions {
  size?: number; // pixels (default: 300)
  errorCorrection?: 'L' | 'M' | 'Q' | 'H'; // default: 'M'
  margin?: number; // default: 1
}

/**
 * Generate QR code URL from data
 * Uses qr-server.com API (free, no auth required)
 */
export const generateQRCodeUrl = (
  data: string,
  options: QRCodeOptions = {}
): string => {
  const {
    size = 300,
    errorCorrection = 'M',
    margin = 1,
  } = options;

  const encodedData = encodeURIComponent(data);
  
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedData}&ecc=${errorCorrection}&margin=${margin}`;
};

/**
 * Generate mobile upload session data
 * Format: sessionId:listingId
 */
export const generateMobileUploadData = (
  sessionId: string,
  listingId: string
): string => {
  return `${sessionId}:${listingId}`;
};

/**
 * Parse mobile upload data from QR code
 */
export const parseMobileUploadData = (
  data: string
): { sessionId: string; listingId: string } | null => {
  const parts = data.split(':');
  if (parts.length === 2) {
    return {
      sessionId: parts[0],
      listingId: parts[1],
    };
  }
  return null;
};

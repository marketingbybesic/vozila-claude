import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { uploadImages } from '../lib/storage';
import { parseMobileUploadData } from '../lib/qr';
import { Upload, Check, AlertCircle } from 'lucide-react';

export const MobileUpload = () => {
  const [searchParams] = useSearchParams();
  const [sessionId, setSessionId] = useState<string>('');
  const [listingId, setListingId] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Parse QR data from URL
  useEffect(() => {
    const data = searchParams.get('data');
    if (data) {
      const parsed = parseMobileUploadData(data);
      if (parsed) {
        setSessionId(parsed.sessionId);
        setListingId(parsed.listingId);
      } else {
        setUploadStatus('error');
        setErrorMessage('Invalid QR code data');
      }
    }
  }, [searchParams]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = async () => {
    if (!sessionId || !listingId || selectedFiles.length === 0) {
      setErrorMessage('Missing session or files');
      setUploadStatus('error');
      return;
    }

    setIsUploading(true);
    setUploadStatus('uploading');
    setUploadProgress(0);

    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Not authenticated');

      // Upload images to storage
      const photoUrls = await uploadImages(
        selectedFiles,
        user.id,
        listingId,
        'gallery',
        (progress) => setUploadProgress(progress)
      );

      // Store upload record in mobile_uploads table for Realtime sync
      const { error: insertError } = await supabase
        .from('mobile_uploads')
        .insert({
          session_id: sessionId,
          listing_id: listingId,
          user_id: user.id,
          photo_urls: photoUrls,
          uploaded_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      setUploadStatus('success');
      setSelectedFiles([]);
      setUploadProgress(0);

      // Auto-close after 3 seconds
      setTimeout(() => {
        window.close();
      }, 3000);
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-black text-white">Učitaj slike</h1>
          <p className="text-xs text-neutral-400 uppercase tracking-widest">
            Vozila.hr Mobile Upload
          </p>
        </div>

        {/* Status Messages */}
        {uploadStatus === 'error' && (
          <div className="flex items-start gap-3 p-4 border border-red-500/30 bg-red-500/5 rounded-none">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-black text-red-400 uppercase tracking-widest">Greška</p>
              <p className="text-xs text-red-300 mt-1">{errorMessage}</p>
            </div>
          </div>
        )}

        {uploadStatus === 'success' && (
          <div className="flex items-start gap-3 p-4 border border-green-500/30 bg-green-500/5 rounded-none">
            <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-black text-green-400 uppercase tracking-widest">Uspješno!</p>
              <p className="text-xs text-green-300 mt-1">Slike su učitane. Prozor će se zatvoriti...</p>
            </div>
          </div>
        )}

        {/* File Input */}
        {uploadStatus !== 'success' && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-white/20 rounded-none p-8 text-center hover:border-white/40 transition-all">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                disabled={isUploading}
                className="hidden"
                id="mobile-file-input"
              />
              <label htmlFor="mobile-file-input" className="cursor-pointer block">
                <Upload className="w-12 h-12 text-white/40 mx-auto mb-4" />
                <p className="text-sm font-black text-white mb-2">Odaberi slike</p>
                <p className="text-xs text-neutral-400">Kliknite ili prevucite slike</p>
              </label>
            </div>

            {/* Selected Files */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-black uppercase tracking-widest text-neutral-400">
                  Odabrane slike ({selectedFiles.length})
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {selectedFiles.map((file, idx) => (
                    <div key={idx} className="relative aspect-square">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Selected ${idx + 1}`}
                        className="w-full h-full object-cover border border-white/20"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Progress */}
            {isUploading && (
              <div className="space-y-2">
                <div className="w-full h-1 bg-neutral-800 rounded-none overflow-hidden">
                  <div
                    className="h-full bg-white transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-neutral-400 text-center">Učitavanje... {uploadProgress}%</p>
              </div>
            )}

            {/* Upload Button */}
            <button
              onClick={handleUpload}
              disabled={selectedFiles.length === 0 || isUploading}
              className="w-full px-6 py-4 bg-white text-black rounded-none font-black uppercase tracking-widest text-xs hover:bg-neutral-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? 'Učitavanje...' : 'Učitaj slike'}
            </button>
          </div>
        )}

        {/* Session Info */}
        <div className="text-center text-xs text-neutral-500">
          <p>Session: {sessionId.substring(0, 12)}...</p>
        </div>
      </div>
    </div>
  );
};

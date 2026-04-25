import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Download, AlertCircle, CheckCircle2, X } from 'lucide-react';
import {
  validateCSV,
  importListingsFromCSV,
  generateCSVTemplate,
} from '../../lib/csvImportService';
import { navigationMenu } from '../../config/taxonomy';

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CSVImportModal = ({ isOpen, onClose, onSuccess }: CSVImportModalProps) => {
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'result'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [categorySlug, setCategorySlug] = useState('osobni-automobili');
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<any>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const handleFileSelect = async (file: File) => {
    setErrors([]);
    
    // Validate file
    const validation = await validateCSV(file);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setSelectedFile(file);
    setStep('preview');
  };

  const handleDownloadTemplate = () => {
    const csv = generateCSVTemplate();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vozila-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleStartImport = async () => {
    if (!selectedFile) return;

    setIsImporting(true);
    setStep('importing');
    setImportProgress(0);

    try {
      const result = await importListingsFromCSV(
        selectedFile,
        categorySlug,
        (current, total) => {
          setImportProgress(Math.round((current / total) * 100));
        }
      );

      setImportResult(result);
      setStep('result');
      
      if (result.success && result.listingsCreated > 0) {
        onSuccess?.();
      }
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Import failed']);
      setStep('result');
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setStep('upload');
    setSelectedFile(null);
    setCategorySlug('osobni-automobili');
    setImportProgress(0);
    setImportResult(null);
    setErrors([]);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-2xl bg-black border border-white/10 rounded-none p-8 space-y-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-white">Grupni uvoz oglasa</h2>
              <p className="text-xs text-neutral-400 uppercase tracking-widest mt-1">
                Učitaj više vozila odjednom iz CSV datoteke
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-none transition-all"
            >
              <X className="w-5 h-5 text-white" strokeWidth={2} />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-6">
            {/* Upload Step */}
            {step === 'upload' && (
              <div className="space-y-6">
                {/* Category Selection */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-white/60 mb-2">
                    Kategorija vozila
                  </label>
                  <select
                    value={categorySlug}
                    onChange={(e) => setCategorySlug(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-none px-4 py-3 text-xs text-white focus:outline-none focus:border-white/30"
                  >
                    {navigationMenu.map((cat) => (
                      <option key={cat.slug} value={cat.slug}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* File Upload */}
                <div className="border-2 border-dashed border-white/20 rounded-none p-8 text-center hover:border-white/40 transition-all">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label htmlFor="csv-upload" className="cursor-pointer block">
                    <Upload className="w-12 h-12 text-white/40 mx-auto mb-4" strokeWidth={1.5} />
                    <p className="text-sm font-black text-white mb-2">Odaberi CSV datoteku</p>
                    <p className="text-xs text-neutral-400">Ili prevuci datoteku ovdje</p>
                  </label>
                </div>

                {/* Template Download */}
                <button
                  onClick={handleDownloadTemplate}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-neutral-900 border border-white/10 text-white rounded-none font-black uppercase tracking-widest text-xs hover:bg-neutral-800 transition-all"
                >
                  <Download className="w-4 h-4" strokeWidth={2} />
                  Preuzmi CSV template
                </button>

                {/* Errors */}
                {errors.length > 0 && (
                  <div className="p-4 border border-red-500/30 bg-red-500/5 rounded-none space-y-2">
                    {errors.map((error, idx) => (
                      <p key={idx} className="text-xs text-red-400">
                        {error}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Preview Step */}
            {step === 'preview' && selectedFile && (
              <div className="space-y-6">
                <div className="p-4 border border-white/10 bg-white/5 rounded-none">
                  <p className="text-xs font-black uppercase tracking-widest text-white/60 mb-2">
                    Datoteka
                  </p>
                  <p className="text-sm text-white font-mono">{selectedFile.name}</p>
                  <p className="text-xs text-neutral-400 mt-1">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>

                <div className="p-4 border border-white/10 bg-white/5 rounded-none">
                  <p className="text-xs font-black uppercase tracking-widest text-white/60 mb-2">
                    Kategorija
                  </p>
                  <p className="text-sm text-white">
                    {navigationMenu.find(c => c.slug === categorySlug)?.name}
                  </p>
                </div>

                <p className="text-xs text-neutral-400">
                  Pritisnite "Počni uvoz" da započnete učitavanje vozila.
                </p>
              </div>
            )}

            {/* Importing Step */}
            {step === 'importing' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  >
                    <Upload className="w-5 h-5 text-white" strokeWidth={2} />
                  </motion.div>
                  <span className="text-sm font-black text-white">Učitavanje u tijeku...</span>
                </div>

                <div className="w-full h-2 bg-neutral-800 rounded-none overflow-hidden">
                  <motion.div
                    className="h-full bg-white"
                    initial={{ width: 0 }}
                    animate={{ width: `${importProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>

                <p className="text-xs text-neutral-400 text-center">{importProgress}%</p>
              </div>
            )}

            {/* Result Step */}
            {step === 'result' && importResult && (
              <div className="space-y-6">
                {importResult.success ? (
                  <div className="p-4 border border-green-500/30 bg-green-500/5 rounded-none">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" strokeWidth={2} />
                      <div>
                        <p className="text-sm font-black text-green-400 uppercase tracking-widest">
                          Uvoz uspješan!
                        </p>
                        <p className="text-xs text-green-300 mt-2">
                          Učitano: <strong>{importResult.listingsCreated}</strong> vozila
                        </p>
                        {importResult.listingsFailed > 0 && (
                          <p className="text-xs text-yellow-300 mt-1">
                            Neuspješno: <strong>{importResult.listingsFailed}</strong> vozila
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 border border-red-500/30 bg-red-500/5 rounded-none">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" strokeWidth={2} />
                      <div>
                        <p className="text-sm font-black text-red-400 uppercase tracking-widest">
                          Greška pri uvozu
                        </p>
                        <p className="text-xs text-red-300 mt-2">
                          {importResult.errors?.[0]?.error || 'Nepoznata greška'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error Details */}
                {importResult.errors?.length > 0 && (
                  <div className="p-4 border border-white/10 bg-white/5 rounded-none max-h-48 overflow-y-auto">
                    <p className="text-xs font-black uppercase tracking-widest text-white/60 mb-3">
                      Detalji grešaka
                    </p>
                    <div className="space-y-2">
                      {importResult.errors.slice(0, 10).map((err: any, idx: number) => (
                        <p key={idx} className="text-xs text-red-300">
                          Red {err.row}: {err.error}
                        </p>
                      ))}
                      {importResult.errors.length > 10 && (
                        <p className="text-xs text-neutral-400">
                          ... i još {importResult.errors.length - 10} grešaka
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-6 border-t border-white/10">
            {step === 'upload' && (
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-neutral-900 border border-white/10 text-white rounded-none font-black uppercase tracking-widest text-xs hover:bg-neutral-800 transition-all"
              >
                Zatvori
              </button>
            )}

            {step === 'preview' && (
              <>
                <button
                  onClick={() => setStep('upload')}
                  className="flex-1 px-6 py-3 bg-neutral-900 border border-white/10 text-white rounded-none font-black uppercase tracking-widest text-xs hover:bg-neutral-800 transition-all"
                >
                  Natrag
                </button>
                <button
                  onClick={handleStartImport}
                  disabled={isImporting}
                  className="flex-1 px-6 py-3 bg-white text-black rounded-none font-black uppercase tracking-widest text-xs hover:bg-neutral-200 transition-all disabled:opacity-50"
                >
                  Počni uvoz
                </button>
              </>
            )}

            {step === 'result' && (
              <>
                <button
                  onClick={handleReset}
                  className="flex-1 px-6 py-3 bg-neutral-900 border border-white/10 text-white rounded-none font-black uppercase tracking-widest text-xs hover:bg-neutral-800 transition-all"
                >
                  Novi uvoz
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 px-6 py-3 bg-white text-black rounded-none font-black uppercase tracking-widest text-xs hover:bg-neutral-200 transition-all"
                >
                  Zatvori
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

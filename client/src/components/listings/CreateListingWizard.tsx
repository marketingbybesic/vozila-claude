import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { uploadImages } from '../../lib/storage';
import { 
  ChevronRight, ChevronLeft, Check, Upload, Trash2, Camera,
  Car, MapPin, Euro, FileText, AlertCircle
} from 'lucide-react';
import { navigationMenu } from '../../config/taxonomy';
import { categoryFilters } from '../../config/filters';

type WizardStep = 1 | 2 | 3;

interface FormData {
  // Step 1: Category & Basic Info
  category_slug: string;
  title: string;
  price: number;
  listing_type: 'prodaja' | 'najam';
  location: string;
  description: string;
  contact_phone: string;
  contact_email: string;
  
  // Step 2: Dynamic Attributes (JSONB)
  attributes: Record<string, any>;
  
  // Step 3: Media
  heroImage: File | null;
  galleryImages: File[];
  damageImages: File[];
}

export const CreateListingWizard = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    category_slug: '',
    title: '',
    price: 0,
    listing_type: 'prodaja',
    location: '',
    description: '',
    contact_phone: '',
    contact_email: '',
    attributes: {},
    heroImage: null,
    galleryImages: [],
    damageImages: [],
  });

  // Get current category filters
  const currentFilters = formData.category_slug 
    ? categoryFilters[formData.category_slug] || []
    : [];

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep((prev) => (prev + 1) as WizardStep);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as WizardStep);
    }
  };

  const handleFileChange = (type: 'hero' | 'gallery' | 'damage', files: FileList | null) => {
    if (!files) return;
    
    if (type === 'hero') {
      setFormData(prev => ({ ...prev, heroImage: files[0] }));
    } else if (type === 'gallery') {
      setFormData(prev => ({ ...prev, galleryImages: Array.from(files) }));
    } else {
      setFormData(prev => ({ ...prev, damageImages: Array.from(files) }));
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Not authenticated');

      // Create listing
      const { data: listing, error } = await supabase
        .from('listings')
        .insert({
          category_slug: formData.category_slug,
          title: formData.title,
          price: formData.price,
          location: formData.location,
          description: formData.description,
          contact_phone: formData.contact_phone,
          contact_email: formData.contact_email,
          attributes: formData.attributes,
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;
      if (!listing) throw new Error('Failed to create listing');

      // Upload images with progress tracking
      let mainImageUrl = '';
      let galleryUrls: string[] = [];
      let damageUrls: string[] = [];

      // Upload hero image
      if (formData.heroImage) {
        const heroUrls = await uploadImages(
          [formData.heroImage],
          user.id,
          listing.id,
          'hero',
          (progress) => {
            // Update progress: hero is 33%
          }
        );
        mainImageUrl = heroUrls[0];
      }

      // Upload gallery images
      if (formData.galleryImages.length > 0) {
        galleryUrls = await uploadImages(
          formData.galleryImages,
          user.id,
          listing.id,
          'gallery',
          (progress) => {
            // Update progress: gallery is 33%
          }
        );
      }

      // Upload damage images
      if (formData.damageImages.length > 0) {
        damageUrls = await uploadImages(
          formData.damageImages,
          user.id,
          listing.id,
          'damage',
          (progress) => {
            // Update progress: damage is 34%
          }
        );
      }

      // Update listing with image URLs
      const { error: updateError } = await supabase
        .from('listings')
        .update({
          main_image: mainImageUrl,
          images: galleryUrls,
          damage_images: damageUrls,
          status: 'published',
        })
        .eq('id', listing.id);

      if (updateError) throw updateError;

      // Navigate to listing detail
      navigate(`/listing/${listing.id}`);
    } catch (error) {
      console.error('Error creating listing:', error);
      alert('Greška pri kreiranju oglasa. Pokušajte ponovo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-8 px-8">
      <div className="max-w-4xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div className={`w-10 h-10 rounded-none border-2 flex items-center justify-center font-black text-sm transition-all ${
                  currentStep >= step 
                    ? 'border-white bg-white text-black' 
                    : 'border-neutral-800 text-neutral-600'
                }`}>
                  {currentStep > step ? <Check className="w-5 h-5" strokeWidth={3} /> : step}
                </div>
                {step < 3 && (
                  <div className={`flex-1 h-0.5 mx-4 ${
                    currentStep > step ? 'bg-white' : 'bg-neutral-800'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs font-black uppercase tracking-widest text-neutral-400">
            <span>Osnovno</span>
            <span>Atributi</span>
            <span>Slike</span>
          </div>
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {currentStep === 1 && <Step1 formData={formData} setFormData={setFormData} />}
            {currentStep === 2 && <Step2 formData={formData} setFormData={setFormData} filters={currentFilters} />}
            {currentStep === 3 && <Step3 formData={formData} handleFileChange={handleFileChange} />}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between mt-12">
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            className="inline-flex items-center gap-2 px-8 py-4 bg-neutral-800 text-white rounded-none font-black uppercase tracking-widest text-xs hover:bg-neutral-700 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5" strokeWidth={2} />
            Natrag
          </button>

          {currentStep < 3 ? (
            <button
              onClick={handleNext}
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-black rounded-none font-black uppercase tracking-widest text-xs hover:bg-neutral-200 transition-all"
            >
              Dalje
              <ChevronRight className="w-5 h-5" strokeWidth={2} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-8 py-4 bg-green-600 text-white rounded-none font-black uppercase tracking-widest text-xs hover:bg-green-700 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Spremanje...' : 'Objavi'}
              <Check className="w-5 h-5" strokeWidth={2} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Step 1: Category & Basic Info
const Step1 = ({ formData, setFormData }: any) => {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-black text-white mb-8">Osnove Informacije</h2>
        
        {/* Category Selection */}
        <div className="mb-8">
          <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-4">
            <Car className="w-4 h-4 inline mr-2" />
            Kategorija
          </label>
          <select
            value={formData.category_slug}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, category_slug: e.target.value }))}
            className="w-full px-8 py-4 bg-card border border-neutral-800 rounded-none text-white font-black text-sm focus:outline-none focus:border-white transition-all"
          >
            <option value="">Odaberite kategoriju</option>
            {navigationMenu.map((cat) => (
              <option key={cat.slug} value={cat.slug}>{cat.name}</option>
            ))}
          </select>
        </div>

        {/* Title */}
        <div className="mb-8">
          <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-4">
            <FileText className="w-4 h-4 inline mr-2" />
            Naslov
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, title: e.target.value }))}
            placeholder="npr. BMW 320d M Sport"
            className="w-full px-8 py-4 bg-card border border-neutral-800 rounded-none text-white font-bold text-sm focus:outline-none focus:border-white transition-all"
          />
        </div>

        {/* Price */}
        <div className="mb-8">
          <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-4">
            <Euro className="w-4 h-4 inline mr-2" />
            Cijena (€)
          </label>
          <input
            type="number"
            value={formData.price}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, price: Number(e.target.value) }))}
            placeholder="0 za 'Na upit'"
            className="w-full px-8 py-4 bg-card border border-neutral-800 rounded-none text-white font-bold text-sm focus:outline-none focus:border-white transition-all"
          />
        </div>

        {/* Location */}
        <div className="mb-8">
          <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-4">
            <MapPin className="w-4 h-4 inline mr-2" />
            Lokacija
          </label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, location: e.target.value }))}
            placeholder="npr. Zagreb, Hrvatska"
            className="w-full px-8 py-4 bg-card border border-neutral-800 rounded-none text-white font-bold text-sm focus:outline-none focus:border-white transition-all"
          />
        </div>

        {/* Description */}
        <div className="mb-8">
          <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-4">
            Opis
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, description: e.target.value }))}
            rows={6}
            placeholder="Detaljno opišite vozilo..."
            className="w-full px-8 py-4 bg-card border border-neutral-800 rounded-none text-white font-medium text-sm focus:outline-none focus:border-white transition-all resize-none"
          />
        </div>

        {/* Contact Info */}
        <div className="grid grid-cols-2 gap-8">
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-4">
              Telefon
            </label>
            <input
              type="tel"
              value={formData.contact_phone}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, contact_phone: e.target.value }))}
              placeholder="+385 99 123 4567"
              className="w-full px-8 py-4 bg-card border border-neutral-800 rounded-none text-white font-bold text-sm focus:outline-none focus:border-white transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-4">
              Email
            </label>
            <input
              type="email"
              value={formData.contact_email}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, contact_email: e.target.value }))}
              placeholder="email@example.com"
              className="w-full px-8 py-4 bg-card border border-neutral-800 rounded-none text-white font-bold text-sm focus:outline-none focus:border-white transition-all"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Step 2: Dynamic Attributes
const Step2 = ({ formData, setFormData, filters }: any) => {
  const handleAttributeChange = (key: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      attributes: { ...prev.attributes, [key]: value }
    }));
  };

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-black text-white mb-8">Specifikacije</h2>
      
      {filters.length === 0 ? (
        <p className="text-neutral-400">Odaberite kategoriju u prvom koraku.</p>
      ) : (
        <div className="grid grid-cols-2 gap-8">
          {filters.map((filter: any) => (
            <div key={filter.id}>
              <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-4">
                {filter.label}
              </label>
              
              {filter.type === 'select' && (
                <select
                  value={formData.attributes[filter.id] || ''}
                  onChange={(e) => handleAttributeChange(filter.id, e.target.value)}
                  className="w-full px-8 py-4 bg-card border border-neutral-800 rounded-none text-white font-bold text-sm focus:outline-none focus:border-white transition-all"
                >
                  <option value="">Odaberite</option>
                  {filter.options?.map((opt: any) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              )}
              
              {filter.type === 'range' && (
                <input
                  type="number"
                  value={formData.attributes[filter.id] || ''}
                  onChange={(e) => handleAttributeChange(filter.id, e.target.value)}
                  placeholder={filter.unit}
                  className="w-full px-8 py-4 bg-card border border-neutral-800 rounded-none text-white font-bold text-sm focus:outline-none focus:border-white transition-all"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Step 3: Triple-Zone Media Upload
const Step3 = ({ formData, handleFileChange }: any) => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const removeImage = (type: 'hero' | 'gallery' | 'damage', index?: number) => {
    if (type === 'hero') {
      handleFileChange('hero', null);
    } else if (type === 'gallery' && index !== undefined) {
      const updated = formData.galleryImages.filter((_: any, i: number) => i !== index);
      handleFileChange('gallery', updated);
    } else if (type === 'damage' && index !== undefined) {
      const updated = formData.damageImages.filter((_: any, i: number) => i !== index);
      handleFileChange('damage', updated);
    }
  };

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-black text-white mb-8">Slike Vozila</h2>

      {/* Zone A: Hero Image - 16:9 Large Drop Zone */}
      <div>
        <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-4">
          <Camera className="w-4 h-4 inline mr-2" />
          Glavna Slika (Hero) - 16:9
        </label>
        <div className="relative aspect-[16/9] border-2 border-dashed border-white/20 rounded-none overflow-hidden hover:border-white/40 transition-all">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleFileChange('hero', e.target.files)}
            className="hidden"
            id="hero-upload"
          />
          <label htmlFor="hero-upload" className="absolute inset-0 cursor-pointer flex items-center justify-center bg-black/20 hover:bg-black/40 transition-all">
            {formData.heroImage ? (
              <div className="text-center">
                <Check className="w-12 h-12 text-green-500 mx-auto mb-2" />
                <p className="text-sm font-black text-white">{formData.heroImage.name}</p>
                <p className="text-xs text-neutral-400 mt-2">Kliknite za promjenu</p>
              </div>
            ) : (
              <div className="text-center">
                <Camera className="w-12 h-12 text-white/40 mx-auto mb-4" />
                <p className="text-sm font-black text-white">Dodaj glavnu sliku</p>
                <p className="text-xs text-neutral-400 mt-2">Kliknite ili prevucite sliku</p>
              </div>
            )}
          </label>
          {formData.heroImage && (
            <img
              src={URL.createObjectURL(formData.heroImage)}
              alt="Hero preview"
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
        </div>
      </div>

      {/* Zone B: Gallery - Horizontal Scrollable Grid */}
      <div>
        <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-4">
          Galerija ({formData.galleryImages.length} slika)
        </label>
        <div className="space-y-4">
          {/* Upload Area */}
          <div className="border-2 border-dashed border-white/20 rounded-none p-8 text-center hover:border-white/40 transition-all">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleFileChange('gallery', e.target.files)}
              className="hidden"
              id="gallery-upload"
            />
            <label htmlFor="gallery-upload" className="cursor-pointer block">
              <Upload className="w-8 h-8 mx-auto mb-2 text-white/40" />
              <p className="text-xs font-black uppercase tracking-widest text-neutral-400">Dodaj slike galerije</p>
            </label>
          </div>

          {/* Gallery Grid */}
          {formData.galleryImages.length > 0 && (
            <div className="grid grid-cols-4 gap-2 overflow-x-auto pb-2">
              {formData.galleryImages.map((file: File, idx: number) => (
                <div key={idx} className="relative aspect-square group">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={`Gallery ${idx + 1}`}
                    className="w-full h-full object-cover border border-neutral-800"
                  />
                  <button
                    onClick={() => removeImage('gallery', idx)}
                    className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    <Trash2 className="w-5 h-5 text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Zone C: Damage Gallery - High Contrast Section */}
      <div className="border border-red-500/30 bg-red-500/5 p-8 rounded-none">
        <label className="block text-xs font-black uppercase tracking-widest text-red-400 mb-4">
          <AlertCircle className="w-4 h-4 inline mr-2" />
          Oštećenja ({formData.damageImages.length} slika)
        </label>
        <p className="text-xs text-neutral-400 mb-4">
          Dodajte slike oštećenja kako biste izgradili povjerenje kupaca. Transparentnost je ključna.
        </p>

        <div className="space-y-4">
          {/* Upload Area */}
          <div className="border-2 border-dashed border-red-500/30 rounded-none p-8 text-center hover:border-red-500/50 transition-all">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleFileChange('damage', e.target.files)}
              className="hidden"
              id="damage-upload"
            />
            <label htmlFor="damage-upload" className="cursor-pointer block">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-500/40" />
              <p className="text-xs font-black uppercase tracking-widest text-red-400">Dodaj slike oštećenja</p>
            </label>
          </div>

          {/* Damage Gallery Grid */}
          {formData.damageImages.length > 0 && (
            <div className="grid grid-cols-4 gap-2 overflow-x-auto pb-2">
              {formData.damageImages.map((file: File, idx: number) => (
                <div key={idx} className="relative aspect-square group">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={`Damage ${idx + 1}`}
                    className="w-full h-full object-cover border border-red-500/30"
                  />
                  <button
                    onClick={() => removeImage('damage', idx)}
                    className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    <Trash2 className="w-5 h-5 text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upload Progress Bar */}
      {isUploading && (
        <div className="space-y-2">
          <div className="w-full h-1 bg-neutral-800 rounded-none overflow-hidden">
            <motion.div
              className="h-full bg-white"
              animate={{ width: `${uploadProgress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="text-xs text-neutral-400 text-center">Učitavanje... {uploadProgress}%</p>
        </div>
      )}
    </div>
  );
};

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { uploadImages } from '../../lib/storage';
import { 
  ChevronRight, ChevronLeft, Check, Upload, Trash2, Camera,
  Car, MapPin, Euro, FileText, AlertCircle,
  LogIn, UserPlus, X, Tag
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
  const [authUser, setAuthUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
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

  // Auth check
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setAuthUser(session?.user ?? null);
      setAuthLoading(false);
    };
    checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

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
          (_progress) => {
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
          (_progress) => {
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
          (_progress) => {
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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-8">
        <div className="max-w-md w-full text-center space-y-8">
          <div className="w-16 h-16 bg-neutral-800 rounded-none flex items-center justify-center mx-auto">
            <LogIn className="w-8 h-8 text-white" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-light text-white tracking-widest mb-4">
              Prijava Potrebna
            </h1>
            <p className="text-sm font-light text-neutral-400 leading-relaxed">
              Za predaju oglasa morate biti prijavljeni
            </p>
          </div>
          <div className="space-y-3">
            <Link
              to="/profil"
              className="inline-flex items-center justify-center gap-2 w-full px-8 py-4 bg-white text-black rounded-none font-light uppercase tracking-widest text-xs hover:bg-neutral-200 transition-all"
            >
              <LogIn className="w-4 h-4" strokeWidth={1.5} />
              Prijava
            </Link>
            <Link
              to="/profil"
              className="inline-flex items-center justify-center gap-2 w-full px-8 py-4 bg-neutral-800 text-white rounded-none font-light uppercase tracking-widest text-xs hover:bg-neutral-700 transition-all"
            >
              <UserPlus className="w-4 h-4" strokeWidth={1.5} />
              Registracija
            </Link>
          </div>
          <div className="pt-4 border-t border-neutral-800">
            <p className="text-[10px] font-light uppercase tracking-widest text-neutral-500 mb-3">
              Brza prijava
            </p>
            <div className="flex items-center justify-center gap-3">
              <button className="w-10 h-10 bg-neutral-800 rounded-none flex items-center justify-center hover:bg-neutral-700 transition-all opacity-50 cursor-not-allowed" title="Google prijava - uskoro">
                <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              </button>
              <button className="w-10 h-10 bg-neutral-800 rounded-none flex items-center justify-center hover:bg-neutral-700 transition-all opacity-50 cursor-not-allowed" title="Apple prijava - uskoro">
                <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#fff" d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            {currentStep === 2 && <Step2 formData={formData} setFormData={setFormData} filters={currentFilters} onBack={handleBack} />}
            {currentStep === 3 && <Step3 formData={formData} handleFileChange={handleFileChange} onBack={handleBack} />}
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
const Step2 = ({ formData, setFormData, filters, onBack }: any) => {
  const handleAttributeChange = (key: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      attributes: { ...prev.attributes, [key]: value }
    }));
  };

  const equipmentTags: string[] = formData.attributes?.equipment || [];

  const handleEquipmentInput = (value: string) => {
    const tags = value
      .split(/[,;]/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    handleAttributeChange('equipment', tags);
  };

  const removeEquipmentTag = (tag: string) => {
    const next = equipmentTags.filter((t) => t !== tag);
    handleAttributeChange('equipment', next);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-light uppercase tracking-widest text-neutral-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
          Natrag
        </button>
      </div>

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

      {/* Dynamic Extra Fields by Category */}
      {(formData.category_slug === 'motocikli' || formData.category_slug === 'gospodarska-vozila' || formData.category_slug === 'strojevi') && (
        <div className="border-t border-neutral-800 pt-8 grid grid-cols-2 gap-8">
          {formData.category_slug === 'motocikli' && (
            <>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-4">
                  Kubikaža (cm³)
                </label>
                <input
                  type="number"
                  value={formData.attributes?.engine_displacement || ''}
                  onChange={(e) => handleAttributeChange('engine_displacement', e.target.value)}
                  placeholder="npr. 750"
                  className="w-full px-8 py-4 bg-card border border-neutral-800 rounded-none text-white font-bold text-sm focus:outline-none focus:border-white transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-4">
                  Snaga (kW)
                </label>
                <input
                  type="number"
                  value={formData.attributes?.power_kw || ''}
                  onChange={(e) => handleAttributeChange('power_kw', e.target.value)}
                  placeholder="npr. 55"
                  className="w-full px-8 py-4 bg-card border border-neutral-800 rounded-none text-white font-bold text-sm focus:outline-none focus:border-white transition-all"
                />
              </div>
            </>
          )}
          {(formData.category_slug === 'gospodarska-vozila' || formData.category_slug === 'strojevi') && (
            <>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-4">
                  Radni sati
                </label>
                <input
                  type="number"
                  value={formData.attributes?.working_hours || ''}
                  onChange={(e) => handleAttributeChange('working_hours', e.target.value)}
                  placeholder="npr. 1250"
                  className="w-full px-8 py-4 bg-card border border-neutral-800 rounded-none text-white font-bold text-sm focus:outline-none focus:border-white transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-4">
                  Nosivost (kg)
                </label>
                <input
                  type="number"
                  value={formData.attributes?.capacity || ''}
                  onChange={(e) => handleAttributeChange('capacity', e.target.value)}
                  placeholder="npr. 3500"
                  className="w-full px-8 py-4 bg-card border border-neutral-800 rounded-none text-white font-bold text-sm focus:outline-none focus:border-white transition-all"
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* Dodatna Oprema — Comma-to-Tag */}
      <div className="border-t border-neutral-800 pt-8">
        <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-4">
          <Tag className="w-4 h-4 inline mr-2" />
          Dodatna oprema (odvojite zarezom)
        </label>
        <input
          type="text"
          value={equipmentTags.join(', ')}
          onChange={(e) => handleEquipmentInput(e.target.value)}
          placeholder="npr. Klima, Grijači sjedala, Navigacija, PDC, LED..."
          className="w-full px-8 py-4 bg-card border border-neutral-800 rounded-none text-white font-bold text-sm focus:outline-none focus:border-white transition-all"
        />
        {equipmentTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {equipmentTags.map((tag: string) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 bg-white/5 border border-neutral-700 px-3 py-1 text-[10px] uppercase tracking-widest text-white/70"
              >
                {tag}
                <button
                  onClick={() => removeEquipmentTag(tag)}
                  className="hover:text-white transition-colors ml-1"
                  title="Ukloni"
                >
                  <X className="w-3 h-3" strokeWidth={2} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Step 3: Triple-Zone Media Upload with Drag-and-Drop
const Step3 = ({ formData, handleFileChange, onBack }: any) => {
  const [uploadProgress] = useState(0);
  const [isUploading] = useState(false);
  const [dragActive, setDragActive] = useState<string | null>(null);

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

  const onDrag = useCallback((e: React.DragEvent, zone: string, active: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(active ? zone : null);
  }, []);

  const onDrop = useCallback((e: React.DragEvent, zone: 'hero' | 'gallery' | 'damage') => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(null);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (zone === 'hero') {
        const dt = new DataTransfer();
        dt.items.add(e.dataTransfer.files[0]);
        handleFileChange('hero', dt.files);
      } else {
        handleFileChange(zone, e.dataTransfer.files);
      }
    }
  }, [handleFileChange]);

  const DropZone = ({
    zone,
    id,
    acceptMultiple,
    children,
    className,
    activeClassName,
  }: {
    zone: 'hero' | 'gallery' | 'damage';
    id: string;
    acceptMultiple: boolean;
    children: React.ReactNode;
    className: string;
    activeClassName?: string;
  }) => (
    <div
      className={`${className} ${dragActive === zone ? activeClassName || 'border-white/60 bg-white/5' : ''}`}
      onDragEnter={(e) => onDrag(e, zone, true)}
      onDragLeave={(e) => onDrag(e, zone, false)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => onDrop(e, zone)}
    >
      <input
        type="file"
        accept="image/*"
        multiple={acceptMultiple}
        onChange={(e) => handleFileChange(zone, e.target.files)}
        className="hidden"
        id={id}
      />
      {children}
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-light uppercase tracking-widest text-neutral-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
          Natrag
        </button>
      </div>

      <h2 className="text-2xl font-black text-white mb-8">Slike Vozila</h2>

      {/* Zone A: Hero Image - 16:9 Large Drop Zone */}
      <div>
        <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-4">
          <Camera className="w-4 h-4 inline mr-2" />
          Glavna Slika (Hero) - 16:9
        </label>
        <DropZone
          zone="hero"
          id="hero-upload"
          acceptMultiple={false}
          className="relative aspect-[16/9] border-2 border-dashed border-white/20 rounded-none overflow-hidden hover:border-white/40 transition-all"
          activeClassName="border-white/60 bg-white/5"
        >
          <label htmlFor="hero-upload" className="absolute inset-0 cursor-pointer flex items-center justify-center bg-black/20 hover:bg-black/40 transition-all">
            {formData.heroImage ? (
              <div className="text-center z-10">
                <Check className="w-12 h-12 text-green-500 mx-auto mb-2" />
                <p className="text-sm font-black text-white">{formData.heroImage.name}</p>
                <p className="text-xs text-neutral-400 mt-2">Kliknite ili prevucite za promjenu</p>
              </div>
            ) : (
              <div className="text-center z-10">
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
        </DropZone>
      </div>

      {/* Zone B: Gallery - Horizontal Scrollable Grid */}
      <div>
        <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-4">
          Galerija ({formData.galleryImages.length} slika)
        </label>
        <div className="space-y-4">
          {/* Upload Area */}
          <DropZone
            zone="gallery"
            id="gallery-upload"
            acceptMultiple={true}
            className="border-2 border-dashed border-white/20 rounded-none p-8 text-center hover:border-white/40 transition-all"
            activeClassName="border-white/60 bg-white/5"
          >
            <label htmlFor="gallery-upload" className="cursor-pointer block">
              <Upload className="w-8 h-8 mx-auto mb-2 text-white/40" />
              <p className="text-xs font-black uppercase tracking-widest text-neutral-400">Dodaj slike galerije</p>
              <p className="text-[10px] text-neutral-500 mt-1">Prevucite slike ovdje</p>
            </label>
          </DropZone>

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
          <DropZone
            zone="damage"
            id="damage-upload"
            acceptMultiple={true}
            className="border-2 border-dashed border-red-500/30 rounded-none p-8 text-center hover:border-red-500/50 transition-all"
            activeClassName="border-red-500/60 bg-red-500/5"
          >
            <label htmlFor="damage-upload" className="cursor-pointer block">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-500/40" />
              <p className="text-xs font-black uppercase tracking-widest text-red-400">Dodaj slike oštećenja</p>
              <p className="text-[10px] text-red-400/50 mt-1">Prevucite slike ovdje</p>
            </label>
          </DropZone>

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

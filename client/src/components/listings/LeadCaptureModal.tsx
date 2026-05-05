import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Check, Loader2, ShieldCheck } from 'lucide-react';
import {
  submitLead,
  type PartnerType,
  type LeadPayload,
  PARTNER_LABEL,
  PARTNER_BLURB,
} from '../../lib/leads';
import { supabase } from '../../lib/supabase';

interface Props {
  partnerType: PartnerType;
  listingId?: string;
  // Pre-fill defaults (e.g. from LoanCalculator)
  defaults?: Partial<LeadPayload>;
  // Optional custom trigger button (else default styled button is used)
  trigger?: React.ReactNode;
  // Optional callback after successful submit
  onSubmitted?: (id: string) => void;
}

// Reusable lead-capture dialog. Renders a small form keyed off partnerType
// (financing / insurance / transport) with conditional fields. Inserts to
// public.leads via lib/leads. Auto-fills name/email from logged-in profile.
export const LeadCaptureModal = ({ partnerType, listingId, defaults, trigger, onSubmitted }: Props) => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<LeadPayload>({
    name: '',
    phone: '',
    email: '',
    ...defaults,
  });

  // Hydrate from profile when the modal opens.
  useEffect(() => {
    if (!open) return;
    let alive = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !alive) return;
      const { data: prof } = await supabase
        .from('profiles')
        .select('company_name, business_phone, whatsapp_number')
        .eq('id', user.id)
        .maybeSingle();
      if (!alive) return;
      setForm((f) => ({
        ...f,
        name: f.name || prof?.company_name || '',
        phone: f.phone || prof?.business_phone || prof?.whatsapp_number || '',
        email: f.email || user.email || '',
      }));
    })();
    return () => { alive = false; };
  }, [open]);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await submitLead({ partner_type: partnerType, listing_id: listingId, payload: form });
      if (!res.ok) {
        setError(res.error || 'Greška pri slanju.');
        return;
      }
      setDone(true);
      onSubmitted?.(res.id!);
      setTimeout(() => { setOpen(false); setDone(false); }, 2200);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Greška.');
    } finally {
      setBusy(false);
    }
  };

  const set = <K extends keyof LeadPayload>(k: K, v: LeadPayload[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        {trigger ?? (
          <button className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-primary text-primary-foreground text-[10px] font-light uppercase tracking-[0.25em] hover:bg-primary/90 transition-colors w-full">
            {PARTNER_LABEL[partnerType]}
          </button>
        )}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[101] -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-background border border-border p-7 max-h-[92vh] overflow-y-auto">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[10px] font-light uppercase tracking-[0.3em] text-primary mb-2 inline-flex items-center gap-2">
                <ShieldCheck className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />
                Bez obveze
              </p>
              <Dialog.Title className="text-lg font-light uppercase tracking-tight text-foreground">
                {PARTNER_LABEL[partnerType]}
              </Dialog.Title>
              <p className="text-xs font-light text-muted-foreground mt-2 leading-relaxed">
                {PARTNER_BLURB[partnerType]}
              </p>
            </div>
            <Dialog.Close asChild>
              <button aria-label="Zatvori" className="p-1 -m-1 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" strokeWidth={1.5} /></button>
            </Dialog.Close>
          </div>

          {done ? (
            <div className="flex items-center gap-3 p-4 border border-green-500/30 bg-green-500/5 text-sm font-light text-green-400">
              <Check className="w-4 h-4" strokeWidth={2} />
              Hvala — javit ćemo se uskoro.
            </div>
          ) : (
            <div className="space-y-3">
              <Field label="Ime i prezime" required>
                <input
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  className="w-full bg-background border border-border px-3 py-2 text-sm font-light text-foreground focus:outline-none focus:border-primary/40"
                  placeholder="Ivan Ivić"
                />
              </Field>
              <Field label="Telefon" required>
                <input
                  inputMode="tel"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  className="w-full bg-background border border-border px-3 py-2 text-sm font-light text-foreground focus:outline-none focus:border-primary/40"
                  placeholder="+385 91 234 5678"
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  value={form.email ?? ''}
                  onChange={(e) => set('email', e.target.value)}
                  className="w-full bg-background border border-border px-3 py-2 text-sm font-light text-foreground focus:outline-none focus:border-primary/40"
                  placeholder="ivan@primjer.hr"
                />
              </Field>

              {/* Per-partner-type extras */}
              {partnerType === 'financing' && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Polog (€)">
                    <input
                      type="number"
                      value={form.down_payment_eur ?? ''}
                      onChange={(e) => set('down_payment_eur', e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full bg-background border border-border px-3 py-2 text-sm font-light text-foreground focus:outline-none focus:border-primary/40 tabular-nums"
                    />
                  </Field>
                  <Field label="Trajanje (mj)">
                    <input
                      type="number"
                      value={form.loan_term_months ?? ''}
                      onChange={(e) => set('loan_term_months', e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full bg-background border border-border px-3 py-2 text-sm font-light text-foreground focus:outline-none focus:border-primary/40 tabular-nums"
                    />
                  </Field>
                  <Field label="Mjesečni prihod (€)">
                    <input
                      type="number"
                      value={form.monthly_income ?? ''}
                      onChange={(e) => set('monthly_income', e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full bg-background border border-border px-3 py-2 text-sm font-light text-foreground focus:outline-none focus:border-primary/40 tabular-nums"
                    />
                  </Field>
                  <Field label="Iznos kredita (€)">
                    <input
                      type="number"
                      value={form.desired_loan_eur ?? ''}
                      onChange={(e) => set('desired_loan_eur', e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full bg-background border border-border px-3 py-2 text-sm font-light text-foreground focus:outline-none focus:border-primary/40 tabular-nums"
                    />
                  </Field>
                </div>
              )}

              {partnerType === 'insurance' && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Godina rođenja">
                    <input
                      type="number"
                      value={form.birth_year ?? ''}
                      onChange={(e) => set('birth_year', e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full bg-background border border-border px-3 py-2 text-sm font-light text-foreground focus:outline-none focus:border-primary/40 tabular-nums"
                    />
                  </Field>
                  <Field label="Vozač (godina)">
                    <input
                      type="number"
                      value={form.driver_years ?? ''}
                      onChange={(e) => set('driver_years', e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full bg-background border border-border px-3 py-2 text-sm font-light text-foreground focus:outline-none focus:border-primary/40 tabular-nums"
                    />
                  </Field>
                  <Field label="Poštanski broj">
                    <input
                      value={form.postcode ?? ''}
                      onChange={(e) => set('postcode', e.target.value)}
                      className="w-full bg-background border border-border px-3 py-2 text-sm font-light text-foreground focus:outline-none focus:border-primary/40"
                      placeholder="10000"
                    />
                  </Field>
                </div>
              )}

              {partnerType === 'transport' && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Iz grada">
                    <input
                      value={form.city_from ?? ''}
                      onChange={(e) => set('city_from', e.target.value)}
                      className="w-full bg-background border border-border px-3 py-2 text-sm font-light text-foreground focus:outline-none focus:border-primary/40"
                      placeholder="Zagreb"
                    />
                  </Field>
                  <Field label="U grad">
                    <input
                      value={form.city_to ?? ''}
                      onChange={(e) => set('city_to', e.target.value)}
                      className="w-full bg-background border border-border px-3 py-2 text-sm font-light text-foreground focus:outline-none focus:border-primary/40"
                      placeholder="Split"
                    />
                  </Field>
                  <Field label="Željeni datum">
                    <input
                      type="date"
                      value={form.preferred_date ?? ''}
                      onChange={(e) => set('preferred_date', e.target.value)}
                      className="w-full bg-background border border-border px-3 py-2 text-sm font-light text-foreground focus:outline-none focus:border-primary/40 col-span-2"
                    />
                  </Field>
                </div>
              )}

              <Field label="Napomena (opcionalno)">
                <textarea
                  value={form.notes ?? ''}
                  onChange={(e) => set('notes', e.target.value)}
                  rows={2}
                  maxLength={1000}
                  className="w-full bg-background border border-border px-3 py-2 text-sm font-light text-foreground focus:outline-none focus:border-primary/40 resize-none"
                />
              </Field>

              {error && <p className="text-xs font-light text-red-400">{error}</p>}

              <p className="text-[10px] font-light text-muted-foreground/80 leading-relaxed">
                Slanjem podataka prihvaćate da vas kontaktiraju partneri Vozila.hr radi izrade ponude. Vaši podaci se ne dijele s trećim stranama izvan dogovorene svrhe.
              </p>

              <button
                onClick={submit}
                disabled={busy || !form.name?.trim() || !form.phone?.trim()}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-primary text-primary-foreground text-[10px] font-light uppercase tracking-[0.25em] hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />}
                Pošalji upit
              </button>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-light uppercase tracking-[0.25em] text-muted-foreground mb-1.5">
        {label}{required && <span className="text-primary"> *</span>}
      </span>
      {children}
    </label>
  );
}

import { useState, useMemo } from 'react';
import { Calculator, Banknote } from 'lucide-react';
import { LeadCaptureModal } from './LeadCaptureModal';

interface Props {
  price: number;
  currency?: string;
  // Optional listing context so the captured lead can be attributed.
  listingId?: string;
}

// Pure-JS amortization calculator. HR auto loan reference rates as of
// April 2026: 5.5–7.5% APR with 10–25% down. Drives 'kreditni partner'
// lead generation later — for now a value-add buyer tool.
export const LoanCalculator = ({ price, currency = 'EUR', listingId }: Props) => {
  const [downPct, setDownPct] = useState(15);
  const [months, setMonths] = useState(60);
  const [rateApr, setRateApr] = useState(6.5);

  const calc = useMemo(() => {
    const down = price * (downPct / 100);
    const principal = price - down;
    const r = rateApr / 100 / 12; // monthly rate
    const n = months;
    if (principal <= 0 || months <= 0) {
      return { down, principal, monthly: 0, total: 0, interest: 0 };
    }
    const monthly = r === 0
      ? principal / n
      : principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const total = monthly * n;
    const interest = total - principal;
    return { down, principal, monthly, total, interest };
  }, [price, downPct, months, rateApr]);

  if (!price || price <= 0) return null;

  return (
    <div className="border border-border bg-muted/20 p-5 lg:p-6">
      <div className="flex items-center gap-2 mb-5">
        <Calculator className="w-4 h-4 text-primary" strokeWidth={1.5} aria-hidden="true" />
        <h3 className="text-[10px] font-light uppercase tracking-[0.3em] text-foreground">
          Kalkulator kredita
        </h3>
      </div>

      {/* Inputs */}
      <div className="space-y-4 mb-5">
        <Slider
          label="Polog"
          value={downPct}
          min={0} max={50} step={1}
          unit="%"
          rightHint={fmt(calc.down, currency)}
          onChange={setDownPct}
        />
        <Slider
          label="Trajanje"
          value={months}
          min={12} max={120} step={6}
          unit="mj"
          rightHint={`${(months / 12).toFixed(1)} godina`}
          onChange={setMonths}
        />
        <Slider
          label="Kamatna stopa"
          value={rateApr}
          min={2} max={12} step={0.1}
          unit="% APR"
          rightHint=""
          onChange={setRateApr}
        />
      </div>

      <div className="h-px bg-border mb-5" />

      {/* Output */}
      <div className="grid grid-cols-3 gap-4 mb-3">
        <div>
          <p className="text-[9px] font-light uppercase tracking-[0.25em] text-muted-foreground mb-1">Mjesečna rata</p>
          <p className="text-xl lg:text-2xl font-light text-primary tabular-nums">
            {fmt(calc.monthly, currency)}
          </p>
        </div>
        <div>
          <p className="text-[9px] font-light uppercase tracking-[0.25em] text-muted-foreground mb-1">Ukupno plaćeno</p>
          <p className="text-base font-light text-foreground tabular-nums">
            {fmt(calc.total + calc.down, currency)}
          </p>
        </div>
        <div>
          <p className="text-[9px] font-light uppercase tracking-[0.25em] text-muted-foreground mb-1">Kamate</p>
          <p className="text-base font-light text-foreground tabular-nums">
            {fmt(calc.interest, currency)}
          </p>
        </div>
      </div>

      <p className="text-[10px] font-light text-muted-foreground/80 leading-relaxed inline-flex items-start gap-1.5 mt-2">
        <Banknote className="w-3 h-3 mt-0.5 flex-shrink-0" strokeWidth={1.5} aria-hidden="true" />
        Indikativni izračun. Stvarna ponuda banke ovisi o kreditnoj sposobnosti i osiguranju.
      </p>

      {/* Pre-approval CTA — financing lead capture */}
      <div className="mt-5 pt-5 border-t border-border">
        <LeadCaptureModal
          partnerType="financing"
          listingId={listingId}
          defaults={{
            desired_loan_eur: Math.max(0, Math.round(calc.principal)),
            down_payment_eur: Math.round(calc.down),
            loan_term_months: months,
          }}
        />
        <p className="mt-2 text-[10px] font-light text-muted-foreground/70 leading-relaxed text-center">
          PBZ · Erste · Zaba — bez obveze, ponuda u 24h.
        </p>
      </div>
    </div>
  );
};

function Slider({ label, value, min, max, step, unit, rightHint, onChange }: {
  label: string; value: number; min: number; max: number; step: number; unit: string; rightHint?: string;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <label className="text-[10px] font-light uppercase tracking-[0.25em] text-muted-foreground">
          {label}
        </label>
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-light text-foreground tabular-nums">
            {value.toLocaleString('hr-HR')} {unit}
          </span>
          {rightHint && (
            <span className="text-[10px] font-light text-muted-foreground tabular-nums">
              · {rightHint}
            </span>
          )}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-primary"
        aria-label={label}
      />
    </div>
  );
}

function fmt(n: number, cur: string) {
  if (!Number.isFinite(n)) return '—';
  return Math.round(n).toLocaleString('hr-HR') + ' ' + (cur === 'EUR' ? '€' : cur);
}

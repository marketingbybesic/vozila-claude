import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FileSearch, Wrench, ExternalLink, Loader2, X, Check } from 'lucide-react';
import {
  listMyVinReports,
  VIN_STATUS_LABEL_HR,
  type VinReportRow,
} from '../../lib/vinReports';
import {
  listMyInspections,
  cancelMyInspection,
  STATUS_LABEL_HR as INSPECTION_STATUS_LABEL,
  TIME_WINDOW_LABEL_HR,
  type InspectionRow,
} from '../../lib/inspections';

// "Moje kupnje" — buyer-facing inventory of paid products on /postavke.
// Two sub-sections: VIN reports + Inspekcije. Recovery surface so buyers
// who lost the email can re-find their PDF or check inspection status.
export const MyPurchasesCard = () => {
  const [vinReports, setVinReports] = useState<VinReportRow[]>([]);
  const [inspections, setInspections] = useState<InspectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    const [vr, ins] = await Promise.all([listMyVinReports(), listMyInspections()]);
    setVinReports(vr);
    setInspections(ins);
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const onCancelInspection = async (id: string) => {
    if (!confirm('Otkazati rezervaciju? Ako je plaćeno, povrat ide automatski.')) return;
    setBusy(id);
    const res = await cancelMyInspection(id);
    setBusy(null);
    if (!res.ok) {
      alert(res.error || 'Greška.');
      return;
    }
    if (res.refunded) {
      alert(`Otkazano. Povrat sredstava pokrenut (${res.refund_id ?? 'Stripe'}). Sredstva stižu u 5-10 radnih dana.`);
    }
    reload();
  };

  if (loading) {
    return (
      <div className="border border-border bg-card p-6 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" strokeWidth={1.5} />
      </div>
    );
  }

  if (vinReports.length === 0 && inspections.length === 0) {
    return null;  // empty state — don't render the card at all
  }

  return (
    <div className="border border-border bg-card p-6">
      <div className="flex items-center gap-3 mb-5">
        <FileSearch className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
        <h2 className="text-xs font-light uppercase tracking-[0.15em] text-foreground">Moje kupnje</h2>
      </div>

      {/* VIN reports */}
      {vinReports.length > 0 && (
        <div className="mb-6">
          <p className="text-[10px] font-light uppercase tracking-[0.25em] text-muted-foreground mb-3">
            VIN izvještaji
          </p>
          <ul className="space-y-2">
            {vinReports.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-2.5 border border-border">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono text-foreground truncate">{r.vin}</p>
                  <p className="text-[10px] font-light uppercase tracking-[0.2em] text-muted-foreground tabular-nums">
                    {new Date(r.created_at).toLocaleDateString('hr-HR')} · {VIN_STATUS_LABEL_HR[r.status]}
                  </p>
                </div>
                {r.status === 'delivered' && r.report_url ? (
                  <a
                    href={r.report_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-light uppercase tracking-[0.2em] bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" strokeWidth={1.5} />
                    Preuzmi PDF
                  </a>
                ) : (
                  <span className={`inline-flex items-center px-2 py-0.5 text-[9px] font-light uppercase tracking-[0.2em] border ${
                    r.status === 'failed'
                      ? 'border-red-500/40 bg-red-500/5 text-red-400'
                      : 'border-amber-500/40 bg-amber-500/5 text-amber-500'
                  }`}>
                    {VIN_STATUS_LABEL_HR[r.status]}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Inspections */}
      {inspections.length > 0 && (
        <div>
          <p className="text-[10px] font-light uppercase tracking-[0.25em] text-muted-foreground mb-3">
            Vozila Inspekcije
          </p>
          <ul className="space-y-2">
            {inspections.map((b) => {
              const cancelable = b.status === 'pending' || b.status === 'paid' || b.status === 'assigned';
              return (
                <li key={b.id} className="px-3 py-3 border border-border">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      {b.listing_id && b.listing_title ? (
                        <Link to={`/listing/${b.listing_id}`} className="text-xs font-light text-foreground hover:text-primary inline-flex items-center gap-1.5 truncate">
                          {b.listing_title}
                          <ExternalLink className="w-3 h-3 opacity-40" strokeWidth={1.5} />
                        </Link>
                      ) : (
                        <p className="text-xs font-light text-foreground truncate">{b.address}</p>
                      )}
                      <p className="text-[10px] font-light uppercase tracking-[0.2em] text-muted-foreground tabular-nums mt-1">
                        {new Date(b.created_at).toLocaleDateString('hr-HR')}
                        {b.preferred_date && ` · ${new Date(b.preferred_date).toLocaleDateString('hr-HR')}`}
                        {b.preferred_time_window && ` · ${TIME_WINDOW_LABEL_HR[b.preferred_time_window]}`}
                      </p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className={`inline-flex items-center px-2 py-0.5 text-[9px] font-light uppercase tracking-[0.2em] border ${
                          b.status === 'completed'
                            ? 'border-green-500/40 bg-green-500/5 text-green-500'
                            : b.status === 'canceled'
                            ? 'border-red-500/40 bg-red-500/5 text-red-400'
                            : b.status === 'paid' || b.status === 'assigned'
                            ? 'border-primary/40 bg-primary/5 text-primary'
                            : 'border-amber-500/40 bg-amber-500/5 text-amber-500'
                        }`}>
                          {INSPECTION_STATUS_LABEL[b.status]}
                        </span>
                        {b.report_url && (
                          <a
                            href={b.report_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] font-light uppercase tracking-[0.2em] text-primary hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" strokeWidth={1.5} />
                            Izvještaj
                          </a>
                        )}
                      </div>
                    </div>
                    {cancelable && (
                      <button
                        onClick={() => onCancelInspection(b.id)}
                        disabled={busy === b.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-light uppercase tracking-[0.2em] border border-border text-muted-foreground hover:border-red-500/40 hover:text-red-400 disabled:opacity-40 transition-colors flex-shrink-0"
                      >
                        {busy === b.id ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} /> : <X className="w-3 h-3" strokeWidth={1.5} />}
                        Otkaži
                      </button>
                    )}
                    {b.status === 'completed' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-light uppercase tracking-[0.2em] text-green-500">
                        <Check className="w-3 h-3" strokeWidth={1.5} /> Gotovo
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

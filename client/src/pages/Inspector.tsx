import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Loader2, MapPin, Clock, Check, ExternalLink, Wrench, Upload, AlertCircle } from 'lucide-react';
import {
  listInspectorQueue,
  claimInspection,
  uploadInspectionReport,
  STATUS_LABEL_HR,
  TIME_WINDOW_LABEL_HR,
  type InspectionRow,
} from '../lib/inspections';
import { getMyAdminRole } from '../lib/admin';

// /inspector — workspace for users with profiles.role = 'inspector' (or admin).
// Lists unassigned 'paid' bookings + the inspector's own assigned ones.
// Inspector clicks "Preuzmi" to claim, then "Predaj izvještaj" to upload + close.
export const Inspector = () => {
  const [authChecked, setAuthChecked] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [rows, setRows] = useState<InspectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getMyAdminRole().then((role) => {
      if (!alive) return;
      // admin / owner / inspector all see the queue
      setAllowed(role === 'admin' || role === 'owner' || role === 'moderator');
      setAuthChecked(true);
    });
    return () => { alive = false; };
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    setRows(await listInspectorQueue());
    setLoading(false);
  }, []);

  useEffect(() => { if (allowed) reload(); }, [allowed, reload]);

  const onClaim = async (id: string) => {
    setBusy(id);
    const res = await claimInspection(id);
    setBusy(null);
    if (!res.ok) { alert(res.error || 'Greška.'); return; }
    reload();
  };

  if (!authChecked) {
    return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-5 h-5 text-muted-foreground animate-spin" strokeWidth={1.5} /></div>;
  }

  if (!allowed) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6 text-center">
        <div>
          <Wrench className="w-10 h-10 text-muted-foreground mx-auto mb-4" strokeWidth={1} />
          <h1 className="text-xl font-light uppercase tracking-tight text-foreground mb-2">Pristup samo za inspektore</h1>
          <p className="text-sm font-light text-muted-foreground mb-6">Vaš račun nema inspektorske ovlasti. Kontaktirajte administratora.</p>
          <Link to="/" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground text-[10px] font-light uppercase tracking-[0.25em] hover:bg-primary/90 transition-colors">Natrag na početnu</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-10 py-8 lg:py-12">
      <Helmet><title>Inspektor — Vozila.hr</title></Helmet>

      <div className="flex items-center gap-3 mb-8">
        <Wrench className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
        <h1 className="text-xl font-light uppercase tracking-[0.2em] text-foreground">Inspektorski queue</h1>
        <span className="ml-auto text-[10px] font-light uppercase tracking-[0.25em] text-muted-foreground tabular-nums">
          {rows.length} {rows.length === 1 ? 'rezervacija' : 'rezervacija'}
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 text-muted-foreground animate-spin" strokeWidth={1.5} /></div>
      ) : rows.length === 0 ? (
        <div className="border border-border bg-card p-8 text-center">
          <p className="text-sm font-light text-muted-foreground">Nema rezervacija u redu.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <InspectionCard key={r.id} row={r} busy={busy === r.id} onClaim={() => onClaim(r.id)} onChange={reload} />
          ))}
        </ul>
      )}
    </div>
  );
};

// Individual booking card with claim → upload-report flow.
const InspectionCard = ({ row, busy, onClaim, onChange }: {
  row: InspectionRow;
  busy: boolean;
  onClaim: () => void;
  onChange: () => void;
}) => {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [reportUrl, setReportUrl] = useState('');
  const [summary, setSummary] = useState('');
  const [score, setScore] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!reportUrl.trim()) { setError('URL izvještaja je obavezan.'); return; }
    setSubmitting(true);
    const res = await uploadInspectionReport({
      bookingId: row.id,
      reportUrl: reportUrl.trim(),
      summary: summary.trim() || undefined,
      score: typeof score === 'number' ? score : undefined,
      inspectorNotes: notes.trim() || undefined,
    });
    setSubmitting(false);
    if (!res.ok) { setError(res.error || 'Greška.'); return; }
    setUploadOpen(false);
    onChange();
  };

  const status = row.status;
  const isMine = !!row.inspector_id;

  return (
    <li className="border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex px-2 py-0.5 text-[9px] font-light uppercase tracking-[0.25em] border ${
              status === 'paid' ? 'border-amber-500/40 bg-amber-500/5 text-amber-500'
              : status === 'assigned' ? 'border-primary/40 bg-primary/5 text-primary'
              : status === 'completed' ? 'border-green-500/40 bg-green-500/5 text-green-500'
              : 'border-border text-muted-foreground'
            }`}>
              {STATUS_LABEL_HR[status]}
            </span>
            <span className="text-[10px] font-light uppercase tracking-[0.25em] text-muted-foreground tabular-nums">
              {new Date(row.created_at).toLocaleString('hr-HR', { dateStyle: 'short', timeStyle: 'short' })}
            </span>
            {row.paid_eur != null && (
              <span className="text-[10px] font-light uppercase tracking-[0.25em] text-green-500 tabular-nums">
                {Number(row.paid_eur).toLocaleString('hr-HR')} €
              </span>
            )}
          </div>

          {row.listing_title && (
            <Link to={`/listing/${row.listing_id}`} target="_blank" className="block group">
              <p className="text-sm font-light text-foreground group-hover:text-primary transition-colors line-clamp-1 inline-flex items-center gap-1.5">
                {row.listing_title}
                <ExternalLink className="w-3 h-3 opacity-40" strokeWidth={1.5} />
              </p>
            </Link>
          )}

          <div className="flex items-center gap-4 flex-wrap text-xs font-light text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="w-3 h-3" strokeWidth={1.5} /> {row.address}
            </span>
            {row.preferred_date && (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-3 h-3" strokeWidth={1.5} />
                {new Date(row.preferred_date).toLocaleDateString('hr-HR')}
                {row.preferred_time_window && ` · ${TIME_WINDOW_LABEL_HR[row.preferred_time_window]}`}
              </span>
            )}
          </div>

          {row.notes && (
            <p className="text-xs font-light text-muted-foreground leading-relaxed border-l-2 border-border pl-3">{row.notes}</p>
          )}

          {row.report_url && (
            <a href={row.report_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[10px] font-light uppercase tracking-[0.2em] text-primary hover:underline">
              <ExternalLink className="w-3 h-3" strokeWidth={1.5} /> Izvještaj
            </a>
          )}
        </div>

        <div className="flex flex-col gap-2 flex-shrink-0">
          {status === 'paid' && !isMine && (
            <button onClick={onClaim} disabled={busy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-light uppercase tracking-[0.2em] bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30">
              <Check className="w-3 h-3" strokeWidth={1.5} /> Preuzmi
            </button>
          )}
          {status === 'assigned' && !uploadOpen && (
            <button onClick={() => setUploadOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-light uppercase tracking-[0.2em] bg-primary text-primary-foreground hover:bg-primary/90">
              <Upload className="w-3 h-3" strokeWidth={1.5} /> Predaj izvještaj
            </button>
          )}
        </div>
      </div>

      {uploadOpen && (
        <div className="mt-4 pt-4 border-t border-border space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block sm:col-span-2">
              <span className="block text-[10px] font-light uppercase tracking-[0.25em] text-muted-foreground mb-1.5">URL izvještaja (PDF / link)</span>
              <input
                type="url"
                value={reportUrl}
                onChange={(e) => setReportUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-background border border-border px-3 py-2 text-sm font-light text-foreground focus:outline-none focus:border-primary"
              />
            </label>
            <label className="block">
              <span className="block text-[10px] font-light uppercase tracking-[0.25em] text-muted-foreground mb-1.5">Ocjena (0-100)</span>
              <input
                type="number"
                min={0}
                max={100}
                value={score}
                onChange={(e) => setScore(e.target.value === '' ? '' : Math.max(0, Math.min(100, Number(e.target.value))))}
                className="w-full bg-background border border-border px-3 py-2 text-sm font-light text-foreground focus:outline-none focus:border-primary tabular-nums"
              />
            </label>
            <label className="block">
              <span className="block text-[10px] font-light uppercase tracking-[0.25em] text-muted-foreground mb-1.5">Sažetak</span>
              <input
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Solidno stanje, manji nedostaci…"
                className="w-full bg-background border border-border px-3 py-2 text-sm font-light text-foreground focus:outline-none focus:border-primary"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="block text-[10px] font-light uppercase tracking-[0.25em] text-muted-foreground mb-1.5">Bilješke (interno)</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full bg-background border border-border px-3 py-2 text-sm font-light text-foreground focus:outline-none focus:border-primary resize-none"
              />
            </label>
          </div>
          {error && <div className="flex items-start gap-2 text-[10px] font-light text-red-400"><AlertCircle className="w-3 h-3 mt-0.5" strokeWidth={1.5} />{error}</div>}
          <div className="flex items-center gap-2">
            <button onClick={submit} disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-[10px] font-light uppercase tracking-[0.25em] bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30">
              {submitting ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} /> : <Check className="w-3 h-3" strokeWidth={1.5} />} Predaj
            </button>
            <button onClick={() => setUploadOpen(false)}
              className="px-4 py-2 text-[10px] font-light uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground transition-colors">
              Odustani
            </button>
          </div>
        </div>
      )}
    </li>
  );
};

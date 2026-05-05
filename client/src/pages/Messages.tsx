import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Send, ChevronLeft, Loader2, AlertCircle, ShieldAlert, MessageCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  ensureConversation,
  getConversation,
  listMyConversations,
  listMessages,
  markConversationRead,
  sendMessage,
  subscribeToMessages,
  subscribeToMyConversations,
  detectScamSignals,
  type Conversation,
  type Message,
  NotAuthedError,
} from '../lib/messaging';

// /poruke — split-pane inbox.
// Left: list of my conversations (unread first).
// Right: open thread or empty state.
// Realtime: new messages append live; conversation list refreshes on any change.
//
// Mobile: only one pane visible at a time; conversation list hidden when a
// thread is open. The route /poruke/:id mounts the same component and decides.
export const Messages = () => {
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [meId, setMeId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auth gate
  useEffect(() => {
    let alive = true;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!alive) return;
      setAuthed(!!user);
      setMeId(user?.id ?? null);
      setAuthChecked(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session?.user);
      setMeId(session?.user?.id ?? null);
    });
    return () => { alive = false; listener?.subscription.unsubscribe(); };
  }, []);

  // Load conversation list + subscribe to changes
  useEffect(() => {
    if (!authed) return;
    let alive = true;
    const reload = () => {
      listMyConversations().then((list) => { if (alive) setConversations(list); }).catch(() => {});
    };
    reload();
    const ch = subscribeToMyConversations(reload);
    return () => { alive = false; ch?.unsubscribe(); };
  }, [authed]);

  // When the route id changes, load that thread + mark read + subscribe
  useEffect(() => {
    if (!authed || !routeId) { setActive(null); setMessages([]); return; }
    let alive = true;
    setError(null);
    (async () => {
      try {
        const conv = await getConversation(routeId);
        if (!alive) return;
        if (!conv) {
          setError('Razgovor nije pronađen.');
          setActive(null);
          return;
        }
        setActive(conv);
        const msgs = await listMessages(conv.id);
        if (!alive) return;
        setMessages(msgs);
        markConversationRead(conv.id).catch(() => {});
      } catch (e) {
        if (e instanceof NotAuthedError) {
          navigate('/profil');
        } else {
          setError(e instanceof Error ? e.message : 'Greška pri učitavanju razgovora.');
        }
      }
    })();
    const ch = subscribeToMessages(routeId, (m) => {
      setMessages((prev) => (prev.some((p) => p.id === m.id) ? prev : [...prev, m]));
      markConversationRead(routeId).catch(() => {});
    });
    return () => { alive = false; ch?.unsubscribe(); };
  }, [authed, routeId, navigate]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, active?.id]);

  const scamCheck = useMemo(() => detectScamSignals(draft), [draft]);

  const onSend = async () => {
    if (!active) return;
    setBusy(true);
    setError(null);
    try {
      const msg = await sendMessage(active.id, draft);
      setMessages((prev) => [...prev, msg]);
      setDraft('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Slanje nije uspjelo.');
    } finally {
      setBusy(false);
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" strokeWidth={1.5} />
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6 text-center">
        <div>
          <MessageCircle className="w-10 h-10 text-muted-foreground mx-auto mb-4" strokeWidth={1} />
          <h1 className="text-xl font-light uppercase tracking-tight text-foreground mb-2">Prijava potrebna</h1>
          <p className="text-sm font-light text-muted-foreground mb-6">Za pristup porukama prijavite se na svoj račun.</p>
          <Link to="/profil" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground text-[10px] font-light uppercase tracking-[0.25em] hover:bg-primary/90 transition-colors">
            Prijava
          </Link>
        </div>
      </div>
    );
  }

  const otherPartyName = (c: Conversation) => {
    if (!meId) return '—';
    const isBuyer = c.buyer_id === meId;
    const other = isBuyer ? c.seller_profile : c.buyer_profile;
    return other?.company_name || (isBuyer ? 'Prodavač' : 'Kupac');
  };

  const myUnreadFor = (c: Conversation) => (meId === c.buyer_id ? c.buyer_unread : c.seller_unread);

  return (
    <div className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-10 py-6 lg:py-10">
      <Helmet><title>Poruke | Vozila.hr</title></Helmet>
      <h1 className="text-xl font-light uppercase tracking-[0.2em] text-foreground mb-6">Poruke</h1>

      <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-0 border border-border min-h-[60vh]">
        {/* List */}
        <div className={`border-r border-border bg-muted/10 ${routeId ? 'hidden md:block' : 'block'}`}>
          {conversations.length === 0 ? (
            <div className="p-6 text-xs font-light text-muted-foreground leading-relaxed">
              Još nemate razgovora. Kad pošaljete poruku iz oglasa, razgovor se pojavljuje ovdje.
            </div>
          ) : (
            <ul>
              {conversations.map((c) => {
                const unread = myUnreadFor(c);
                const selected = c.id === routeId;
                return (
                  <li key={c.id}>
                    <Link
                      to={`/poruke/${c.id}`}
                      className={`block px-4 py-4 border-b border-border transition-colors ${selected ? 'bg-background' : 'hover:bg-background/50'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-light uppercase tracking-[0.2em] text-muted-foreground truncate">
                            {otherPartyName(c)}
                          </p>
                          <p className="text-sm font-light text-foreground truncate mt-1">
                            {c.listing?.title ?? 'Oglas'}
                          </p>
                        </div>
                        {unread > 0 && (
                          <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-primary text-primary-foreground text-[10px] font-light tabular-nums">
                            {unread}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-light uppercase tracking-[0.2em] text-muted-foreground/60 mt-2 tabular-nums">
                        {new Date(c.last_message_at).toLocaleString('hr-HR', { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Thread */}
        <div className={`flex flex-col ${routeId ? 'block' : 'hidden md:flex md:items-center md:justify-center'}`}>
          {!active ? (
            <div className="text-xs font-light text-muted-foreground p-8 text-center">
              Odaberite razgovor s lijeve strane.
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-border flex items-center gap-3">
                <Link to="/poruke" className="md:hidden text-muted-foreground"><ChevronLeft className="w-4 h-4" strokeWidth={1.5} /></Link>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-light uppercase tracking-[0.25em] text-muted-foreground truncate">
                    {otherPartyName(active)}
                  </p>
                  {active.listing && (
                    <Link to={`/listing/${active.listing.id}`} className="text-sm font-light text-foreground truncate hover:underline">
                      {active.listing.title}
                    </Link>
                  )}
                </div>
                {active.listing?.price !== undefined && (
                  <p className="text-sm font-light text-foreground tabular-nums">
                    {active.listing.price === 0 ? 'Na upit' : `${active.listing.price.toLocaleString('hr-HR')} €`}
                  </p>
                )}
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-4 bg-background">
                {messages.length === 0 && (
                  <p className="text-center text-xs font-light text-muted-foreground py-12">
                    Pošaljite prvu poruku da započnete razgovor.
                  </p>
                )}
                {messages.map((m) => {
                  const mine = m.sender_id === meId;
                  return (
                    <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] px-4 py-3 ${mine ? 'bg-primary text-primary-foreground' : 'bg-muted/40 text-foreground border border-border'}`}>
                        <p className="text-sm font-light leading-relaxed whitespace-pre-wrap break-words">{m.body}</p>
                        <p className={`text-[9px] font-light uppercase tracking-[0.25em] mt-2 tabular-nums ${mine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                          {new Date(m.created_at).toLocaleString('hr-HR', { dateStyle: 'short', timeStyle: 'short' })}
                          {m.flagged && <span className="ml-2 text-amber-400">⚠ flagged</span>}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Composer */}
              <div className="border-t border-border bg-muted/10 px-4 py-3">
                {scamCheck.suspicious && draft.length > 0 && (
                  <div className="mb-3 flex items-start gap-2 px-3 py-2 border border-amber-500/40 bg-amber-500/5 text-[10px] font-light text-amber-300">
                    <ShieldAlert className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" strokeWidth={1.5} />
                    <div>
                      {scamCheck.reasons.map((r) => <div key={r}>{r}</div>)}
                    </div>
                  </div>
                )}
                {error && (
                  <div className="mb-3 flex items-start gap-2 px-3 py-2 border border-red-500/40 bg-red-500/5 text-[10px] font-light text-red-300">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" strokeWidth={1.5} />
                    {error}
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onSend(); }
                    }}
                    placeholder="Napišite poruku… (Ctrl/Cmd+Enter za slanje)"
                    rows={3}
                    maxLength={4000}
                    className="flex-1 resize-none bg-background border border-border px-3 py-2 text-sm font-light text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/40"
                  />
                  <button
                    onClick={onSend}
                    disabled={busy || !draft.trim()}
                    className="inline-flex items-center gap-2 px-4 py-3 bg-primary text-primary-foreground text-[10px] font-light uppercase tracking-[0.25em] hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} /> : <Send className="w-3.5 h-3.5" strokeWidth={1.5} />}
                    Pošalji
                  </button>
                </div>
                <p className="text-[10px] font-light uppercase tracking-[0.2em] text-muted-foreground/60 mt-2 tabular-nums">
                  {draft.length} / 4000
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper exported for ContactActionHub deep-link path.
export async function startConversationAndGo(listingId: string, navigate: (p: string) => void): Promise<void> {
  const conv = await ensureConversation(listingId);
  navigate(`/poruke/${conv.id}`);
}

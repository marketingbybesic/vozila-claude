import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, Loader2, MessageCircle, Bookmark, Sparkles, CreditCard, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  listMyNotifications,
  getMyUnreadCount,
  markNotificationRead,
  markAllRead,
  subscribeToMyNotifications,
  notificationLink,
  notificationTitle,
  type NotificationRow,
} from '../../lib/notifications';
import { getUnreadTotal, subscribeToMyConversations } from '../../lib/messaging';

// Bell + flyout. Combines two unread sources into one badge:
//   • notifications.read_at IS NULL  (saved-search hits, boost confirmations…)
//   • conversations.{buyer,seller}_unread (live message counters — kept here
//     too so the bell doesn't disappear when there are unread messages and
//     no notifications row yet — the trigger-driven message email path
//     populates a notifications row, but realtime arrival is faster)
//
// Click → flyout opens, scopes auto-mark for items as the user clicks them.
export const NotificationsFlyout = () => {
  const [authed, setAuthed] = useState(false);
  const [meId, setMeId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [unreadMsgs, setUnreadMsgs] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!alive) return;
      setAuthed(!!user);
      setMeId(user?.id ?? null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session?.user);
      setMeId(session?.user?.id ?? null);
      if (!session?.user) {
        setItems([]); setUnreadNotifs(0); setUnreadMsgs(0); setOpen(false);
      }
    });
    return () => { alive = false; listener?.subscription.unsubscribe(); };
  }, []);

  // Counters (refresh on realtime change for either source).
  useEffect(() => {
    if (!authed || !meId) return;
    let alive = true;
    const refresh = () => {
      getMyUnreadCount().then((n) => { if (alive) setUnreadNotifs(n); }).catch(() => {});
      getUnreadTotal().then((n) => { if (alive) setUnreadMsgs(n); }).catch(() => {});
    };
    refresh();
    const notifCh = subscribeToMyNotifications(meId, () => refresh());
    const convCh = subscribeToMyConversations(refresh);
    return () => {
      alive = false;
      notifCh?.unsubscribe();
      convCh?.unsubscribe();
    };
  }, [authed, meId]);

  // Lazy-load list on open.
  useEffect(() => {
    if (!open || !authed) return;
    setLoading(true);
    listMyNotifications(30).then((list) => { setItems(list); setLoading(false); }).catch(() => setLoading(false));
  }, [open, authed]);

  // Click-outside to close.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  if (!authed) return null;

  const total = unreadNotifs + unreadMsgs;
  const display = total > 99 ? '99+' : total > 0 ? String(total) : '';

  const onItemClick = async (n: NotificationRow) => {
    if (!n.read_at) {
      await markNotificationRead(n.id).catch(() => {});
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
      setUnreadNotifs((c) => Math.max(0, c - 1));
    }
    setOpen(false);
  };

  const onMarkAllRead = async () => {
    await markAllRead().catch(() => {});
    setItems((prev) => prev.map((x) => (x.read_at ? x : { ...x, read_at: new Date().toISOString() })));
    setUnreadNotifs(0);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative px-3 py-2 hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-300"
        title={total > 0 ? `${total} novih obavijesti` : 'Obavijesti'}
        aria-label="Obavijesti"
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" strokeWidth={1.5} />
        {display && (
          <span className="absolute top-0 right-0 min-w-[16px] h-4 px-1 bg-primary text-primary-foreground text-[10px] font-light flex items-center justify-center shadow-sm tabular-nums">
            {display}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-[360px] max-w-[calc(100vw-32px)] bg-background border border-border shadow-2xl z-[60] animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="text-[10px] font-light uppercase tracking-[0.25em] text-foreground">Obavijesti</p>
            {unreadNotifs > 0 && (
              <button
                onClick={onMarkAllRead}
                className="inline-flex items-center gap-1 text-[10px] font-light uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors"
              >
                <CheckCheck className="w-3 h-3" strokeWidth={1.5} />
                Označi sve
              </button>
            )}
          </div>

          {/* Quick-link to messages when there are unread chats */}
          {unreadMsgs > 0 && (
            <Link
              to="/poruke"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-3 border-b border-border hover:bg-muted/30 transition-colors"
            >
              <MessageCircle className="w-4 h-4 text-primary" strokeWidth={1.5} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-light text-foreground">{unreadMsgs} {unreadMsgs === 1 ? 'nova poruka' : 'novih poruka'}</p>
                <p className="text-[10px] font-light uppercase tracking-[0.2em] text-muted-foreground mt-0.5">Otvori inbox</p>
              </div>
            </Link>
          )}

          <div className="max-h-[420px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" strokeWidth={1.5} />
              </div>
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs font-light text-muted-foreground">
                Nema novih obavijesti.
              </p>
            ) : (
              <ul>
                {items.map((n) => {
                  const link = notificationLink(n);
                  const Icon = iconFor(n.type);
                  const row = (
                    <div className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                      <div className={`mt-0.5 ${n.read_at ? 'opacity-40' : 'text-primary'}`}>
                        <Icon className="w-4 h-4" strokeWidth={1.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs leading-relaxed ${n.read_at ? 'font-light text-muted-foreground' : 'font-light text-foreground'}`}>
                          {notificationTitle(n)}
                        </p>
                        <p className="text-[10px] font-light uppercase tracking-[0.2em] text-muted-foreground/60 mt-1 tabular-nums">
                          {new Date(n.created_at).toLocaleString('hr-HR', { dateStyle: 'short', timeStyle: 'short' })}
                        </p>
                      </div>
                      {!n.read_at && (
                        <span className="mt-1.5 w-1.5 h-1.5 bg-primary flex-shrink-0" aria-hidden="true" />
                      )}
                    </div>
                  );
                  return (
                    <li key={n.id} className="border-b border-border last:border-0">
                      {link ? (
                        <Link to={link} onClick={() => onItemClick(n)} className="block">
                          {row}
                        </Link>
                      ) : (
                        <button onClick={() => onItemClick(n)} className="block w-full text-left">
                          {row}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="border-t border-border px-4 py-2 text-center">
            <Link
              to="/postavke"
              onClick={() => setOpen(false)}
              className="text-[10px] font-light uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground transition-colors"
            >
              Postavke obavijesti
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

function iconFor(type: string): typeof Bell {
  switch (type) {
    case 'new_message':           return MessageCircle;
    case 'saved_search_hits':     return Bookmark;
    case 'boost_purchased':       return Sparkles;
    case 'subscription_started':
    case 'subscription_canceled': return CreditCard;
    case 'listing_expiring':
    case 'listing_sold':          return AlertCircle;
    case 'auction_outbid':
    case 'auction_won':
    case 'auction_seller_sold':
    case 'auction_seller_unsold':
    case 'auction_approved':
    case 'auction_rejected':      return Sparkles;
    case 'vin_report_ready':      return AlertCircle;
    case 'inspection_assigned':
    case 'inspection_canceled':   return AlertCircle;
    default:                      return Bell;
  }
}

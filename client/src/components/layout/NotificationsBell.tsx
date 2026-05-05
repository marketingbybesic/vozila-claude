import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { getUnreadTotal, subscribeToMyConversations } from '../../lib/messaging';
import { supabase } from '../../lib/supabase';

// Header bell — shows total unread message count, links to /poruke.
// Subscribes to realtime conversation changes so the badge updates live.
export const NotificationsBell = () => {
  const [authed, setAuthed] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    let alive = true;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!alive) return;
      setAuthed(!!user);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session?.user);
      if (!session?.user) setCount(0);
    });
    return () => { alive = false; listener?.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!authed) return;
    let alive = true;
    const refresh = () => {
      getUnreadTotal().then((n) => { if (alive) setCount(n); }).catch(() => {});
    };
    refresh();
    const ch = subscribeToMyConversations(refresh);
    return () => { alive = false; ch?.unsubscribe(); };
  }, [authed]);

  if (!authed) return null;

  return (
    <Link
      to="/poruke"
      className="relative px-3 py-2 hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-300"
      title={count > 0 ? `${count} novih poruka` : 'Poruke'}
      aria-label="Poruke"
    >
      <MessageCircle className="h-5 w-5" strokeWidth={1.5} />
      {count > 0 && (
        <span className="absolute top-0 right-0 min-w-[16px] h-4 px-1 bg-primary text-primary-foreground text-[10px] font-light flex items-center justify-center shadow-sm tabular-nums">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
};

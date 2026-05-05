import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Mail, X, Send, Phone, Eye } from 'lucide-react';
import { trackLead } from '../../lib/leadTracking';
import { ensureConversation, sendMessage, detectScamSignals, NotAuthedError } from '../../lib/messaging';

interface ContactActionHubProps {
  listingId: string;
  listingTitle: string;
  listingUrl: string;
  contactPhone?: string;
  contactEmail?: string;
  // When true, contactPhone is hidden behind a Reveal click and the WhatsApp
  // button is gated. This is the anti-scam path used until the buyer messages.
  obfuscatePhone?: boolean;
}

// Mask all but the last 2 digits of a phone string. "+385 91 234 5678" → "+385 9X XXX XX78".
function maskPhone(p: string): string {
  const digits = p.replace(/\D/g, '');
  if (digits.length < 4) return p;
  const visible = digits.slice(-2);
  return `${p.slice(0, p.length - digits.length + 2).replace(/\d/g, '+').replace(/\++/, '+').padEnd(p.length - 2, 'X')}${visible}`;
}

export const ContactActionHub = ({
  listingId,
  listingTitle,
  listingUrl,
  contactPhone,
  contactEmail,
  obfuscatePhone = false,
}: ContactActionHubProps) => {
  const navigate = useNavigate();
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [messageSent, setMessageSent] = useState(false);
  const [phoneRevealed, setPhoneRevealed] = useState(!obfuscatePhone);

  const handleWhatsAppClick = async () => {
    // Track lead
    await trackLead(listingId, 'whatsapp');

    // Pre-fill message
    const message = `Pozdrav, zainteresiran sam za ${listingTitle} (link: ${listingUrl}).`;
    const encodedMessage = encodeURIComponent(message);

    // Open WhatsApp
    if (contactPhone) {
      const phoneNumber = contactPhone.replace(/\D/g, '');
      window.open(`https://wa.me/${phoneNumber}?text=${encodedMessage}`, '_blank');
    }
  };

  const handleMessageClick = async () => {
    await trackLead(listingId, 'message');
    setShowMessageModal(true);
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) {
      setMessageError('Poruka ne može biti prazna');
      return;
    }

    setIsSendingMessage(true);
    setMessageError(null);

    try {
      const conv = await ensureConversation(listingId);
      await sendMessage(conv.id, messageText);
      setMessageSent(true);
      setMessageText('');
      setTimeout(() => {
        setShowMessageModal(false);
        setMessageSent(false);
        navigate(`/poruke/${conv.id}`);
      }, 1200);
    } catch (error) {
      if (error instanceof NotAuthedError) {
        setMessageError('Prijavite se za slanje poruke prodavaču.');
      } else {
        setMessageError(error instanceof Error ? error.message : 'Greška pri slanju poruke');
      }
    } finally {
      setIsSendingMessage(false);
    }
  };

  const draftScam = messageText ? detectScamSignals(messageText) : { suspicious: false, reasons: [] as string[] };

  return (
    <>
      {/* Action Buttons */}
      <div className="space-y-3">
        {/* Internal Message Button — primary CTA, anti-scam path */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleMessageClick}
          className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-primary text-primary-foreground rounded-none font-black uppercase tracking-widest text-xs hover:bg-primary/90 transition-all duration-300"
        >
          <Mail className="w-5 h-5" strokeWidth={2} />
          Pošalji poruku prodavaču
        </motion.button>

        {/* WhatsApp Lead Button (gated by reveal when obfuscation is on) */}
        {contactPhone && phoneRevealed && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleWhatsAppClick}
            className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-green-600 text-white rounded-none border border-green-600 font-black uppercase tracking-widest text-xs hover:bg-white hover:text-green-600 transition-all duration-300"
          >
            <MessageCircle className="w-5 h-5" strokeWidth={2} />
            Pošalji upit na WhatsApp
          </motion.button>
        )}

        {/* Phone reveal — anti-scam */}
        {contactPhone && !phoneRevealed && (
          <button
            onClick={() => { setPhoneRevealed(true); trackLead(listingId, 'phone'); }}
            className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-card border border-border rounded-none text-foreground font-black uppercase tracking-widest text-xs hover:border-primary transition-all duration-300"
          >
            <Eye className="w-4 h-4" strokeWidth={1.5} />
            <span className="tabular-nums opacity-70">{maskPhone(contactPhone)}</span>
            <span className="opacity-60">— klikni za prikaz</span>
          </button>
        )}
        {contactPhone && phoneRevealed && (
          <a
            href={`tel:${contactPhone}`}
            onClick={() => trackLead(listingId, 'phone')}
            className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-card border border-border rounded-none text-foreground font-black uppercase tracking-widest text-xs hover:border-primary transition-all duration-300"
          >
            <Phone className="w-4 h-4" strokeWidth={1.5} />
            <span className="tabular-nums">{contactPhone}</span>
          </a>
        )}

        {/* Email Button (if available) */}
        {contactEmail && (
          <motion.a
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            href={`mailto:${contactEmail}`}
            onClick={() => trackLead(listingId, 'email')}
            className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-black border border-border text-white rounded-none font-black uppercase tracking-widest text-xs hover:bg-white hover:text-black transition-all duration-300"
          >
            <Mail className="w-5 h-5" strokeWidth={2} />
            Pošalji email
          </motion.a>
        )}
      </div>

      {/* Internal Message Modal */}
      <AnimatePresence>
        {showMessageModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-black border border-border rounded-none p-8 space-y-6"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-foreground">Pošalji poruku</h2>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">
                    Direktna poruka prodavatelju
                  </p>
                </div>
                <button
                  onClick={() => setShowMessageModal(false)}
                  className="p-2 hover:bg-muted/50 rounded-none transition-all"
                >
                  <X className="w-5 h-5 text-foreground" strokeWidth={2} />
                </button>
              </div>

              {/* Success Message */}
              {messageSent ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-4 border border-green-500/30 bg-green-500/5 rounded-none text-center"
                >
                  <p className="text-sm font-black text-green-400 uppercase tracking-widest">
                    ✓ Poruka je poslana!
                  </p>
                  <p className="text-xs text-green-300 mt-2">
                    Prodavatelj će vam odgovoriti uskoro.
                  </p>
                </motion.div>
              ) : (
                <>
                  {/* Listing Info */}
                  <div className="p-4 border border-border bg-muted/30 rounded-none">
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">
                      Oglas
                    </p>
                    <p className="text-sm text-foreground">{listingTitle}</p>
                  </div>

                  {/* Error Message */}
                  {messageError && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 border border-red-500/30 bg-red-500/5 rounded-none"
                    >
                      <p className="text-xs text-red-400">{messageError}</p>
                    </motion.div>
                  )}

                  {/* Anti-scam tip when message contains red-flag patterns */}
                  {draftScam.suspicious && (
                    <div className="p-3 border border-amber-500/30 bg-amber-500/5">
                      {draftScam.reasons.map((r) => (
                        <p key={r} className="text-[10px] text-amber-300 leading-relaxed">{r}</p>
                      ))}
                    </div>
                  )}

                  {/* Message Input */}
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">
                      Poruka
                    </label>
                    <textarea
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Napišite vašu poruku..."
                      maxLength={4000}
                      className="w-full bg-card border border-border rounded-none px-4 py-3 text-xs text-white placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground/40 transition-all resize-none h-32"
                    />
                    <p className="text-xs text-muted-foreground/70 mt-2">
                      {messageText.length} / 4000 znakova
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4 border-t border-border">
                    <button
                      onClick={() => setShowMessageModal(false)}
                      className="flex-1 px-6 py-3 bg-card border border-border text-foreground rounded-none font-black uppercase tracking-widest text-xs hover:bg-muted transition-all"
                    >
                      Otkaži
                    </button>
                    <button
                      onClick={handleSendMessage}
                      disabled={isSendingMessage || !messageText.trim()}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white text-black rounded-none font-black uppercase tracking-widest text-xs hover:bg-foreground/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-4 h-4" strokeWidth={2} />
                      {isSendingMessage ? 'Slanje...' : 'Pošalji'}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

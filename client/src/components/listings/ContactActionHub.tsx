import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Mail, X, Send } from 'lucide-react';
import { trackLead } from '../../lib/leadTracking';

interface ContactActionHubProps {
  listingId: string;
  listingTitle: string;
  listingUrl: string;
  contactPhone?: string;
  contactEmail?: string;
  ownerId: string;
}

export const ContactActionHub = ({
  listingId,
  listingTitle,
  listingUrl,
  contactPhone,
  contactEmail,
  ownerId,
}: ContactActionHubProps) => {
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [messageSent, setMessageSent] = useState(false);

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
    // Track lead
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
      // In production, this would send to a messages table
      // For now, we'll simulate the send
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Here you would insert into a messages table:
      // await supabase.from('messages').insert({
      //   sender_id: currentUserId,
      //   receiver_id: ownerId,
      //   listing_id: listingId,
      //   content: messageText,
      //   created_at: new Date().toISOString(),
      // });

      setMessageSent(true);
      setMessageText('');
      setTimeout(() => {
        setShowMessageModal(false);
        setMessageSent(false);
      }, 2000);
    } catch (error) {
      setMessageError(error instanceof Error ? error.message : 'Greška pri slanju poruke');
    } finally {
      setIsSendingMessage(false);
    }
  };

  return (
    <>
      {/* Action Buttons */}
      <div className="space-y-3">
        {/* WhatsApp Lead Button */}
        {contactPhone && (
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

        {/* Internal Message Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleMessageClick}
          className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-black border border-white/10 text-white rounded-none font-black uppercase tracking-widest text-xs hover:bg-white hover:text-black transition-all duration-300"
        >
          <Mail className="w-5 h-5" strokeWidth={2} />
          Pošalji poruku
        </motion.button>

        {/* Email Button (if available) */}
        {contactEmail && (
          <motion.a
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            href={`mailto:${contactEmail}`}
            onClick={() => trackLead(listingId, 'email')}
            className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-black border border-white/10 text-white rounded-none font-black uppercase tracking-widest text-xs hover:bg-white hover:text-black transition-all duration-300"
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
              className="w-full max-w-md bg-black border border-white/10 rounded-none p-8 space-y-6"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-white">Pošalji poruku</h2>
                  <p className="text-xs text-neutral-400 uppercase tracking-widest mt-1">
                    Direktna poruka prodavatelju
                  </p>
                </div>
                <button
                  onClick={() => setShowMessageModal(false)}
                  className="p-2 hover:bg-white/10 rounded-none transition-all"
                >
                  <X className="w-5 h-5 text-white" strokeWidth={2} />
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
                  <div className="p-4 border border-white/10 bg-white/5 rounded-none">
                    <p className="text-xs font-black uppercase tracking-widest text-white/60 mb-2">
                      Oglas
                    </p>
                    <p className="text-sm text-white">{listingTitle}</p>
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

                  {/* Message Input */}
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-white/60 mb-2">
                      Poruka
                    </label>
                    <textarea
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Napišite vašu poruku..."
                      className="w-full bg-black border border-white/10 rounded-none px-4 py-3 text-xs text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-all resize-none h-32"
                    />
                    <p className="text-xs text-neutral-500 mt-2">
                      {messageText.length} / 500 znakova
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4 border-t border-white/10">
                    <button
                      onClick={() => setShowMessageModal(false)}
                      className="flex-1 px-6 py-3 bg-neutral-900 border border-white/10 text-white rounded-none font-black uppercase tracking-widest text-xs hover:bg-neutral-800 transition-all"
                    >
                      Otkaži
                    </button>
                    <button
                      onClick={handleSendMessage}
                      disabled={isSendingMessage || !messageText.trim()}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white text-black rounded-none font-black uppercase tracking-widest text-xs hover:bg-neutral-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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

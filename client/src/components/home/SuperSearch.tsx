import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';

const SEARCH_QUERIES = [
  'Alfa Romeo Giulia u Zagrebu, >200ks',
  'Porsche 911 s Porsche Approved jamstvom',
  'BMW M3 ispod 100.000 km, prvi vlasnik',
  'Električni automobili s dosegom preko 400km',
  'Obiteljski SUV do 30.000€ u Splitu',
];

export const SuperSearch = () => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentQueryIndex, setCurrentQueryIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);
  const [charIndex, setCharIndex] = useState(0);

  const currentQuery = SEARCH_QUERIES[currentQueryIndex];

  useEffect(() => {
    const typingSpeed = 50; // ms per character
    const erasingSpeed = 30; // ms per character
    const pauseBeforeErase = 3000; // ms before starting to erase
    const pauseBeforeNextQuery = 500; // ms before typing next query

    let timeout: NodeJS.Timeout;

    if (isTyping) {
      // Typing phase
      if (charIndex < currentQuery.length) {
        timeout = setTimeout(() => {
          setDisplayedText(currentQuery.slice(0, charIndex + 1));
          setCharIndex(charIndex + 1);
        }, typingSpeed);
      } else {
        // Finished typing, pause before erasing
        timeout = setTimeout(() => {
          setIsTyping(false);
        }, pauseBeforeErase);
      }
    } else {
      // Erasing phase
      if (charIndex > 0) {
        timeout = setTimeout(() => {
          setDisplayedText(currentQuery.slice(0, charIndex - 1));
          setCharIndex(charIndex - 1);
        }, erasingSpeed);
      } else {
        // Finished erasing, move to next query
        timeout = setTimeout(() => {
          setCurrentQueryIndex((prev) => (prev + 1) % SEARCH_QUERIES.length);
          setIsTyping(true);
        }, pauseBeforeNextQuery);
      }
    }

    return () => clearTimeout(timeout);
  }, [charIndex, isTyping, currentQuery]);

  return (
    <div className="relative w-full bg-black py-24 px-8 border-b border-white/10">
      <div className="max-w-2xl mx-auto">
        {/* Input Container with Glassmorphism */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-white/0 rounded-none blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="relative bg-black/40 backdrop-blur-xl border border-white/10 rounded-none overflow-hidden">
            {/* Search Icon */}
            <div className="absolute left-8 top-1/2 -translate-y-1/2 text-white/40">
              <Search className="w-5 h-5" strokeWidth={1.5} />
            </div>

            {/* Input Field */}
            <input
              type="text"
              placeholder="Pretraži vozila..."
              className="w-full pl-20 pr-8 py-6 bg-transparent text-white font-light text-lg focus:outline-none placeholder-white/20 caret-white"
            />

            {/* AI Typing Animation Overlay */}
            <div className="absolute left-20 top-1/2 -translate-y-1/2 pointer-events-none">
              <motion.span
                className="text-white/40 font-light text-lg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                {displayedText}
              </motion.span>
              
              {/* Blinking Cursor */}
              <motion.span
                className="inline-block w-0.5 h-6 bg-white/40 ml-1"
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
            </div>
          </div>

          {/* Bottom Border Accent on Hover */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </div>

        {/* Subtle Hint Text */}
        <div className="mt-6 text-center">
          <p className="text-white/30 text-xs font-light uppercase tracking-widest">
            Počnite pisati ili odaberite iz prijedloga
          </p>
        </div>
      </div>
    </div>
  );
};

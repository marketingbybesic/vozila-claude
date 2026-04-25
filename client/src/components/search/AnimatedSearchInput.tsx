import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { useTypingAnimation } from '../../hooks/useTypingAnimation';

interface AnimatedSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
}

// Hyper-realistic Croatian search examples
const SEARCH_SUGGESTIONS = [
  'Audi A6 2022 crni koža',
  'Traktor s prednjim utovarivačem',
  'Najam kamiona u Splitu',
  'Tesla Model 3 2024 Zagreb',
  'Caterpillar bageri 2021',
];

export const AnimatedSearchInput = ({
  value,
  onChange,
  onSubmit,
  placeholder = 'Pretraži vozila...',
}: AnimatedSearchInputProps) => {
  const { displayText } = useTypingAnimation({
    texts: SEARCH_SUGGESTIONS,
    typingSpeed: 50, // 0.05s per character
    pauseDuration: 3000, // 3s pause
  });

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onSubmit) {
      onSubmit(value);
    }
  };

  return (
    <div className="relative">
      {/* Input Container */}
      <div className="relative flex items-center">
        {/* Search Icon */}
        <div className="absolute left-4 text-white/40 pointer-events-none">
          <Search className="w-5 h-5" strokeWidth={1.5} />
        </div>

        {/* Animated Placeholder Text (Behind Input) */}
        <div className="absolute left-12 top-1/2 -translate-y-1/2 text-white/30 font-light pointer-events-none overflow-hidden">
          <motion.span
            key={displayText}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="inline-block"
          >
            {displayText}
          </motion.span>
          {/* Blinking cursor */}
          <motion.span
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.6, repeat: Infinity }}
            className="inline-block w-0.5 h-5 bg-white/30 ml-0.5"
          />
        </div>

        {/* Actual Input */}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          className="w-full bg-black border border-white/10 rounded-none pl-12 pr-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-all"
        />
      </div>

      {/* Subtle glow on focus */}
      <style>{`
        input:focus {
          box-shadow: 0 0 20px rgba(255, 255, 255, 0.05);
        }
      `}</style>
    </div>
  );
};

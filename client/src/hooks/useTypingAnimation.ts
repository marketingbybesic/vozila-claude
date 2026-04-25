import { useState, useEffect } from 'react';

interface UseTypingAnimationProps {
  texts: string[];
  typingSpeed?: number; // ms per character
  pauseDuration?: number; // ms between texts
}

interface UseTypingAnimationReturn {
  displayText: string;
  isTyping: boolean;
  currentTextIndex: number;
}

/**
 * Hook for AI-style typing animation
 * Cycles through texts with character-by-character typing effect
 */
export const useTypingAnimation = ({
  texts,
  typingSpeed = 50,
  pauseDuration = 3000,
}: UseTypingAnimationProps): UseTypingAnimationReturn => {
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);

  const currentText = texts[currentTextIndex];

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    if (isTyping) {
      // Typing phase
      if (charIndex < currentText.length) {
        timeout = setTimeout(() => {
          setDisplayText(currentText.slice(0, charIndex + 1));
          setCharIndex(charIndex + 1);
        }, typingSpeed);
      } else {
        // Finished typing, start pause
        setIsTyping(false);
        timeout = setTimeout(() => {
          setIsTyping(true);
        }, pauseDuration);
      }
    } else {
      // Pause phase - wait before moving to next text
      timeout = setTimeout(() => {
        setCurrentTextIndex((prev) => (prev + 1) % texts.length);
        setCharIndex(0);
        setDisplayText('');
        setIsTyping(true);
      }, pauseDuration);
    }

    return () => clearTimeout(timeout);
  }, [charIndex, isTyping, currentText, typingSpeed, pauseDuration, texts, currentTextIndex]);

  return {
    displayText,
    isTyping,
    currentTextIndex,
  };
};

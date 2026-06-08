import { useEffect, useRef, useState } from 'react';

interface MouthShape {
  openness: number; // 0-1
  roundness: number; // 0-1
  width: number; // 0-1
}

interface UseLipSyncOptions {
  enabled?: boolean;
  isSpeaking?: boolean;
}

// Phoneme to mouth shape mapping
const PHONEME_SHAPES: Record<string, MouthShape> = {
  // Vowels
  'a': { openness: 0.8, roundness: 0.2, width: 0.8 },
  'e': { openness: 0.6, roundness: 0.1, width: 0.9 },
  'i': { openness: 0.4, roundness: 0.0, width: 0.6 },
  'o': { openness: 0.7, roundness: 0.9, width: 0.7 },
  'u': { openness: 0.5, roundness: 0.9, width: 0.5 },

  // Consonants
  'm': { openness: 0.0, roundness: 0.5, width: 0.5 },
  'p': { openness: 0.0, roundness: 0.3, width: 0.4 },
  'b': { openness: 0.0, roundness: 0.3, width: 0.4 },
  'f': { openness: 0.3, roundness: 0.0, width: 0.6 },
  'v': { openness: 0.3, roundness: 0.0, width: 0.6 },
  's': { openness: 0.2, roundness: 0.0, width: 0.7 },
  'z': { openness: 0.2, roundness: 0.0, width: 0.7 },
  'th': { openness: 0.3, roundness: 0.0, width: 0.5 },
  'l': { openness: 0.4, roundness: 0.2, width: 0.5 },
  'r': { openness: 0.5, roundness: 0.6, width: 0.6 },
  'n': { openness: 0.3, roundness: 0.2, width: 0.5 },
  'ng': { openness: 0.2, roundness: 0.1, width: 0.4 },
  't': { openness: 0.1, roundness: 0.0, width: 0.3 },
  'd': { openness: 0.1, roundness: 0.0, width: 0.3 },
  'k': { openness: 0.0, roundness: 0.0, width: 0.3 },
  'g': { openness: 0.0, roundness: 0.0, width: 0.3 },
  'ch': { openness: 0.2, roundness: 0.0, width: 0.5 },
  'j': { openness: 0.2, roundness: 0.0, width: 0.5 },
  'sh': { openness: 0.3, roundness: 0.0, width: 0.6 },
  'zh': { openness: 0.3, roundness: 0.0, width: 0.6 },
  'y': { openness: 0.3, roundness: 0.3, width: 0.5 },
  'w': { openness: 0.4, roundness: 0.8, width: 0.6 },
  'h': { openness: 0.5, roundness: 0.0, width: 0.7 },
};

// Simple text to phoneme conversion (English)
function textToPhonemes(text: string): string[] {
  const phonemes: string[] = [];
  const normalized = text.toLowerCase();

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    const nextChar = normalized[i + 1];

    // Skip spaces and punctuation
    if (!/[a-z]/.test(char)) continue;

    // Check for digraphs first
    const digraph = char + nextChar;
    if (['ch', 'sh', 'th', 'ng', 'zh'].includes(digraph)) {
      phonemes.push(digraph);
      i++; // Skip next char
    } else {
      phonemes.push(char);
    }
  }

  return phonemes;
}

export function useLipSync(options: UseLipSyncOptions = {}) {
  const { enabled = true, isSpeaking = false } = options;

  const [currentMouthShape, setCurrentMouthShape] = useState<MouthShape>({
    openness: 0,
    roundness: 0,
    width: 0,
  });

  const phonemeQueueRef = useRef<string[]>([]);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const currentPhonemeIndexRef = useRef(0);
  const phonemeDurationRef = useRef(100); // ms per phoneme

  // Start lip-sync animation
  useEffect(() => {
    if (!enabled || !isSpeaking) {
      // Reset to neutral position
      setCurrentMouthShape({
        openness: 0,
        roundness: 0,
        width: 0,
      });
      return;
    }

    const animate = () => {
      if (phonemeQueueRef.current.length === 0) {
        // Idle animation when speaking but no phonemes
        setCurrentMouthShape(prev => ({
          openness: Math.sin(Date.now() / 300) * 0.3 + 0.2,
          roundness: Math.sin(Date.now() / 400) * 0.2 + 0.1,
          width: 0.7,
        }));
      } else {
        const phoneme = phonemeQueueRef.current[currentPhonemeIndexRef.current];
        const shape = PHONEME_SHAPES[phoneme] || {
          openness: 0.3,
          roundness: 0.2,
          width: 0.6,
        };

        setCurrentMouthShape(shape);

        // Move to next phoneme
        currentPhonemeIndexRef.current++;
        if (currentPhonemeIndexRef.current >= phonemeQueueRef.current.length) {
          currentPhonemeIndexRef.current = 0;
          phonemeQueueRef.current = [];
        }
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [enabled, isSpeaking]);

  const updatePhonemes = (text: string) => {
    phonemeQueueRef.current = textToPhonemes(text);
    currentPhonemeIndexRef.current = 0;
  };

  const setPhonemeDuration = (duration: number) => {
    phonemeDurationRef.current = duration;
  };

  return {
    currentMouthShape,
    updatePhonemes,
    setPhonemeDuration,
  };
}

/**
 * Phoneme to Mouth Shape Mapping
 * Maps English phonemes to mouth animation parameters
 */

export interface MouthShape {
  openness: number; // 0-1: how open the mouth is
  roundness: number; // 0-1: how rounded the mouth is
  width: number; // 0-1: how wide the mouth is
}

// Comprehensive phoneme to mouth shape mapping for English
export const PHONEME_SHAPES: Record<string, MouthShape> = {
  // Vowels - Open mouth sounds
  'a': { openness: 0.85, roundness: 0.1, width: 0.85 },  // "cat"
  'æ': { openness: 0.8, roundness: 0.05, width: 0.8 },   // "trap"
  'ɑ': { openness: 0.9, roundness: 0.2, width: 0.75 },   // "lot"
  'ɔ': { openness: 0.7, roundness: 0.85, width: 0.7 },   // "thought"
  'ʌ': { openness: 0.6, roundness: 0.15, width: 0.7 },   // "strut"
  'ə': { openness: 0.4, roundness: 0.1, width: 0.6 },    // "comma" (schwa)
  'ɪ': { openness: 0.3, roundness: 0.0, width: 0.7 },    // "kit"
  'i': { openness: 0.25, roundness: 0.0, width: 0.65 },  // "fleece"
  'ʊ': { openness: 0.35, roundness: 0.9, width: 0.5 },   // "foot"
  'u': { openness: 0.3, roundness: 0.95, width: 0.45 },  // "goose"
  'e': { openness: 0.5, roundness: 0.05, width: 0.75 },  // "face"
  'ɛ': { openness: 0.55, roundness: 0.0, width: 0.8 },   // "dress"
  'o': { openness: 0.55, roundness: 0.8, width: 0.65 },  // "goat"

  // Diphthongs
  'aɪ': { openness: 0.7, roundness: 0.0, width: 0.8 },   // "price"
  'aʊ': { openness: 0.75, roundness: 0.5, width: 0.75 }, // "mouth"
  'ɔɪ': { openness: 0.65, roundness: 0.7, width: 0.7 },  // "choice"
  'eɪ': { openness: 0.6, roundness: 0.05, width: 0.75 }, // "face"
  'oʊ': { openness: 0.5, roundness: 0.8, width: 0.65 },  // "goat"
  'ɪə': { openness: 0.4, roundness: 0.0, width: 0.7 },   // "near"
  'eə': { openness: 0.5, roundness: 0.05, width: 0.75 }, // "square"
  'ʊə': { openness: 0.4, roundness: 0.8, width: 0.55 },  // "cure"

  // Consonants - Plosives (stops)
  'p': { openness: 0.0, roundness: 0.4, width: 0.35 },   // "pin"
  'b': { openness: 0.0, roundness: 0.4, width: 0.35 },   // "bin"
  't': { openness: 0.15, roundness: 0.0, width: 0.3 },   // "tin"
  'd': { openness: 0.15, roundness: 0.0, width: 0.3 },   // "din"
  'k': { openness: 0.0, roundness: 0.0, width: 0.25 },   // "kin"
  'g': { openness: 0.0, roundness: 0.0, width: 0.25 },   // "gin"

  // Consonants - Fricatives
  'f': { openness: 0.25, roundness: 0.0, width: 0.55 },  // "fin"
  'v': { openness: 0.25, roundness: 0.0, width: 0.55 },  // "vin"
  's': { openness: 0.2, roundness: 0.0, width: 0.65 },   // "sin"
  'z': { openness: 0.2, roundness: 0.0, width: 0.65 },   // "zen"
  'ʃ': { openness: 0.25, roundness: 0.3, width: 0.6 },   // "shin"
  'ʒ': { openness: 0.25, roundness: 0.3, width: 0.6 },   // "vision"
  'θ': { openness: 0.3, roundness: 0.0, width: 0.5 },    // "thin"
  'ð': { openness: 0.3, roundness: 0.0, width: 0.5 },    // "this"
  'h': { openness: 0.4, roundness: 0.0, width: 0.65 },   // "hat"

  // Consonants - Nasals
  'm': { openness: 0.0, roundness: 0.5, width: 0.4 },    // "min"
  'n': { openness: 0.2, roundness: 0.0, width: 0.35 },   // "nin"
  'ŋ': { openness: 0.1, roundness: 0.1, width: 0.3 },    // "ring"

  // Consonants - Approximants
  'w': { openness: 0.3, roundness: 0.9, width: 0.5 },    // "win"
  'j': { openness: 0.3, roundness: 0.2, width: 0.5 },    // "yes"
  'l': { openness: 0.3, roundness: 0.1, width: 0.4 },    // "lin"
  'r': { openness: 0.4, roundness: 0.6, width: 0.55 },   // "rin"

  // Affricates
  'tʃ': { openness: 0.2, roundness: 0.2, width: 0.5 },   // "chin"
  'dʒ': { openness: 0.2, roundness: 0.2, width: 0.5 },   // "jin"

  // Silence/Rest
  'silence': { openness: 0.0, roundness: 0.0, width: 0.0 },
  'rest': { openness: 0.05, roundness: 0.1, width: 0.2 },
};

/**
 * Convert text to phonemes (simplified English phoneme conversion)
 * This is a basic implementation - for production, use a proper phoneme library
 */
export function textToPhonemes(text: string): string[] {
  const phonemes: string[] = [];
  const normalized = text.toLowerCase();

  // Simple character to phoneme mapping
  const charToPhoneme: Record<string, string> = {
    'a': 'a',
    'e': 'e',
    'i': 'i',
    'o': 'o',
    'u': 'u',
    'y': 'j',
  };

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];

    // Skip spaces and punctuation
    if (!/[a-z]/.test(char)) {
      if (phonemes.length > 0 && phonemes[phonemes.length - 1] !== 'silence') {
        phonemes.push('silence');
      }
      continue;
    }

    // Check for digraphs
    const digraph = char + normalized[i + 1];
    if (digraph === 'ch' || digraph === 'sh' || digraph === 'th' || digraph === 'ng') {
      phonemes.push(digraph);
      i++;
      continue;
    }

    // Single character
    phonemes.push(charToPhoneme[char] || char);
  }

  return phonemes;
}

/**
 * Get mouth shape for a specific phoneme
 * Falls back to neutral shape if phoneme not found
 */
export function getPhonemeShape(phoneme: string): MouthShape {
  return PHONEME_SHAPES[phoneme] || {
    openness: 0.3,
    roundness: 0.1,
    width: 0.5,
  };
}

/**
 * Interpolate between two mouth shapes for smooth animation
 */
export function interpolateMouthShape(
  from: MouthShape,
  to: MouthShape,
  progress: number
): MouthShape {
  return {
    openness: from.openness + (to.openness - from.openness) * progress,
    roundness: from.roundness + (to.roundness - from.roundness) * progress,
    width: from.width + (to.width - from.width) * progress,
  };
}

/**
 * Get neutral mouth shape (closed, at rest)
 */
export function getNeutralMouthShape(): MouthShape {
  return {
    openness: 0.0,
    roundness: 0.0,
    width: 0.0,
  };
}

/**
 * Get idle mouth shape (slightly open, natural rest position)
 */
export function getIdleMouthShape(): MouthShape {
  return {
    openness: 0.05,
    roundness: 0.1,
    width: 0.2,
  };
}

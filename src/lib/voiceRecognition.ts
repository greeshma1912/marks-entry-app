import type { VoiceRecognitionResult } from './types';

const NUMBER_WORDS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
};

const ABSENT_KEYWORDS = ['absent', 'ab', 'abs', 'absence', 'missing', 'absentee'];

const FILLER_WORDS = [
  'question',
  'questions',
  'marks',
  'mark',
  'for',
  'is',
  'equals',
  'equal',
  'and',
  'then',
  'next',
  'first',
  'second',
  'third',
  'fourth',
  'fifth',
  'sixth',
  'seventh',
  'eighth',
  'ninth',
  'tenth',
  'the',
  'a',
  'an',
  'please',
  'here',
  'give',
  'record',
  'enter',
];

export interface ParsedToken {
  type: 'number' | 'absent' | 'unknown';
  value?: number | 'AB';
  raw: string;
}

export interface ParseDebugInfo {
  rawTranscript: string;
  normalizedTranscript: string;
  tokens: string[];
  parsedTokens: ParsedToken[];
  detectedMarks: (number | 'AB')[];
  expectedCount: number;
}

export function isVoiceRecognitionSupported(): boolean {
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
}

export function parseVoiceInput(
  transcript: string,
  expectedCount: number,
  maxMarksPerQuestion: number
): VoiceRecognitionResult & { debugInfo?: ParseDebugInfo } {
  const debugInfo: ParseDebugInfo = {
    rawTranscript: transcript,
    normalizedTranscript: '',
    tokens: [],
    parsedTokens: [],
    detectedMarks: [],
    expectedCount,
  };

  const normalized = transcript
    .toLowerCase()
    .replace(/[,\-;:\.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  debugInfo.normalizedTranscript = normalized;

  const rawTokens = normalized.split(/\s+/).filter((w) => w.trim());
  debugInfo.tokens = rawTokens;

  const parsedTokens: ParsedToken[] = [];
  const tentativeMarks: (number | 'AB')[] = [];

  for (const token of rawTokens) {
    if (FILLER_WORDS.includes(token)) {
      parsedTokens.push({ type: 'unknown', raw: token });
      continue;
    }

    if (ABSENT_KEYWORDS.includes(token)) {
      parsedTokens.push({ type: 'absent', value: 'AB', raw: token });
      tentativeMarks.push('AB');
      continue;
    }

    if (NUMBER_WORDS[token] !== undefined) {
      parsedTokens.push({ type: 'number', value: NUMBER_WORDS[token], raw: token });
      tentativeMarks.push(NUMBER_WORDS[token]);
      continue;
    }

    if (/^\d+$/.test(token)) {
      const splitResult = splitNumericString(token, expectedCount - tentativeMarks.length, maxMarksPerQuestion);
      for (const splitVal of splitResult) {
        parsedTokens.push({ type: 'number', value: splitVal, raw: splitVal.toString() });
        tentativeMarks.push(splitVal);
      }
      continue;
    }

    parsedTokens.push({ type: 'unknown', raw: token });
  }

  debugInfo.parsedTokens = parsedTokens;
  debugInfo.detectedMarks = tentativeMarks;

  console.log('[VoiceRecognition] Parse Debug:', {
    raw: debugInfo.rawTranscript,
    normalized: debugInfo.normalizedTranscript,
    tokens: debugInfo.tokens,
    parsed: debugInfo.parsedTokens.map((t) => t.value),
    marks: tentativeMarks,
    expected: expectedCount,
  });

  if (tentativeMarks.length !== expectedCount) {
    return {
      success: false,
      values: [],
      error: `Expected ${expectedCount} marks but received ${tentativeMarks.length}.`,
      debugInfo,
    };
  }

  for (let i = 0; i < tentativeMarks.length; i++) {
    const val = tentativeMarks[i];
    if (val === 'AB') continue;

    if (val < 0) {
      return {
        success: false,
        values: [],
        error: 'Negative marks are not allowed.',
        debugInfo,
      };
    }

    if (val > maxMarksPerQuestion) {
      return {
        success: false,
        values: [],
        error: `Q${i + 1} exceeds maximum allowed marks of ${maxMarksPerQuestion}.`,
        debugInfo,
      };
    }
  }

  return {
    success: true,
    values: tentativeMarks,
    debugInfo,
  };
}

function splitNumericString(numStr: string, remainingSlots: number, maxMarks: number): number[] {
  const asNumber = parseInt(numStr, 10);

  // First check: if the entire number is valid, return it as-is
  if (asNumber <= maxMarks) {
    return [asNumber];
  }

  // Second check: if the number exceeds max marks, try to split it intelligently
  // This handles cases like "453" being said without spaces -> should become [4, 5, 3]
  // But NOT cases like "10" which is a valid single number

  // If we have enough remaining slots to accommodate splitting each digit
  if (numStr.length <= remainingSlots) {
    const digits = numStr.split('').map((d) => parseInt(d, 10));
    // All digits must be valid (0-9 is always <= maxMarks if maxMarks >= 9)
    if (digits.every((d) => d <= maxMarks && d >= 0)) {
      // But only split if NO single digit equals the full number
      // This prevents splitting "10" into [1, 0] when maxMarks is 10
      const singleDigit = digits.length === 1;
      if (!singleDigit && digits.length > 1) {
        // Check if this split makes sense - only use it if we need more marks
        // than the number provides as a whole
        return digits;
      }
    }
  }

  // Try smart splitting for complex cases
  const potentialSplit = trySmartSplit(numStr, maxMarks);
  if (potentialSplit) {
    return potentialSplit;
  }

  // Fallback: return the number as-is if it's valid, otherwise it's an error
  return [asNumber];
}

function trySmartSplit(numStr: string, maxMarks: number): number[] | null {
  // Check if the number as a whole is a valid mark
  const asNumber = parseInt(numStr, 10);
  if (asNumber <= maxMarks) {
    return null; // Don't split valid single numbers
  }

  const results: number[][] = [];

  function explore(current: string, collected: number[]) {
    if (current.length === 0) {
      results.push([...collected]);
      return;
    }

    for (let len = 1; len <= current.length; len++) {
      const part = current.substring(0, len);
      const value = parseInt(part, 10);
      if (value <= maxMarks) {
        explore(current.substring(len), [...collected, value]);
      } else {
        break;
      }
    }
  }

  explore(numStr, []);

  if (results.length === 0) {
    return null;
  }

  const validResults = results.filter((r) => r.every((v) => v <= maxMarks));
  if (validResults.length === 0) {
    return null;
  }

  // Prefer the split that uses the fewest numbers (most likely correct)
  validResults.sort((a, b) => a.length - b.length);
  return validResults[0];
}

export interface SpeechRecognitionWrapper {
  start: () => void;
  stop: () => void;
  onResult: (callback: (transcript: string) => void) => void;
  onError: (callback: (error: string) => void) => void;
  onEnd: (callback: () => void) => void;
  isListening: () => boolean;
}

export function createSpeechRecognition(): SpeechRecognitionWrapper | null {
  if (!isVoiceRecognitionSupported()) {
    return null;
  }

  const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const recognition = new SpeechRecognitionClass();

  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  let listening = false;
  let resultCallback: ((transcript: string) => void) | null = null;
  let errorCallback: ((error: string) => void) | null = null;
  let endCallback: (() => void) | null = null;

  recognition.onresult = (event: any) => {
    const transcript = event.results[0][0].transcript;
    console.log('[VoiceRecognition] Raw transcript:', transcript);
    if (resultCallback) {
      resultCallback(transcript);
    }
  };

  recognition.onerror = (event: any) => {
    listening = false;
    console.error('[VoiceRecognition] Error:', event.error);
    if (errorCallback) {
      let message = 'Speech recognition error';
      switch (event.error) {
        case 'no-speech':
          message = 'No speech detected. Please try again.';
          break;
        case 'audio-capture':
          message = 'No microphone found.';
          break;
        case 'not-allowed':
          message = 'Microphone permission denied.';
          break;
        case 'network':
          message = 'Network error occurred.';
          break;
        default:
          message = `Error: ${event.error}`;
      }
      errorCallback(message);
    }
  };

  recognition.onend = () => {
    listening = false;
    console.log('[VoiceRecognition] Recognition ended');
    if (endCallback) {
      endCallback();
    }
  };

  return {
    start: () => {
      listening = true;
      console.log('[VoiceRecognition] Starting recognition...');
      recognition.start();
    },
    stop: () => {
      listening = false;
      console.log('[VoiceRecognition] Stopping recognition...');
      recognition.stop();
    },
    onResult: (callback) => {
      resultCallback = callback;
    },
    onError: (callback) => {
      errorCallback = callback;
    },
    onEnd: (callback) => {
      endCallback = callback;
    },
    isListening: () => listening,
  };
}

export function formatMarksPreview(marks: (number | 'AB')[], maxPerQuestion: number): string {
  return marks
    .map((m, i) => {
      const label = m === 'AB' ? 'AB' : `${m}/${maxPerQuestion}`;
      return `Q${i + 1} = ${label}`;
    })
    .join('\n');
}

import { SentimentAnalysisResult } from './types.js';

const LEXICON: Record<string, { emotion: string; polarity: number }> = {
  // Frustration/Anger
  frustrated: { emotion: 'Frustrated', polarity: -0.8 },
  angry: { emotion: 'Angry', polarity: -0.9 },
  annoyed: { emotion: 'Annoyed', polarity: -0.7 },
  furious: { emotion: 'Furious', polarity: -0.95 },
  irritated: { emotion: 'Irritated', polarity: -0.6 },
  upset: { emotion: 'Upset', polarity: -0.7 },
  hate: { emotion: 'Hate', polarity: -0.8 },
  terrible: { emotion: 'Terrible', polarity: -0.8 },
  awful: { emotion: 'Awful', polarity: -0.8 },
  horrible: { emotion: 'Horrible', polarity: -0.9 },
  broken: { emotion: 'Frustrated', polarity: -0.6 },
  error: { emotion: 'Troubled', polarity: -0.5 },
  fail: { emotion: 'Disappointed', polarity: -0.6 },
  failed: { emotion: 'Disappointed', polarity: -0.6 },

  // Positive emotions
  thanks: { emotion: 'Grateful', polarity: 0.8 },
  thank: { emotion: 'Grateful', polarity: 0.8 },
  great: { emotion: 'Happy', polarity: 0.7 },
  awesome: { emotion: 'Excited', polarity: 0.9 },
  amazing: { emotion: 'Amazed', polarity: 0.9 },
  perfect: { emotion: 'Content', polarity: 1.0 },
  good: { emotion: 'Content', polarity: 0.6 },
  nice: { emotion: 'Pleased', polarity: 0.6 },
  love: { emotion: 'Loving', polarity: 0.9 },
  like: { emotion: 'Pleased', polarity: 0.5 },
  happy: { emotion: 'Happy', polarity: 0.8 },
  glad: { emotion: 'Content', polarity: 0.7 },
  pleased: { emotion: 'Satisfied', polarity: 0.7 },
  excited: { emotion: 'Energetic', polarity: 0.8 },
  wonderful: { emotion: 'Delighted', polarity: 0.9 },
  fantastic: { emotion: 'Enthusiastic', polarity: 0.9 },
  brilliant: { emotion: 'Impressed', polarity: 0.85 },

  // Curiosity/Questions
  why: { emotion: 'Curious', polarity: 0.2 },
  how: { emotion: 'Inquisitive', polarity: 0.2 },
  explain: { emotion: 'Seeking', polarity: 0.3 },
  what: { emotion: 'Questioning', polarity: 0.1 },
  who: { emotion: 'Questioning', polarity: 0.1 },
  when: { emotion: 'Questioning', polarity: 0.1 },
  where: { emotion: 'Questioning', polarity: 0.1 },
  question: { emotion: 'Inquisitive', polarity: 0.1 },
  confused: { emotion: 'Confused', polarity: -0.3 },
  unclear: { emotion: 'Uncertain', polarity: -0.3 },
  help: { emotion: 'Seeking', polarity: 0.1 },

  // Neutral
  okay: { emotion: 'Neutral', polarity: 0.05 },
  ok: { emotion: 'Neutral', polarity: 0.05 },
  yes: { emotion: 'Affirmative', polarity: 0.2 },
  no: { emotion: 'Negative', polarity: -0.2 }
};

export function analyzeSentiment(text: string): SentimentAnalysisResult {
  if (!text || text.trim() === '') {
    return {
      polarity: 0,
      emotion: 'Neutral',
      confidence: 0.5,
      recommendation: 'Provide clear, standard operational response.'
    };
  }

  const words = text.toLowerCase().match(/\b[a-z']+\b/g) || [];
  let scoreSum = 0;
  let matches = 0;
  const emotionCounts: Record<string, number> = {};

  for (const word of words) {
    if (LEXICON[word]) {
      const match = LEXICON[word];
      scoreSum += match.polarity;
      matches++;
      emotionCounts[match.emotion] = (emotionCounts[match.emotion] || 0) + 1;
    }
  }

  const polarity = matches > 0 ? Number((scoreSum / matches).toFixed(2)) : 0;

  // Primary emotion
  let dominantEmotion = 'Neutral';
  let maxCount = 0;
  for (const [em, count] of Object.entries(emotionCounts)) {
    if (count > maxCount) {
      maxCount = count;
      dominantEmotion = em;
    }
  }

  if (matches === 0) {
    if (text.endsWith('?')) {
      dominantEmotion = 'Inquisitive';
    } else if (text.endsWith('!')) {
      dominantEmotion = 'Empowered';
    }
  }

  let recommendation = 'Deliver structured technical response with standard conciseness.';
  if (polarity < -0.4) {
    recommendation = 'User signals frustration. Prioritize immediate, empathetic resolution without unnecessary preamble.';
  } else if (polarity > 0.4) {
    recommendation = 'User in enthusiastic state. Maintain high-tempo forward momentum with collaborative tone.';
  } else if (dominantEmotion === 'Inquisitive' || dominantEmotion === 'Curious') {
    recommendation = 'User is exploring concepts. Provide lucid architectural breakdowns with contextual examples.';
  }

  return {
    polarity,
    emotion: dominantEmotion,
    confidence: matches > 0 ? Math.min(0.95, 0.5 + matches * 0.1) : 0.5,
    recommendation
  };
}

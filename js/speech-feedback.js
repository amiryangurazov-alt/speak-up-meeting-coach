/**
 * @param {string} text
 * @param {string} phrase
 * @param {number} minMatches
 */
function sharesKeywords(text, phrase, minMatches = 1) {
  const stop = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "to",
    "for",
    "of",
    "in",
    "on",
    "we",
    "i",
    "you",
    "that",
    "this",
    "it",
    "is",
    "are",
    "can",
    "from",
    "with",
    "our",
    "your",
    "have",
    "has",
  ]);
  const keys = phrase
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 3 && !stop.has(w));
  if (!keys.length) return false;
  const lower = text.toLowerCase();
  const hits = keys.filter((w) => lower.includes(w)).length;
  const need = Math.min(minMatches, keys.length);
  return hits >= need;
}

function excerpt(text, max = 72) {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

const COACH_TIPS = [
  "Next turn, name one prep bullet explicitly (“From my prep…”).",
  "Try a clarifying question about the current topic.",
  "Offer to own one small task before the meeting ends.",
  "Summarize the last two points, then add your view.",
  "Link your point to the team charter norm in Setup.",
];

/**
 * @param {string} utterance
 * @param {string[]} prepBullets
 * @param {string} currentTopic
 * @param {number} [tipIndex]
 * @returns {{ tone: 'positive' | 'coach', title: string, message: string, wordCount: number, kind: string }}
 */
export function feedbackForUtterance(utterance, prepBullets, currentTopic, tipIndex = 0) {
  const trimmed = utterance.trim();
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  const quote = excerpt(trimmed);

  if (!trimmed) {
    return {
      kind: "empty",
      tone: "coach",
      title: "Nothing to analyze yet",
      message: "Speak or type what you said, then log again.",
      wordCount: 0,
    };
  }

  if (wordCount < 4) {
    return {
      kind: "brief",
      tone: "coach",
      title: "Brief contribution",
      message: `You said: “${quote}” (${wordCount} words). Add one concrete detail next— a number, name, or deliverable.`,
      wordCount,
    };
  }

  const prepHit = prepBullets.find((b) => sharesKeywords(trimmed, b, 1));
  if (prepHit) {
    const snippet = prepHit.length > 55 ? `${prepHit.slice(0, 55)}…` : prepHit;
    return {
      kind: "prep",
      tone: "positive",
      title: "Strong use of prep",
      message: `You said: “${quote}” — matches your prep: “${snippet}”.`,
      wordCount,
    };
  }

  if (currentTopic?.trim() && sharesKeywords(trimmed, currentTopic, 1)) {
    return {
      kind: "topic",
      tone: "positive",
      title: "On topic",
      message: `You said: “${quote}” — ties to “${currentTopic.trim()}”. Add a prep fact or question to go deeper.`,
      wordCount,
    };
  }

  const hasQuestion = /\?|could we|can we|what if|how do we|should we/i.test(trimmed);
  if (hasQuestion) {
    return {
      kind: "question",
      tone: "positive",
      title: "Good question",
      message: `You asked: “${quote}” — questions pull others in and create space for you.`,
      wordCount,
    };
  }

  const tip = COACH_TIPS[tipIndex % COACH_TIPS.length];
  return {
    kind: "general",
    tone: "coach",
    title: "You were heard",
    message: `You said: “${quote}” (${wordCount} words). ${tip}`,
    wordCount,
  };
}

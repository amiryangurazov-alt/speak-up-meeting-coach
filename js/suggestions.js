/** @typedef {'question'|'build'|'summarize'|'challenge'|'offer'} SuggestionType */

/**
 * @param {string} text
 * @returns {string[]}
 */
export function parsePrepBullets(text) {
  return text
    .split(/\n/)
    .map((line) => line.replace(/^[\s\-*•\d.)]+/, "").trim())
    .filter((line) => line.length > 3);
}

function topicMap(topic, bullet) {
  const t = topic.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
  const b = bullet.toLowerCase();
  if (!t.length) return 0;
  return t.filter((w) => b.includes(w)).length;
}

function clip(text, max = 90) {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

/**
 * @param {object} opts
 * @param {string[]} opts.prepBullets
 * @param {string} opts.currentTopic
 * @param {string} [opts.charterNorm]
 * @param {Set<string>} opts.shownLines
 * @param {boolean} [opts.urgent]
 * @returns {{ type: SuggestionType, line: string, score: number }[]}
 */
export function generateSuggestions(opts) {
  const topic = (opts.currentTopic || "this decision").trim();
  const bullets = opts.prepBullets.length
    ? opts.prepBullets
    : ["a concrete example from our project", "one risk we should name"];
  const ranked = [...bullets].sort((a, b) => topicMap(topic, b) - topicMap(topic, a));
  const best = clip(ranked[0]);
  const second = clip(ranked[1] || ranked[0]);

  /** @type {{ type: SuggestionType, line: string, score: number }[]} */
  const raw = [
    {
      type: "question",
      line: `Can we pause on “${topic}” for a second—what would change our decision?`,
      score: 3 + (opts.urgent ? 2 : 0),
    },
    {
      type: "build",
      line: `Building on that: ${best}. That should shape how we present this.`,
      score: 4 + topicMap(topic, best),
    },
    {
      type: "summarize",
      line: `Quick recap: we are on ${topic}. The open piece I see is ${second}.`,
      score: 2 + topicMap(topic, second),
    },
    {
      type: "offer",
      line: `I can take ${second} and bring a draft back this week.`,
      score: 3,
    },
    {
      type: "challenge",
      line: `One check on ${topic}: have we accounted for ${best}?`,
      score: 1 + topicMap(topic, best),
    },
  ];

  if (opts.charterNorm && /round.?robin|go around|each person/i.test(opts.charterNorm)) {
    raw.push({
      type: "summarize",
      line: `For the round-robin: my update on ${topic} is ${best}.`,
      score: 5,
    });
  }

  if (opts.urgent) {
    raw.push({
      type: "build",
      line: `I have not spoken in a bit. On ${topic}: ${best}.`,
      score: 6,
    });
  }

  let filtered = raw.filter((r) => !opts.shownLines.has(r.line));
  if (!filtered.length) {
    opts.shownLines.clear();
    filtered = raw;
  }
  filtered.sort((a, b) => b.score - a.score);
  return filtered.slice(0, 4);
}

/**
 * @param {object} ctx
 */
export function buildAiPrompt(ctx) {
  const {
    displayName,
    prepNotes,
    currentTopic,
    transcriptChunk,
    charterNorm,
    nudgeReason,
    mySpeechLog,
  } = ctx;
  return `# Speak-up coach — generate 4 short lines I can say aloud

I am ${displayName || "a team member"}. I struggle to speak up in online meetings. Give **four** speakable sentences (max 25 words each), varied: one question, one build-on, one offer to help, one summary.

**Current topic:** ${currentTopic || "(not set)"}

**My prep notes:**
${prepNotes || "(none)"}

**Team norm (optional):** ${charterNorm || "(none)"}

**Why I need help now:** ${nudgeReason || "timer nudge"}

**What I have already said:**
${mySpeechLog || "(none yet)"}

**Recent transcript (optional):**
${transcriptChunk || "(none)"}

Rules: supportive tone, no jargon, do not invent facts not in my prep. Label each line Q / Build / Offer / Summary.`;
}

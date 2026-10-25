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

/**
 * @param {string} topic
 * @param {string} bullet
 */
function topicOverlap(topic, bullet) {
  const t = topic.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
  const b = bullet.toLowerCase();
  if (!t.length) return 0;
  return t.filter((w) => b.includes(w)).length;
}

/**
 * @param {object} opts
 * @param {string} opts.displayName
 * @param {string[]} opts.prepBullets
 * @param {string} opts.currentTopic
 * @param {string} [opts.charterNorm]
 * @param {Set<string>} opts.shownLines
 * @param {boolean} [opts.urgent]
 * @returns {{ type: SuggestionType, line: string, score: number }[]}
 */
export function generateSuggestions(opts) {
  const topic = (opts.currentTopic || "this topic").trim();
  const bullets = opts.prepBullets.length
    ? opts.prepBullets
    : ["a concrete example from our project", "one risk we should name"];
  const ranked = [...bullets].sort(
    (a, b) => topicOverlap(topic, b) - topicOverlap(topic, a)
  );
  const best = ranked[0];
  const second = ranked[1] || ranked[0];

  /** @type {{ type: SuggestionType, line: string, score: number }[]} */
  const raw = [
    {
      type: "question",
      line: `Can we clarify what we mean by "${topic}" before we decide?`,
      score: 3 + (opts.urgent ? 2 : 0),
    },
    {
      type: "build",
      line: `Building on that—I'd add ${best}, because it affects how we present this.`,
      score: 4 + topicOverlap(topic, best),
    },
    {
      type: "summarize",
      line: `If it's helpful, I can summarize: we're aligned on ${topic}, and the open piece is ${second}.`,
      score: 2 + topicOverlap(topic, second),
    },
    {
      type: "offer",
      line: `I can take a small piece on ${second} from my prep notes if that unblocks us.`,
      score: 3,
    },
    {
      type: "challenge",
      line: `One gentle pushback on ${topic}: have we checked ${best}?`,
      score: 1 + topicOverlap(topic, best),
    },
  ];

  if (opts.charterNorm && /round.?robin|go around|each person/i.test(opts.charterNorm)) {
    raw.push({
      type: "summarize",
      line: `When we round-robin, my update on ${topic} is: ${best}.`,
      score: 5,
    });
  }

  if (opts.urgent) {
    raw.push({
      type: "build",
      line: `Jumping in—I haven't spoken in a while; on ${topic}, ${best}.`,
      score: 6,
    });
  }

  const filtered = raw.filter((r) => !opts.shownLines.has(r.line));
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
  } = ctx;
  return `# Speak-up coach — generate 4 short lines I can say aloud

I am ${displayName || "a team member"}. I struggle to speak up in online meetings. Give **four** speakable sentences (max 25 words each), varied: one question, one build-on, one offer to help, one summary.

**Current topic:** ${currentTopic || "(not set)"}

**My prep notes:**
${prepNotes || "(none)"}

**Team norm (optional):** ${charterNorm || "(none)"}

**Why I need help now:** ${nudgeReason || "timer nudge"}

**Recent transcript (optional):**
${transcriptChunk || "(none)"}

Rules: supportive tone, no jargon, do not invent facts not in my prep. Label each line Q / Build / Offer / Summary.`;
}

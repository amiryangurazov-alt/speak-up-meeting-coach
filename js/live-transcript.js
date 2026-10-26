/**
 * Merge incoming transcript text into a rolling log (dedupe by line).
 * @param {string} existing
 * @param {string} incoming
 * @param {Set<string>} seenLines
 * @returns {{ text: string, addedLines: string[] }}
 */
export function mergeTranscript(existing, incoming, seenLines) {
  if (!incoming?.trim()) {
    return { text: existing, addedLines: [] };
  }
  const addedLines = [];
  const parts = incoming.split(/\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of parts) {
    const key = line.toLowerCase();
    if (seenLines.has(key)) continue;
    seenLines.add(key);
    addedLines.push(line);
  }
  if (!addedLines.length) {
    return { text: existing, addedLines: [] };
  }
  const text = existing ? `${existing.trim()}\n${addedLines.join("\n")}` : addedLines.join("\n");
  return { text, addedLines };
}

/**
 * @param {string} text
 * @param {number} maxLines
 */
export function recentTranscriptWindow(text, maxLines = 40) {
  const lines = text.split(/\n/).filter(Boolean);
  return lines.slice(-maxLines).join("\n");
}

export class LiveTranscriptTracker {
  /**
   * @param {object} opts
   * @param {(payload: { text: string, addedLines: string[], source: string }) => void} opts.onUpdate
   * @param {number} [opts.pollMs]
   */
  constructor(opts) {
    this.onUpdate = opts.onUpdate;
    this.pollMs = opts.pollMs ?? 2500;
    this.fullText = "";
    this.seenLines = new Set();
    this.lastClipboardSnapshot = "";
    this.clipboardTimer = null;
    this.useClipboard = true;
    this.active = false;
  }

  /**
   * @param {string} text
   * @param {string} source
   */
  ingest(text, source) {
    const { text: merged, addedLines } = mergeTranscript(
      this.fullText,
      text,
      this.seenLines
    );
    if (!addedLines.length) return;
    this.fullText = merged;
    this.onUpdate({ text: merged, addedLines, source });
  }

  reset() {
    this.fullText = "";
    this.seenLines.clear();
    this.lastClipboardSnapshot = "";
  }

  async requestClipboardAccess() {
    if (!navigator.clipboard?.readText) {
      return { ok: false, reason: "Clipboard read not supported in this browser." };
    }
    try {
      await navigator.clipboard.readText();
      return { ok: true };
    } catch {
      return {
        ok: false,
        reason: "Allow clipboard access when prompted (Chrome: site permission → Clipboard).",
      };
    }
  }

  startClipboardPolling() {
    if (this.clipboardTimer) return;
    this.clipboardTimer = setInterval(() => this.pollClipboard(), this.pollMs);
  }

  stopClipboardPolling() {
    if (this.clipboardTimer) {
      clearInterval(this.clipboardTimer);
      this.clipboardTimer = null;
    }
  }

  async pollClipboard() {
    if (!this.active || !this.useClipboard || !navigator.clipboard?.readText) return;
    try {
      const text = await navigator.clipboard.readText();
      if (!text?.trim() || text === this.lastClipboardSnapshot) return;
      this.lastClipboardSnapshot = text;
      this.ingest(text, "clipboard");
    } catch {
      /* permission revoked or tab unfocused */
    }
  }

  /**
   * @param {{ clipboard?: boolean }} modes
   */
  async start(modes = {}) {
    this.active = true;
    this.useClipboard = modes.clipboard !== false;

    if (this.useClipboard) {
      this.startClipboardPolling();
    }
    return { ok: true };
  }

  stop() {
    this.active = false;
    this.stopClipboardPolling();
  }
}

/** Demo: append fake meeting lines on an interval */
export function startDemoTranscriptFeed(onLine, intervalMs = 4000) {
  const lines = [
    "Jordan Lee: Let's assign slides for the financial section.",
    "Sam Ortiz: I can take intro and transitions.",
    "Casey Kim: We should lead with the customer problem first.",
    "Jordan Lee: Agreed. Morgan, can you handle the appendix?",
    "Sam Ortiz: I'll send a run-of-show by Tuesday.",
  ];
  let i = 0;
  const id = setInterval(() => {
    if (i >= lines.length) {
      clearInterval(id);
      return;
    }
    onLine(lines[i]);
    i += 1;
  }, intervalMs);
  return () => clearInterval(id);
}

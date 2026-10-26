const ERROR_HELP = {
  "not-allowed":
    "Allow microphone for this site (Chrome address bar lock icon → Microphone → Allow). On Mac: System Settings → Privacy → Microphone → Chrome.",
  "service-not-allowed":
    "Use http://localhost:8080 or HTTPS—not a file:// link.",
  network:
    "Chrome needs internet for speech-to-text (Google service). Check connection or use Quick log below.",
  "audio-capture": "No mic found, or Zoom is using it exclusively. Try headphones + built-in mic.",
  aborted: null,
  "no-speech": null,
};

export class UserVoiceTracker {
  /**
   * @param {object} opts
   * @param {(text: string) => void} [opts.onInterim]
   * @param {(text: string) => void} opts.onFinal
   * @param {(message: string) => void} [opts.onError]
   * @param {() => void} [opts.onListening]
   */
  constructor(opts) {
    this.onInterim = opts.onInterim;
    this.onFinal = opts.onFinal;
    this.onError = opts.onError;
    this.onListening = opts.onListening;
    this.recognition = null;
    this.active = false;
    this.stopping = false;
  }

  async ensureMicrophoneAccess() {
    if (!window.isSecureContext) {
      return {
        ok: false,
        reason: "Open http://localhost:8080 (run: python3 -m http.server 8080)",
      };
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      return { ok: false, reason: "Microphone API not available in this browser." };
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      return { ok: true };
    } catch (e) {
      const name = e instanceof DOMException ? e.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        return { ok: false, reason: ERROR_HELP["not-allowed"] };
      }
      if (name === "NotFoundError") {
        return { ok: false, reason: ERROR_HELP["audio-capture"] };
      }
      return { ok: false, reason: `Microphone: ${name || e}` };
    }
  }

  async start() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      return {
        ok: false,
        reason: "Use Google Chrome or Microsoft Edge for live microphone transcription.",
      };
    }
    if (this.recognition) return { ok: true };

    const mic = await this.ensureMicrophoneAccess();
    if (!mic.ok) return mic;

    this.recognition = new SR();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = "en-US";

    this.recognition.onresult = (event) => {
      let interim = "";
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += t;
        else interim += t;
      }
      if (interim.trim() && this.onInterim) this.onInterim(interim.trim());
      if (finalText.trim()) {
        if (this.onInterim) this.onInterim("");
        this.onFinal(finalText.trim());
      }
    };

    this.recognition.onerror = (ev) => {
      const help = ERROR_HELP[ev.error];
      if (help === null) return;
      this.onError?.(help || `Speech error: ${ev.error}`);
    };

    this.recognition.onstart = () => this.onListening?.();

    this.recognition.onend = () => {
      if (this.stopping || !this.active || !this.recognition) return;
      try {
        this.recognition.start();
      } catch {
        /* restart race */
      }
    };

    this.active = true;
    this.stopping = false;
    try {
      this.recognition.start();
      return { ok: true };
    } catch (e) {
      this.active = false;
      this.recognition = null;
      return { ok: false, reason: String(e) };
    }
  }

  stop() {
    this.stopping = true;
    this.active = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        /* ignore */
      }
      this.recognition = null;
    }
    this.stopping = false;
  }

  get isListening() {
    return this.active && Boolean(this.recognition);
  }
}

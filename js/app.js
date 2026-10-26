import {
  parsePrepBullets,
  generateSuggestions,
  buildAiPrompt,
} from "./suggestions.js";
import { nameAppearsInChunk, nameAppearsInLines } from "./transcript.js";
import {
  LiveTranscriptTracker,
  recentTranscriptWindow,
  startDemoTranscriptFeed,
} from "./live-transcript.js";
import { feedbackForUtterance } from "./speech-feedback.js";
import { UserVoiceTracker } from "./user-voice.js";

const STORAGE_KEY = "speakUpCoachSession_v2";
const TRANSCRIPT_NUDGE_COOLDOWN_MS = 90_000;

const els = {
  displayName: document.getElementById("displayName"),
  prepNotes: document.getElementById("prepNotes"),
  charterNorm: document.getElementById("charterNorm"),
  nudgeInterval: document.getElementById("nudgeInterval"),
  currentTopic: document.getElementById("currentTopic"),
  transcriptChunk: document.getElementById("transcriptChunk"),
  btnStart: document.getElementById("btnStart"),
  btnPause: document.getElementById("btnPause"),
  btnSpoke: document.getElementById("btnSpoke"),
  btnRefreshSuggest: document.getElementById("btnRefreshSuggest"),
  btnCheckTranscript: document.getElementById("btnCheckTranscript"),
  btnCopyAi: document.getElementById("btnCopyAi"),
  btnDemo: document.getElementById("btnDemo"),
  btnLoadDemoPrep: document.getElementById("btnLoadDemoPrep"),
  sessionStatus: document.getElementById("sessionStatus"),
  nudgeBanner: document.getElementById("nudgeBanner"),
  nudgeBannerText: document.getElementById("nudgeBannerText"),
  timerDisplay: document.getElementById("timerDisplay"),
  timerRingProgress: document.getElementById("timerRingProgress"),
  speakCount: document.getElementById("speakCount"),
  suggestionsList: document.getElementById("suggestionsList"),
  toast: document.getElementById("toast"),
  liveClipboard: document.getElementById("liveClipboard"),
  transcriptLiveStatus: document.getElementById("transcriptLiveStatus"),
  transcriptLineCount: document.getElementById("transcriptLineCount"),
  justSaid: document.getElementById("justSaid"),
  btnLogSpeech: document.getElementById("btnLogSpeech"),
  speechFeedback: document.getElementById("speechFeedback"),
  speechFeedbackTitle: document.getElementById("speechFeedbackTitle"),
  speechFeedbackMeta: document.getElementById("speechFeedbackMeta"),
  speechFeedbackMessage: document.getElementById("speechFeedbackMessage"),
  mySpeechLog: document.getElementById("mySpeechLog"),
  voiceLiveStatus: document.getElementById("voiceLiveStatus"),
  btnStartMic: document.getElementById("btnStartMic"),
  btnStopMic: document.getElementById("btnStopMic"),
  speechInterim: document.getElementById("speechInterim"),
  micHelp: document.getElementById("micHelp"),
  liveMicLog: document.getElementById("liveMicLog"),
  setupPanel: document.getElementById("setupPanel"),
};

const state = {
  running: false,
  lastSpokeAt: null,
  startedAt: null,
  shownLines: new Set(),
  tickId: null,
  lastTranscriptNudgeAt: 0,
  demoFeedStop: null,
  demoSpeechStop: null,
  feedbackTipIndex: 0,
  lastMicLine: "",
  lastMicLineAt: 0,
  nudgeActive: false,
  speakCount: 0,
};

const liveTranscript = new LiveTranscriptTracker({
  onUpdate: ({ text, addedLines, source }) => {
    els.transcriptChunk.value = text;
    updateTranscriptMeta(text);
    if (source !== "speech" && source !== "voice") {
      onLiveTranscriptLines(addedLines, source);
    }
  },
});

const userVoice = new UserVoiceTracker({
  onInterim: (text) => {
    if (!els.speechInterim) return;
    if (text) {
      els.speechInterim.hidden = false;
      els.speechInterim.textContent = `Hearing: “${text}”`;
    } else {
      els.speechInterim.hidden = true;
    }
  },
  onFinal: (line) => {
    const norm = line.trim().toLowerCase();
    const now = Date.now();
    if (norm === state.lastMicLine && now - state.lastMicLineAt < 4000) return;
    state.lastMicLine = norm;
    state.lastMicLineAt = now;
    appendLiveMicLog(line);
    handleUserSpeech(line);
  },
  onError: (msg) => {
    setVoiceLiveStatus("warn", "Mic: error");
    setMicHelp(msg);
    if (els.btnStartMic) els.btnStartMic.disabled = false;
    if (els.btnStopMic) els.btnStopMic.disabled = true;
  },
  onListening: () => {
    setVoiceLiveStatus("live", "Mic: listening");
    setMicHelp("");
    if (els.btnStartMic) els.btnStartMic.disabled = true;
    if (els.btnStopMic) els.btnStopMic.disabled = false;
  },
});

function loadFormFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data.displayName) els.displayName.value = data.displayName;
    if (data.prepNotes) els.prepNotes.value = data.prepNotes;
    if (data.charterNorm) els.charterNorm.value = data.charterNorm;
    if (data.nudgeInterval) els.nudgeInterval.value = String(data.nudgeInterval);
    if (data.currentTopic) els.currentTopic.value = data.currentTopic;
    if (data.liveClipboard && els.liveClipboard) els.liveClipboard.checked = true;
  } catch {
    /* ignore */
  }
}

function persistForm() {
  const payload = {
    displayName: els.displayName.value,
    prepNotes: els.prepNotes.value,
    charterNorm: els.charterNorm.value,
    nudgeInterval: Number(els.nudgeInterval.value) || 7,
    currentTopic: els.currentTopic.value,
    liveClipboard: Boolean(els.liveClipboard?.checked),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function showToast(msg) {
  els.toast.textContent = msg;
  els.toast.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    els.toast.hidden = true;
  }, 2200);
}

function nudgeIntervalMs() {
  const min = Number(els.nudgeInterval.value) || 7;
  return Math.max(2, min) * 60 * 1000;
}

function msSinceLastSpoke() {
  if (!state.lastSpokeAt) return Infinity;
  return Date.now() - state.lastSpokeAt;
}

function formatCountdown(ms) {
  if (!isFinite(ms)) return "—";
  const sec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function setNudgeVisible(visible, message) {
  els.nudgeBanner.hidden = !visible;
  document.body.classList.toggle("session-nudge", visible);
  if (message && els.nudgeBannerText) els.nudgeBannerText.textContent = message;
}

function setSessionStatus(mode) {
  const labels = {
    idle: "Not started",
    live: "Live",
    paused: "Paused",
    due: "Nudge due",
  };
  els.sessionStatus.textContent = labels[mode] || labels.idle;
  els.sessionStatus.className = `status-pill status-${mode}`;
}

function updateSpeakCount() {
  if (els.speakCount) els.speakCount.textContent = String(state.speakCount);
}

function updateTimerRing(remainingMs) {
  if (!els.timerRingProgress) return;
  const total = nudgeIntervalMs();
  if (!state.running || !state.lastSpokeAt) {
    els.timerRingProgress.setAttribute("stroke-dasharray", "0, 100");
    return;
  }
  const pct = Math.max(0, Math.min(100, (remainingMs / total) * 100));
  els.timerRingProgress.setAttribute("stroke-dasharray", `${pct}, 100`);
}

function renderSuggestions(urgent = false) {
  const bullets = parsePrepBullets(els.prepNotes.value);
  const items = generateSuggestions({
    displayName: els.displayName.value,
    prepBullets: bullets,
    currentTopic: els.currentTopic.value,
    charterNorm: els.charterNorm.value,
    shownLines: state.shownLines,
    urgent,
  });

  els.suggestionsList.innerHTML = "";
  if (!items.length) {
    const empty = document.createElement("li");
    empty.className = "suggestions-empty";
    empty.textContent = "Add prep notes in Setup, then refresh.";
    els.suggestionsList.appendChild(empty);
    return;
  }

  for (const item of items) {
    state.shownLines.add(item.line);
    const li = document.createElement("li");
    li.className = `suggestion-card type-${item.type}`;
    const type = document.createElement("span");
    type.className = `tag tag-${item.type}`;
    type.textContent = item.type;
    const p = document.createElement("p");
    p.textContent = item.line;
    const foot = document.createElement("div");
    foot.className = "card-foot";
    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "btn btn-secondary small";
    copyBtn.textContent = "Copy";
    copyBtn.addEventListener("click", async () => {
      await navigator.clipboard.writeText(item.line);
      showToast("Copied — unmute and say it");
    });
    const useBtn = document.createElement("button");
    useBtn.type = "button";
    useBtn.className = "btn btn-ghost small";
    useBtn.textContent = "I said this";
    useBtn.addEventListener("click", () => handleUserSpeech(item.line));
    foot.append(copyBtn, useBtn);
    li.append(type, p, foot);
    els.suggestionsList.appendChild(li);
  }
}

async function maybeNotify(title, body) {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    new Notification(title, { body });
  }
}

async function requestNotificationPermission() {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    await Notification.requestPermission();
  }
}

function markSpoke({ silent = false } = {}) {
  state.lastSpokeAt = Date.now();
  state.nudgeActive = false;
  setNudgeVisible(false);
  persistForm();
  if (!silent) showToast("Timer reset");
  updateTimerUi();
}

function triggerNudge(reason) {
  const msg = reason || "Time to add your voice—pick a line or use your own words.";
  setNudgeVisible(true, msg);
  renderSuggestions(true);
  maybeNotify("Speak-Up Coach", msg);
}

function updateTimerUi() {
  if (!state.running) {
    if (state.startedAt) {
      setSessionStatus("paused");
      els.timerDisplay.textContent = "Paused";
    } else {
      setSessionStatus("idle");
      els.timerDisplay.textContent = "Start when the call begins";
    }
    document.body.classList.remove("session-due");
    updateTimerRing(0);
    return;
  }
  const remaining = nudgeIntervalMs() - msSinceLastSpoke();
  if (remaining <= 0) {
    setSessionStatus("due");
    els.timerDisplay.textContent = "Speak up now";
    document.body.classList.add("session-due");
    updateTimerRing(0);
  } else {
    setSessionStatus("live");
    els.timerDisplay.textContent = formatCountdown(remaining);
    document.body.classList.remove("session-due");
    updateTimerRing(remaining);
  }
}

function tick() {
  if (!state.running) return;
  if (msSinceLastSpoke() >= nudgeIntervalMs() && !state.nudgeActive) {
    state.nudgeActive = true;
    triggerNudge("You have not spoken in a while. Here are lines you can use:");
  }
  updateTimerUi();
}

function updateTranscriptMeta(text) {
  const n = text.split(/\n/).filter(Boolean).length;
  if (els.transcriptLineCount) {
    els.transcriptLineCount.textContent = `${n} line${n === 1 ? "" : "s"}`;
  }
}

function setTranscriptLiveStatus(mode, label) {
  if (!els.transcriptLiveStatus) return;
  els.transcriptLiveStatus.textContent = label;
  els.transcriptLiveStatus.className = `transcript-status status-${mode}`;
}

function showSpeechFeedback(feedback) {
  if (!els.speechFeedback) return;
  els.speechFeedback.hidden = false;
  els.speechFeedback.className = `speech-feedback tone-${feedback.tone}`;
  els.speechFeedbackTitle.textContent = feedback.title;
  els.speechFeedbackMessage.textContent = feedback.message;
  if (els.speechFeedbackMeta) {
    const time = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    els.speechFeedbackMeta.textContent = `Updated ${time} · ${feedback.wordCount} words · ${feedback.kind}`;
  }
  els.speechFeedback.classList.remove("is-updated");
  void els.speechFeedback.offsetWidth;
  els.speechFeedback.classList.add("is-updated");
  els.speechFeedback.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function setVoiceLiveStatus(mode, label) {
  if (!els.voiceLiveStatus) return;
  els.voiceLiveStatus.textContent = label;
  els.voiceLiveStatus.className = `transcript-status status-${mode}`;
}

function setMicHelp(message) {
  if (!els.micHelp) return;
  if (message) {
    els.micHelp.hidden = false;
    els.micHelp.textContent = message;
  } else {
    els.micHelp.hidden = true;
    els.micHelp.textContent = "";
  }
}

function appendLiveMicLog(line) {
  if (!els.liveMicLog) return;
  const stamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const entry = `[${stamp}] ${line}`;
  const prev = els.liveMicLog.value.trim();
  els.liveMicLog.value = prev ? `${prev}\n${entry}` : entry;
  els.liveMicLog.scrollTop = els.liveMicLog.scrollHeight;
}

async function startMicListen() {
  setMicHelp("");
  setVoiceLiveStatus("live", "Mic: starting…");
  const result = await userVoice.start();
  if (!result.ok) {
    setVoiceLiveStatus("warn", "Mic: error");
    setMicHelp(result.reason || "Could not start microphone. Use the text box instead.");
    if (els.btnStartMic) els.btnStartMic.disabled = false;
    if (els.btnStopMic) els.btnStopMic.disabled = true;
    return false;
  }
  return true;
}

function stopMicListen() {
  userVoice.stop();
  setVoiceLiveStatus("off", "Mic: off");
  if (els.speechInterim) els.speechInterim.hidden = true;
  if (els.btnStartMic) els.btnStartMic.disabled = false;
  if (els.btnStopMic) els.btnStopMic.disabled = true;
}

function appendMySpeechLog(line) {
  if (!els.mySpeechLog) return;
  const stamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const entry = `[${stamp}] ${line}`;
  const prev = els.mySpeechLog.value.trim();
  els.mySpeechLog.value = prev ? `${prev}\n${entry}` : entry;
  els.mySpeechLog.scrollTop = els.mySpeechLog.scrollHeight;
}

function handleUserSpeech(line) {
  const trimmed = line.trim();
  if (!trimmed) return;

  state.speakCount += 1;
  updateSpeakCount();
  appendMySpeechLog(trimmed);
  markSpoke({ silent: true });

  const bullets = parsePrepBullets(els.prepNotes.value);
  const feedback = feedbackForUtterance(
    trimmed,
    bullets,
    els.currentTopic.value,
    state.feedbackTipIndex
  );
  if (feedback.kind === "general") state.feedbackTipIndex += 1;
  showSpeechFeedback(feedback);
  showToast(`${feedback.title}`);
}

function logWhatISaid() {
  const line = els.justSaid?.value.trim();
  if (!line) {
    showToast("Type what you said, then Log + feedback");
    els.justSaid?.focus();
    return;
  }
  handleUserSpeech(line);
  els.justSaid.value = "";
  els.justSaid.focus();
}

async function startLiveTranscript() {
  liveTranscript.stop();
  const useClipboard = els.liveClipboard?.checked === true;

  if (useClipboard) {
    const access = await liveTranscript.requestClipboardAccess();
    if (!access.ok) {
      setTranscriptLiveStatus("warn", "Captions: allow clipboard");
      showToast(access.reason || "Enable clipboard, or leave captions off");
    }
  }

  await liveTranscript.start({ clipboard: useClipboard });
  setTranscriptLiveStatus(useClipboard ? "live" : "off", useClipboard ? "Captions: live" : "Captions: off");
}

function stopLiveTranscript() {
  liveTranscript.stop();
  stopMicListen();
  if (state.demoFeedStop) {
    state.demoFeedStop();
    state.demoFeedStop = null;
  }
  if (state.demoSpeechStop) {
    clearTimeout(state.demoSpeechStop);
    state.demoSpeechStop = null;
  }
  setTranscriptLiveStatus("off", "Captions: off");
}

function onLiveTranscriptLines(addedLines, source) {
  const name = els.displayName.value.trim();
  if (!name || !addedLines.length) return;

  if (nameAppearsInLines(addedLines, name)) {
    markSpoke({ silent: true });
    showToast(`Heard your name in ${source}`);
    return;
  }

  const window = recentTranscriptWindow(els.transcriptChunk.value, 25);
  if (nameAppearsInChunk(window, name)) return;

  const now = Date.now();
  if (now - state.lastTranscriptNudgeAt < TRANSCRIPT_NUDGE_COOLDOWN_MS) return;
  if (state.nudgeActive) return;
  state.lastTranscriptNudgeAt = now;
  state.nudgeActive = true;
  triggerNudge("Your name has not appeared in recent captions. Consider speaking up.");
}

async function startSession() {
  if (!els.displayName.value.trim() || !els.prepNotes.value.trim()) {
    if (els.setupPanel) els.setupPanel.open = true;
    showToast("Add your name and prep notes first");
    els.displayName.focus();
    return;
  }
  state.running = true;
  if (!state.startedAt) state.startedAt = Date.now();
  if (!state.lastSpokeAt) state.lastSpokeAt = Date.now();
  persistForm();
  if (state.tickId) clearInterval(state.tickId);
  state.tickId = setInterval(tick, 1000);
  els.btnStart.disabled = true;
  els.btnPause.disabled = false;
  await startLiveTranscript();
  updateTimerUi();
  renderSuggestions(false);
  showToast("Session live");
}

function pauseSession() {
  state.running = false;
  if (state.tickId) clearInterval(state.tickId);
  state.tickId = null;
  stopLiveTranscript();
  els.btnStart.disabled = false;
  els.btnPause.disabled = true;
  updateTimerUi();
  showToast("Session paused");
}

function checkTranscript() {
  const chunk = recentTranscriptWindow(els.transcriptChunk.value, 40);
  const name = els.displayName.value.trim();
  if (!chunk.trim()) {
    showToast("No captions yet — copy Zoom transcript text");
    return;
  }
  if (!name) {
    showToast("Enter your display name in Setup");
    return;
  }
  if (nameAppearsInChunk(chunk, name)) {
    showToast("Your name is in the captions");
    markSpoke({ silent: true });
  } else {
    state.nudgeActive = true;
    triggerNudge("Your name is not in this caption chunk. Jump in on the next pause.");
  }
}

async function copyAiPrompt() {
  const prompt = buildAiPrompt({
    displayName: els.displayName.value,
    prepNotes: els.prepNotes.value,
    currentTopic: els.currentTopic.value,
    transcriptChunk: els.transcriptChunk.value,
    charterNorm: els.charterNorm.value,
    mySpeechLog: els.mySpeechLog?.value,
    nudgeReason: els.nudgeBanner.hidden
      ? "manual request"
      : els.nudgeBannerText?.textContent,
  });
  await navigator.clipboard.writeText(prompt);
  showToast("AI prompt copied");
}

const DEMO_PREP = `- Customer problem should come before our solution (rubric feedback)
- Market CAGR 8.2% from McKinsey summary—I have the citation
- Recommend Competitor A for overlap on enterprise features
- Offer to draft competitive analysis slide by Thursday
- Ask for round-robin on blockers at start of next meeting`;

function loadDemoPrep() {
  els.displayName.value = "Riley Nguyen";
  els.prepNotes.value = DEMO_PREP;
  els.charterNorm.value = "We use a round-robin on blockers at the start of each meeting.";
  els.currentTopic.value = "presentation outline and slide assignments";
  els.nudgeInterval.value = "7";
  state.shownLines.clear();
  persistForm();
  renderSuggestions(false);
  showToast("Demo prep loaded");
}

function clearLogs() {
  liveTranscript.reset();
  els.transcriptChunk.value = "";
  if (els.mySpeechLog) els.mySpeechLog.value = "";
  if (els.liveMicLog) els.liveMicLog.value = "";
  if (els.speechFeedback) els.speechFeedback.hidden = true;
  updateTranscriptMeta("");
  state.speakCount = 0;
  updateSpeakCount();
  state.feedbackTipIndex = 0;
}

async function runDemoMode() {
  state.shownLines.clear();
  loadDemoPrep();
  clearLogs();
  if (els.liveClipboard) els.liveClipboard.checked = false;
  await startSession();
  setTranscriptLiveStatus("live", "Captions: demo feed");
  state.demoFeedStop = startDemoTranscriptFeed((line) => {
    liveTranscript.ingest(line, "demo");
  }, 2800);
  state.lastSpokeAt = Date.now() - nudgeIntervalMs() - 5000;
  state.nudgeActive = true;
  triggerNudge("Demo: you have been quiet. Try a line, or watch feedback change.");
  const samples = [
    "ok",
    "Should we lead with the customer problem before the solution?",
    "I can take competitive analysis and I have the CAGR citation from my prep notes.",
  ];
  samples.forEach((line, i) => {
    const id = setTimeout(() => handleUserSpeech(line), 1400 + i * 2200);
    if (i === 0) state.demoSpeechStop = id;
  });
}

function maybeOpenSetup() {
  if (!els.setupPanel) return;
  const empty = !els.displayName.value.trim() || !els.prepNotes.value.trim();
  els.setupPanel.open = empty;
}

function bindEvents() {
  [
    els.displayName,
    els.prepNotes,
    els.charterNorm,
    els.nudgeInterval,
    els.currentTopic,
  ].forEach((el) => el.addEventListener("input", persistForm));

  els.btnStart.addEventListener("click", async () => {
    await requestNotificationPermission();
    await startSession();
  });
  els.btnStartMic?.addEventListener("click", () => void startMicListen());
  els.btnStopMic?.addEventListener("click", stopMicListen);
  els.btnPause.addEventListener("click", pauseSession);
  els.btnSpoke.addEventListener("click", () => {
    if (els.justSaid?.value.trim()) logWhatISaid();
    else {
      state.speakCount += 1;
      updateSpeakCount();
      markSpoke();
    }
  });
  els.btnLogSpeech?.addEventListener("click", logWhatISaid);
  els.justSaid?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      logWhatISaid();
    }
  });
  els.btnRefreshSuggest.addEventListener("click", () => renderSuggestions(false));
  els.btnCheckTranscript.addEventListener("click", checkTranscript);
  els.btnCopyAi.addEventListener("click", copyAiPrompt);
  els.btnDemo.addEventListener("click", () => void runDemoMode());
  els.btnLoadDemoPrep.addEventListener("click", loadDemoPrep);
  els.currentTopic.addEventListener("change", () => {
    state.shownLines.clear();
    renderSuggestions(false);
  });
  els.prepNotes.addEventListener("change", () => {
    state.shownLines.clear();
    renderSuggestions(false);
  });
  els.liveClipboard?.addEventListener("change", () => {
    persistForm();
    if (state.running) void startLiveTranscript();
  });
}

function init() {
  loadFormFromStorage();
  bindEvents();
  els.btnPause.disabled = true;
  setSessionStatus("idle");
  setTranscriptLiveStatus("off", "Captions: off");
  setVoiceLiveStatus("off", "Mic: off");
  if (els.btnStopMic) els.btnStopMic.disabled = true;
  updateTranscriptMeta(els.transcriptChunk.value);
  updateSpeakCount();
  renderSuggestions(false);
  updateTimerUi();
  maybeOpenSetup();
}

init();

import {
  parsePrepBullets,
  generateSuggestions,
  buildAiPrompt,
} from "./suggestions.js";
import { nameAppearsInChunk } from "./transcript.js";

const STORAGE_KEY = "speakUpCoachSession_v1";

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
  timerDisplay: document.getElementById("timerDisplay"),
  suggestionsList: document.getElementById("suggestionsList"),
  toast: document.getElementById("toast"),
};

/** @type {{ running: boolean, lastSpokeAt: number|null, startedAt: number|null, shownLines: Set<string>, tickId: number|null }} */
const state = {
  running: false,
  lastSpokeAt: null,
  startedAt: null,
  shownLines: new Set(),
  tickId: null,
};

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
    if (Array.isArray(data.shownLines)) {
      state.shownLines = new Set(data.shownLines);
    }
    if (data.lastSpokeAt) state.lastSpokeAt = data.lastSpokeAt;
    if (data.startedAt) state.startedAt = data.startedAt;
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
    shownLines: [...state.shownLines],
    lastSpokeAt: state.lastSpokeAt,
    startedAt: state.startedAt,
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
  if (message) els.nudgeBanner.textContent = message;
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
    const li = document.createElement("li");
    li.textContent = "No new lines—edit topic or prep notes, then refresh.";
    els.suggestionsList.appendChild(li);
    return;
  }

  for (const item of items) {
    state.shownLines.add(item.line);
    const li = document.createElement("li");
    li.className = "suggestion-card";
    const type = document.createElement("span");
    type.className = "tag";
    type.textContent = item.type;
    const p = document.createElement("p");
    p.textContent = item.line;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn secondary small";
    btn.textContent = "Copy line";
    btn.addEventListener("click", async () => {
      await navigator.clipboard.writeText(item.line);
      showToast("Copied to clipboard");
    });
    li.append(type, p, btn);
    els.suggestionsList.appendChild(li);
  }
  persistForm();
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

function markSpoke() {
  state.lastSpokeAt = Date.now();
  setNudgeVisible(false);
  persistForm();
  showToast("Nice—timer reset");
  updateTimerUi();
}

function triggerNudge(reason) {
  const msg = reason || "Time to add your voice—pick a line below or speak your own.";
  setNudgeVisible(true, msg);
  renderSuggestions(true);
  maybeNotify("Speak-Up Coach", msg);
}

function updateTimerUi() {
  if (!state.running) {
    els.timerDisplay.textContent = "Session paused";
    els.sessionStatus.textContent = "Paused";
    return;
  }
  els.sessionStatus.textContent = "Live";
  const remaining = nudgeIntervalMs() - msSinceLastSpoke();
  if (remaining <= 0) {
    els.timerDisplay.textContent = "Nudge due now";
  } else {
    els.timerDisplay.textContent = `Next nudge in ${formatCountdown(remaining)}`;
  }
}

function tick() {
  if (!state.running) return;
  if (msSinceLastSpoke() >= nudgeIntervalMs()) {
    triggerNudge("You have not marked “I spoke” in a while. Here are ideas:");
  }
  updateTimerUi();
}

function startSession() {
  state.running = true;
  if (!state.startedAt) state.startedAt = Date.now();
  if (!state.lastSpokeAt) state.lastSpokeAt = Date.now();
  persistForm();
  if (state.tickId) clearInterval(state.tickId);
  state.tickId = setInterval(tick, 1000);
  els.btnStart.disabled = true;
  els.btnPause.disabled = false;
  updateTimerUi();
  showToast("Session live");
}

function pauseSession() {
  state.running = false;
  if (state.tickId) clearInterval(state.tickId);
  state.tickId = null;
  els.btnStart.disabled = false;
  els.btnPause.disabled = true;
  updateTimerUi();
  showToast("Session paused");
}

function checkTranscript() {
  const chunk = els.transcriptChunk.value;
  const name = els.displayName.value.trim();
  if (!chunk.trim()) {
    showToast("Paste a transcript chunk first");
    return;
  }
  if (!name) {
    showToast("Enter your display name first");
    return;
  }
  if (nameAppearsInChunk(chunk, name)) {
    showToast("Your name appears—nice contribution");
    markSpoke();
  } else {
    triggerNudge(
      "Your name is not in this transcript chunk—consider speaking in the next pause."
    );
  }
}

async function copyAiPrompt() {
  const prompt = buildAiPrompt({
    displayName: els.displayName.value,
    prepNotes: els.prepNotes.value,
    currentTopic: els.currentTopic.value,
    transcriptChunk: els.transcriptChunk.value,
    charterNorm: els.charterNorm.value,
    nudgeReason: els.nudgeBanner.hidden
      ? "manual request"
      : els.nudgeBanner.textContent,
  });
  await navigator.clipboard.writeText(prompt);
  showToast("AI prompt copied—paste in Cursor or ChatGPT");
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
  persistForm();
  renderSuggestions(false);
  showToast("Demo prep loaded");
}

function runDemoMode() {
  loadDemoPrep();
  els.transcriptChunk.value = `Jordan Lee: Let's assign slides for the financial section.
Sam Ortiz: I can take intro and transitions.
Casey Kim: We should lead with the customer problem first.
Jordan Lee: Agreed. Morgan, can you handle the appendix?`;
  startSession();
  state.lastSpokeAt = Date.now() - nudgeIntervalMs() - 5000;
  triggerNudge("Demo: simulated overdue nudge—try a suggested line.");
  checkTranscript();
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
    startSession();
  });
  els.btnPause.addEventListener("click", pauseSession);
  els.btnSpoke.addEventListener("click", markSpoke);
  els.btnRefreshSuggest.addEventListener("click", () => renderSuggestions(false));
  els.btnCheckTranscript.addEventListener("click", checkTranscript);
  els.btnCopyAi.addEventListener("click", copyAiPrompt);
  els.btnDemo.addEventListener("click", runDemoMode);
  els.btnLoadDemoPrep.addEventListener("click", loadDemoPrep);

  els.currentTopic.addEventListener("change", () => renderSuggestions(false));
}

function init() {
  loadFormFromStorage();
  bindEvents();
  els.btnPause.disabled = true;
  renderSuggestions(false);
  updateTimerUi();
}

init();

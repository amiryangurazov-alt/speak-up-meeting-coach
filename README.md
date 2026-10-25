# Speak-Up Meeting Coach

**Live prototype:** open `index.html` beside Zoom for nudges and suggested contribution lines.

**Public link (after GitHub Pages):** `https://YOUR_USERNAME.github.io/meeting-participation-metrics/`

A browser coach for teammates who struggle to **speak up in online meetings**. It reminds you to contribute on a timer, checks optional pasted transcript chunks for your name, and generates **ready-to-say lines** from your prep notes and the current topic.

## Quick start

### Option A — GitHub Pages (recommended for sharing)

1. Push this repo to GitHub (see [docs/PUBLISH.md](docs/PUBLISH.md)).
2. Enable **Pages** → source **main** → folder **/ (root)**.
3. Open the Pages URL on a laptop beside your video call.

### Option B — Local

ES modules require a local server (not `file://`):

```bash
cd ~/Projects/meeting-participation-metrics
python3 -m http.server 8080
```

Open http://localhost:8080

### First use

1. Fill **Setup** (name, prep bullets, nudge interval).
2. Click **Start meeting** → allow notifications.
3. Use **I spoke**, **Refresh suggestions**, and **Check transcript** during the call.

Full steps: [docs/USAGE.md](docs/USAGE.md)

## Try without a meeting

- **Load demo prep** — sample student-team notes ([inputs/demo-prep.md](inputs/demo-prep.md))
- **Run demo mode** — simulates overdue nudge + transcript without your name

## Optional course inputs

Paste into prep notes or charter field:

- [inputs/breakout-session-notes.md](inputs/breakout-session-notes.md) — self-reflection from Breakout Learning
- [inputs/team-charter.md](inputs/team-charter.md) — norms (e.g. round-robin)
- [inputs/peer-assessments.md](inputs/peer-assessments.md) — reminders of how others experience your participation

## How it works

| Layer | Behavior |
|-------|----------|
| **Timer** | Nudges if you have not clicked “I spoke” within N minutes |
| **Transcript check** | Parses `Name: line` paste; if your name is absent, escalates nudge |
| **Suggestions** | Rule-based lines from prep + topic (question, build, offer, summary) |
| **AI optional** | Copies a structured prompt for Cursor/ChatGPT—no API key in the app |

## Assignment write-up

See [DESCRIPTION.md](DESCRIPTION.md) (≤300 words) for goals and class-based rationale.

## Limits

- No Zoom/Teams API—manual transcript paste only.
- Supports **individual** speak-up; does not replace facilitator inclusion practices.

## License

MIT

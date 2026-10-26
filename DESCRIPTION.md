# Speak-Up Meeting Coach (prototype description)

**Link:** `https://YOUR_USERNAME.github.io/meeting-participation-metrics/` (enable GitHub Pages; see `docs/PUBLISH.md`)

**Goal:** Help teammates who struggle to speak in online meetings through **timed nudges**, **ready-to-say lines from their own prep**, and **feedback after they contribute**—behavior change in the meeting, not a post-hoc dashboard.

**Problem:** Uneven airtime reduces shared understanding and ownership. Quiet members often have useful prep but miss windows to talk. Psychological safety (Edmondson) needs low-risk entry points; structured prompts lower the cost of jumping in. Breakout Learning’s Group Balance and discussion-quality rubrics show that **volume and substance both matter**—so this coach scores what you said against prep, not just whether you talked.

**Prototype:** A static page opened beside Zoom. Setup: name, prep bullets, optional charter norm, nudge interval. Live: a timer resets when you click **I spoke**, log a line, or use the optional microphone (Chrome/Edge). If you stay quiet, a banner and suggested lines appear (question, build, offer, summary). Optional clipboard tracking of Zoom captions checks whether your name appears. **Copy AI prompt** sends context to Cursor or ChatGPT—no API key required.

**For other leaders:** Run `python3 -m http.server 8080` or enable Pages. Follow `docs/USAGE.md`. Click **Run demo** to see nudges, a caption feed, and changing feedback without a real call.

**Limits:** No Zoom API; mic is optional; this supports the individual between facilitator structures (round-robin, timeboxes), it does not replace them.

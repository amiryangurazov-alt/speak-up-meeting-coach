# Speak-Up Meeting Coach (prototype description)

**Link:** `https://YOUR_USERNAME.github.io/meeting-participation-metrics/` (enable GitHub Pages on this repo; see `docs/PUBLISH.md`)

**Goal:** Help teammates who struggle to speak in online meetings through **live nudges** and **concrete lines they can say**, using their own prep—not post-meeting analytics.

**Problem:** Uneven participation hurts team learning and ownership; quiet members often have useful prep but miss windows to talk. Psychological safety (Edmondson) requires low-risk ways to enter the conversation; structured prompts reduce the cognitive barrier to “jump in.”

**Prototype:** A static web page (`index.html`) opened beside Zoom. Inputs: display name, prep bullets, current topic, optional pasted live-transcript chunk, optional team norm from a charter. During the call, a timer reminds the user to contribute if they have not marked “I spoke.” Pasting transcript text checks whether their name appears; if not, the coach escalates a banner/notification and refreshes suggestions. A rule-based engine proposes varied lines (question, build-on, offer, summary) ranked by overlap between prep and topic; “Copy AI prompt” sends context to Cursor or ChatGPT for richer wording without embedding API keys.

**Class ties:** Complements Breakout Learning feedback on engagement and airtime by supporting **behavior change in real time**; charter norms (e.g. round-robin) personalize lines. Distinct from leader dashboards—this coaches the **individual** between facilitator structures.

**For other users:** Clone repo, enable Pages or run `python3 -m http.server`, follow `docs/USAGE.md`. Use **Run demo mode** to evaluate without a live meeting.

**Limits:** Manual transcript copy only; not surveillance; facilitator inclusion practices remain essential.

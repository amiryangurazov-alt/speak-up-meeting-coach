# Speak-Up Meeting Coach

A browser coach for teammates who struggle to **speak up in online meetings**. Sit it beside Zoom: it nudges you when you go quiet, suggests lines from your prep, and gives feedback after you speak.

**Public link (after GitHub Pages):** `https://YOUR_USERNAME.github.io/meeting-participation-metrics/`

## Quick start

```bash
cd ~/Projects/meeting-participation-metrics
python3 -m http.server 8080
```

Open **http://localhost:8080** in Chrome or Edge (not `file://`).

1. Fill **Setup** (name + prep bullets).
2. Click **Start meeting**.
3. When you speak: **I spoke**, **Log + feedback**, **I said this** on a suggestion, or **Start listening** (optional mic).
4. Use **Run demo** if you are grading and have no live call.

Full steps: [docs/USAGE.md](docs/USAGE.md) · publish: [docs/PUBLISH.md](docs/PUBLISH.md)

## How it works

| Layer | What it does |
|-------|----------------|
| Timer | Nudges once if you have not spoken within N minutes |
| Suggestions | Question / build / offer / summary lines from prep + topic |
| Feedback | Quotes what you said and matches it to prep or topic |
| Mic (optional) | Chrome/Edge speech-to-text of **your** microphone |
| Captions (optional) | Clipboard copies of Zoom captions; checks for your name |
| AI | Copies a prompt for Cursor/ChatGPT — no API key |

## Course inputs (optional)

Paste into Setup:

- [inputs/breakout-session-notes.md](inputs/breakout-session-notes.md)
- [inputs/team-charter.md](inputs/team-charter.md)
- [inputs/peer-assessments.md](inputs/peer-assessments.md)

## Assignment write-up

[DESCRIPTION.md](DESCRIPTION.md) (≤300 words).

## Limits

No Zoom/Teams API. Mic is optional and needs Chrome/Edge + internet. This coaches the **individual**; it does not replace facilitator inclusion.

## License

MIT

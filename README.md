# Meeting Participation Metrics

**Prototype link:** After you push to GitHub, paste your public URL here (see [docs/PUBLISH.md](docs/PUBLISH.md)). Example: `https://github.com/YOUR_USERNAME/meeting-participation-metrics`

A Cursor + Python pipeline that turns **online meeting transcripts** and **leader observation notes** into participation metrics: how much each person spoke, the context of their contributions (AI-coded), and engagement/distraction **risk indicators** (transcript + notes only).

Built for team leaders who want data-informed facilitation—not surveillance.

## Quick start (another team leader)

### 1. Prepare inputs

| File | Required | What to do |
|------|----------|------------|
| `inputs/meeting.vtt` or `.txt` | Yes | Record your Zoom/Teams meeting. Export **transcript** (VTT preferred) or plain text as `Speaker Name: utterance` per line. |
| `inputs/leader-notes.md` | Yes | Copy the template in that file; fill attendance, late joins, camera, observed distraction (2 minutes post-meeting). |
| `inputs/breakout-session-notes.md` | No | Paste Breakout Group Balance / rubric snippets to compare simulation vs live meeting. |
| `inputs/team-charter.md` | No | Your norms and decision rules for coaching section. |
| `inputs/peer-assessments.md` | No | Aggregated peer review scores if available. |

**Privacy:** Use pseudonyms in shared repos. Keep real names in local copies only.

### 2. Compute volume metrics (local)

```bash
python3 scripts/meeting_metrics.py inputs/meeting.vtt -o outputs/metrics.json
```

Outputs JSON: talk share %, turns, monologue length, **team_balance_score** (0–1, higher = more even). See [docs/METRICS.md](docs/METRICS.md).

### 3. Generate the full report (Cursor Agent)

1. Open this folder in [Cursor](https://cursor.com).
2. Start **Agent** chat.
3. Attach `@prompts/analyze-meeting.md`, `@outputs/metrics.json`, transcript, and `leader-notes.md`.
4. Send the prompt block from that file.
5. Save the result to `outputs/team-report-YYYY-MM-DD.md`. Share **individual metric cards** privately with each member.

**No Cursor?** Paste the same files and the prompt from `prompts/analyze-meeting.md` into ChatGPT or Claude.

### 4. Demo without your data

```bash
python3 scripts/meeting_metrics.py inputs/meeting-demo.vtt -o outputs/metrics-demo.json
```

Compare your output to [outputs/sample-report.md](outputs/sample-report.md).

## Metric families

1. **Volume** — script-computed from word counts (objective).
2. **Contribution context** — agent classifies turns (task, process, questions, off-topic) and substantive depth 0–4.
3. **Engagement / distraction risk** — agent merges minimal replies, repetition requests, off-topic speech with leader notes; always cites evidence.

## Exporting transcripts

- **Zoom:** Record to cloud or local → Transcripts → VTT download.
- **Teams:** Transcript in meeting recap → save as `.vtt` or copy to `Speaker:` text format.

## Repository layout

```
inputs/          Your meeting files (demo included)
scripts/         meeting_metrics.py
prompts/         analyze-meeting.md (agent instructions)
outputs/         metrics JSON + reports (demo samples committed)
docs/METRICS.md  Formal definitions
.cursor/rules/   Rubric for consistent agent output
```

## Assignment description

See [DESCRIPTION.md](DESCRIPTION.md) (≤300 words) for goals and class-based rationale to submit with the prototype.

## License

MIT — use and adapt for course teams.

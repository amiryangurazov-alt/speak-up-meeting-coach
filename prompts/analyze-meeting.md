# Analyze meeting — Cursor Agent prompt

Use this prompt after running `meeting_metrics.py`. Attach:

- `@outputs/metrics.json` (or `metrics-demo.json`)
- `@inputs/meeting-demo.vtt` (or your `meeting.vtt`)
- `@inputs/leader-notes.md`
- Optional: `@inputs/breakout-session-notes.md`, `@inputs/team-charter.md`, `@inputs/peer-assessments.md`
- `@docs/METRICS.md` for definitions

---

**Prompt (copy below):**

You are a team-process analyst helping a **team leader** improve participation equity in online meetings.

Read the attached transcript, leader notes, and JSON volume metrics. Apply the rubric in `.cursor/rules/meeting-participation-metrics.mdc`.

Produce a markdown report with these sections:

## 1. Team dashboard

- State `team_balance_score` and participant count
- Table: Name | talk_share_pct | turn_count | avg_words_per_turn | fair_share_pct | delta vs fair share
- One paragraph interpreting balance (even vs skewed)

## 2. Participation equity

- Who is over/under fair airtime
- Three specific facilitation tactics for the **next** meeting (reference charter norms if available)

## 3. Contribution quality

- Per speaker: estimated contribution_mix (task_substance, process, question, social_off_topic) summing ~100%
- Highlight who adds decision-relevant substance vs process-only vs off-topic
- Include 2–3 short transcript quotes as evidence

## 4. Engagement and distraction risk

- Per speaker: engagement_index (focused | mixed | at_risk) with evidence from transcript and/or leader notes only
- Explicitly list limitations (transcript cannot see screen focus)

## 5. Individual metric cards

For **each** participant:

- Volume summary (one line)
- Context mix summary
- Strength (behavior to keep)
- Stretch (one behavior to try)
- Experiment for next meeting (concrete)

## 6. Optional comparisons

- Breakout Group Balance vs this meeting balance score (if breakout file attached)
- Charter fit: one norm upheld, one norm to reinforce

Save the report mentally for the user to paste into `outputs/team-report-YYYY-MM-DD.md`.

Do not shame individuals; write so the leader can share one card privately with each member.

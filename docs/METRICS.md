# Metric definitions

## Volume metrics (computed by `scripts/meeting_metrics.py`)

| Metric | Definition |
|--------|------------|
| **talk_share_pct** | Speaker word count ÷ total meeting words × 100 |
| **turn_count** | Number of contiguous utterances attributed to the speaker |
| **avg_words_per_turn** | word_count ÷ turn_count |
| **longest_monologue_words** | Maximum single-turn word count |
| **total_speaking_seconds** | Sum of VTT cue durations for that speaker (when timestamps exist) |
| **team_balance_score** | 1 − Gini coefficient of word counts across speakers (0 = one person dominates, 1 = perfectly even) |

## Contribution context (Cursor agent — qualitative coding)

Each turn is classified into one primary type:

| Type | Examples |
|------|----------|
| **task_substance** | Ideas, evidence, decisions, analysis |
| **process** | Agenda, timing, assignments, summaries |
| **question** | Clarifying or probing questions |
| **social_off_topic** | Non-task chat |

**substantive_depth_avg** (0–4): adapted from Breakout discussion-quality rubrics — 0 = no task content, 4 = reasoned position with evidence and peer linkage.

## Engagement index (agent + leader notes)

| Index | Criteria |
|-------|----------|
| **focused** | No distraction flags; substantive replies when addressed |
| **mixed** | Some minimal replies or one self-reported distraction |
| **at_risk** | Multiple minimal replies, repetition requests, leader notes multitasking, or camera-off + low talk share without charter exception |

Every flag must cite a **transcript quote** or **leader-notes line**. The tool does not infer video behavior beyond what notes state.

## Equity flags (agent)

| Flag | Typical pattern |
|------|-----------------|
| **over_index_airtime** | talk_share_pct well above fair share (100 ÷ n) and mostly process/social |
| **under_index_substance** | Low talk share but high depth when speaking |
| **balanced** | Near fair share and healthy mix |

Fair share baseline: `100 / number_of_participants`.

# Meeting Participation Metrics (prototype description)

**Link:** https://github.com/amiryangurazov/meeting-participation-metrics

Meeting Participation Metrics is a Cursor-based prototype that helps team leaders improve online meeting equity using recorded transcripts and short leader notes—not video surveillance.

**Goal:** Make participation visible along three dimensions: (1) **volume** (talk share, turns, team balance score), (2) **contribution context** (whether speech advances task substance, process, questions, or off-topic chat), and (3) **engagement risk** (distraction cues such as repetition requests, minimal replies, or leader-observed multitasking).

**Inputs:** Required—meeting VTT/txt and `leader-notes.md`. Optional—Breakout Learning session summaries, team charter, peer assessments—for comparison and coaching.

**How it works:** A Python script computes objective airtime metrics from the transcript. Cursor Agent (prompt + rubric in-repo) codes contribution quality and merges engagement flags, citing quotes or notes for every claim. Output includes a team dashboard and individual metric cards with facilitation experiments (e.g., round-robin openers for uneven airtime).

**Class-based evidence:** Breakout’s Group Balance and discussion-quality rubrics motivate measuring airtime and substantive depth, not only volume—quiet members may add high-value evidence in few turns. Team charters supply norms for gap analysis (e.g., cameras on, consensus decisions). Combining transcript analysis with leader observations reflects mixed-methods team research; framing engagement as supportive check-ins aligns with psychological safety (Edmondson)—metrics inform structure, not grades.

**For other leaders:** Clone the repo, replace `inputs/`, run the script, then Agent with `prompts/analyze-meeting.md`. Demo data and `outputs/sample-report.md` show expected results.

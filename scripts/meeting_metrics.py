#!/usr/bin/env python3
"""Parse meeting transcript (WebVTT or Speaker: lines) and emit volume metrics."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path


SPEAKER_LINE = re.compile(r"^([A-Za-z][A-Za-z0-9 .'-]{0,40}):\s*(.*)$", re.MULTILINE)
VTT_CUE = re.compile(
    r"(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})\s*\n(?:.*\n)*?"
    r"(?:<v\s+([^>]+)>|([^:\n]+):\s*)?(.*?)(?=\n\n|\Z)",
    re.DOTALL,
)
VTT_INLINE = re.compile(r"^([^:\n]+):\s*(.+)$")


def parse_timestamp(ts: str) -> float:
    h, m, rest = ts.split(":")
    s, ms = rest.split(".")
    return int(h) * 3600 + int(m) * 60 + int(s) + int(ms) / 1000.0


def gini_coefficient(values: list[int]) -> float:
    if not values or sum(values) == 0:
        return 0.0
    sorted_vals = sorted(values)
    n = len(sorted_vals)
    total = sum(sorted_vals)
    cumulative = 0
    weighted = 0
    for i, v in enumerate(sorted_vals, start=1):
        cumulative += v
        weighted += i * v
    return (2 * weighted) / (n * total) - (n + 1) / n


def balance_score(word_counts: dict[str, int]) -> float:
    counts = [word_counts[s] for s in word_counts if word_counts[s] > 0]
    if len(counts) <= 1:
        return 1.0 if len(counts) == 1 else 0.0
    g = gini_coefficient(counts)
    return round(max(0.0, min(1.0, 1.0 - g)), 3)


def word_count(text: str) -> int:
    return len(re.findall(r"\b[\w']+\b", text))


def parse_vtt(content: str) -> list[tuple[str, str, float | None]]:
    """Return list of (speaker, text, duration_seconds)."""
    turns: list[tuple[str, str, float | None]] = []
    content = content.replace("\r\n", "\n").strip()
    if not content.upper().startswith("WEBVTT"):
        return turns

    blocks = re.split(r"\n\n+", content)
    for block in blocks:
        if block.strip().upper() == "WEBVTT" or re.match(r"^\d+$", block.strip()):
            continue
        lines = block.strip().split("\n")
        if not lines:
            continue
        time_idx = next((i for i, ln in enumerate(lines) if "-->" in ln), None)
        if time_idx is None:
            continue
        time_line = lines[time_idx]
        m = re.match(
            r"(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})",
            time_line,
        )
        duration = None
        if m:
            duration = parse_timestamp(m.group(2)) - parse_timestamp(m.group(1))
        body = "\n".join(lines[time_idx + 1 :]).strip()
        body = re.sub(r"<[^>]+>", "", body)
        speaker = "Unknown"
        text = body
        tag = re.match(r"^<v\s+([^>]+)>\s*(.*)$", body, re.DOTALL)
        if tag:
            speaker = tag.group(1).strip()
            text = tag.group(2).strip()
        else:
            inline = VTT_INLINE.match(body.replace("\n", " "))
            if inline:
                speaker = inline.group(1).strip()
                text = inline.group(2).strip()
        if text:
            turns.append((speaker, text, duration))
    return turns


def parse_speaker_txt(content: str) -> list[tuple[str, str, float | None]]:
    turns: list[tuple[str, str, float | None]] = []
    for match in SPEAKER_LINE.finditer(content):
        speaker = match.group(1).strip()
        text = match.group(2).strip()
        if text:
            turns.append((speaker, text, None))
    return turns


def parse_file(path: Path) -> list[tuple[str, str, float | None]]:
    content = path.read_text(encoding="utf-8", errors="replace")
    if path.suffix.lower() == ".vtt" or content.strip().upper().startswith("WEBVTT"):
        turns = parse_vtt(content)
        if turns:
            return turns
    return parse_speaker_txt(content)


def compute_metrics(turns: list[tuple[str, str, float | None]]) -> dict:
    speakers: dict[str, dict] = {}
    total_words = 0

    for speaker, text, duration in turns:
        wc = word_count(text)
        total_words += wc
        if speaker not in speakers:
            speakers[speaker] = {
                "turn_count": 0,
                "word_count": 0,
                "longest_monologue_words": 0,
                "total_speaking_seconds": 0.0,
            }
        s = speakers[speaker]
        s["turn_count"] += 1
        s["word_count"] += wc
        s["longest_monologue_words"] = max(s["longest_monologue_words"], wc)
        if duration is not None:
            s["total_speaking_seconds"] += max(0.0, duration)

    word_counts = {name: data["word_count"] for name, data in speakers.items()}
    balance = balance_score(word_counts)

    participants = {}
    for name, data in sorted(speakers.items()):
        share = round(100.0 * data["word_count"] / total_words, 1) if total_words else 0.0
        avg_turn = round(data["word_count"] / data["turn_count"], 1) if data["turn_count"] else 0.0
        participants[name] = {
            "talk_share_pct": share,
            "turn_count": data["turn_count"],
            "word_count": data["word_count"],
            "avg_words_per_turn": avg_turn,
            "longest_monologue_words": data["longest_monologue_words"],
            "total_speaking_seconds": round(data["total_speaking_seconds"], 1),
        }

    return {
        "source": "meeting_metrics.py",
        "total_words": total_words,
        "total_turns": len(turns),
        "team_balance_score": balance,
        "participants": participants,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Compute meeting participation volume metrics.")
    parser.add_argument("transcript", type=Path, help="Path to .vtt or Speaker: .txt transcript")
    parser.add_argument("-o", "--output", type=Path, default=Path("outputs/metrics.json"))
    args = parser.parse_args()

    if not args.transcript.is_file():
        print(f"Error: file not found: {args.transcript}", file=sys.stderr)
        return 1

    turns = parse_file(args.transcript)
    if not turns:
        print("Error: no speaker turns parsed. Check VTT or 'Name: text' format.", file=sys.stderr)
        return 1

    metrics = compute_metrics(turns)
    metrics["transcript_file"] = str(args.transcript)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(metrics, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {args.output} ({len(metrics['participants'])} participants, balance={metrics['team_balance_score']})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

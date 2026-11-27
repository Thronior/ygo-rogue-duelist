"""Freeze the 10K player survey's multiple-choice results into the client (user, 2026-11-27: close the survey and show
its results as a Family Feud style quiz plus a results page, android/web/survey-results.js).

Usage:
  python -B tools/survey_results_snapshot.py                 download every answer from the stats Worker
  python -B tools/survey_results_snapshot.py answers.csv     build from a CSV (tools/export_survey.mjs)

Writes android/web/survey-results.json: per question the English answer names and how many players picked each, the
number of players, and the places. Free-text wishes are never copied, nor response IDs or times. Places picked by
fewer than MIN_PLACE players are folded into one "other" count (listed by code only, no counts) so no single
player's answer stands out.
Rerun it right after the stats Worker closes the survey (SURVEY_CLOSED "true") so the snapshot holds every answer.
"""
import csv, io, json, sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import survey_report  # noqa: E402  (download + token handling)

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'android/web/survey-results.json'
QUESTIONS = [key for key, _ in survey_report.QUESTIONS]
MIN_PLACE = 3


def snapshot(text):
    rows = list(csv.DictReader(io.StringIO(text.lstrip('﻿'))))
    questions = {}
    for key in QUESTIONS:
        counts = Counter(r[key] for r in rows if (r.get(key) or '').strip())
        questions[key] = {'answered': sum(counts.values()), 'counts': sorted(counts.items(), key=lambda x: (-x[1], x[0]))}
    places = Counter(r['country_code'] for r in rows if (r.get('country_code') or '').strip())
    shown = sorted(((code, n) for code, n in places.items() if n >= MIN_PLACE), key=lambda x: (-x[1], x[0]))
    return {
        'survey': '10k-2026', 'players': len(rows),
        'closed': datetime.now(timezone.utc).strftime('%Y-%m-%d'),
        'questions': questions,
        'places': {'answered': sum(places.values()), 'count': len(places), 'top': shown,
                   'other': sum(n for n in places.values() if n < MIN_PLACE),
                   # The map tints these as "1–2 players", without a count.
                   'few': sorted(code for code, n in places.items() if n < MIN_PLACE)},
    }


def main():
    text = Path(sys.argv[1]).read_text(encoding='utf-8-sig') if len(sys.argv) > 1 else survey_report.download()
    data = snapshot(text)
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf8')
    print(f'Wrote {OUT.relative_to(ROOT)} ({data["players"]} players, {OUT.stat().st_size // 1024} KB)')
    for key in QUESTIONS:
        q = data['questions'][key]
        print(f'  {key}: {q["answered"]} answers, top: ' + ', '.join(f'{n} {c * 100 / q["answered"]:.0f}%' for n, c in q['counts'][:5]))


if __name__ == '__main__':
    main()

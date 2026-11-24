"""10K player survey answers as CSV (android/web/survey.js). One row per player.

The client sends {survey, id, country, countryName, answers: {column: English name}, wish}. `row()` checks it and
returns the CSV row; `append()` adds it to a file unless that response ID is already there (a retried send).
tools/serve_qa.py records the local demo with it.
"""
import csv, io, re
from datetime import datetime, timezone
from pathlib import Path

SURVEY_ID = '10k-2026'
ANSWERS = ['fav_character', 'least_character', 'fav_relic', 'fav_shadow_relic', 'fav_fused_relic',
           'fav_opponent', 'least_opponent', 'fav_online_mode']
COLUMNS = ['received_utc', 'response_id', 'country_code', 'country', *ANSWERS, 'wish']


def clean(value, limit):
    # A leading = + - @ would make a spreadsheet run it as a formula.
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', str(value or '')).strip()[:limit]
    return "'" + text if text[:1] in ('=', '+', '-', '@') else text


def row(data):
    if not isinstance(data, dict) or data.get('survey') != SURVEY_ID:
        raise ValueError('not a survey answer')
    rid = str(data.get('id') or '')
    if not re.fullmatch(r'[0-9a-fA-F-]{8,64}', rid):
        raise ValueError('bad response id')
    code = str(data.get('country') or '')
    if code and not re.fullmatch(r'[A-Z]{2}', code):
        raise ValueError('bad country')
    answers = data.get('answers') if isinstance(data.get('answers'), dict) else {}
    return {'received_utc': datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M'), 'response_id': rid,
            'country_code': code, 'country': clean(data.get('countryName'), 80) if code else '',
            **{k: clean(answers.get(k), 80) for k in ANSWERS}, 'wish': clean(data.get('wish'), 1000)}


def append(path, data):
    """Returns True when a new row was written, False for a response ID already in the file."""
    path = Path(path)
    line = row(data)
    if path.exists():
        with path.open(encoding='utf-8-sig', newline='') as f:
            if any(r.get('response_id') == line['response_id'] for r in csv.DictReader(f)):
                return False
    path.parent.mkdir(parents=True, exist_ok=True)
    new = not path.exists()
    # utf-8-sig so Excel opens accents and Japanese/Korean/Chinese answers correctly.
    with path.open('a', encoding='utf-8-sig' if new else 'utf-8', newline='') as f:
        w = csv.DictWriter(f, COLUMNS)
        if new:
            w.writeheader()
        w.writerow(line)
    return True


def text(rows):
    out = io.StringIO()
    w = csv.DictWriter(out, COLUMNS)
    w.writeheader()
    w.writerows(rows)
    return out.getvalue()

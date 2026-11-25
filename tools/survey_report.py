"""10K player survey results as one self-contained HTML page (user, 2026-11-25: "a way for me to see the results of
the survey so far in an interesting way").

Usage:
  python tools/survey_report.py                 download every answer from the stats Worker, then build the page
  python tools/survey_report.py answers.csv     build it from a CSV (tools/export_survey.mjs or the QA demo)

Downloading needs the stats Worker secret SURVEY_ADMIN_TOKEN, read from $env:YGO_SURVEY_ADMIN_TOKEN or from
multiplayer/global-stats/.admin-token (git-ignored). It is never printed. Output (never overwritten):
D:/Codex Exports/Survey/<time>/survey-report.html plus the CSV it was built from. The page embeds small portraits
and relic art, so it opens offline and can be sent as one file. It holds players' free-text wishes: keep it private.
"""
import base64, csv, io, json, re, sys, urllib.request
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / 'android/web'
QUESTIONS = [
    ('fav_character', 'Favourite character to play'), ('least_character', 'Least favourite character to play'),
    ('fav_relic', 'Favourite normal relic'), ('fav_shadow_relic', 'Favourite shadow relic'),
    ('fav_fused_relic', 'Favourite fused relic'), ('fav_opponent', 'Favourite opponent'),
    ('least_opponent', 'Least favourite opponent'), ('fav_online_mode', 'Favourite online mode')]
STOP = set('''a an the and or but of to in on for with at by from is are was were be been it its this that these those i
me my we our you your he she they them their as so if not no do does did have has had can could would should will just
more some any all also than then there here what which who when where why how into out up down over about like add
adding added game games please make want would maybe really very much many get got one two new card cards mode
lot lots thing things even still way im i'm it's dont don't de la le et les des que en un une el los las y es para
por con se lo see love like think feel good great fun cool nice yugioh yu-gi-oh play playing etc era cartas carta del una mais mas como esse essa ser ter seria sería really something someone other others thank thanks dev developer keep'''.split())


def token():
    value = __import__('os').environ.get('YGO_SURVEY_ADMIN_TOKEN', '').strip()
    path = ROOT / 'multiplayer/global-stats/.admin-token'
    if not value and path.exists():
        value = path.read_text(encoding='utf8').strip()
    return value


def download():
    secret = token()
    if not secret:
        raise SystemExit('No survey token: set $env:YGO_SURVEY_ADMIN_TOKEN or write it to multiplayer/global-stats/.admin-token.')
    url = json.loads((WEB / 'multiplayer-config.json').read_text(encoding='utf8'))['statsUrl'] + '/v1/survey.csv'
    request = urllib.request.Request(url, headers={'Authorization': 'Bearer ' + secret, 'User-Agent': 'survey-report'})
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            return response.read().decode('utf-8-sig')
    except urllib.error.HTTPError as error:
        raise SystemExit(f'The stats Worker refused the download ({error.code}).' + (' Wrong or unset SURVEY_ADMIN_TOKEN.' if error.code == 401 else ''))


def thumb(path, size=96):
    """A small WebP data URL, so the page stays light."""
    try:
        image = Image.open(path).convert('RGBA')
    except Exception:
        return ''
    image.thumbnail((size, size * 2))
    out = io.BytesIO()
    image.save(out, 'WEBP', quality=80)
    return 'data:image/webp;base64,' + base64.b64encode(out.getvalue()).decode()


def art_index():
    """English answer name -> image file, the same pictures the survey tiles show."""
    content = json.loads((WEB / 'content.json').read_text(encoding='utf8'))
    files = {}
    for person in content.get('characters', []):
        if person.get('sprite'):
            files.setdefault(person['name'], WEB / 'assets' / person['sprite'])
    for key, row in content.get('artifacts', {}).items():
        art = (content.get('artifactInfo', {}).get(key) or {}).get('art')
        if art:
            files.setdefault(row[0], WEB / 'assets/relics' / (art if re.search(r'\.(png|svg)$', str(art), re.I) else f'{art}.jpg'))
    for name, code in (('Tag Duels', 81332143), ('Draft Duels', 3549275), ('Ultimate Collector', 17375316)):
        files[name] = WEB / f'assets/menu/{code}.jpg'
    return files


def words(wishes):
    counts = Counter()
    for text in wishes:
        seen = set()
        for word in re.findall(r"[^\W\d_][\w'-]{2,}", text.lower()):
            word = word.strip("'-")
            if word not in STOP and word not in seen and len(word) > 2:
                seen.add(word); counts[word] += 1
    return [[w, n] for w, n in counts.most_common(40) if n > 1]


def build(text):
    rows = [r for r in csv.DictReader(io.StringIO(text.lstrip('\ufeff')))]
    files = art_index()
    tally = {key: Counter(r[key] for r in rows if r.get(key)) for key, _ in QUESTIONS}
    used = {name for counter in tally.values() for name, _ in counter.most_common(40)}
    images = {name: thumb(files[name]) for name in used if name in files and files[name].exists()}
    days = Counter((r.get('received_utc') or '')[:10] for r in rows if r.get('received_utc'))
    countries = Counter(r['country'] for r in rows if r.get('country'))
    wishes = [{'at': r.get('received_utc', ''), 'from': r.get('country', ''), 'text': r['wish'].lstrip("'")}
              for r in rows if (r.get('wish') or '').strip()]
    wishes.sort(key=lambda w: w['at'], reverse=True)
    data = {
        'generated': datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC'),
        'total': len(rows), 'answered': {key: sum(tally[key].values()) for key, _ in QUESTIONS},
        'questions': {key: {'title': title, 'counts': tally[key].most_common()} for key, title in QUESTIONS},
        'countries': countries.most_common(), 'skippedCountry': sum(1 for r in rows if not r.get('country')),
        'days': sorted(days.items()), 'wishes': wishes, 'words': words(w['text'] for w in wishes), 'images': images,
        'last': max((r.get('received_utc') or '' for r in rows), default=''),
    }
    template = (ROOT / 'tools/survey_report_template.html').read_text(encoding='utf8')
    return template.replace('/*DATA*/null', json.dumps(data, ensure_ascii=False).replace('</', '<\\/'))


def main():
    stamp = datetime.now().strftime('%Y-%m-%dT%H-%M')
    if len(sys.argv) > 1:
        text = Path(sys.argv[1]).read_text(encoding='utf-8-sig')
        out = Path(sys.argv[2]) if len(sys.argv) > 2 else Path(f'D:/Codex Exports/Survey/{stamp}/survey-report.html')
    else:
        text = download()
        out = Path(f'D:/Codex Exports/Survey/{stamp}/survey-report.html')
    if out.exists():
        raise SystemExit(f'Refusing to overwrite {out}')
    out.parent.mkdir(parents=True, exist_ok=True)
    if len(sys.argv) == 1:
        (out.parent / 'survey-answers.csv').write_text(text, encoding='utf-8-sig')
    out.write_text(build(text), encoding='utf8')
    print(f'Wrote {out} ({len(list(csv.DictReader(io.StringIO(text.lstrip(chr(0xfeff))))))} answers)')


if __name__ == '__main__':
    main()

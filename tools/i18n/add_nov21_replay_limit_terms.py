"""Replay upload limit raised from 20 kB to 100 kB (Nori, Discord 2026-11-21: a loop 9 run with 150+ relics could not send
any behaviour flag). The two messages keep the old wording with the new number, in all 8 languages.
Never overwrites an existing translation."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {
 'A replay exceeds the 100 kB upload limit.': (
  'Eine Wiederholung überschreitet das Upload-Limit von 100 kB.',
  'Una repetición supera el límite de subida de 100 kB.',
  "Un replay dépasse la limite d'envoi de 100 Ko.",
  'Un replay supera il limite di caricamento di 100 kB.',
  'リプレイがアップロード上限の100 kBを超えています。',
  '리플레이가 업로드 한도인 100 kB를 초과합니다.',
  'Um replay excede o limite de envio de 100 kB.',
  '有回放超过了100 kB的上传限制。'),
 'Replay exceeds the 100 kB upload limit.': (
  'Die Wiederholung überschreitet das Upload-Limit von 100 kB.',
  'La repetición supera el límite de subida de 100 kB.',
  "Le replay dépasse la limite d'envoi de 100 Ko.",
  'Il replay supera il limite di caricamento di 100 kB.',
  'リプレイがアップロード上限の100 kBを超えています。',
  '리플레이가 업로드 한도인 100 kB를 초과합니다.',
  'O replay excede o limite de envio de 100 kB.',
  '回放超过了100 kB的上传限制。'),
}


def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, values in TERMS.items(): table.setdefault(en, values[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    catalog_path = ROOT / 'data/i18n/catalog.json'
    catalog = json.loads(catalog_path.read_text(encoding='utf-8-sig'))
    known = {r['en'] for r in catalog}
    for en in TERMS:
        if en not in known: catalog.append({'group': 'ui', 'en': en, 'kind': 'exact', 'ctx': 'replays.js'})
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    print('ok', len(TERMS))


if __name__ == '__main__':
    main()

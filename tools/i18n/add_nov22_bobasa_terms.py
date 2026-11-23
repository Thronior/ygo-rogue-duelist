"""Adds the Bobasa Tier 1 opponent (2026-11-22): his theme text in every language, and his name in Japanese, Korean and
Simplified Chinese. ja is his original anime name (Yugipedia ja_name ボバサ); ko and zh are transliterations of it, as
Duel Links does not list him. European languages keep the English name, so the name gets no catalog row (see
add_nov19_character_names.py). Existing translations are never overwritten. Run once; re-running changes nothing."""
import json,runpy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ('de', 'es', 'fr', 'it', 'pt', 'ja', 'ko', 'zh')
THEME = 'A Lamp deck whose genies pour out of its lamps, backed by Jars that flip into surprises.'
TERMS = {THEME: (
    'Ein Lampen-Deck, dessen Dschinns aus seinen Lampen strömen, unterstützt von Krügen, die beim Umdrehen überraschen.',
    'Un deck de Lámparas cuyos genios salen de sus lámparas, respaldado por Jarrones que sorprenden al voltearse.',
    'Un deck Lampe dont les génies jaillissent de ses lampes, soutenu par des Jarres qui surprennent une fois retournées.',
    'Un Deck di Lampade i cui geni escono dalle lampade, sostenuto da Vasi che sorprendono quando vengono scoperti.',
    'Um deck de Lâmpadas cujos gênios saem de suas lâmpadas, apoiado por Jarros que surpreendem ao serem virados.',
    'ランプから魔人が次々と現れ、リバースで不意を突く壺が支えるランプデッキ。',
    '램프에서 마인이 쏟아져 나오고, 뒤집히면 허를 찌르는 항아리가 받쳐 주는 램프 덱입니다.',
    '魔人从神灯中接连现身，并由翻转时出其不意的壶支援的神灯卡组。')}
NAMES = {'Bobasa': {'ja': 'ボバサ', 'ko': '보바사', 'zh': '波巴萨'}}


def main():
    catalog_path = ROOT / 'data/i18n/catalog.json'
    catalog = json.loads(catalog_path.read_text(encoding='utf8'))
    rows = catalog if isinstance(catalog, list) else catalog.get('strings', catalog.get('entries'))
    known = {r['en'] for r in rows}
    added = {}
    for index, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf8'))
        count = 0
        for key, values in TERMS.items():
            if key not in table: table[key] = values[index]; count += 1
        for key, names in NAMES.items():
            if lang in names and key not in table: table[key] = names[lang]; count += 1
        if count: path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
        added[lang] = count
    fresh = [key for key in TERMS if key not in known]
    for key in fresh: rows.append({'group': 'ui', 'en': key, 'kind': 'exact', 'ctx': 'opponent theme added 2026-11-22'})
    if fresh: catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    print('added', added, 'catalog rows', len(fresh))


if __name__ == '__main__':
    main()

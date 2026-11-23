"""Adds the Johnny Steps Tier 1 opponent (2026-11-23): his theme text in every language, and his name in Japanese,
Korean and Simplified Chinese (ja ジョニー・ステップ from the anime; ko and zh transliterate it). The card names in the
theme are each language's official ones from data/i18n/cards. European languages keep the English name, so the name
gets no catalog row (see add_nov19_character_names.py). Existing translations are never overwritten. Run once;
re-running changes nothing."""
import json,runpy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ('de', 'es', 'fr', 'it', 'pt', 'ja', 'ko', 'zh')
THEME = 'A Fusion deck that calls Musician King and Empress Judge and arms them with Metalmorph and Fusion Weapon.'
TERMS = {THEME: (
    'Ein Fusionsdeck, das Musikerkönig und Kaiserliche Richterin ruft und sie mit Metallwandler und Fusionswaffe ausrüstet.',
    'Un deck de Fusión que invoca a Rey Músico y a Juez Emperatriz y los equipa con Metalmorph y Arma de Fusión.',
    'Un deck Fusion qui invoque Roi Musicien et Impératrice Juge et les équipe de Métalmorphe et Arme de Fusion.',
    'Un Deck Fusione che evoca Re Musicista e Giudice Imperatrice e li equipaggia con Metalmorph e Arma Fusione.',
    'Um deck de Fusão que invoca Rei Músico e Juíza Imperatriz e os equipa com Metalmorfo e Arma de Fusão.',
    '「音楽家の帝王」と「裁きを下す女帝」を融合召喚し、「メタル化・魔法反射装甲」と「フュージョン・ウェポン」で強化する融合デッキ。',
    '"음악의 제왕"과 "심판의 여왕"을 융합 소환하고 "메탈화 마법반사장갑"과 "퓨전 웨폰"으로 강화하는 융합 덱입니다.',
    '融合召唤「音乐家帝王」和「下达裁决的女帝」，再用「金属化·魔法反射装甲」和「融合武器」强化它们的融合卡组。')}
NAMES = {'Johnny Steps': {'ja': 'ジョニー・ステップ', 'ko': '조니 스텝', 'zh': '强尼·斯特普'}}


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
    for key in fresh: rows.append({'group': 'ui', 'en': key, 'kind': 'exact', 'ctx': 'opponent theme added 2026-11-23 (Johnny Steps)'})
    if fresh: catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    print('added', added, 'catalog rows', len(fresh))


if __name__ == '__main__':
    main()

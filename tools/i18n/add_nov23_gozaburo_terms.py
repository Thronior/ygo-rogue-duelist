"""Adds the Gozaburo Kaiba Tier 1 opponent (2026-11-23): his theme text in every language, and his name in Japanese,
Korean and Simplified Chinese (ja 海馬剛三郎 is his original anime name; ko and zh follow it). The card names in the theme
are each language's official ones from data/i18n/cards. European languages keep the English name, so the name gets no
catalog row (see add_nov19_character_names.py). Existing translations are never overwritten. Run once; re-running
changes nothing."""
import json,runpy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ('de', 'es', 'fr', 'it', 'pt', 'ja', 'ko', 'zh')
THEME = 'An Exodia Necross deck that buries all five Forbidden One pieces to call up a Necross that grows stronger every turn.'
TERMS = {THEME: (
    'Ein Exodia-Necross-Deck, das alle fünf Teile der Verbotenen auf den Friedhof legt, um einen Necross zu rufen, der jeden Spielzug stärker wird.',
    'Un deck de Exodia Necross que manda al Cementerio las cinco piezas del Prohibido para invocar a un Necross que se fortalece cada turno.',
    "Un deck Éxodia Necross qui envoie au Cimetière les cinq pièces de l'Interdit pour invoquer un Necross qui se renforce à chaque tour.",
    'Un Deck Exodia Necross che manda al Cimitero tutti e cinque i pezzi del Proibito per evocare un Necross che diventa più forte a ogni turno.',
    'Um deck de Exodia Necross que envia ao Cemitério as cinco peças do Proibido para invocar um Necross que fica mais forte a cada turno.',
    '封印されしエクゾディアのパーツ5枚をすべて墓地へ送り、ターンごとに強くなるエクゾディア・ネクロスを呼び出すデッキ。',
    '봉인된 엑조디아의 파츠 5장을 모두 묘지로 보내, 턴마다 강해지는 엑조디아 네크로스를 불러내는 덱입니다.',
    '将被封印的艾克佐迪亚的五个部件全部送去墓地，召唤每回合不断变强的艾克佐迪亚的亡灵的卡组。')}
NAMES = {'Gozaburo Kaiba': {'ja': '海馬剛三郎', 'ko': '카이바 고자부로', 'zh': '海马刚三郎'}}


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
    for key in fresh: rows.append({'group': 'ui', 'en': key, 'kind': 'exact', 'ctx': 'opponent theme added 2026-11-23'})
    if fresh: catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    print('added', added, 'catalog rows', len(fresh))


if __name__ == '__main__':
    main()

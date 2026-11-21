"""Deck editor items from Discord (Nori, 2026-11-20), in all 8 languages. Never overwrites an existing translation.
Boss curses in the deck stats: the note under the deck count when the next boss's curses are counted."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {
 # Solo deck editor, when the next duel is a boss with ATK/DEF or relic curses (feedback-ui.js bossStatCurses).
 "Card stats include the next boss's curses.": (
  'Die Kartenwerte enthalten die Flüche des nächsten Bosses.',
  'Las estadísticas de las cartas incluyen las maldiciones del siguiente jefe.',
  'Les statistiques des cartes incluent les malédictions du prochain Boss.',
  'Le statistiche delle carte includono le maledizioni del prossimo Boss.',
  'カードの数値には次のボスの呪いが含まれています。',
  '카드 수치에 다음 보스의 저주가 반영되어 있습니다.',
  'Os atributos das cartas incluem as maldições do próximo chefe.',
  '卡片数值已计入下一个首领的诅咒。'),
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
        if en not in known: catalog.append({'group': 'ui', 'en': en, 'kind': 'exact', 'ctx': 'deck editor, Nori 2026-11-20'})
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    print('ok', len(TERMS))


if __name__ == '__main__':
    main()

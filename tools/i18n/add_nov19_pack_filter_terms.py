"""Pack details window term links of 2026-11-19 (CITYDRIVER on Discord), in all 8 languages. Never overwrites an
existing translation. The summary's Types, Attributes, archetypes and Support themes are links (card-links.js
packSummaryHtml); a click shows only that pack's cards of the term, with a "Showing only" chip and ✕ (mobile.js
inspectPack)."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {
 # Hover text of each link.
 'Show only these cards from this pack': (
  'Nur diese Karten aus diesem Booster zeigen',
  'Mostrar solo estas cartas de este sobre',
  'Afficher uniquement ces cartes de ce booster',
  'Mostra solo queste carte di questa busta',
  'このパックのこのカードだけを表示',
  '이 팩에서 이 카드만 표시',
  'Mostrar apenas estes cards deste pacote',
  '只显示此补充包中的这些卡片'),
 # The active-filter chip above the pack's card list; {0} is the translated term.
 'Showing only {0}': (
  'Nur {0} angezeigt',
  'Mostrando solo {0}',
  'Affichage : {0} uniquement',
  'Solo {0} in mostra',
  '{0}のみ表示中',
  '{0}만 표시 중',
  'Mostrando apenas {0}',
  '仅显示{0}'),
 'Clear filter': ('Filter entfernen', 'Quitar filtro', 'Retirer le filtre', 'Rimuovi filtro', 'フィルターを解除', '필터 해제', 'Remover filtro', '清除筛选'),
 'No cards in this pack match.': (
  'Keine Karte in diesem Booster passt.',
  'Ninguna carta de este sobre coincide.',
  'Aucune carte de ce booster ne correspond.',
  'Nessuna carta di questa busta corrisponde.',
  'このパックに該当するカードはありません。',
  '이 팩에 해당하는 카드가 없습니다.',
  'Nenhum card deste pacote corresponde.',
  '此补充包中没有符合的卡片。'),
}


def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, values in TERMS.items(): table.setdefault(en, values[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
        print(lang, len(TERMS), 'terms')


if __name__ == '__main__':
    main()

"""Stacked duplicates in the deck editor (user, 2026-11-14): the Settings › Gameplay switch and the stack labels.
8 languages, using each language's existing words for Deck, copy and misprint."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
EXACT = {
 'Stack Duplicate Cards': {'de': 'Doppelte Karten stapeln', 'es': 'Apilar cartas repetidas', 'fr': 'Empiler les cartes en double', 'it': 'Impila le carte doppie',
                           'ja': '重複カードをまとめる', 'ko': '중복 카드 묶기', 'pt': 'Empilhar cards repetidos', 'zh': '叠放重复卡片'},
 'Copies of the same card show as one card in the deck editor, with a dot for each copy. Misprints stay separate.': {
  'de': 'Kopien derselben Karte erscheinen im Deck-Editor als eine Karte mit einem Punkt pro Kopie. Fehldrucke bleiben getrennt.',
  'es': 'Las copias de la misma carta se muestran como una sola en el editor de mazos, con un punto por copia. Los errores de impresión se muestran aparte.',
  'fr': 'Les exemplaires d’une même carte apparaissent comme une seule carte dans l’éditeur de deck, avec un point par exemplaire. Les erreurs d’impression restent séparées.',
  'it': 'Le copie della stessa carta appaiono come una sola carta nell’editor del Deck, con un punto per copia. Gli errori di stampa restano separati.',
  'ja': 'デッキ編集で同じカードを1枚にまとめ、枚数分の点を表示します。ミスプリントは別に表示されます。',
  'ko': '덱 편집기에서 같은 카드를 한 장으로 묶고, 장수만큼 점을 표시합니다. 미스프린트는 따로 표시됩니다.',
  'pt': 'Cópias do mesmo card aparecem como um só card no editor de Deck, com um ponto por cópia. Erros de impressão ficam separados.',
  'zh': '在卡组编辑中，同一张卡的多张会叠成一张，每张显示一个圆点。印刷错误的卡会单独显示。'},
 'Take one copy out of the Deck': {'de': 'Eine Kopie aus dem Deck nehmen', 'es': 'Quitar una copia del mazo', 'fr': 'Retirer un exemplaire du deck', 'it': 'Togli una copia dal Deck',
                                   'ja': 'デッキから1枚抜く', 'ko': '덱에서 한 장 빼기', 'pt': 'Tirar uma cópia do Deck', 'zh': '从卡组中移除一张'},
}
PATTERNS = {
 '{0} of {1} copies in the Deck': {'de': '{0} von {1} Kopien im Deck', 'es': '{0} de {1} copias en el mazo', 'fr': '{0} exemplaires sur {1} dans le deck', 'it': '{0} copie su {1} nel Deck',
                                   'ja': 'デッキに{1}枚中{0}枚', 'ko': '{1}장 중 {0}장이 덱에 있음', 'pt': '{0} de {1} cópias no Deck', 'zh': '{1}张中有{0}张在卡组中'},
 '{0} copies': {'de': '{0} Kopien', 'es': '{0} copias', 'fr': '{0} exemplaires', 'it': '{0} copie', 'ja': '{0}枚', 'ko': '{0}장', 'pt': '{0} cópias', 'zh': '{0}张'},
}
def main():
    for lang in ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']:
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for terms in (EXACT, PATTERNS):
            for key, text in terms.items(): table[key] = text[lang]
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    path = ROOT / 'data/i18n/catalog.json'
    catalog = json.loads(path.read_text(encoding='utf-8-sig'))
    known = {r.get('en') for r in catalog}
    catalog += [{'group': 'ui', 'en': k, 'kind': 'exact', 'ctx': 'deck-stacks.js'} for k in EXACT if k not in known]
    catalog += [{'group': 'ui', 'en': k, 'kind': 'pattern', 'ctx': 'deck-stacks.js'} for k in PATTERNS if k not in known]
    path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
if __name__ == '__main__':
    main()

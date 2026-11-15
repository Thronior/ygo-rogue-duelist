"""The 3-copy deck message names the card and how many copies you have (Discord, 2026-11-15, Xtrathiccsnorlax: four
Fire Princess blocked a Tag lock-in and the message did not say why), all 8 languages. Never overwrites a translation."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TEXT = 'You have {0} copies of {1}. You can use at most three copies of a card.'
LOCAL = ('Du hast {0} Exemplare von {1}. Du kannst höchstens drei Exemplare einer Karte verwenden.',
 'Tienes {0} copias de {1}. Puedes usar como máximo tres copias de una carta.',
 "Vous avez {0} exemplaires de {1}. Vous pouvez utiliser au maximum trois exemplaires d'une carte.",
 'Hai {0} copie di {1}. Puoi usare al massimo tre copie di una carta.',
 '{1}が{0}枚あります。同名カードは3枚までしか使えません。',
 '{1}이(가) {0}장 있습니다. 같은 카드는 최대 3장까지 사용할 수 있습니다.',
 'Você tem {0} cópias de {1}. Você pode usar no máximo três cópias de um card.',
 '你有{0}张{1}。同名卡最多只能放3张。')

def main():
    for lang, text in zip(LANGS, LOCAL):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        table.setdefault(TEXT, text)
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    catalog_path = ROOT / 'data/i18n/catalog.json'
    catalog = json.loads(catalog_path.read_text(encoding='utf-8-sig'))
    if TEXT not in {r['en'] for r in catalog}:
        catalog.append({'group': 'python', 'en': TEXT, 'kind': 'pattern', 'ctx': 'campaign.py validate (2026-11-15)'})
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    print('ok')

if __name__ == '__main__': main()

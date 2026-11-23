"""Tag trading opens in the shop's deck editor too (user, 2026-11-23): the host's refusal now says trading starts after the
first duel. Existing translations are never overwritten. Run once; re-running changes nothing."""
import json,runpy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ('de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh')
TERMS = {'Trading is available in the deck editor after your first duel.': (
    'Tauschen ist nach deinem ersten Duell im Deck-Editor möglich.',
    'El intercambio está disponible en el editor de decks después de tu primer duelo.',
    "L'échange est disponible dans l'éditeur de deck après votre premier duel.",
    "Lo scambio è disponibile nell'editor del Deck dopo il tuo primo duello.",
    '最初のデュエルの後、デッキ編集でトレードができます。',
    '첫 듀얼을 마치면 덱 편집기에서 교환할 수 있습니다.',
    'A troca fica disponível no editor de deck depois do seu primeiro duelo.',
    '完成第一场决斗后，可以在卡组编辑器中进行交换。')}


def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, values in TERMS.items(): table.setdefault(en, values[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')


if __name__ == '__main__':
    main()

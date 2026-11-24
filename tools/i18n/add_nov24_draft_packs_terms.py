"""Draft Duels help after the Nov 24 pack change (Discord 2026-11-23): the opening adds three other duelists' boosters and
a Draft Screen pick gives three boosters (was two). Builds each language's new text from its existing translation of
the old help, replacing only the changed phrases. All 8 languages; never overwrites an existing translation."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
OLD = 'Choose a character, open their four starting boosters and build a deck of at least 20 cards. After each duel both players draft: the loser picks one relic and one character pack (two boosters) first, then the winner. The minimum deck grows to 30, then 40 cards. Relics are active in every later duel. First to 3 wins takes the match; if both agree, play on to 6, 9 and more. Maximum three copies by card name, no banned list or siding, 8,000 LP each.'
NEW = OLD.replace('open their four starting boosters and', "open their four starting boosters plus one booster each from three other duelists' packs, and").replace('(two boosters)', '(three boosters)')
EDITS = {
 'de': [('öffne seine vier Start-Booster und', 'öffne seine vier Start-Booster sowie je einen Booster aus den Packs von drei anderen Duellanten und'), ('(zwei Booster)', '(drei Booster)')],
 'es': [('abre sus cuatro sobres iniciales y', 'abre sus cuatro sobres iniciales más un sobre de cada uno de otros tres duelistas y'), ('(dos sobres)', '(tres sobres)')],
 'fr': [('ouvrez ses quatre boosters de départ et', "ouvrez ses quatre boosters de départ plus un booster de chacun de trois autres duellistes, et"), ('(deux boosters)', '(trois boosters)')],
 'it': [('apri le sue quattro buste iniziali e', 'apri le sue quattro buste iniziali più una busta ciascuno di altri tre duellanti e'), ('(due buste)', '(tre buste)')],
 'ja': [('4つの初期ブースターを開封して', '4つの初期ブースターと、ほかの3人のデュエリストのパックからブースターを1つずつ開封して'), ('（ブースター2つ）', '（ブースター3つ）')],
 'ko': [('시작 부스터 4개를 개봉해', '시작 부스터 4개와 다른 듀얼리스트 3명의 팩에서 부스터를 1개씩 개봉해'), ('(부스터 2개)', '(부스터 3개)')],
 'pt': [('abra seus quatro pacotes iniciais e', 'abra seus quatro pacotes iniciais mais um pacote de cada um de outros três duelistas e'), ('(dois pacotes)', '(três pacotes)')],
 'zh': [('开启其四个初始补充包，', '开启其四个初始补充包，以及另外三名决斗者的补充包各一个，'), ('（两个补充包）', '（三个补充包）')],
}


def main():
    for lang, edits in EDITS.items():
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        text = table[OLD]
        for old, new in edits:
            assert old in text, (lang, old)
            text = text.replace(old, new)
        table.setdefault(NEW, text)
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')


if __name__ == '__main__':
    main()

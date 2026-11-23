"""The Original Japanese Names display setting (user, 2026-11-23), in all 8 languages. Never overwrites an existing
translation."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {
 'Original Japanese Names': (
  'Japanische Originalnamen',
  'Nombres japoneses originales',
  'Noms japonais d\'origine',
  'Nomi giapponesi originali',
  '日本語版の名前',
  '일본 원작 이름',
  'Nomes japoneses originais',
  '日版原名'),
 'Duelists use their original Japanese names. Card names stay the same.': (
  'Duellanten tragen ihre japanischen Originalnamen. Kartennamen bleiben gleich.',
  'Los duelistas usan sus nombres japoneses originales. Los nombres de las cartas no cambian.',
  'Les duellistes portent leurs noms japonais d\'origine. Les noms des cartes ne changent pas.',
  'I duellanti usano i loro nomi giapponesi originali. I nomi delle carte restano uguali.',
  'デュエリストを日本語版の名前で表示します。カード名は変わりません。',
  '듀얼리스트가 일본 원작 이름으로 표시됩니다. 카드 이름은 바뀌지 않습니다.',
  'Os duelistas usam seus nomes japoneses originais. Os nomes das cartas não mudam.',
  '决斗者使用日版原名。卡片名称保持不变。'),
}


def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, values in TERMS.items(): table.setdefault(en, values[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')


if __name__ == '__main__':
    main()

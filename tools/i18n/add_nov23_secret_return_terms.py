"""The notice after beating the shopkeeper's secret duel, which now hands back the run with its relics (user, 2026-11-23),
in all 8 languages. Never overwrites an existing translation."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {
 'Angry Grandpa is beaten! Your run continues with your relics.': (
  'Wütender Opa ist besiegt! Dein Durchlauf geht mit deinen Relikten weiter.',
  '¡Has vencido al Abuelo furioso! Tu partida continúa con tus reliquias.',
  'Grand-père en colère est vaincu ! Ta partie continue avec tes reliques.',
  'Nonno arrabbiato è sconfitto! La tua partita continua con le tue reliquie.',
  '怒れるじいちゃんを倒した！レリックを持ったままランが続きます。',
  '화난 할아버지를 이겼습니다! 유물을 가진 채로 런이 계속됩니다.',
  'Vovô furioso foi derrotado! Sua jornada continua com suas relíquias.',
  '击败了愤怒的爷爷！你的冒险将带着遗物继续。'),
}


def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, values in TERMS.items(): table.setdefault(en, values[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')


if __name__ == '__main__':
    main()

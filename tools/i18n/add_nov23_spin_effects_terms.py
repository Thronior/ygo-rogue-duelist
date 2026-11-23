"""The Spin/Slots Effects setting (user, 2026-11-23): turned off, the boss and reward slot reels show their result
without spinning. All 8 languages; never overwrites an existing translation."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {
 'Spin/Slots Effects': (
  'Dreh-/Walzeneffekte',
  'Efectos de giro/tragaperras',
  'Effets de rotation/rouleaux',
  'Effetti di rotazione/slot',
  'スピン/スロット演出',
  '회전/슬롯 효과',
  'Efeitos de giro/caça-níqueis',
  '旋转/老虎机特效'),
 'Boss and reward slot reels spin before they stop.': (
  'Die Walzen für Bosse und Belohnungen drehen sich, bevor sie anhalten.',
  'Los rodillos de jefes y recompensas giran antes de detenerse.',
  'Les rouleaux des boss et des récompenses tournent avant de s\'arrêter.',
  'I rulli di boss e ricompense girano prima di fermarsi.',
  'ボスと報酬のスロットが止まる前に回転します。',
  '보스와 보상 슬롯 릴이 멈추기 전에 회전합니다.',
  'Os rolos de chefes e recompensas giram antes de parar.',
  '首领和奖励的老虎机转轮会先旋转再停下。'),
}


def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, values in TERMS.items(): table.setdefault(en, values[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')


if __name__ == '__main__':
    main()

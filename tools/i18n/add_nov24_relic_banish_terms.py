"""Shop relic banish (Discord suggestion, user 2026-11-24): the cross on a shop relic's art, its confirm button ("Banish",
already translated) and the shop's messages, in all 8 languages. Never overwrites an existing translation."""
import json, runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
TERMS = {
 'Banish relic': ('Relikt verbannen', 'Desterrar reliquia', 'Bannir la relique', 'Bandisci reliquia', 'レリックを除外', '유물 제외', 'Banir relíquia', '除外遗物'),
 'Keep relic': ('Relikt behalten', 'Conservar reliquia', 'Garder la relique', 'Tieni reliquia', 'レリックを残す', '유물 유지', 'Manter relíquia', '保留遗物'),
 'Keep this relic': ('Dieses Relikt behalten', 'Conservar esta reliquia', 'Garder cette relique', 'Tieni questa reliquia', 'このレリックを残す', '이 유물 유지', 'Manter esta relíquia', '保留此遗物'),
 'Banish: never offer this relic again this run': (
  'Verbannen: Dieses Relikt wird in diesem Lauf nie wieder angeboten.',
  'Desterrar: esta reliquia no volverá a ofrecerse en esta partida.',
  'Bannir : cette relique ne sera plus proposée de cette partie.',
  'Bandisci: questa reliquia non verrà più offerta in questa partita.',
  '除外：このランではこのレリックが二度と並ばない',
  '제외: 이번 런에서 이 유물이 다시 나오지 않습니다',
  'Banir: esta relíquia não será mais oferecida nesta partida.',
  '除外：本局中不会再出现此遗物'),
 'Only relics in stock can be banished.': (
  'Nur vorrätige Relikte können verbannt werden.',
  'Solo se pueden desterrar las reliquias en venta.',
  'Seules les reliques en stock peuvent être bannies.',
  'Solo le reliquie in vendita possono essere bandite.',
  '除外できるのは販売中のレリックだけです。',
  '판매 중인 유물만 제외할 수 있습니다.',
  'Só as relíquias à venda podem ser banidas.',
  '只能除外在售的遗物。'),
 'a banish': ('eine Verbannung', 'un destierro', 'un bannissement', 'un bando', '除外', '제외', 'um banimento', '一次除外'),
}


def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, values in TERMS.items():
            table.setdefault(en, values[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')


if __name__ == '__main__':
    main()

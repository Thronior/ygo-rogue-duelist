"""Restless Dead now revives at the start of your opponent's Standby Phase (user, 2026-11-23; Discord, Ace39), in all 8
languages (ui table, keyed by the relic's English text). Wording follows each language's existing Restless Dead text."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
EN = "Once per turn, at the start of your opponent's Standby Phase, if you control no monsters, Special Summon 1 random Zombie monster from your GY in Defense Position."
OLD = 'Once per turn, at the start of your Standby Phase, if you control no monsters, Special Summon 1 random Zombie monster from your GY in Defense Position.'
# The old translation with "your Standby Phase" swapped for "your opponent's Standby Phase".
SWAP = {
 'de': ('zu Beginn deiner Standby Phase', 'zu Beginn der Standby Phase deines Gegners'),
 'es': ('al principio de tu Standby Phase', 'al principio de la Standby Phase de tu adversario'),
 'fr': ('au début de votre Standby Phase', 'au début de la Standby Phase de votre adversaire'),
 'it': ("all'inizio della tua Standby Phase", "all'inizio della Standby Phase del tuo avversario"),
 'ja': ('自分スタンバイフェイズ開始時に', '相手スタンバイフェイズ開始時に'),
 'ko': ('자신 스탠바이 페이즈 개시시에', '상대 스탠바이 페이즈 개시시에'),
 'pt': ('no começo da sua Fase de Apoio', 'no começo da Fase de Apoio do seu oponente'),
 'zh': ('自己准备阶段开始时', '对方准备阶段开始时'),
}


def main():
    for lang in LANGS:
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        old = table.get(OLD)
        assert old, (lang, 'no old text')
        a, b = SWAP[lang]
        assert a in old, (lang, old)
        table[EN] = old.replace(a, b)
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')


if __name__ == '__main__':
    main()

"""Duel-end coin lines of 2026-11-20, in all 8 languages. Never overwrites an existing translation.
'Exodia win' tops an Exodia victory up to 150 coins (CITYDRIVER, campaign_expansion.rewards), like 'Final Countdown win'.
'Beat them with their own monster' is a victory-only battle bonus rule (jerichoholic, duel_rewards.RULES)."""
import json,runpy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'tools/safe_write.py'))['install']()
LANGS = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
# Exodia keeps the spelling of each language's official "Exodia the Forbidden One" (fr Éxodia, ja/ko/zh in script).
TERMS = {
 'Exodia win': ('Sieg durch Exodia', 'Victoria por Exodia', 'Victoire par Éxodia', 'Vittoria con Exodia',
  'エクゾディアで勝利', '엑조디아 승리', 'Vitória por Exodia', '艾克佐迪亚胜利'),
 'Beat them with their own monster': ('Besiege den Gegner mit seinem eigenen Monster', 'Derrota al rival con su propio monstruo',
  "Vaincre l'adversaire avec son propre monstre", "Sconfiggi l'avversario con il suo stesso mostro",
  '相手のモンスターでとどめを刺す', '상대의 몬스터로 마무리', 'Derrote o oponente com o próprio monstro dele', '用对手的怪兽完成最后一击'),
}
CONTEXT = {
 'Exodia win': ('rules', 'victory coin line: an Exodia win pays at least 150 coins, 2026-11-20'),
 'Beat them with their own monster': ('rules', 'coin reward condition: final blow by a monster the opponent owns, 2026-11-20'),
}


def main():
    for i, lang in enumerate(LANGS):
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for en, values in TERMS.items(): table.setdefault(en, values[i])
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    catalog_path = ROOT / 'data/i18n/catalog.json'
    catalog = json.loads(catalog_path.read_text(encoding='utf-8-sig'))
    known = {r['en'] for r in catalog}
    for en in TERMS:
        group, ctx = CONTEXT[en]
        if en not in known: catalog.append({'group': group, 'en': en, 'kind': 'exact', 'ctx': ctx})
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    print('ok', len(TERMS))


if __name__ == '__main__':
    main()

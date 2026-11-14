"""Duel log names the kind of summon (user, 2026-11-14): "You Flip Summon X." instead of "You summon X.".
8 patterns × 8 languages, written as {0} patterns so the card name stays translatable."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
L = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']
KIND = {  # Normal, Tribute, Special, Flip in each language's usual card-game wording
 'de': ['als Normalbeschwörung', 'als Tributbeschwörung', 'als Spezialbeschwörung', 'als Flippbeschwörung'],
 'es': ['de Invocación Normal', 'de Invocación de Sacrificio', 'de Invocación Especial', 'de Invocación por Volteo'],
 'fr': ['par Invocation Normale', 'par Invocation Sacrifice', 'par Invocation Spéciale', 'par Invocation Flip'],
 'it': ['tramite Evocazione Normale', 'tramite Evocazione Tributo', 'tramite Evocazione Speciale', 'tramite Evocazione di Scoperta'],
 'pt': ['por Invocação-Normal', 'por Invocação-Tributo', 'por Invocação-Especial', 'por Invocação-Virar'],
 'ja': ['通常召喚', 'アドバンス召喚', '特殊召喚', '反転召喚'],
 'ko': ['일반 소환', '어드밴스 소환', '특수 소환', '반전 소환'],
 'zh': ['通常召唤', '上级召唤', '特殊召唤', '反转召唤'],
}
def phrases(lang, k):
    if lang == 'de': return f'Du beschwörst {{0}} {k}.', f'Gegner beschwört {{0}} {k}.'
    if lang == 'es': return f'Realizas una {k[3:]} de {{0}}.', f'El adversario realiza una {k[3:]} de {{0}}.'
    if lang == 'fr': return f'Vous invoquez {{0}} {k}.', f"L'adversaire invoque {{0}} {k}."
    if lang == 'it': return f'Evochi {{0}} {k}.', f"L'avversario evoca {{0}} {k}."
    if lang == 'pt': return f'Você invoca {{0}} {k}.', f'O oponente invoca {{0}} {k}.'
    if lang == 'ja': return f'あなたは{{0}}を{k}した。', f'相手は{{0}}を{k}した。'
    if lang == 'ko': return f'{{0}}을(를) {k}했습니다.', f'상대가 {{0}}을(를) {k}했습니다.'
    if lang == 'zh': return f'你{k}了{{0}}。', f'对手{k}了{{0}}。'
TERMS = {}
for i, kind in enumerate(['Normal', 'Tribute', 'Special', 'Flip']):
    you, opp = f'You {kind} Summon {{0}}.', f'Opponent {kind} Summons {{0}}.'
    TERMS[you] = {}; TERMS[opp] = {}
    for lang in L:
        a, b = phrases(lang, KIND[lang][i]); TERMS[you][lang] = a; TERMS[opp][lang] = b
def main():
    for lang in L:
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for key, text in TERMS.items(): table[key] = text[lang]
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    path = ROOT / 'data/i18n/catalog.json'
    catalog = json.loads(path.read_text(encoding='utf-8-sig'))
    known = {r.get('en') for r in catalog}
    catalog += [{'group': 'ui', 'en': k, 'kind': 'pattern', 'ctx': 'engine.js'} for k in TERMS if k not in known]
    path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
if __name__ == '__main__':
    main()

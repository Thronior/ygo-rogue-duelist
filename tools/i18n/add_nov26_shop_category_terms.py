"""Shop reward category rework (user, 2026-11-26): new category labels in 8 languages. Labels that already exist
(Exodia, Special Summons, Spells, Traps, Tribute Summons, Spell Counters, Tokens, Chaos cards, Staple Traps) keep their
translations; the Chinese "Special Summons" and "Tribute Summons" lose their "count" ending (次数) so they read right as a
shop boost and still fit the Stats screens, like the Japanese and Korean ones. Never overwrites anything else."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
TERMS = {
 'Piercing and direct attacks': {'de': 'Durchschlagender Schaden und direkte Angriffe', 'es': 'Daño de penetración y ataques directos',
  'fr': 'Dommages perçants et attaques directes', 'it': 'Danno perforante e attacchi diretti', 'ja': '貫通ダメージと直接攻撃',
  'ko': '관통 데미지와 직접 공격', 'pt': 'Dano perfurante e Ataques Diretos', 'zh': '穿刺伤害与直接攻击'},
 'Staple Spells': {'de': 'Standard-Zauber', 'es': 'Mágicas básicas', 'fr': 'Magies incontournables', 'it': 'Magie fondamentali',
  'ja': '定番の魔法カード', 'ko': '필수 마법 카드', 'pt': 'Magias essenciais', 'zh': '常用魔法卡'},
 'Staple Monsters': {'de': 'Standard-Monster', 'es': 'Monstruos básicos', 'fr': 'Monstres incontournables', 'it': 'Mostri fondamentali',
  'ja': '定番のモンスター', 'ko': '필수 몬스터', 'pt': 'Monstros essenciais', 'zh': '常用怪兽'},
 'LV monsters': {'de': 'LV-Monster', 'es': 'Monstruos LV', 'fr': 'Monstres LV', 'it': 'Mostri LV', 'ja': 'LVモンスター',
  'ko': 'LV 몬스터', 'pt': 'Monstros LV', 'zh': 'LV怪兽'},
 'Deck searchers': {'de': 'Deck-Suche', 'es': 'Búsqueda en el Deck', 'fr': 'Recherche dans le Deck', 'it': 'Ricerca dal Deck',
  'ja': 'デッキサーチ', 'ko': '덱 서치', 'pt': 'Busca no Deck', 'zh': '检索卡'},
 'Blue-Eyes cards': {'de': '„Blauäugig“-Karten', 'es': 'Cartas "Ojos Azules"', 'fr': 'Cartes Yeux Bleus', 'it': 'Carte Occhi Blu',
  'ja': '「ブルーアイズ」カード', 'ko': '「블루아이즈」 카드', 'pt': 'Cards Olhos Azuis', 'zh': '「青眼」卡'},
 'Ninja cards': {'de': '„Ninja“-Karten', 'es': 'Cartas "Ninja"', 'fr': 'Cartes Ninja', 'it': 'Carte Ninja', 'ja': '「忍者」カード',
  'ko': '닌자 카드', 'pt': 'Cards Ninja', 'zh': '「忍者」卡'},
 'Ojama cards': {'de': '„Ojama“-Karten', 'es': 'Cartas "Ojama"', 'fr': 'Cartes Ojama', 'it': 'Carte Ojama', 'ja': '「おジャマ」カード',
  'ko': '방해꾼 카드', 'pt': 'Cards Ojama', 'zh': '「扰乱」卡'},
}
OVERRIDES = {'zh': {'Special Summons': '特殊召唤', 'Tribute Summons': '上级召唤'}}
LABELS = list(TERMS) + ['Exodia', 'Special Summons', 'Spells', 'Traps', 'Tribute Summons', 'Spell Counters', 'Tokens', 'Chaos cards', 'Staple Traps']
def main():
    for lang in ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']:
        path = ROOT / f'data/i18n/ui/{lang}.json'
        table = json.loads(path.read_text(encoding='utf-8-sig'))
        for key, text in TERMS.items(): table.setdefault(key, text[lang])
        table.update(OVERRIDES.get(lang, {}))
        missing = [k for k in LABELS if k not in table]
        assert not missing, (lang, missing)
        path.write_text(json.dumps(table, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
    path = ROOT / 'data/i18n/catalog.json'
    catalog = json.loads(path.read_text(encoding='utf-8-sig'))
    known = {r.get('en') for r in catalog}
    catalog += [{'group': 'python', 'en': k, 'kind': 'exact', 'ctx': 'shop_rewards.py'} for k in LABELS if k not in known]
    path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + '\n', encoding='utf8', newline='\n')
if __name__ == '__main__':
    main()

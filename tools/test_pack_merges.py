import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import content
import campaign as game
from pack_merges import MERGE_GROUPS, merge_pack_catalog
from pack_odds import inspect_pack
import random


# Exercise the merger independently of the already-merged production catalog.
fixture = [
    {
        'id': 'CANON', 'name': 'Canonical', 'common': [1, 2], 'rare': [8],
        'rare_display': [8], 'rarities': {'1': ['Common'], '8': ['Rare']},
        'rarity_source': 'English checklist', 'draft_only': True,
    },
    {
        'id': 'OLD', 'name': 'Retired', 'common': [2, 3], 'rare': [2, 9],
        'rare_display': [9], 'rarities': {'1': ['Short Print'], '9': ['Super Rare']},
        'rarity_source': 'Game list', 'shop_only': True, 'reward_pack': 'EN-MFC',
    },
]
merged, aliases = merge_pack_catalog(fixture, [{'canonical': 'CANON', 'merge': ['OLD']}])
assert aliases == {'OLD': 'CANON'}
assert len(merged) == 1 and merged[0]['id'] == 'CANON'
assert merged[0]['common'] == [1, 3]
assert merged[0]['rare'] == [8, 2, 9]
assert merged[0]['rare_display'] == [8, 9]
assert merged[0]['rarities']['1'] == ['Common', 'Short Print']
assert merged[0]['rarities']['9'] == ['Super Rare']
assert merged[0]['draft_only'] and merged[0]['shop_only']
assert merged[0]['reward_pack'] == 'EN-MFC'
assert merged[0]['rarity_source'] == 'English checklist | Game list'
merged_again, aliases_again = merge_pack_catalog(merged, [{'canonical': 'CANON', 'merge': ['OLD']}])
assert merged_again == merged and aliases_again == aliases

# Every selected source pack is hidden from offers but still resolves to the
# canonical merged pack for saved runs, character assignments and rewards.
catalog_ids = {pack['id'] for pack in content.PACKS}
expected_aliases = {
    source: group['canonical']
    for group in MERGE_GROUPS
    for source in group.get('merge', [])
}
assert content.MERGED_PACK_ALIASES == expected_aliases
assert not (catalog_ids & set(expected_aliases))
for retired_id, canonical_id in expected_aliases.items():
    assert retired_id in content.PACK_ALIASES
    assert content.PACK_ALIASES[retired_id] == canonical_id
    assert content.PACK_BY_ID[retired_id] is content.PACK_BY_ID[canonical_id]
    assert content.PACK_BY_ID[canonical_id] in content.PACKS

characters_by_name = {character['name']: character for character in content.CHARACTERS}
assert characters_by_name['Yami Yugi']['pack'] == 'DRAFT-YAMI-YUGI'
assert characters_by_name['Yugi Muto']['pack'] == 'DRAFT-YAMI-YUGI'
assert characters_by_name['Yugi Muto']['starting_packs'][0] == 'DRAFT-YAMI-YUGI'

for group in MERGE_GROUPS:
    pack = content.PACK_BY_ID[group['canonical']]
    assert len(pack['common']) == len(set(pack['common']))
    assert len(pack['rare']) == len(set(pack['rare']))
    assert len(pack.get('rare_display', [])) == len(set(pack.get('rare_display', [])))
    rows = inspect_pack(group['canonical'], {})
    assert abs(sum(row['chance'] for row in rows) - 9) < 1e-7, group['canonical']
    pulled = game.open_pack(group['canonical'], random.Random(96))
    assert len(pulled) == len({game.card_identity(card_id) for card_id in pulled}) == 9

print(f'PASS {len(MERGE_GROUPS)} duplicate/near-duplicate pack groups; {len(expected_aliases)} legacy IDs resolve')

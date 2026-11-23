"""Fused bonus-stock relics weigh their pool x4 in general stock, on top of the deck weighting, capped at x30 (2026-11-22)."""
import sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g, archetype_relics as a, relic_fusions

# Every fused relic that took in a bonus-stock relic is covered, and its piece really is one of its pieces.
for fused,piece in a.FUSED_STOCK.items():assert piece in relic_fusions.RECIPES[fused],(fused,piece)
stock={k for k,p in relic_fusions.RECIPES.items() if any(x in a.NEW_IDS or x in ('archfiend_contract','toon_world') for x in p)}
assert stock==set(a.FUSED_STOCK),stock^set(a.FUSED_STOCK)

harpie=next(c for c in g.CARDS if a.matches('harpie_feather',c))
archfiend=next(c for c in g.CARDS if 'Archfiend' in c['name'])
plain=next(c for c in g.CARDS if not a.matches('harpie_feather',c) and not a.is_archfiend(c))
cards=[harpie,archfiend,plain]
base={harpie['id']:2.0,archfiend['id']:9.0,plain['id']:1.5}

run=dict(artifacts=[],pool=[])
assert a.fused_stock_boost(base,cards,run)==base,'no fused relic: unchanged'
run=dict(artifacts=['harpie_nest'],pool=[])
out=a.fused_stock_boost(base,cards,run)
assert out[harpie['id']]==8.0 and out[plain['id']]==1.5 and out[archfiend['id']]==9.0,out
run=dict(artifacts=['terrorking_magnus'],pool=[])
out=a.fused_stock_boost(base,cards,run)
assert out[archfiend['id']]==30.0,'9 x 4 = 36 is capped at 30'
# The pieces themselves (no fusion yet) do nothing here: they keep their extra slot.
assert a.fused_stock_boost(base,cards,dict(artifacts=['harpie_feather'],pool=[]))==base
print('PASS fused bonus-stock relics: x4 on the pool, on top of deck weighting, capped at x30')

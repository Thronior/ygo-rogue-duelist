"""General stock singles use the relic deck weighting (user, 2026-11-13): archetype > Type > Attribute, capped, and
plain Spells/Traps keep a fair share. Also checks data/card-tag-ceilings.json is current."""
import sys,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,relic_affinity as ra
AMA=[c['id'] for c in g.CARDS if c['name'].startswith('Amazoness')]
run={'pool':AMA*3,'selected':list(range(len(AMA)*3))}
pick=lambda pred:next(c for c in g.CARDS if pred(c))
ama=g.BY_NAME['Amazoness Swords Woman'];warrior=pick(lambda c:c.get('race')=='Warrior' and not c['name'].startswith('Amazoness') and not c['data'].get('setcodes'))
zombie=pick(lambda c:c.get('race')=='Zombie' and c.get('attribute')!='EARTH' and not c['data'].get('setcodes'))
plain=next(c for c in g.CARDS if not c['data']['type']&1 and not ra.card_weight_tags(c))
m=ra.card_multipliers([ama,warrior,zombie,plain],run)
assert m[ama['id']]==ra.ARCHETYPE_CEILING,m
assert 2.5<m[warrior['id']]<m[ama['id']],m
assert m[zombie['id']]==ra.DEAD_CARD,m  # nothing in the Deck shares its features
assert 1.0<=m[plain['id']]<=ra.NEUTRAL_CARD_CAP,m
assert all(v<=ra.CARD_BOOST_CAP for v in ra.card_multipliers(g.CARDS,run).values())
assert ra.card_multipliers([ama],{'pool':[]})=={ama['id']:1.0},'no cards, no weighting'
# Only the Deck counts: the same Amazoness cards sitting in the collection, outside the Deck, give no boost.
side={'pool':AMA*3+[warrior['id']]*40,'selected':list(range(len(AMA)*3,len(AMA)*3+40))}
assert ra.card_multipliers([ama],side)[ama['id']]<ra.ARCHETYPE_CEILING and ra.card_multipliers([zombie],side)[zombie['id']]==ra.DEAD_CARD
# Archetype singles follow the narrow card count: 2 Amazoness cards in a 20-card Deck give half the boost.
two={'pool':[AMA[0]]*2+[zombie['id']]*18,'selected':list(range(20)),'round':0}
assert abs((ra.card_multipliers([ama],two)[ama['id']]-1)/(ra.ARCHETYPE_CEILING-1)-0.5)<1e-9
assert json.loads(ra.CARD_CEILINGS_FILE.read_text(encoding='utf8'))==ra.compute_card_ceilings(),'data/card-tag-ceilings.json is stale'
print(f"PASS single-card weights: Amazoness x{m[ama['id']]}, other Warrior x{m[warrior['id']]:.2f}, unrelated x0.4, plain Spell/Trap x{m[plain['id']]:.2f}")

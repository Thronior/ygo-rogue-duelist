"""Tag shop weights (user, 2026-11-13): both Decks shape the shared shop, each adding half of its own change."""
import sys,tempfile,random
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import storage,content,campaign as game,archetype_relics as a,relic_affinity as ra
storage.ROOT=Path(tempfile.mkdtemp(dir=ROOT/'temp',prefix='tag-weights-'));game.SAVE=storage.ROOT/'run.json'
from tag_campaign import TagCampaign
p=storage.profile();p['unlocked']=list(range(len(content.CHARACTERS)))
s=TagCampaign([0,1],[p,p],seed=5)
ZOMBIE=game.BY_NAME['Armored Zombie']['id'];AMA=[c['id'] for c in game.CARDS if c['name'].startswith('Amazoness') and c['data']['type']&1][:4]
s.players[0].update(pool=[ZOMBIE]*20,selected=list(range(20)));s.players[1].update(pool=AMA*5,selected=list(range(20)))
host,mate=s.players
keys=['bone','amazoness_standard','dragon']
solo_host=a.offer_weights(keys,host);solo_mate=a.offer_weights(keys,mate)
with s.scope(0):tag=a.offer_weights(keys,host)
for k in keys:
 want=1+.5*(solo_host[k][1]-1)+.5*(solo_mate[k][1]-1)
 assert abs(tag[k][1]-want)<1e-9,(k,tag[k],want)
# Weights no longer multiply by the Deck (theme chances, 2026-11-14): each relic is x1 for the Deck that has its cards
# and x0.4 for the one that does not, so Bone lands halfway and Dragon (no Dragons anywhere) stays x0.4.
half=1+.5*(a.DEAD_RELIC-1)
assert abs(tag['bone'][1]-half)<1e-9 and abs(tag['dragon'][1]-a.DEAD_RELIC)<1e-9,tag
# Family relics (2026-11-18) weigh their cards in the base: half the host's family weight (no Amazoness) plus half the
# teammate's (20 Amazoness cards, capped), and no missing-cards factor.
assert tag['amazoness_standard'][1]==1 and abs(tag['amazoness_standard'][0]-(.5*a.FAMILY_BASE+.5*a.FAMILY_CAP))<1e-9,tag
# Theme chances: each Deck adds half of its own chance (themed_picks), so an all-Zombie Deck's 25% becomes about 12.5%.
host_z=[v for v in ra.theme_chances(host).values() if 'bone' in v[1]]
assert host_z and abs(host_z[0][0]-ra.THEME_START)<1e-9,host_z
# Singles too: an Amazoness card gets half of the Amazoness Deck's boost plus half of the Zombie Deck's x0.4.
ama=game.BY_ID[AMA[0]]
with s.scope(0):m=ra.card_multipliers([ama],host)[ama['id']]
assert abs(m-(1+.5*(ra._card_multipliers_one([ama],mate)[ama['id']]-1)+.5*(ra.DEAD_CARD-1)))<1e-9,m
# Outside Tag nothing changes, and the partner is cleared after the scope.
assert ra.TAG_PARTNER is None and a.offer_weights(keys,host)==solo_host
# A real shared restock runs with both Decks.
s.phase='shop'
for r in s.players:r.update(opponent=2,stage='shop')
with s.scope(0):game.restock(host,random.Random(3))
print(f"PASS Tag shop weights: Bone x{tag['bone'][1]:.2f}, Amazoness Standard x{tag['amazoness_standard'][1]:.2f}, Dragon x{tag['dragon'][1]:.2f}; singles halved too")

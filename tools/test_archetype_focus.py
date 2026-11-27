"""Archetype shelves favour the archetype's own cards (user, 2026-11-26): support extras stay in the pool, but core cards
weigh more, so a featured shelf averages about 1 off-theme card in 5 (Discord: Harpie shelves full of Winged Beasts)."""
import random,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import campaign as g,shop_rewards as s,custom_cards,card_rarity
N=g.BY_NAME
for key,core,extra in [
 ('harpie',['Harpie Lady','Elegant Egotist','Triangle Ecstasy Spark','Birdface'],['Sonic Duck']),
 ('darkscorpion',['Dark Scorpion - Gorg the Strong','Don Zaloog'],['Command Knight']),
 ('amazoness',['Amazoness Tiger','Dramatic Rescue'],['Marauding Captain']),
 ('jar',['Pot of Greed','Morphing Jar','Avatar of The Pot'],['Book of Moon','Graceful Charity']),
 ('exodia',['Left Arm of the Forbidden One','Exodia Necross'],['Pot of Greed']),
 ('darkmagician',['Dark Magician','Sage\'s Stone','Dark Paladin','Dark Sage'],['Mage Power']),
 ('toon',['Toon World','Toon Mermaid','Comic Hand'],['Jinzo']),
 ('gravekeeper',["Gravekeeper's Spy",'Necrovalley'],['D.D. Warrior Lady']),
 ('guardian',['Guardian Grarl','Gravity Axe - Grarl'],['Celtic Guardian','Shine Palace']),
]:
 for n in core:assert s.matches(N[n],key) and s.is_core(N[n],key),(key,n)
 for n in extra:assert s.matches(N[n],key) and not s.is_core(N[n],key),(key,n)
# Gryphon Wing only names Harpie's Feather Duster to stop it.
assert not s.is_core(N['Gryphon Wing'],'harpie')
# Type/mechanic categories are unchanged: no focus weight.
assert s.focus_weight(N['Harpie Lady'],'Winged Beast')==1.0 and s.focus_weight(N['Pot of Greed'],'draw')==1.0
themed=[c for c in g.CARDS if c['id'] not in custom_cards.IDS];rng=random.Random(7)
for key in ['harpie','darkscorpion','amazoness','jar','darkmagician','archfiend','toon','gravekeeper','guardian']:
 pool=[c for c in themed if s.matches(c,key)];off=0
 for _ in range(1500):
  top=sorted(pool,key=lambda c:rng.random()**(1/(card_rarity.weight(c['id'])*s.focus_weight(c,key))),reverse=True)[:5]
  off+=sum(not s.is_core(c,key) for c in top)
 assert off/1500<=1.15,(key,off/1500)
print('PASS archetype shelves keep their extras but average about 1 off-theme card in 5')

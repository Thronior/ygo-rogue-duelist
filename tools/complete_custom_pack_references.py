"""Audit or complete custom packs: named-card references and whole archetypes."""
import json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT));sys.path.insert(0,str(ROOT/'tools'))
import campaign as g,card_rarity
from complete_character_pack_references import references

ANCIENT_TREASURE=190000050  # Stays exclusive to the All Spells pack.
ARCHETYPES=json.loads((ROOT/'data/archetypes.json').read_text(encoding='utf8'))['archetypes']
# Archetypes each pack really plays. Engine set codes also tag cards by name alone (Goblin Zombie as
# Goblin, Morphing Jar #2 as Chaos, Metal Guardian as Guardian), so those overlaps are left out.
PACK_ARCHETYPES={
 'CUSTOM-NIGHTMARE-LEGION':('Archfiend','Vampire'),
 'CUSTOM-KNIGHTS-AND-MAGI':('Amazoness','Mystic Swordsman','Silent Swordsman','Toon'),
 'CUSTOM-HEAVENS-WRATH':('Black Luster Soldier','Blue-Eyes','Harpie','The Agent'),
 'CUSTOM-SAVAGE-WILDS':('Worm',),
 'CUSTOM-STONE-AND-STEEL':('Millennium','Sphinx'),
 'CUSTOM-STORM-TIDE':('Penguin','Thunder Dragon'),
}

def member(c,code):
 # A sub-archetype code carries its parent's low 12 bits, so match the full code it names.
 return any(int(x)&0xfff==code&0xfff and int(x)&code==code for x in c.get('data',{}).get('setcodes',[]))
def members(code):
 return {c['id'] for c in g.CARDS if member(c,code) and c['id']!=ANCIENT_TREASURE}
def pool_for(c):
 return 'rare' if c['data']['type']&0xc0 or c.get('level',0)>=7 or c['id'] in card_rarity.ULTRA else 'common'

def complete(packs):
 changes=[]
 for p in packs:
  if not p['id'].startswith('CUSTOM-'):continue
  present=set(p['common']+p['rare']);queue=sorted(present)
  identities={g.card_identity(c) for c in present}
  def add(cid,why):
   if g.card_identity(cid) in identities or cid==ANCIENT_TREASURE:return
   c=g.BY_ID[cid];pool=pool_for(c)
   p[pool].append(cid);p['rarities'][str(cid)]=['Rare' if pool=='rare' else 'Common']
   if pool=='rare':p['rare_display'].append(cid)
   present.add(cid);identities.add(g.card_identity(cid));queue.append(cid)
   changes.append(dict(pack=p['name'],card=c['name'],pool=pool,requiredBy=why))
  for name in PACK_ARCHETYPES.get(p['id'],()):
   code=next(a['setcode'] for a in ARCHETYPES if a['name']==name)
   for cid in sorted(members(code)):add(cid,'archetype: '+name)
  # Named references last, and recursively, so archetype additions bring their own.
  while queue:
   c=g.BY_ID[queue.pop(0)]
   for ref in sorted(references(c)):add(ref,c['name'])
 return changes

if __name__=='__main__':
 path=ROOT/'data/packs.json';raw=path.read_bytes().decode('utf8');packs=json.loads(raw);changes=complete(packs)
 if '--apply' in sys.argv:
  path.write_bytes((json.dumps(packs,indent=2)+'\n').replace('\n','\r\n').encode('utf8'))
 sys.stdout.reconfigure(encoding='utf8')
 by={}
 for row in changes:by.setdefault(row['pack'],[]).append(row)
 for pack,rows in by.items():
  p=next(x for x in packs if x['name']==pack and x['id'].startswith('CUSTOM-'))
  print(f"\n{pack}: +{len(rows)} -> {len(set(p['common']+p['rare']))}")
  print('; '.join(f"{r['card']}{'*' if r['pool']=='rare' else ''} <{r['requiredBy']}>" for r in rows))
 print(len(changes),'additions')

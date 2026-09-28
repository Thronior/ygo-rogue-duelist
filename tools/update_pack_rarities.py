"""Attach original set-printing rarity labels without changing pull pools or odds."""
from pathlib import Path
import json,re
ROOT=Path(__file__).resolve().parents[1]
def annotate(packs):
 sets=json.loads((ROOT/'dependencies/ygojson/sets.json').read_text(encoding='utf8'))
 raw={c['id']:c for c in json.loads((ROOT/'dependencies/ygojson/cards.json').read_text(encoding='utf8'))}
 cards=json.loads((ROOT/'data/era-cards.json').read_text(encoding='utf8'));byname={c['name']:c['id'] for c in cards}
 aliases=json.loads((ROOT/'data/card-aliases.json').read_text());valid={c['id'] for c in cards}
 labels={'common':'Common','shortprint':'Common','supershortprint':'Common','normal':'Common','rare':'Rare','super':'Super Rare','ultra':'Ultra Rare','secret':'Secret Rare','ultimate':'Ultimate Rare','parallel':'Parallel Rare'}
 missing=[]
 for pack in packs:
  locale='na' if pack['region']=='EN' else 'jp';s=next(s for s in sets if s['name'].get('en','').replace(' (set)','')==pack['name'] and locale in s.get('locales',{}));rarities={}
  for co in s['contents']:
   if locale not in co.get('locales',[]):continue
   for printing in co['cards']:
    c=raw[printing['card']];cid=byname.get(c.get('text',{}).get('en',{}).get('name')) or next((int(aliases.get(str(x),x)) for x in c.get('passwords',[]) if int(aliases.get(str(x),x)) in valid),None)
    if cid and printing.get('rarity'):
     rarity=printing['rarity'];label=labels.get(rarity,rarity.replace('_',' ').title());rarities.setdefault(str(cid),[])
     if label not in rarities[str(cid)]:rarities[str(cid)].append(label)
  fallback=ROOT/f'temp/pack-{pack["code"]}.json'
  if not rarities and fallback.exists():
   text=json.loads(fallback.read_text(encoding='utf8'))
   for match in re.finditer(re.escape(pack['code'])+r'-\d+ - \$[\d.]+ (.*?)(?='+re.escape(pack['code'])+r'-\d+|\n|$)',text):
    cid=byname.get(match.group(1).strip());headers=list(re.finditer(r'## (Common|Normal|Rare|Super Rare|Ultra Rare|Secret Rare|Ultimate Rare)',text[:match.start()]))
    if cid and headers:rarities.setdefault(str(cid),[]).append('Common' if headers[-1][1]=='Normal' else headers[-1][1])
  ids=set(pack['common']+pack['rare']);missing.extend((pack['id'],cid) for cid in ids if str(cid) not in rarities)
  pack['rarities']={str(cid):sorted(set(rarities[str(cid)])) for cid in sorted(ids) if str(cid) in rarities}
  pack['rare_display']=[cid for cid in sorted(ids) if any('Rare' in name for name in rarities.get(str(cid),[]))]
  pack['rarity_source']='Original '+('North American TCG' if locale=='na' else 'Japanese OCG')+' set printing; YGOJSON / published set checklist'
 if missing:raise ValueError('Missing set rarities: '+str(missing))
 return packs
if __name__=='__main__':
 path=ROOT/'data/packs.json';packs=json.loads(path.read_text(encoding='utf8'));before=[(p['common'][:],p['rare'][:]) for p in packs];annotate(packs);assert before==[(p['common'],p['rare']) for p in packs];path.write_text(json.dumps(packs,indent=2)+'\n',encoding='utf8');print('PASS original-set rarity coverage for',len(packs),'packs; pull pools unchanged')

"""Real-card data for the randomizer (user, 2026-11-19): what the game's own cards do, so randomized cards follow it.

Reads the recreation of every real card as randomizer blocks (temp/recreate/cards, made by tools/recreate_cards.py;
only cards marked full) and writes data/randomizer-templates.json, which ships with the game:
  templates  real uses of blocks the generator cannot roll by itself: [slot, parameters, timing, effect kind]. A
             randomized card that rolls one of these blocks copies the parameters of a real use ("target 1 Spell/Trap
             your opponent controls; return it to the hand") and, when every real use has a timing, one of those
             timings, so it says what real cards say, as often. Uses that name a specific card are left out (randomized
             pools rarely hold that card).
  lua        per template block, what its Lua does that the generator must know: a mandatory trigger, this card in the GY
  counts     per slot and category, how many real effects use each block (rollable blocks and templates)
  structure  per slot, the real share of always-on effects, and of activated effects with a timing, a condition or a
             cost; for Fusion / Ritual Monsters and Ritual Spells, the share of cards with an effect
randomizer.py turns on every template except those in TEMPLATE_OFF (each one is tested in the duel engine first).
  python/python.exe tools/build_randomizer_templates.py"""
import json,re,sys,collections
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT));sys.path.insert(0,str(ROOT/'tools'))
from safe_write import write_bytes
import os
os.environ['RANDOMIZER_RAW_TEXT']='1'   # the deck is built from the blocks' own texts, not the reworded ones
import randomizer as R

SPECIFIC={'names','codes','code','name','payoff_name','board_name','board','board_code','setcode'}
CATS=('conds','costs','acts','limits')
MIN_USES=1   # every mapped block (user, Nov 19: use the recreation's blocks in the randomizer)

def lua_facts(keys):
 """Mandatory triggers and GY timings, read from each block's Lua definition (one table entry or R.X.key=...)."""
 lua=(ROOT/'data/randomizer/randomizer.lua').read_text(encoding='utf8');out={}
 for k in keys:
  m=re.search(r'(?:^|\n)\s*(?:R\.\w+\.)?'+re.escape(k)+r'\s*=\s*\{(.{0,700})',lua,re.S)
  if not m:continue
  body=m.group(1);facts={}
  if re.search(r'forced\s*=\s*true',body.split('\n\t},')[0]):facts['forced']=True
  if 'LOCATION_GRAVE' in body.split('\n\t},')[0] and 'IsLocation' in body:facts['gy']=True
  if facts:out[k]=facts
 return out

KIND_TAGS=('spirit','toon','union')
# Blocks that are a whole effect, not a piece: the Lua builds them on their own (R.Rule), or their text is a whole
# sentence with its own trigger ("when this card inflicts Battle Damage, ..."). They stay with their card, whole.
LUA_RULES=set(re.findall(r'^R\.Rule\.(\w+)=',(ROOT/'data/randomizer/randomizer.lua').read_text(encoding='utf8'),re.M))
RACE_LIST=re.compile('(?:(?:'+'|'.join(re.escape(r) for r in sorted(R.RACES,key=len,reverse=True))+r')(?:, and |, | and | or |, or )?)+ monsters')
SHUFFLED_RULES={'archetype_no_standby_cost','archetype_destroyed_search'}   # Lua rules built to stand alone: dealt like any piece
SENTENCE=re.compile(r'^(Once|When|If|During|While|At|Each|You cannot|This card)\b|^(when|if|once|while|you cannot)\b')
# An action that only works with its real timing (it negates, or reads the attack or battle) keeps that timing, and
# one that reads its cost ("the number banished for this effect", "that many") keeps its costs.
NEEDS_TIMING=re.compile(r'negate|attack|battl|chain|redirect')
TIMING_TEXT=re.compile(r'\bnegate|\bthat (?:Spell|Trap|card|monster|attack|effect|draw)\b|\bthe (?:attack|attacking|attacked|activated|Summoned)\b',re.I)
# Pieces that only set up another effect of their card (counters it places, a count it keeps): dealt alone they did
# nothing ("Place 1 counter on this card during each of your Standby Phases", Discord Nov 20). A card with one keeps
# all its effects, whole.
SETUP_ONLY={'wave_motion_counter','breaker_place_counter','hannibal_counter_setup','hannibal_normal_summon_counter',
 'royal_magical_library_counters','spell_counter_per_spell_activation','mausoleum_proc',
 'manticore_grave_flag'}   # "If this card is sent to the GY, remember it until the End Phase" (Nov 20)
READS_COST=re.compile(r'for this effect|for the cost|that many|the (?:discarded|Tributed|banished|sent|paid)\b|as many',re.I)
DCATS=('conds','costs','acts','limits','others')
# Archetypes (user, Nov 19): a piece that names an archetype ("Archfiend monster", "'Gravekeeper's' monster", or an
# archetype code) is dealt, and the card it lands on takes the archetype into its name and its codes (_ar). Toon is a
# monster kind, LV a Level series, Exodia a set; archetypes that are also a Type ("Aqua monsters") mean the Type.
_ARCH=json.loads((ROOT/'data/archetypes.json').read_text(encoding='utf8'))['archetypes']
ARCH={a['name']:a['setcode'] for a in _ARCH if a['name'] not in {'Toon','LV','Exodia','Forbidden One'} and a['name'] not in R.RACES}
ARCH_BY_CODE={v:k for k,v in ARCH.items()}
ARCH_TEXT=re.compile(r'''(?<!["\w])['\u2018]?('''+'|'.join(re.escape(n) for n in sorted(ARCH,key=len,reverse=True))+r''')['\u2019]?\s+(?:monsters?|cards?|Spells?|Traps?)\b''')
def archetypes(cat,p):
 m=R.CATEGORIES[cat].get(p['k'],{})
 text=' '.join(str(x) for x in (m.get('text',''),m.get('tclause',''),p.get('filter','')))
 found=list(dict.fromkeys(ARCH_TEXT.findall(text)+([ARCH_BY_CODE[p['setcode']]] if p.get('setcode') in ARCH_BY_CODE else [])))
 return [[n,ARCH[n]] for n in found]
def apply_splits(cards):
 """Big blocks rebuilt from smaller ones (user, Nov 19: "Pandemonium can still be broken down"): data/randomizer-splits.json
 maps a big block to, per real card, the effects that replace the effect holding it. A split is used only when every
 piece is a known block that fits the card; the others are reported and the card keeps its big block."""
 path=ROOT/'data/randomizer-splits.json'
 if not path.exists():return cards,{}
 splits=json.loads(path.read_text(encoding='utf8')).get('splits',{})
 cat_of={k:c for c,t in R.CATEGORIES.items() for k in t}
 report=collections.Counter();out=[]
 for c in cards:
  new=[]
  for e in c.get('effects',[]):
   keys=[p['k'] for p in e.get('acts',[])]
   big=next((k for k in keys if k in splits and c['name'] in splits[k]),None)
   if big is None:new.append(e);continue
   repl=splits[big][c['name']]
   bad=[p.get('k') for x in repl for cat in DCATS for p in x.get(cat,[]) if cat_of.get(p.get('k'))!=cat or c['slot'] not in R.CATEGORIES[cat][p['k']].get('fits',())]
   if bad or not repl:report['split refused (unknown or unfitting block)']+=1;print('  split refused:',big,c['name'],bad);new.append(e);continue
   report['effects split']+=1
   new+=[{'kind':x.get('kind','activated'),**{cat:[dict(p) for p in x.get(cat,[])] for cat in DCATS}} for x in repl]
  out.append({**c,'effects':new})
 return out,dict(report)

def build_deck(cards,named):
 """The deal (user, Nov 19): every real card as a shell, every piece of its effects in a bag. randomizer.py shuffles the
 shells and deals the pieces back into them, so every block, amount, card type and stat line appears as often as on the
 real cards. A shell keeps what makes it work: its summoning rules, its Spirit / Toon pieces, a Flip monster's FLIP
 timing (Unions use the generic Union procedure: real Union blocks name their partner cards). Pieces that name real
 cards keep them (user, Nov 19): each named card (codes / names / code / name) is marked with its kind (_nk) and the
 deal swaps it for a randomized card dealt before it. Pieces whose text names a card with no parameter to swap (the
 name is in the block itself), archetype and board pieces, blocks with real faults (randomizer.DEAL_OFF) and
 blocks with no Lua are left out. Big blocks whose steps exist as blocks (randomizer.BUNDLES) go in as their steps."""
 name_of={c['id']:c['name'] for c in json_era}
 kind_of={c['id']:('monster' if c['data']['type']&1 else 'spell' if c['data']['type']&2 else 'trap') for c in json_era}
 SWAP={'names','codes','code','name'}
 def ok(cat,p):
  meta=R.CATEGORIES[cat].get(p['k'])
  if meta is None or meta.get('lua') is False or p['k'] in R.DEAL_OFF:return False
  if (SPECIFIC-SWAP-{'setcode'})&set(p):return False
  if SWAP&set(p):return bool(named_codes(p))
  try:text=R._fmt((meta.get('tclause','')+' '+meta.get('gen_text',meta.get('text',''))).replace('{what}','card'),dict(p),{'slot':'m_main','name':'X'})
  except Exception:return True
  return not named.search(text)
 def named_codes(p):
  codes=list(p.get('codes') or [])+([p['code']] if isinstance(p.get('code'),int) else [])
  return [c for c in codes if c in kind_of]
 def mark(p):
  # the kinds of the cards a piece names, so the deal can swap in randomized cards of the same kind
  codes=named_codes(p)
  if codes and not p.get('names') and not (isinstance(p.get('name'),str) and p.get('name')):
   p={**p,'names':[name_of[c] for c in codes]}   # its text says them (they were only codes)
  return {**p,'_nk':[kind_of[c] for c in codes]} if codes else p
 def markar(cat,p):
  # a piece for one Type whose filter lists the Types of its whole real effect ("Machine and Pyro monsters" on the
  # Machine piece) says only its own Type once dealt alone
  if isinstance(p.get('race'),str) and isinstance(p.get('filter'),str):
   others=[r for r in R.RACES if r!=p['race'] and re.search(r'(?<![\w-])'+re.escape(r)+r'(?![\w-])',p['filter'])]
   if others:p={**p,'filter':RACE_LIST.sub(p['race']+' monsters',p['filter'],count=1)}
  if 'exclude_codes' in p:   # the real cards an archetype search leaves out mean nothing on randomized cards (user, Nov 19)
   p={x:v for x,v in p.items() if x!='exclude_codes'}
   if isinstance(p.get('filter'),str):p['filter']=re.sub(r'\s+except (?:the )?\w+ excluded cards?','',p['filter'])
  ar=archetypes(cat,p)
  if ar and p.get('setcode') in ARCH_BY_CODE and 'filter' not in p and '{filter}' in str(R.CATEGORIES[cat].get(p['k'],{})):
   where={'gy':' in your GY','deck':' in your Deck','hand':' in your hand','banished':' that is banished','deck_hand':' in your hand or Deck','deck_gy':' in your Deck or GY'}.get(p.get('zone'),'')
   if p.get('side')=='opp':where=where.replace('your','your opponent\'s')
   p={**p,'filter':f'"{ARCH_BY_CODE[p["setcode"]]}" '+('card' if p.get('kind') in ('spell','trap','card') else 'monster')+where}   # the text says which cards, and where
  return {**p,'_ar':ar} if ar else p
 def evkey(e):
  return next((p['k'] for p in e.get('conds',[]) if R.CATEGORIES['conds'].get(p['k'],{}).get('kind')=='event'),None)
 def timed(p):
  m=R.ACTS.get(p['k'],{})
  return bool(m.get('ctx') or m.get('ctx_events') or NEEDS_TIMING.search(p['k']) or any(NEEDS_TIMING.search(x) for x in p if x!='k')
   or TIMING_TEXT.search(m.get('text','')))
 shells=[];bags=collections.defaultdict(list);excluded=collections.Counter()
 for c in cards:
  slot=c['slot']
  if slot=='s_ritual':continue   # a Ritual Spell is made with its Ritual Monster
  tags=[t for t in c.get('frame_tags',[]) if t in KIND_TAGS+('flip',)]
  sh=dict(s=slot,f=c.get('frame',''),t=tags,an=[],sk=[])
  pinned=any(p['k'] in SETUP_ONLY for e in c.get('effects',[]) for cat in DCATS for p in e.get(cat,[]))
  for e in c.get('effects',[]):
   keys={p['k'] for cat in DCATS for p in e.get(cat,[])}
   # what makes a Spirit or a Toon, and every summoning rule, stays with its card
   kind_piece=('spirit' in tags and (keys&{'spirit_return'} or (e['kind']=='rule' and keys=={'cannot_ss'}))) or ('toon' in tags and any(k.startswith('toon_') for k in keys))
   if 'union' in tags and e['kind']=='rule':excluded['union rule (generic Union instead)']+=1;continue
   if kind_piece or e['kind']=='rule':
    if all(ok(cat,p) for cat in DCATS for p in e.get(cat,[])):sh['an'].append({x:[markar(x,mark(p)) for p in e.get(x,[])] for x in DCATS}|{'kind':e['kind']})
    else:excluded['rule naming a real card']+=1
    continue
   if not e.get('acts'):continue
   if pinned:
    if all(ok(cat,p) for cat in DCATS for p in e.get(cat,[])):sh['an'].append({x:[markar(x,mark(p)) for p in e.get(x,[])] for x in DCATS}|{'kind':e['kind'],'whole':True})
    else:excluded['effect of a card with a setup piece, naming a real card']+=1
    continue
   if any(p['k'] not in SHUFFLED_RULES and (p['k'] in LUA_RULES or SENTENCE.match(R.ACTS.get(p['k'],R.AURAS.get(p['k'],{})).get('text',''))) for p in e['acts']):
    if all(ok(cat,p) for cat in DCATS for p in e.get(cat,[])):
     sh['an'].append({x:[markar(x,mark(p)) for p in e.get(x,[])] for x in DCATS}|{'kind':e['kind'],'whole':True})
    else:excluded['whole effect naming a real card or turned off']+=1
    continue
   acts=[]
   for p in e['acts']:
    if p['k'] in R.BUNDLES:acts+=[{x:v for x,v in q.items() if x not in ('link','part','bundle')} for q in R.BUNDLES[p['k']]({x:v for x,v in p.items() if x!='k'})]
    else:acts.append(p)
   kept={cat:[markar(cat,mark(p)) for p in (acts if cat=='acts' else e.get(cat,[])) if ok(cat,p)] for cat in DCATS}
   excluded['pieces naming a real card or turned off']+=sum(len(acts if cat=='acts' else e.get(cat,[]))-len(kept[cat]) for cat in DCATS)
   if evkey(e) and not evkey({'conds':kept['conds']}):
    # its timing was left out: an action that needs a timing goes too (it errored on another one)
    timed_out=[p for p in kept['acts'] if timed(p)];kept['acts']=[p for p in kept['acts'] if not timed(p)]
    excluded['pieces naming a real card or turned off']+=len(timed_out)
   if not kept['acts']:
    # nothing of it can be used (its blocks name cards in their text or are faulty): its card keeps the layout, the
    # deal fills it with other pieces, so the card's frame still counts
    excluded['effects with no usable action (layout kept)']+=1
    ev=evkey(e);fixed='flip' if 'flip' in tags and ev=='flip' else None
    cnt=dict(a=len(acts),c=len(e.get('costs',[])),l=len(e.get('limits',[])),o=len(e.get('others',[])),
     st=sum(1 for p in e.get('conds',[]) if R.CATEGORIES['conds'].get(p['k'],{}).get('kind')!='event'),ev=int(ev is not None))
    sh['sk'].append(dict(kind=e['kind'],n=cnt,**({'fix':'flip'} if fixed else {})));continue
   ev=evkey({'conds':kept['conds']})
   fixed='flip' if 'flip' in tags and ev=='flip' else None
   # an action that needs a timing its real effect never had builds that timing itself (Judgment of Anubis): whole
   if ev is None and len(kept['acts'])==len(acts) and any(timed(p) and not R.ACTS.get(p['k'],{}).get('ctx') and not R.ACTS.get(p['k'],{}).get('ctx_events') for p in kept['acts'])       and all(ok(cat,p) for cat in DCATS for p in e.get(cat,[])):
    sh['an'].append({x:[markar(x,mark(p)) for p in e.get(x,[])] for x in DCATS}|{'kind':e['kind'],'whole':True});excluded['whole effect (its action makes its own timing)']+=1;continue
   cnt=dict(a=len(kept['acts']),c=len(kept['costs']),l=len(kept['limits']),o=len(kept['others']),
    st=sum(1 for p in kept['conds'] if R.CATEGORIES['conds'][p['k']].get('kind')!='event'),ev=int(ev is not None))
   # how strong the real effect is: the deal lets a dealt effect be as strong as the real one in its place
   try:
    clean={x:[{q:v for q,v in p.items() if q!='_nk'} for p in kept[x]] for x in DCATS}
    power=round(R.power_score(clean,slot),2);strength=round(sum(R._act_strength(a,{'slot':slot,'name':'X'}) for a in clean['acts']),2)
   except Exception:power=strength=0
   sh['sk'].append(dict(kind=e['kind'],n=cnt,p=power,pa=strength,**({'fix':'flip'} if fixed else {})))
   k=e['kind']
   # an action that only works after certain timings ("negate the activation") keeps its real timing with it
   evp=next((p for p in kept['conds'] if p['k']==ev),None) if ev and not fixed else None
   glue=next((p for p in kept['acts'] if evp and timed(p)),None)
   reader=next((p for p in kept['acts'] if kept['costs'] and READS_COST.search(R.ACTS.get(p['k'],R.AURAS.get(p['k'],{})).get('text',''))),None)
   for cat in ('acts','costs','limits','others'):
    for p in kept[cat]:
     if cat=='costs' and reader is not None:continue   # they travel with the action that reads them
     bags[f'{k}|{cat}'].append({**p,'_s':slot,**({'_e':ev} if cat=='acts' else {}),**({'_ev':evp} if p is glue else {}),
      **({'_cost':kept['costs']} if p is reader else {})})
   for p in kept['conds']:
    if fixed and p['k']=='flip':continue   # the FLIP timing stays with its shell
    if glue is not None and p is evp:continue   # it travels with its action
    sub='event' if R.CATEGORIES['conds'][p['k']].get('kind')=='event' else 'state'
    bags[f'{k}|conds|{sub}'].append({**p,'_s':slot})
  if c['frame'] in ('normal','effect','fusion','ritual'):
   r=next(x for x in json_era if x['id']==c['id'])
   # a "?" ATK or DEF (-1/-2 in the card data) only means something with its card's own effect; dealt to another
   # card it was a 0/0 Level 10 (Nov 20), so that stat line is left out
   if r['atk']>=0 and r['defense']>=0:sh['st']=[r['level'],r['atk'],r['defense']]
   sh['ra']=[r['race'],r['attribute']]
  shells.append(sh)
 return dict(shells=shells,bags=dict(bags),excluded=dict(excluded),lua_rules=sorted(LUA_RULES))

json_era=json.loads((ROOT/'data/era-cards.json').read_text(encoding='utf8'))

def main():
 cards=[c for f in sorted((ROOT/'temp/recreate/cards').glob('batch-*.json')) for c in json.loads(f.read_text(encoding='utf8'))]
 full=[c for c in cards if c.get('coverage')=='full' and c['slot']!='m_none']
 uses=collections.defaultdict(list);counts=collections.defaultdict(lambda:collections.defaultdict(collections.Counter))
 st=collections.defaultdict(collections.Counter)
 for c in full:
  slot=c['slot'];effects=[e for e in c.get('effects',[]) if e.get('acts') and e['kind'] in ('activated','continuous')]
  st[slot]['cards']+=1;st[slot]['with_effect']+=bool(effects)
  for e in effects:
   cont=e['kind']=='continuous';st[slot]['continuous' if cont else 'activated']+=1
   ev=next((p['k'] for p in e.get('conds',[]) if R.CATEGORIES['conds'].get(p['k'],{}).get('kind')=='event'),None)
   if not cont:
    kinds={R.CATEGORIES['conds'].get(p['k'],{}).get('kind') for p in e.get('conds',[])}
    st[slot]['timing']+='event' in kinds;st[slot]['state']+='state' in kinds;st[slot]['cost']+=bool(e.get('costs'))
   else:st[slot]['aura_state']+=any(R.CATEGORIES['conds'].get(p['k'],{}).get('kind')=='state' for p in e.get('conds',[]))
   for cat in CATS:
    for p in e.get(cat,[]):
     k=p['k'];meta=R.CATEGORIES[cat].get(k)
     if meta is None:continue
     params={x:v for x,v in p.items() if x!='k'}
     if meta.get('real_only') or meta.get('templates') is not None or k in R.TEMPLATE_META or k in R.TEMPLATE_OFF:   # randomizer.py turned the enabled ones on at import
      if SPECIFIC&set(params):continue
      uses[k].append([slot,params,ev if cat=='acts' else None,e['kind']])
     counts[slot][cat][k]+=1
 # Uses whose text names a real card ("Batteryman AA monsters", "Special Summoned by Ultimate Insect LV5") are about that
 # card, not a kind of effect: left out like uses with a card code (Nov 19).
 names=sorted({c['name'] for c in json.loads((ROOT/'data/era-cards.json').read_text(encoding='utf8')) if len(c['name'])>=6},key=len,reverse=True)
 named=re.compile('|'.join(re.escape(n) for n in names))
 def generic(k,u):
  meta=next((t[k] for t in R.CATEGORIES.values() if k in t),{})
  try:text=R._fmt((meta.get('tclause','')+' '+meta.get('gen_text',meta.get('text',''))).replace('{what}','card'),{'k':k,**u[1]},{'slot':u[0],'name':'X'})
  except Exception:return True
  return not named.search(text)
 uses={k:[u for u in v if generic(k,u)] for k,v in uses.items()}
 templates={k:v for k,v in sorted(uses.items()) if len(v)>=MIN_USES}
 # Counts only for what the generator can roll: its own blocks and the templates it keeps.
 for slot in counts:
  for cat in counts[slot]:
   for k in list(counts[slot][cat]):
    m=R.CATEGORIES[cat][k]
    if (m.get('real_only') or m.get('templates') is not None or k in R.TEMPLATE_OFF) and k not in templates:del counts[slot][cat][k]
 # Power budget per slot: the 90th percentile of the real cards' effect strength (randomizer.power_score).
 powers=collections.defaultdict(list)
 for c in full:
  for e in c.get('effects',[]):
   if e.get('acts') and e['kind'] in ('activated','continuous'):
    try:powers[c['slot']].append(R.power_score({k:e.get(k,[]) for k in R.CATEGORIES},c['slot'],{'slot':c['slot'],'name':c['name']}))
    except Exception:pass
 structure={}
 for slot,s in st.items():
  a=max(s['activated'],1);n=max(s['activated']+s['continuous'],1)
  structure[slot]=dict(effect=round(s['with_effect']/max(s['cards'],1),3),always_on=round(s['continuous']/n,3),
   timing=round(s['timing']/a,3),state=round(s['state']/a,3),cost=round(s['cost']/a,3),
   aura_state=round(s['aura_state']/max(s['continuous'],1),3),effects=s['activated']+s['continuous'],
   budget=sorted(powers[slot])[int(.9*(len(powers[slot])-1))] if powers[slot] else None)
 split_cards,split_report=apply_splits(cards)
 deck=build_deck(split_cards,named);deck['splits']=split_report;print('splits:',split_report)
 out=dict(_note='Generated by tools/build_randomizer_templates.py from the real-card recreation. Do not edit by hand.',
  cards=len(full),templates=templates,lua=lua_facts(templates),deck=deck,
  wording=json.loads((ROOT/'data/randomizer-wording.json').read_text(encoding='utf8')) if (ROOT/'data/randomizer-wording.json').exists() else {},
  counts={s:{c:dict(v.most_common()) for c,v in cats.items()} for s,cats in sorted(counts.items())},structure=dict(sorted(structure.items())))
 path=ROOT/'data/randomizer-templates.json'
 write_bytes(path,(json.dumps(out,ensure_ascii=False,separators=(',',':'))+'\n').encode('utf8'))
 print(f"{len(full)} real effect cards; {len(templates)} template blocks ({sum(len(v) for v in templates.values())} uses); {path.stat().st_size//1024} KB")
 for slot,s in sorted(structure.items()):print(' ',slot,s)

if __name__=='__main__':main()

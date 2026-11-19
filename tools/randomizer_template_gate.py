"""Tests every real-card block the randomizer rolls (dev tool, 2026-11-19). Run it after the recreation adds blocks:
  python/python.exe tools/build_randomizer_templates.py     (refresh data/randomizer-templates.json)
  python/python.exe tools/randomizer_template_gate.py [out-dir] [cards per block] [duels per group]
Each enabled template block is forced onto cards of the kinds real cards use it on; their text is checked, then they play
in the duel engine (tools/test_randomizer_engine.mjs). A block fails on: an error while making the card, text with a
gap or placeholder, text that is a whole sentence where a piece belongs, or that describes the recreation ("listed",
"mapped"), a Lua error, an activated block never used, an always-on block never on the field. The failures are
printed as a set to add to TEMPLATE_OFF in randomizer.py."""
import sys,json,random,re,collections,subprocess,traceback
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import randomizer as R
R.DEAL_MODE=False   # the gate forces blocks onto rolled cards

SHAPE={'m_main':('monster','effect'),'m_fusion':('monster','fusion'),'m_ritual':('monster','ritual'),'s_ritual':('monster','ritual'),
 's_normal':('spell','Normal'),'s_quick':('spell','Quick-Play'),'s_cont':('spell','Continuous'),'s_equip':('spell','Equip'),
 's_field':('spell','Field'),'t_normal':('trap','Normal'),'t_cont':('trap','Continuous'),'t_counter':('trap','Counter')}
BADTEXT=re.compile(r'\{|\}|\bNone\b|\bnan\b|\.\.|\.,|  ')
# A whole effect, not a piece: starts like a card sentence, or with its own trigger in lower case ("when this card inflicts
# Battle Damage, ..."; Nov 19). A lower-case "during ..." is a delayed step and reads fine after "then".
SENTENCE=re.compile(r'^(Once|When|If|During|While|At|Each|You cannot|This card)\b|^(when|if|once|while|you cannot)\b')

def make(out,per):
 cat_of={k:c for c,t in R.CATEGORIES.items() for k in t}
 keys=[k for c,t in R.CATEGORIES.items() for k,m in t.items() if m.get('templates')]
 rng=random.Random(11);ids=iter(range(R.FIRST_ID,R.FIRST_ID+900000));used=set();saved=dict(R.BLOCK_WEIGHTS);cards=[];gate={}
 for key in keys:
  slots=sorted(R.CATEGORIES[cat_of[key]][key].get('roll_fits') or [])
  R.BLOCK_WEIGHTS.clear();R.BLOCK_WEIGHTS.update(saved);R.BLOCK_WEIGHTS[key]=10000
  got=[];errors=[];texts=[];tries=0
  while len(got)<per and tries<400 and slots:
   tries+=1;kind,shape=SHAPE[slots[tries%len(slots)]]
   try:batch=R.make_card(random.Random(rng.random()),lambda:next(ids),used,kind=kind,frame=shape if kind=='monster' else None,sub=shape if kind!='monster' else None)
   except Exception as e:errors.append(''.join(traceback.format_exception_only(e)).strip()[:200]);continue
   if not any(key in (p['k'],p.get('bundle')) for c in batch for cat in c['parts'].values() for p in cat):continue   # bundles roll as their steps
   texts+=[c['desc'][:200] for c in batch if not c.get('flavor') and BADTEXT.search(c['desc'])]
   got.append([R.as_game_card(c) for c in batch])
  gate[key]=dict(cards=len(got),errors=errors[:3],bad_text=texts[:3])
  for b in got:cards+=b
 R.BLOCK_WEIGHTS.clear();R.BLOCK_WEIGHTS.update(saved)
 out.write_text(json.dumps({'seed':11,'cards':cards}),encoding='utf8')
 return gate

def score(out,gate):
 cat_of={k:c for c,t in R.CATEGORIES.items() for k in t}
 cards=json.loads(out.read_text(encoding='utf8'))['cards']
 report=json.loads(out.with_suffix('.engine.json').read_text(encoding='utf8'))
 rep={r['id']:r for r in report['cards']};tmpl=set(gate)
 agg=collections.defaultdict(lambda:dict(cards=0,act=0,summ=0,err=0))
 for c in cards:
  r=rep.get(c['card']['id'],{})
  for k in (set(re.findall(r'k="(\w+)"',c['script']))|set(re.findall(r'bundle="(\w+)"',c['script'])))&tmpl:
   a=agg[k];a['cards']+=1;a['act']+=r.get('activated',0);a['summ']+=r.get('summoned',0);a['err']+=bool(r.get('errors'))
 off={}
 for k,g in gate.items():
  meta=R.CATEGORIES[cat_of[k]][k];a=agg.get(k);text=(meta.get('tclause','')+' '+meta.get('gen_text',meta.get('text',''))).strip()
  activated=cat_of[k] in ('acts','costs') and k not in R.AURAS or (cat_of[k]=='conds' and R.CONDS[k]['kind']=='event')
  if not g['cards']:off[k]='never rolled'
  elif g['bad_text']:off[k]='text: '+g['bad_text'][0][:90]
  elif re.search(r'\b(mapped|listed|selected)\b',text):off[k]='text describes the recreation'
  elif cat_of[k] in ('acts','costs') and k not in R.AURAS and SENTENCE.search(meta.get('text','')):off[k]='a whole sentence'
  elif not a:off[k]='not in the engine test'
  elif a['err']:off[k]=f"Lua errors on {a['err']} of {a['cards']} cards"
  elif activated and a['act']==0:off[k]=f"never used in {a['cards']} cards' duels"
  elif not activated and a['act']+a['summ']==0:off[k]=f"never on the field in {a['cards']} cards' duels"
 stalls=[x for x in report['failures'] if x['kind']=='stall']
 return off,stalls,report

def main():
 out_dir=Path(sys.argv[1]) if len(sys.argv)>1 else ROOT/'temp/randomizer-gate';out_dir.mkdir(parents=True,exist_ok=True)
 per=int(sys.argv[2]) if len(sys.argv)>2 else 4;duels=sys.argv[3] if len(sys.argv)>3 else '10'
 out=out_dir/'gate.json';gate=make(out,per)
 print(f'{len(gate)} enabled template blocks; {sum(g["cards"] for g in gate.values())} card sets; playing them in the duel engine...',flush=True)
 node=ROOT/'runtime/ai/node.exe'
 subprocess.run([str(node),str(ROOT/'tools/test_randomizer_engine.mjs'),str(out),duels,'12'],cwd=ROOT,check=True)
 off,stalls,report=score(out,gate)
 print(f"{report['duels']} duels, {report['capped']} hit the turn cap, {len(stalls)} stalled (6000 steps: a loop)")
 for k,why in sorted(off.items()):print(f'  {k}: {why}')
 print('Add to TEMPLATE_OFF:',sorted(off) if off else 'nothing')
 (out_dir/'gate-off.json').write_text(json.dumps(off,indent=1,ensure_ascii=False),encoding='utf8')

if __name__=='__main__':main()

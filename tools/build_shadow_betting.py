"""Build the standalone Shadow Betting site: only the minigame, no main menu, no campaign runtime, no test tools.

Usage: python/python.exe -B tools/build_shadow_betting.py --output <new empty directory> [--cache <packaged-assets dir>]
Deploy (from multiplayer/cloudflare, see the release notes):
  npx wrangler pages deploy <output> --project-name ygo-rogue --branch shadow-betting
That is a branch deployment of the web game's Pages project: https://shadow-betting.ygo-rogue.pages.dev
(the main game's production site is untouched).

What goes in: the page (tools/shadow-betting), every module the minigame and its duel worker import, the duel core,
the card scripts and data the CPU decks can reach, their card art (WebP, as in the web build), the relic, portrait and
background art the minigame shows, its sound effects and fonts, and the soundtrack. DEV_TOOLS is switched off, so the
"Infinite money" setting is gone.
"""
from pathlib import Path
import argparse,json,re,shutil,sys

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
import package_assets as pa

IMPORT=re.compile(r"""(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|new\s+URL\(\s*)['"](\.{1,2}/[^'"]+)['"]""")
CHUNK=8*1024*1024

def modules(web,starts):
 """Every local module reachable from the start files (static and dynamic imports, workers)."""
 seen,queue=set(),list(starts)
 while queue:
  path=queue.pop()
  if path in seen or not path.is_file():continue
  seen.add(path)
  if path.suffix!='.js':continue
  for ref in IMPORT.findall(path.read_text(encoding='utf8',errors='ignore')):
   target=(path.parent/ref.split('?')[0]).resolve()
   queue.append(target)
 return seen

def quoted(block):return [a or b for a,b in re.findall(r"'((?:[^'\\]|\\.)*)'|\"([^\"]*)\"",block)]

def build(out,cache=None):
 web=ROOT/'android/web';templates=ROOT/'tools/shadow-betting'
 out.mkdir(parents=True,exist_ok=True)
 if any(out.iterdir()):raise SystemExit('Output directory must be empty.')
 if cache:pa.CACHE=Path(cache)
 files={}  # relative posix path -> source Path or bytes
 def add(rel,source=None):
  source=source if source is not None else web/rel
  if isinstance(source,bytes) or Path(source).is_file():files[rel]=source;return True
  return False

 # ---- code ----
 web_resolved=web.resolve()
 for path in sorted(modules(web,[web.resolve()/'idle-bets.js',web.resolve()/'audio-balance.js'])):
  rel=path.relative_to(web_resolved).as_posix();add(rel,path)
 for path in (web/'vendor/package/dist').rglob('*'):
  if path.is_file():add(path.relative_to(web).as_posix(),path)
 add('idle-bets.css')
 model=(web/'idle-bets-model.js').read_text(encoding='utf8')
 assert model.count('export const DEV_TOOLS=true;')==1,'DEV_TOOLS switch not found'
 files['idle-bets-model.js']=model.replace('export const DEV_TOOLS=true;','export const DEV_TOOLS=false;// standalone site: no test tools').encode('utf8')
 for name in ['index.html','shadow-betting.js']:add(name,templates/name)

 # ---- game data: only what the CPU decks can reach ----
 content=json.loads((web/'content.json').read_text(encoding='utf8'))
 engine_data=json.loads((web/'engine-data.json').read_text(encoding='utf8'))
 scripts=json.loads((web/'scripts.json').read_text(encoding='utf8'))
 seeds=pa._numbers(json.dumps([content.get('cpuWatchDecks'),content.get('cpuDecks'),content.get('tokenCards')]))
 seeds|=pa._numbers((web/'idle-bets-model.js').read_text(encoding='utf8'))|pa._numbers((web/'idle-bets.js').read_text(encoding='utf8'))
 known={int(k) for k in engine_data};named=pa._named_cards(scripts);keep=set();queue=[n for n in seeds if n in known]
 while queue:
  code=queue.pop()
  if code in keep:continue
  keep.add(code);row=engine_data.get(str(code)) or {}
  found={int(row['alias'])} if row.get('alias') else set()
  script=scripts.get(f'c{code}.lua','')
  found|=pa._numbers(script)|{named[n] for n in pa.CARD_NAME.findall(script) if n in named}
  queue.extend(n for n in found if n in known and n not in keep)
 card_script=re.compile(r'c(\d+)\.lua')
 scripts={k:v for k,v in scripts.items() if not (m:=card_script.fullmatch(k)) or int(m.group(1)) in keep}
 engine_data={k:v for k,v in engine_data.items() if int(k) in keep}
 files['engine-data.json']=json.dumps(engine_data,ensure_ascii=False).encode('utf8')
 chunks,chunk,size=[],{},0
 for name,script in scripts.items():
  cost=len(json.dumps({name:script},ensure_ascii=False).encode())
  if chunk and size+cost>CHUNK:chunks.append(chunk);chunk={};size=0
  chunk[name]=script;size+=cost
 if chunk:chunks.append(chunk)
 paths=[]
 for i,part in enumerate(chunks):name=f'scripts-{i}.json';paths.append(name);files[name]=json.dumps(part,ensure_ascii=False).encode('utf8')
 engine=(web/'engine.js').read_text(encoding='utf8');old="fetch('scripts.json').then(r=>r.json())"
 assert engine.count(old)==1,'engine.js script loader changed'
 files['engine.js']=engine.replace(old,'Promise.all('+json.dumps(paths)+'.map(url=>fetch(url).then(r=>{if(!r.ok)throw Error("Could not load card scripts");return r.json()}))).then(parts=>Object.assign({},...parts))').encode('utf8')
 slim={k:content[k] for k in ['characters','cpuDecks','cpuWatchDecks','cpuWatchOpponents','tokenCards','battleCoinRules','soundtrack','ultimateCollectors'] if k in content}
 slim['cards']=[c for c in content.get('cards',[]) if c.get('id') in keep]
 files['content.json']=json.dumps(slim,ensure_ascii=False,separators=(',',':')).encode('utf8')

 # ---- art, sound, fonts ----
 for code in sorted(keep):add(f'assets/cards-thumb/{code}.jpg');add(f'assets/cards/{code}.jpg')
 arts=set()
 for name in ['CALL_ART','ART','TREE_ART']:
  m=re.search(r'const '+name+r'=([\[{].*?[\]}]);',model,re.S);assert m,name
  arts|=set(quoted(m.group(1)))
 for art in arts:add(f'assets/relics/{art}.png')
 # Character upgrades: the tailored relics, curses and signature cards (tools/build_shadow_betting_mods.py).
 mods=json.loads((web/'idle-bets-mods.json').read_text(encoding='utf8'));add('idle-bets-mods.json')
 for r in mods['relics'].values():
  if r.get('art'):add('assets/relics/'+r['art'])
  if r.get('artCard'):add(f"assets/cards-thumb/{r['artCard']}.jpg");add(f"assets/cards/{r['artCard']}.jpg")
 for c in mods['chars'].values():
  if c.get('card'):add(f"assets/cards-thumb/{c['card']}.jpg");add(f"assets/cards/{c['card']}.jpg")
 for who in [*(content.get('characters') or []),*(content.get('cpuWatchOpponents') or {}).values()]:
  if isinstance(who,dict) and who.get('sprite'):add('assets/'+who['sprite'])
 ui=(web/'idle-bets.js').read_text(encoding='utf8')+(web/'idle-bets.css').read_text(encoding='utf8')
 for ref in set(re.findall(r"""(assets/(?:sfx|ui|backgrounds)/[\w./-]+\.(?:wav|mp3|png|jpg|webp))""",ui))|{'assets/card-back.jpg','assets/menu/83241722.jpg'}:
  assert add(ref),'missing '+ref
 for path in (web/'sound').glob('coin-pickup*'):add(path.relative_to(web).as_posix(),path)
 for font in ['BebasNeue-Regular.ttf','SpectralSC-SemiBold.ttf','Spectral-Medium.ttf']:assert add('assets/fonts/'+font)
 for track in content.get('soundtrack',[]):add(f"assets/music/{track['id']}.m4a")

 # WebP for images, as in the web build (same cache, same encoder).
 images=pa.shrink_images([(src,Path(rel)) for rel,src in files.items() if not isinstance(src,bytes)])
 files.update(images)
 total=0
 for rel,src in files.items():
  target=out/rel;target.parent.mkdir(parents=True,exist_ok=True)
  if isinstance(src,bytes):target.write_bytes(src)
  else:shutil.copy2(src,target)
  size=target.stat().st_size;total+=size
  assert size<25*1024*1024,f'{rel} is over the 25 MiB Pages limit'
 print(f'{len(files)} files, {total/1048576:.1f} MB, {len(keep)} cards, {len(chunks)} script chunks -> {out}')

if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);p.add_argument('--cache',type=Path,default=None);a=p.parse_args();build(a.output,a.cache)

"""Build the standalone Shadow Betting site: only the minigame, no main menu, no campaign runtime, no test tools.

Usage: python/python.exe -B tools/build_shadow_betting.py --output <new empty directory> [--cache <packaged-assets dir>] [--itch]
  --itch: the itch.io upload (images packed into bundles for itch's 1,000-file limit; writes <output>.zip).
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

def build(out,cache=None,version=None,itch=False):
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
 # Each build gets an id: build.json, and the same id in shadow-betting.js (the page's update check).
 import time;build_id=time.strftime('%Y%m%d%H%M%S')
 add('index.html',templates/'index.html')
 sb=(templates/'shadow-betting.js').read_text(encoding='utf8');assert sb.count("'__SB_BUILD__'")==1,'build id slot'
 files['shadow-betting.js']=sb.replace("'__SB_BUILD__'",repr(build_id)).encode('utf8')
 # The phone app also learns its version here (its update check compares it with the shadow-betting release).
 if not itch:files['build.json']=json.dumps({'id':build_id,**({'version':version} if version else {})}).encode('utf8')

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
 for c in mods['curses'].values():
  if c.get('icon'):assert add(c['icon']),'missing '+c['icon']
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
 if itch:itch_bundle(out)
 print(f'{len(files)} files, {total/1048576:.1f} MB, {len(keep)} cards, {len(chunks)} script chunks -> {out}')

# ---- itch.io: one ZIP with fewer than 1,000 files (itch's limit; the site has ~2,800). The images go into 8 MB bundles that a
# service worker serves under their usual paths, as the game's own itch build does (tools/web_artwork_bundles.py). ----
ITCH_BOOT='''// Shadow Betting on itch.io: a service worker serves the images from bundles (itch allows under 1,000 files).
try{
 if(!/^https?:$/.test(location.protocol))throw Error('The itch.io desktop app cannot run this game. Play it in your web browser.');
 if(!navigator.serviceWorker)throw Error('This browser cannot load the artwork inside the embedded player. Please open the game directly.');
 await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});
 await Promise.race([navigator.serviceWorker.ready,new Promise((_,r)=>setTimeout(()=>r(Error('The embedded player could not finish loading. Please retry.')),25000))]);
 if(!navigator.serviceWorker.controller)await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('Close other game windows and reopen to finish updating.')),15000);navigator.serviceWorker.addEventListener('controllerchange',()=>{clearTimeout(t);resolve()},{once:true})});
 await import('./shadow-betting.js');
}catch(error){const m=document.querySelector('.sb-loading small');if(m)m.textContent=error.message+' ';const a=document.createElement('button');a.textContent='Retry';a.onclick=()=>location.reload();m?.after(a)}
'''
ITCH_SW='''// Images live in content-addressed bundles; everything else is cached as it is fetched (versioned by the build).
const VERSION=__VERSION__,ART=__ART__,PACKS=__PACKS__,CACHE='sb-itch-'+VERSION,ART_CACHE='sb-itch-art-v1';
const root=new URL('./',self.location.href),resident=new Map(),inflight=new Map();
const TYPES={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',svg:'image/svg+xml'};
async function bundle(name){
 if(resident.has(name))return resident.get(name);if(inflight.has(name))return inflight.get(name);
 const job=(async()=>{const cache=await caches.open(ART_CACHE),url=new URL(name,root).href;let r=await cache.match(url),cached=!!r;if(!r)r=await fetch(url);if(!r.ok)throw Error('Artwork download failed: '+r.status);
  const blob=await r.blob();if(blob.size!==PACKS[name]){await cache.delete(url);throw Error('Incomplete artwork download')}if(!cached)await cache.put(url,new Response(blob)).catch(()=>{});
  resident.set(name,blob);while(resident.size>3)resident.delete(resident.keys().next().value);return blob})();
 inflight.set(name,job);try{return await job}finally{inflight.delete(name)}}
self.addEventListener('install',e=>e.waitUntil(self.skipWaiting()));
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const n of await caches.keys())if(n.startsWith('sb-itch-')&&n!==CACHE&&n!==ART_CACHE)await caches.delete(n);
 const cache=await caches.open(ART_CACHE),keep=new Set(Object.keys(PACKS).map(p=>new URL(p,root).href));for(const q of await cache.keys())if(!keep.has(q.url))await cache.delete(q);await self.clients.claim()})()));
self.addEventListener('fetch',e=>{const url=new URL(e.request.url);if(e.request.method!=='GET'||url.origin!==root.origin||!url.pathname.startsWith(root.pathname))return;
 const path=decodeURIComponent(url.pathname.slice(root.pathname.length)),entry=ART[path];
 if(entry){e.respondWith((async()=>{try{const [name,start,length]=entry,blob=await bundle(name),type=TYPES[path.split('.').pop().toLowerCase()]||'application/octet-stream';return new Response(blob.slice(start,start+length,type),{headers:{'Content-Type':type,'Content-Length':String(length)}})}catch(err){return new Response(String(err),{status:503})}})());return}
 e.respondWith((async()=>{const cache=await caches.open(CACHE),key=url.href.split('#')[0];let r=await cache.match(key);if(r)return r;r=await fetch(e.request);if(r.ok&&!e.request.headers.has('range'))await cache.put(key,r.clone()).catch(()=>{});return r})())});
'''
def itch_bundle(out):
 import hashlib,zipfile
 images=sorted(p for p in out.rglob('*') if p.is_file() and p.suffix.lower() in ('.png','.jpg','.jpeg','.webp','.svg') and p.relative_to(out).as_posix()!='assets/menu/83241722.webp' and not p.relative_to(out).as_posix().startswith('assets/menu/'))
 art={};packs={};data=bytearray();pending=[]
 def flush():
  if not data:return
  name=f'art-{len(packs):02}-{hashlib.sha256(data).hexdigest()[:12]}.bin';(out/name).write_bytes(data);packs[name]=len(data)
  for src,off,n in pending:art[src.relative_to(out).as_posix()]=[name,off,n];src.unlink()
  data.clear();pending.clear()
 for src in images:
  raw=src.read_bytes()
  if data and len(data)+len(raw)>8*1024*1024:flush()
  pending.append((src,len(data),len(raw)));data.extend(raw)
 flush()
 page=out/'index.html';html=page.read_text(encoding='utf8')
 assert html.count('<script type="module" src="shadow-betting.js"></script>')==1,'entry script'
 page.write_text(html.replace('<script type="module" src="shadow-betting.js"></script>','<script type="module" src="itch-boot.js"></script>'),encoding='utf8')
 (out/'itch-boot.js').write_text(ITCH_BOOT,encoding='utf8')
 digest=hashlib.sha256()
 for f in sorted(p for p in out.rglob('*') if p.is_file()):digest.update(f.relative_to(out).as_posix().encode());digest.update(f.read_bytes())
 version=digest.hexdigest()[:16]
 (out/'sw.js').write_text(ITCH_SW.replace('__VERSION__',json.dumps(version)).replace('__ART__',json.dumps(art,separators=(',',':'))).replace('__PACKS__',json.dumps(packs)),encoding='utf8')
 for d in sorted((p for p in out.rglob('*') if p.is_dir()),key=lambda p:-len(p.parts)):
  if not any(d.iterdir()):d.rmdir()
 names=[p for p in out.rglob('*') if p.is_file()];assert len(names)<990,f'{len(names)} files: itch.io allows under 1,000'
 with zipfile.ZipFile(out.parent/(out.name+'.zip'),'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
  for f in names:z.write(f,f.relative_to(out).as_posix())
 print(f'itch.io: {len(art)} images in {len(packs)} bundles, {len(names)} files -> {out.parent/(out.name+".zip")}')

if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);p.add_argument('--cache',type=Path,default=None);p.add_argument('--itch',action='store_true',help='itch.io build: images in bundles, a ZIP next to the folder');a=p.parse_args();build(a.output,a.cache,itch=a.itch)

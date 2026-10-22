"""Rebuild the offline Android APK from the current desktop campaign and assets."""
from pathlib import Path
import sys,json,shutil,zipfile,subprocess,hashlib,time,os,sqlite3
from PIL import Image
from mobile_bundle import web_files
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
BUILD_TEMP=ROOT/'temp/build';BUILD_TEMP.mkdir(parents=True,exist_ok=True)
os.environ['TMP']=os.environ['TEMP']=str(BUILD_TEMP)

import campaign as game,content,passives
A=ROOT/'android';WEB=A/'web';BUILD=A/'build';DEP=ROOT/'dependencies/android'

def copy(source,destination):
 destination.parent.mkdir(parents=True,exist_ok=True)
 if not destination.exists() or source.stat().st_mtime>destination.stat().st_mtime:shutil.copy2(source,destination)

def sync():
 from generate_collector_catalog import generate as generate_collector
 generate_collector()
 from generate_art_crops import generate
 generate()
 WEB.mkdir(exist_ok=True)
 (WEB/'replay-version.js').write_text('export const replayVersion='+json.dumps((ROOT/'VERSION').read_text().strip())+';\n',encoding='utf8')
 import endless
 champion_ids=json.loads((ROOT/'data/champion-ultra.json').read_text(encoding='utf8'))['cards']
 (WEB/'champion-cards.js').write_text('export const championCards='+json.dumps(champion_ids)+';\n',encoding='utf8')
 system_strings={}
 for line in (ROOT/'runtime/config/strings.conf').read_text(encoding='utf-8-sig').splitlines():
  if line.startswith('!system '):
   parts=line.split(maxsplit=2);system_strings[parts[1]]=parts[2] if len(parts)>2 else ''
 (WEB/'system-strings.js').write_text('export const systemStrings='+json.dumps(system_strings,ensure_ascii=False)+';\n',encoding='utf8')
 scripts_path=WEB/'scripts.json'
 if scripts_path.exists():
  scripts=json.loads(scripts_path.read_text(encoding='utf8'))
  scripts['rogue-rng.lua']=(ROOT/'runtime/script/rogue-rng.lua').read_text(encoding='utf8')
  scripts['c24096228.lua']=(ROOT/'runtime/script/official/c24096228.lua').read_text(encoding='utf8')
  for card in (78637313,53119267,93599951,85562745,94585852):
   scripts[f'c{card}.lua']=(ROOT/f'runtime/script/official/c{card}.lua').read_text(encoding='utf8')
  if 'Duel.LoadScript("rogue-rng.lua")' not in scripts['utility.lua']:scripts['utility.lua']+='\nDuel.LoadScript("rogue-rng.lua")\n'
  scripts_path.write_text(json.dumps(scripts,ensure_ascii=False),encoding='utf8')
 shared=['feedback_update.py','campaign_catalog.py','character_variants.py','variant_relics.py','archetype_relics.py','pack_odds.py','fallen_collectors.py','collector.py','approved_relics.py','approved_relic_effects.py','cursed_relics.py','artifact_effects.py','artifact_text.py','artifact_expansion.py','tag_campaign.py','secret_challenge.py','character_progression.py','challenge_levels.py','loss_reason.py','campaign.py','campaign_expansion.py','content.py','storage.py','shop_rewards.py','unlocks.py','passives.py','duel_rewards.py','achievement_model.py','encounters.py','endless.py','deck_files.py']
 shared.extend(['reward_slots.py','boss_selection.py','progress_sync.py','golden_cards.py','card_rarity.py','custom_cards.py'])
 files={name:(ROOT/name).read_text(encoding='utf8') for name in shared}
 files['mobile_backend.py']=(A/'mobile_backend.py').read_text(encoding='utf8')
 for p in (ROOT/'data').glob('*.json'):files['data/'+p.name]=p.read_text(encoding='utf8')
 for p in (ROOT/'data/decks').glob('*'):files['data/decks/'+p.name]=p.read_text(encoding='utf8')
 (WEB/'campaign-files.json').write_text(json.dumps(files,ensure_ascii=False),encoding='utf8')
 tokens=json.loads((ROOT/'data/tokens.json').read_text());token_cards=[]
 with sqlite3.connect(ROOT/'runtime/expansions/cards.cdb') as db:
  for token in tokens:
   cid=token['id'];row=db.execute('SELECT name,desc,type,level,atk,def,race,attribute FROM texts JOIN datas USING(id) WHERE id=?',(cid,)).fetchone()
   if row:token_cards.append(dict(id=cid,name=row[0],desc=row[1],type='Token',level=row[3]&255,atk=row[4],defense=row[5],race='Token',attribute='',data=dict(type=row[2]),strings=[]))
 custom_relic_art=json.loads((ROOT/'data/relic-custom-art.json').read_text(encoding='utf8'))
 meta=dict(tutorial=json.loads((ROOT/'data/tutorial.json').read_text(encoding='utf8')),characters=content.CHARACTERS,playable=content.PLAYABLE_IDS,packs=content.PACKS,artifacts=content.ARTIFACTS,retiredArtifacts=sorted(content.RETIRED_ARTIFACTS),artifactInfo={key:dict(value,art=custom_relic_art.get(key) or next((c['id'] for c in game.CARDS if c['name'].casefold()==str(value['art']).casefold()),game.BY_NAME['Pot of Greed']['id'])) for key,value in content.ART_INFO.items()},curses=content.CURSES,runLength=content.RUN_LENGTH,cards=game.CARDS,tokenCards=token_cards)
 from duel_rewards import RULES, VICTORY_ONLY
 meta['battleBonusLabels']=[label for _,_,label,_ in RULES]
 meta['battleCoinRules']=[dict(label=label,coins=coins,victoryOnly=metric in VICTORY_ONLY) for metric,_,label,coins in RULES]
 meta['cpuDecks']={str(i):[content.opponent_record(t*3,i) for t in range(3)]+[content.opponent_record(0,i,loop=1)] for i in content.GAME_DECKS}
 from campaign_catalog import watch_catalog
 meta.update(watch_catalog())

 (WEB/'content.json').write_text(json.dumps(meta,ensure_ascii=False),encoding='utf8')
 old=ROOT.parent/'Shadow Run/duel-run/dist'
 # Vendor the working engine once. Subsequent builds are self-contained.
 for folder,source in [('vendor',old/'vendor'),('pyodide',DEP/'pyodide/package')]:
  if source.exists():
   for p in source.rglob('*'):
    if p.is_file() and p.suffix not in ('.map','.ts'):copy(p,WEB/folder/p.relative_to(source))
 vendor=WEB/'vendor/package/dist/index.js'
 if vendor.exists():vendor.write_text(vendor.read_text(encoding='utf8').replace('t.counters[a]=c','t.counters[c]=a'),encoding='utf8')
 for name in ['engine-data.json','scripts.json']:
  if not (WEB/name).exists():copy(old/name,WEB/name)
 import custom_cards
 engine_data=json.loads((WEB/'engine-data.json').read_text(encoding='utf8'))
 scripts=json.loads((WEB/'scripts.json').read_text(encoding='utf8'))
 for card in custom_cards.CARDS:
  engine_data[str(card['id'])]=card['data']
  scripts[f'c{card["id"]}.lua']=(ROOT/f'runtime/script/custom/c{card["id"]}.lua').read_text(encoding='utf8')
 (WEB/'engine-data.json').write_text(json.dumps(engine_data,ensure_ascii=False),encoding='utf8')
 (WEB/'scripts.json').write_text(json.dumps(scripts,ensure_ascii=False),encoding='utf8')
 # Card assets include all pool cards, every token and the menu's decorative cards.
 ids={c['id'] for c in game.CARDS}|{c['id'] for c in json.loads((ROOT/'data/tokens.json').read_text())}
 excluded_packs=set(json.loads((ROOT/'data/content-era.json').read_text(encoding='utf8')).get('excluded_pack_ids',[]))
 selected_music=set(json.loads((ROOT/'assets/music/soundtrack.json').read_text(encoding='utf8'))['tracks'])
 for source in (ROOT/'assets').rglob('*'):
  if not source.is_file():continue
  relative=source.relative_to(ROOT/'assets')
  if relative.parts[0]=='music' and (len(relative.parts)!=2 or source.suffix.lower()!='.m4a' or source.stem not in selected_music):continue
  if any(part.casefold()=='potential sound effects' for part in relative.parts):continue
  if source.name.startswith('gx'):continue
  if relative.parts[0]=='packs' and source.stem in excluded_packs:continue
  if relative.parts[0]=='cards' and int(source.stem) not in ids:continue
  dest=WEB/'assets'/relative;dest.parent.mkdir(parents=True,exist_ok=True)
  variant_icon=relative.parts[0]=='relics' and source.name.startswith('variant-')
  if dest.exists() and dest.stat().st_mtime>=source.stat().st_mtime:
   if not variant_icon:continue
   with Image.open(dest) as current:
    if max(current.size)<=512:continue
  if source.suffix.lower() in ('.jpg','.png'):
   with Image.open(source) as im:
    im.thumbnail((288,420) if relative.parts[0]=='cards' else (512,512) if variant_icon else (1280,900),Image.Resampling.LANCZOS)
    if source.suffix.lower()=='.jpg':im=im.convert('RGB')
    im.save(dest,quality=85,optimize=True)
  else:copy(source,dest)
 for card in game.CARDS:
  if card['data']['type']&0x80000:
   source=ROOT/'assets/cards'/f'{card["id"]}.jpg';dest=WEB/'assets/fields'/source.name;dest.parent.mkdir(exist_ok=True)
   if not dest.exists() or source.stat().st_mtime>dest.stat().st_mtime:
    with Image.open(source) as im:
     w,h=im.size;im.crop((w*.12,h*.22,w*.88,h*.62)).convert('RGB').save(dest,quality=88)
 for folder in ['textures','sound']:
  for p in (ROOT/'runtime'/folder).glob('*'):
   if p.is_file():copy(p,WEB/folder/p.name)
 missing=[cid for cid in ids if not (WEB/'assets/cards'/f'{cid}.jpg').exists()]
 if missing:raise RuntimeError('Missing offline card images: '+str(missing))
 # Enumerate only assets shipped by the shared Android/web packaging policy.
 packaged=[relative for _,relative in web_files(WEB)]
 audio=[p.as_posix() for p in packaged if p.suffix.lower() in ('.wav','.mp3','.ogg','.m4a')]
 images=[p.as_posix() for p in packaged if p.suffix.lower() in ('.jpg','.png','.webp','.gif','.svg') and p.parts[:2]!=('assets','cards')]
 (WEB/'startup-assets.json').write_text(json.dumps(dict(audio=audio,images=images)),encoding='utf8')
 digest=hashlib.sha256(json.dumps(files,sort_keys=True).encode()).hexdigest()
 (WEB/'build.json').write_text(json.dumps(dict(version=(ROOT/'VERSION').read_text().strip(),built=time.strftime('%Y-%m-%d %H:%M'),campaignHash=digest,webEngine='ocgcore-wasm 0.1.2',androidEngine='ocgcore-wasm 0.1.2',cards=len(game.CARDS),tokens=len(ids)-len(game.CARDS))))
 print('Synchronized campaign,',len(ids),'card/token images and desktop UI assets.',flush=True)

def build():
 BUILD.mkdir(exist_ok=True);jdk=next((DEP/'jdk').glob('jdk-*'));sdk=DEP/'sdk';bt=sdk/'android-15';platform=sdk/'android-35/android.jar'
 def run(args):subprocess.run([str(x) for x in args],check=True,cwd=A)
 def reset_build_dir(path):
  resolved=path.resolve();build_root=BUILD.resolve()
  if resolved==build_root or build_root not in resolved.parents:raise RuntimeError(f'Refusing to reset non-build directory: {resolved}')
  if resolved.exists():shutil.rmtree(resolved)
  resolved.mkdir(parents=True)
  return resolved
 classes=BUILD/'classes';classes.mkdir(exist_ok=True)
 run([jdk/'bin/javac.exe','-encoding','UTF-8','-source','8','-target','8','-classpath',platform,'-d',classes,*list((A/'src').rglob('*.java'))])
 run([jdk/'bin/jar.exe','cf',BUILD/'classes.jar','-C',classes,'.'])
 run([jdk/'bin/java.exe','-cp',bt/'lib/d8.jar','com.android.tools.r8.D8','--min-api','29','--lib',platform,'--output',BUILD,BUILD/'classes.jar'])
 code=int(time.time()//60);version=(ROOT/'VERSION').read_text().strip()
 # AAPT2 writes .flat resources into an output directory; passing a .zip file here crashes it.
 compiled_resources=reset_build_dir(BUILD/'compiled-resources')
 run([bt/'aapt2.exe','compile','--dir',A/'res','-o',compiled_resources])
 flat_resources=sorted(compiled_resources.glob('*.flat'))
 if not flat_resources:raise RuntimeError('AAPT2 did not produce any compiled resources')
 linked_resources=reset_build_dir(BUILD/'linked-resources')
 for folder in (A/'res').rglob('*'):
  if folder.is_dir():(linked_resources/'res'/folder.relative_to(A/'res')).mkdir(parents=True,exist_ok=True)
 run([bt/'aapt2.exe','link',*flat_resources,'-o',linked_resources,'--output-to-dir','--manifest',A/'AndroidManifest.xml','-I',platform,'--replace-version','--version-code',str(code),'--version-name',version])
 with zipfile.ZipFile(BUILD/'unsigned.apk','w',zipfile.ZIP_DEFLATED,compresslevel=6) as archive:
  for p in sorted(linked_resources.rglob('*')):
   if p.is_file():
    name=p.relative_to(linked_resources).as_posix()
    # Android 11+ rejects APKs whose resource table is compressed or not 4-byte aligned.
    compression=zipfile.ZIP_STORED if name=='resources.arsc' else zipfile.ZIP_DEFLATED
    archive.write(p,name,compress_type=compression)
  archive.write(BUILD/'classes.dex','classes.dex')
  for p,relative in web_files(WEB):archive.write(p,'assets/web/'+relative.as_posix())
 with zipfile.ZipFile(BUILD/'unsigned.apk') as archive:
  if archive.getinfo('resources.arsc').compress_type!=zipfile.ZIP_STORED:
   raise RuntimeError('Android resource table must be stored uncompressed in the APK')
 unsigned=BUILD/'unsigned.apk';aligned=BUILD/'aligned.apk';zipalign=bt/'zipalign.exe'
 # Don't rewrite a valid archive: this bundled zipalign can crash after truncating its output.
 checked=subprocess.run([str(zipalign),'-c','4',str(unsigned)],cwd=A,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 if checked.returncode==0:shutil.copy2(unsigned,aligned)
 else:
  run([zipalign,'-f','4',unsigned,aligned])
  run([zipalign,'-c','4',aligned])
 key=A/'signing/private-experiment.jks';key.parent.mkdir(exist_ok=True)
 if not key.exists():run([jdk/'bin/keytool.exe','-genkeypair','-keystore',key,'-storepass','shadowrun-private','-keypass','shadowrun-private','-alias','shadowrun','-dname','CN=Shadow Run Private Experiment','-keyalg','RSA','-keysize','2048','-validity','10000'])
 release=ROOT/'releases';release.mkdir(exist_ok=True)
 apk=Path(os.environ.get('ANDROID_APK_OUTPUT',str(release/'YGO-Rogue-Android.apk'))).resolve()
 apk.parent.mkdir(parents=True,exist_ok=True)
 from android_delta import archive_base
 archive_base(apk)
 sign=[jdk/'bin/java.exe','-jar',bt/'lib/apksigner.jar']
 run(sign+['sign','--ks',key,'--ks-key-alias','shadowrun','--ks-pass','pass:shadowrun-private','--out',apk,aligned])
 run(sign+['verify','--verbose',apk])
 run([zipalign,'-c','4',apk])
 with zipfile.ZipFile(apk) as archive:
  if archive.getinfo('resources.arsc').compress_type!=zipfile.ZIP_STORED:
   raise RuntimeError('Signed APK resource table is compressed; refusing to publish an un-installable APK')
 (release/'build.json').write_text((WEB/'build.json').read_text())
 print('APK:',apk,'â€”',round(apk.stat().st_size/1024/1024,1),'MiB',flush=True)

if __name__=='__main__':
 sync()
 if '--sync-only' not in sys.argv:
  build()

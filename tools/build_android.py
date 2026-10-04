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
  for card in (78637313,53119267):
   scripts[f'c{card}.lua']=(ROOT/f'runtime/script/official/c{card}.lua').read_text(encoding='utf8')
  if 'Duel.LoadScript("rogue-rng.lua")' not in scripts['utility.lua']:scripts['utility.lua']+='\nDuel.LoadScript("rogue-rng.lua")\n'
  scripts_path.write_text(json.dumps(scripts,ensure_ascii=False),encoding='utf8')
 shared=['collector.py','approved_relics.py','approved_relic_effects.py','cursed_relics.py','artifact_effects.py','artifact_text.py','artifact_expansion.py','tag_campaign.py','secret_challenge.py','character_progression.py','challenge_levels.py','loss_reason.py','campaign.py','campaign_expansion.py','content.py','storage.py','shop_rewards.py','unlocks.py','passives.py','duel_rewards.py','achievement_model.py','encounters.py','endless.py','deck_files.py']
 shared.extend(['reward_slots.py','boss_selection.py','progress_sync.py','golden_cards.py','card_rarity.py'])
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
 # Spectator catalog comes only from decks reachable by the current campaign.
 # Do not enumerate the deck directory: it also contains retired revisions.
 watch={}
 def add_watch(i,record,label):
  rows=watch.setdefault(str(i),[])
  signature=(sorted(record['main']),sorted(record.get('extra',[])))
  same=next((row for row in rows if (sorted(row['main']),sorted(row['extra']))==signature),None)
  if same:same['label']+=' / '+label
  else:rows.append(dict(main=record['main'][:],extra=record.get('extra',[])[:],label=label))
 for i,variant in content.TUTORIAL_OPPONENTS.items():
  add_watch(i,dict(main=game.opponent_deck(0,opponent=i,tutorial_variant=variant),extra=[]),'Opening Duel')
 for tier in range(3):
  for i in content.eligible_opponents(tier*3+1):add_watch(i,content.opponent_record(tier*3+1,i),'Tier '+str(tier+1))
 for i in content.eligible_opponents(0,loop=1):add_watch(i,content.opponent_record(0,i,loop=1),'Endless')
 add_watch(-1,endless.CHAMPION,'World Championship')
 meta['cpuWatchDecks']=watch
 meta['cpuWatchOpponents']={'-1':dict(name=endless.CHAMPION['name'],sprite='dm01.png',background='character-backgrounds/0.jpg')}

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
 # Card assets include all pool cards, every token and the menu's decorative cards.
 ids={c['id'] for c in game.CARDS}|{c['id'] for c in json.loads((ROOT/'data/tokens.json').read_text())}
 selected_music=set(json.loads((ROOT/'assets/music/soundtrack.json').read_text(encoding='utf8'))['tracks'])
 for source in (ROOT/'assets').rglob('*'):
  if not source.is_file():continue
  relative=source.relative_to(ROOT/'assets')
  if relative.parts[0]=='music' and (len(relative.parts)!=2 or source.suffix.lower()!='.mp3' or source.stem not in selected_music):continue
  if any(part.casefold()=='potential sound effects' for part in relative.parts):continue
  if source.name.startswith('gx'):continue
  if relative.parts[0]=='cards' and int(source.stem) not in ids:continue
  dest=WEB/'assets'/relative;dest.parent.mkdir(parents=True,exist_ok=True)
  if dest.exists() and dest.stat().st_mtime>=source.stat().st_mtime:continue
  if source.suffix.lower() in ('.jpg','.png'):
   with Image.open(source) as im:
    im.thumbnail((288,420) if relative.parts[0]=='cards' else (1280,900),Image.Resampling.LANCZOS)
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
 digest=hashlib.sha256(json.dumps(files,sort_keys=True).encode()).hexdigest()
 (WEB/'build.json').write_text(json.dumps(dict(version=(ROOT/'VERSION').read_text().strip(),built=time.strftime('%Y-%m-%d %H:%M'),campaignHash=digest,desktopEngine='ShadowDuel.exe',androidEngine='ocgcore-wasm 0.1.2',cards=len(game.CARDS),tokens=len(ids)-len(game.CARDS))))
 print('Synchronized campaign,',len(ids),'card/token images and desktop UI assets.',flush=True)

def build():
 BUILD.mkdir(exist_ok=True);jdk=next((DEP/'jdk').glob('jdk-*'));sdk=DEP/'sdk';bt=sdk/'android-15';platform=sdk/'android-35/android.jar'
 def run(args):subprocess.run([str(x) for x in args],check=True,cwd=A)
 classes=BUILD/'classes';classes.mkdir(exist_ok=True)
 run([jdk/'bin/javac.exe','-encoding','UTF-8','-source','8','-target','8','-classpath',platform,'-d',classes,*list((A/'src').rglob('*.java'))])
 run([jdk/'bin/jar.exe','cf',BUILD/'classes.jar','-C',classes,'.'])
 run([jdk/'bin/java.exe','-cp',bt/'lib/d8.jar','com.android.tools.r8.D8','--min-api','29','--lib',platform,'--output',BUILD,BUILD/'classes.jar'])
 run([bt/'aapt2.exe','compile','--dir',A/'res','-o',BUILD/'res.zip'])
 code=int(time.time()//60);version=(ROOT/'VERSION').read_text().strip()
 run([bt/'aapt2.exe','link','-o',BUILD/'unsigned.apk','--manifest',A/'AndroidManifest.xml','-I',platform,'--replace-version','--version-code',str(code),'--version-name',version,BUILD/'res.zip'])
 with zipfile.ZipFile(BUILD/'unsigned.apk','a',zipfile.ZIP_DEFLATED,compresslevel=6) as archive:
  archive.write(BUILD/'classes.dex','classes.dex')
  for p,relative in web_files(WEB):archive.write(p,'assets/web/'+relative.as_posix())
 run([bt/'zipalign.exe','-f','4',BUILD/'unsigned.apk',BUILD/'aligned.apk'])
 key=A/'signing/private-experiment.jks';key.parent.mkdir(exist_ok=True)
 if not key.exists():run([jdk/'bin/keytool.exe','-genkeypair','-keystore',key,'-storepass','shadowrun-private','-keypass','shadowrun-private','-alias','shadowrun','-dname','CN=Shadow Run Private Experiment','-keyalg','RSA','-keysize','2048','-validity','10000'])
 release=ROOT/'releases';release.mkdir(exist_ok=True);apk=release/'YGO-Rogue-Android.apk'
 from android_delta import archive_base
 archive_base(apk)
 sign=[jdk/'bin/java.exe','-jar',bt/'lib/apksigner.jar']
 run(sign+['sign','--ks',key,'--ks-key-alias','shadowrun','--ks-pass','pass:shadowrun-private','--out',apk,BUILD/'aligned.apk'])
 run(sign+['verify','--verbose',apk])
 (release/'build.json').write_text((WEB/'build.json').read_text())
 print('APK:',apk,'â€”',round(apk.stat().st_size/1024/1024,1),'MiB',flush=True)

if __name__=='__main__':
 sync()
 if '--sync-only' not in sys.argv:
  build()

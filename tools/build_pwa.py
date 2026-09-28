"""Build the installable web edition without changing native Android/desktop files.

Usage: python tools/build_pwa.py --output <directory>
Run tools/build_android.py --sync-only first when campaign/assets have changed.
"""
from pathlib import Path
import argparse,hashlib,json,shutil,sys,zipfile
from PIL import Image

def build(root,out,templates):
 sys.path.insert(0,str(root/'tools'))
 from mobile_bundle import web_files
 out.mkdir(parents=True,exist_ok=True)
 if any(out.iterdir()):raise SystemExit('Output directory must be empty; choose a new build directory.')
 for source,relative in web_files(root/'android/web'):
  if relative.as_posix()=='scripts.json':continue
  target=out/relative;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source,target)
 scripts=json.loads((root/'android/web/scripts.json').read_text(encoding='utf8'))
 chunks=[];chunk={};size=0
 for name,script in scripts.items():
  cost=len(json.dumps({name:script},ensure_ascii=False).encode())
  if chunk and size+cost>8*1024*1024:chunks.append(chunk);chunk={};size=0
  chunk[name]=script;size+=cost
 if chunk:chunks.append(chunk)
 paths=[]
 for i,chunk in enumerate(chunks):
  name=f'scripts-{i}.json';paths.append(name);(out/name).write_text(json.dumps(chunk,ensure_ascii=False),encoding='utf8')
 engine=out/'engine.js';text=engine.read_text(encoding='utf8')
 old="fetch('scripts.json').then(r=>r.json())"
 assert text.count(old)==1
 text=text.replace(old,'Promise.all('+json.dumps(paths)+'.map(url=>fetch(url).then(r=>{if(!r.ok)throw Error("Could not load card scripts");return r.json()}))).then(parts=>Object.assign({},...parts))')
 engine.write_text(text,encoding='utf8')
 for name in ['pwa-storage.js','pwa.js','pwa.css']:shutil.copy2(templates/name,out/name)
 mobile=out/'mobile.js';text=mobile.read_text(encoding='utf8')
 text="import {webStorage} from './pwa-storage.js';\n"+text
 old="else localStorage.setItem('shadow-run-mobile',data)";assert old in text;text=text.replace(old,'else await webStorage.store(data)')
 old="localStorage.getItem('shadow-run-mobile')||'{}'";assert old in text;text=text.replace(old,'await webStorage.load()')
 text=text.replace('updating this APK preserves your save.','web updates preserve your saves. Export a backup before clearing browser data.')
 old="${btn('Tutorial','tutorial')}${btn('Back','settings-back')}";assert old in text
 text=text.replace(old,"<button id=\"web-app-options\">Install, offline play &amp; save backups</button>"+old)
 marker='<div class="title-footer">'
 assert marker in text
 text=text.replace(marker,'<button class="web-install-menu" data-web-install>Install on iPhone / Play offline</button>'+marker,1)
 mobile.write_text(text,encoding='utf8')
 # Export dedicated icons; the original game artwork is preserved.
 with Image.open(root/'assets/zgo rogue iconArtboard 1.png') as source:
  for size in [180,192,512]:source.convert('RGBA').resize((size,size),Image.Resampling.LANCZOS).save(out/f'icon-{size}.png')
 manifest=dict(id='./',name='Yu-Gi-Oh: Rogue Duelist',short_name='YGO Rogue',start_url='./',scope='./',display='standalone',background_color='#081923',theme_color='#102936',orientation='any',icons=[dict(src=f'icon-{s}.png',sizes=f'{s}x{s}',type='image/png',purpose='any') for s in [192,512]])
 (out/'manifest.webmanifest').write_text(json.dumps(manifest,indent=2),encoding='utf8')
 page=out/'index.html';text=page.read_text(encoding='utf8').replace('</head>','<link rel="manifest" href="manifest.webmanifest"><link rel="apple-touch-icon" href="icon-180.png"><meta name="theme-color" content="#102936"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="YGO Rogue"><link rel="stylesheet" href="pwa.css"></head>').replace('</body>','<script type="module" src="pwa.js"></script></body>');page.write_text(text,encoding='utf8')
 (out/'_headers').write_text('/sw.js\n  Cache-Control: no-cache\n/index.html\n  Cache-Control: no-cache\n/manifest.webmanifest\n  Content-Type: application/manifest+json\n/*.wasm\n  Content-Type: application/wasm\n/*.mjs\n  Content-Type: text/javascript\n',encoding='utf8')
 files=sorted(p.relative_to(out).as_posix() for p in out.rglob('*') if p.is_file() and p.name!='_headers')
 digest=hashlib.sha256()
 for name in files:digest.update(name.encode());digest.update((out/name).read_bytes())
 digest.update((templates/'pwa-sw.js').read_bytes())
 version=digest.hexdigest()[:16]
 sw=(templates/'pwa-sw.js').read_text(encoding='utf8').replace('__VERSION__',json.dumps(version)).replace('__FILES__',json.dumps(files))
 (out/'sw.js').write_text(sw,encoding='utf8')
 assert len(files)<20000
 assert all(p.stat().st_size<=25*1024*1024 for p in out.rglob('*') if p.is_file())
 report=dict(version=version,files=len(files),bytes=sum(p.stat().st_size for p in out.rglob('*') if p.is_file()),scriptChunks=len(chunks),scriptCount=len(scripts))
 (out.parent/(out.name+'-build.json')).write_text(json.dumps(report,indent=2))
 with zipfile.ZipFile(out.parent/(out.name+'.zip'),'w',zipfile.ZIP_DEFLATED,compresslevel=6) as archive:
  for p in out.rglob('*'):
   if p.is_file():archive.write(p,p.relative_to(out).as_posix())
 print(json.dumps(report,indent=2),flush=True)

if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1]);parser.add_argument('--output',type=Path,required=True);parser.add_argument('--templates',type=Path,default=Path(__file__).parent/'pwa');args=parser.parse_args();build(args.root,args.output,args.templates)

"""Windows installer release assets (user, 2026-11-14).

The Windows app (WebView2 launcher, source in D:/Codex Exports/Yu-Gi-Oh! Rogue Duelist Windows) updates its game
files from the latest stable GitHub release: it downloads the asset named exactly web-X.Y.Z.zip (the hosted
tools/build_pwa.py output) and checks it against GitHub's SHA-256 digest. The installer itself is uploaded with each
release under a fixed name, so releases/latest/download/YGO-Rogue-Windows-Setup.exe always works.

check_web_zip() repeats the launcher's archive rules (GameFiles.Extract / IsPlayable / AdaptReplay), so a release
never ships a ZIP that every Windows player would reject.

  python/python.exe tools/windows_release.py            # checks releases/web-<VERSION>.zip
"""
import json,re,sys,zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
INSTALLER_NAME='YGO-Rogue-Windows-Setup.exe'
INSTALLER=ROOT/'releases/windows'/INSTALLER_NAME
MAX_ZIP,MAX_EXPANDED,MAX_ENTRY,MAX_ENTRIES=600_000_000,1_500_000_000,30_000_000,25000
EXTENSIONS={'.js','.mjs','.json','.html','.css','.wasm','.zip','.gz','.png','.jpg','.jpeg','.webp','.gif','.svg','.ico',
 '.woff','.woff2','.ttf','.otf','.mp3','.wav','.ogg','.flac','.webmanifest','.txt','.md','.map','.avif','.dat','.bin',
 '.webm','.mp4','.m4a'}
REQUIRED=('index.html','mobile.js','campaign-files.json','engine-data.json','live-version.json')
SEGMENT=re.compile(r'^[^<>:"/\\|?*\x00-\x1f]+$')
DEVICE=re.compile(r'^(CON|PRN|AUX|NUL|CONIN\$|CONOUT\$|COM[0-9¹²³]|LPT[0-9¹²³])$',re.I)
# The launcher writes replay files by appending to this exact line of replays.js.
REPLAY_ANCHOR='uploaded:old?.steps===copy.responses.length&&old?.ended===copy.ended?old.uploaded:false,ended:copy.ended});'

def web_zip(version):return ROOT/'releases'/f'web-{version}.zip'

def check_web_zip(path,version):
 """Raises AssertionError when a Windows launcher would refuse or half-work with this ZIP."""
 path=Path(path);assert path.is_file(),f'Missing {path}'
 assert path.stat().st_size<=MAX_ZIP,'web ZIP is over the launcher limit'
 with zipfile.ZipFile(path) as z:
  infos=z.infolist();assert 1<=len(infos)<=MAX_ENTRIES,f'{len(infos)} entries'
  seen,total,names=set(),0,set()
  for e in infos:
   rel=e.filename[:-1] if e.is_dir() else e.filename;parts=rel.split('/')
   assert len(rel)<=240 and rel.lower() not in seen,'Bad entry '+rel;seen.add(rel.lower())
   for p in parts:assert p not in('.','..') and SEGMENT.match(p) and not p.endswith(('.',' ')) and not DEVICE.match(p.split('.')[0].rstrip()),'Unsafe entry '+rel
   assert ((e.external_attr>>16)&0xF000) in(0,0x4000,0x8000) and not e.external_attr&0x400,'Linked entry '+rel
   if e.is_dir():continue
   ext=Path(rel).suffix.lower()
   assert ext in EXTENSIONS or parts[-1] in('_headers','LICENSE'),'Launcher rejects file type: '+rel
   assert e.file_size<=MAX_ENTRY,'Entry too large: '+rel
   total+=e.file_size;names.add(rel)
  assert total<=MAX_EXPANDED,'Expanded bundle too large'
  missing=[n for n in REQUIRED if n not in names];assert not missing,f'Missing {missing}'
  assert json.loads(z.read('live-version.json'))['version']==version,'live-version.json does not match VERSION'
  assert 'web-boot.js' in z.read('index.html').decode('utf8'),'index.html must boot through web-boot.js (hosted build, not --bundle-artwork)'
  assert 'startup-assets.json' in names,'startup-assets.json missing (launcher artwork preload)'
  if 'replays.js' in names:assert REPLAY_ANCHOR in z.read('replays.js').decode('utf8'),'replays.js changed: the launcher can no longer save replay files (update REPLAY_ANCHOR and the launcher)'
 return len(names)

def assets(version):
 """{release asset name: local file} the Windows app needs on every release."""
 assert INSTALLER.is_file(),f'Missing Windows installer {INSTALLER}'
 check_web_zip(web_zip(version),version)
 return {f'web-{version}.zip':web_zip(version),INSTALLER_NAME:INSTALLER}

if __name__=='__main__':
 v=(ROOT/'VERSION').read_text().strip();p=Path(sys.argv[1]) if len(sys.argv)>1 else web_zip(v)
 print(p.name,'OK for the Windows launcher,',check_web_zip(p,v if len(sys.argv)<3 else sys.argv[2]),'files')

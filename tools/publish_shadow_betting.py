"""Publish Shadow Betting's own downloads (user, 2026-11-27): the Android APK on the GitHub release "shadow-betting" and
the itch.io ZIP, both under exports/shadow-betting in the main checkout.

The release is a pre-release under a fixed tag and never "latest", so the game's own updater (releases/latest) never
sees it. The app's updater (tools/shadow-betting/android UpdateActivity) reads shadow-betting-manifest.json from it,
downloads Shadow-Betting.apk and checks its SHA-256 and signing key; the page compares build.json's version with the
release title ("Shadow Betting vX.Y.Z") through the GitHub API.

Usage (repository root): python/python.exe -B tools/publish_shadow_betting.py [--no-release] [--no-itch]
The standalone website is deployed separately (docs/DUEL-BETS-BRANCH.md).
"""
from pathlib import Path
import argparse,hashlib,json,shutil,subprocess,sys
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'tools'))
import build_shadow_betting,build_shadow_betting_apk as apk_build
TAG='shadow-betting';REPO='Thronior/ygo-rogue-duelist'

def gh(*args,check=True):return subprocess.run(['gh',*args,'--repo',REPO],capture_output=True,text=True,check=check)

def main():
 p=argparse.ArgumentParser();p.add_argument('--no-release',action='store_true');p.add_argument('--no-itch',action='store_true');a=p.parse_args()
 out=apk_build.APK.parent
 version=apk_build.build();apk=apk_build.APK
 data=apk.read_bytes();manifest={'version':version,'files':{'Shadow-Betting.apk':{'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}}}
 mf=out/'shadow-betting-manifest.json';mf.write_text(json.dumps(manifest,indent=1),encoding='utf8')
 if not a.no_itch:
  site=out/'itch';shutil.rmtree(site,ignore_errors=True);zipped=out/'itch.zip';zipped.unlink(missing_ok=True)
  cache=apk_build.MAIN/'temp/build/packaged-assets'
  build_shadow_betting.build(site,cache if cache.is_dir() else None,itch=True)
  final=out/f'Shadow-Betting-itch-{version}.zip';final.unlink(missing_ok=True);zipped.rename(final);shutil.rmtree(site,ignore_errors=True)
  print(f'itch.io ZIP: {final}',flush=True)
 if a.no_release:return
 title=f'Shadow Betting v{version}';notes='Shadow Betting, the betting minigame on its own. Install Shadow-Betting.apk on Android; the app updates itself from this release.'
 if gh('release','view',TAG,check=False).returncode==0:
  gh('release','upload',TAG,str(apk),str(mf),'--clobber');gh('release','edit',TAG,'--title',title,'--prerelease','--latest=false')
 else:
  gh('release','create',TAG,str(apk),str(mf),'--title',title,'--notes',notes,'--prerelease','--latest=false','--target','shadow-betting')
 print(f'Released {title} on {REPO} (tag {TAG}, pre-release)',flush=True)

if __name__=='__main__':main()

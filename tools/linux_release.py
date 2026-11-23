"""Linux app release assets (user, 2026-11-22).

The Linux app is a small launcher (source and build.ps1 in D:/Codex Exports/Yu-Gi-Oh! Rogue Duelist Linux) that uses the
system's WebKitGTK and ships without the game: the first start downloads web-X.Y.Z.zip from the latest stable GitHub
release, and later updates use the same web-<old>-to-<new>.delta.gz files as the Windows app (one update pipeline,
tools/windows_release.py builds and checks them). Like the Windows launcher it updates itself: each release carries
linux-launcher.json {"build": N}, and launchers with a lower LauncherUpdate.Build download the new one.

Files in releases/linux/, written by build.ps1 -CopyToRelease:
  YGO-Rogue-Linux-x86_64.tar.gz     YGO-Rogue-Linux/ygo-rogue-duelist (executable) + README.txt. The download link.
  linux-launcher.json               {"build": N} from LauncherUpdate.Build.
  YGO-Rogue-Linux-x86_64.AppImage   optional; once one is there, every release must carry it (AppImage players update from it).
The launcher does not contain the game, so these files only change when launcher code changes (raise Build then).

  python/python.exe tools/linux_release.py        # checks releases/linux and releases/web-<VERSION>.zip
"""
import gzip,json,tarfile,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
import windows_release
FOLDER=ROOT/'releases/linux'
ARCHIVE_NAME='YGO-Rogue-Linux-x86_64.tar.gz'
APPIMAGE_NAME='YGO-Rogue-Linux-x86_64.AppImage'
MANIFEST_NAME='linux-launcher.json'
# The executable inside the archive: LauncherUpdate.ArchiveEntry in the launcher, which extracts it when it updates itself.
ENTRY='YGO-Rogue-Linux/ygo-rogue-duelist'
MAX_LAUNCHER=300_000_000

def elf(data):return data[:4]==b'\x7fELF' and data[4]==2 and int.from_bytes(data[18:20],'little')==62  # 64-bit x86-64

def check_archive(path):
 """Raises AssertionError when installed launchers could not update from this archive, or players could not run it."""
 path=Path(path);assert path.is_file(),f'Missing {path}: build it with build.ps1 -CopyToRelease in the Linux launcher folder'
 assert path.stat().st_size<=MAX_LAUNCHER,'Linux archive is over the launcher limit'
 with tarfile.open(path,'r:gz') as tar:
  member=tar.getmember(ENTRY)
  assert member.isreg(),ENTRY+' must be a regular file'
  assert member.mode&0o111==0o111,ENTRY+' must be executable (mode 755)'
  assert elf(tar.extractfile(member).read(64)),ENTRY+' is not a 64-bit x86-64 Linux program'
  assert 'YGO-Rogue-Linux/README.txt' in tar.getnames(),'README.txt missing'
 return member.size

def check_appimage(path):
 data=Path(path).read_bytes()[:64]
 assert elf(data) and data[8:11]==b'AI\x02',f'{path} is not a type 2 AppImage'

def build_number():
 manifest=FOLDER/MANIFEST_NAME;assert manifest.is_file(),f'Missing {manifest}: rebuild with build.ps1 -CopyToRelease'
 assert manifest.stat().st_mtime>=(FOLDER/ARCHIVE_NAME).stat().st_mtime-120,'linux-launcher.json is older than the archive: rebuild with build.ps1 -CopyToRelease'
 build=json.loads(manifest.read_text())['build'];assert isinstance(build,int) and 1<=build<=1_000_000,'Bad launcher build'
 return build

def assets(version):
 """{release asset name: local file} the Linux app needs on every release (the web ZIP and deltas too, same names as Windows)."""
 check_archive(FOLDER/ARCHIVE_NAME);build_number()
 out={ARCHIVE_NAME:FOLDER/ARCHIVE_NAME,MANIFEST_NAME:FOLDER/MANIFEST_NAME}
 if (FOLDER/APPIMAGE_NAME).exists():check_appimage(FOLDER/APPIMAGE_NAME);out[APPIMAGE_NAME]=FOLDER/APPIMAGE_NAME
 windows_release.check_web_zip(windows_release.web_zip(version),version)
 out[f'web-{version}.zip']=windows_release.web_zip(version)
 out.update(windows_release.web_deltas(version))
 return out

if __name__=='__main__':
 v=(ROOT/'VERSION').read_text().strip()
 size=check_archive(FOLDER/ARCHIVE_NAME)
 print(ARCHIVE_NAME,'OK,',f'{size/1e6:.1f} MB launcher, build',build_number(),'+ AppImage' if (FOLDER/APPIMAGE_NAME).exists() else '(no AppImage)')
 print(f'web-{v}.zip OK,',windows_release.check_web_zip(windows_release.web_zip(v),v),'files')

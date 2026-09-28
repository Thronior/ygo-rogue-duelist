"""Apply the requested 75% card-art dimensions once, with an audit manifest."""
from pathlib import Path
from PIL import Image
import json
ROOT=Path(__file__).resolve().parents[1]
manifest=ROOT/'temp/card-art-75-percent.json'
records=json.loads(manifest.read_text(encoding='utf-8')) if manifest.exists() else {}
before=after=changed=0
for folder in ['assets/cards','runtime/pics','android/web/assets/cards','ios/ShadowRun/web/assets/cards']:
 for path in (ROOT/folder).glob('*.jpg'):
  key=path.relative_to(ROOT).as_posix()
  with Image.open(path) as source:
   current=list(source.size)
   record=records.get(key)
   if record and current==record['target']:continue
   target=record['target'] if record else [max(1,round(n*.75)) for n in current]
   before+=path.stat().st_size
   resized=source.convert('RGB').resize(target,Image.Resampling.LANCZOS)
   temporary=path.with_suffix('.resize-tmp')
   resized.save(temporary,format='JPEG',quality=85,optimize=True)
  temporary.replace(path);after+=path.stat().st_size;changed+=1
  records[key]={'original':record['original'] if record else current,'target':target}
  if changed%100==0:manifest.write_text(json.dumps(records),encoding='utf-8')
manifest.write_text(json.dumps(records),encoding='utf-8')
print(f'Resized {changed} images: {before/1048576:.1f} -> {after/1048576:.1f} MiB; saved {(before-after)/1048576:.1f} MiB',flush=True)

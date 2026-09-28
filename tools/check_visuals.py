import sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
import json, urllib.request, time
from PIL import Image, ImageGrab
import desktop, visual_ui

cards=json.loads((ROOT/'data/cards.json').read_text(encoding='utf-8-sig'))
names={n for _,_,ns in desktop.CHARACTERS for n in ns}
names.update(card for _,card,_ in visual_ui.ITEMS)
jobs=[(ROOT/'assets/cards'/f'{c["id"]}.jpg',f'https://images.ygoprodeck.com/images/cards/{c["id"]}.jpg') for c in cards if c['name'] in names]
jobs += [(ROOT/'assets/packs'/f'{code}.jpg',f'https://images.ygoprodeck.com/images/sets/{code}.jpg') for code in visual_ui.PACKS]
for path,url in jobs:
    if path.exists(): continue
    try:
        path.parent.mkdir(exist_ok=True)
        with urllib.request.urlopen(url,timeout=15) as response: data=response.read()
        path.write_bytes(data)
        with Image.open(path) as im: im.verify()
        print('Cached',path.name,flush=True)
        time.sleep(.3)
    except Exception as exc: print('Missing',path.name,str(exc),flush=True)

visual_ui.enhance(desktop.Campaign)
a=desktop.Campaign(); a.save=lambda:None
errors=[]
a.report_callback_exception=lambda *args:errors.append(str(args))
a.update(); a.lift()
ROOT.joinpath('temp').mkdir(exist_ok=True)
def screenshot(name):
    a.update()
    try:
        ImageGrab.grab(bbox=(a.winfo_rootx(),a.winfo_rooty(),a.winfo_rootx()+a.winfo_width(),a.winfo_rooty()+a.winfo_height())).save(ROOT/'temp'/name)
    except OSError:
        print('Screen capture unavailable; checking Tk layout dimensions instead.',flush=True)
    assert a.winfo_width()>=1200 and a.winfo_height()>=800
screenshot('home-preview.png')
a.run=None; a.new_run(0); a.update()
before=list(a.run['selected'])
art=a.tiles[2][0].winfo_children()[0]
art.event_generate('<Button-1>'); a.update()
assert 2 in a.run['selected']
art.event_generate('<Enter>'); a.update()
assert a.preview_id==a.run['pool'][2]
art.event_generate('<Button-1>'); a.update()
assert a.run['selected']==before
a.tiles[0][0].event_generate('<Button-1>'); a.update()
assert 0 in a.run['selected']
screenshot('draft-preview.png')
visual_ui.items(a); a.update()
assert not errors,errors
print('PASS: home, draft, actual click binding, hover preview, signature lock, artifact gallery',flush=True)
a.destroy()

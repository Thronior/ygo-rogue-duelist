from pathlib import Path
from PIL import Image
import sys,shutil
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
import content,campaign
MENU=[17375316,28566710,81332143,30834988,71625222,75500286,36560997,32012841,91595718]
def generate():
    relics={campaign.BY_NAME[v['art']]['id'] for v in content.ART_INFO.values()}
    for folder,ids in [('relics',relics),('menu',MENU)]:
        output=ROOT/'assets'/folder;output.mkdir(exist_ok=True)
        for cid in ids:
            src=ROOT/'assets/cards'/f'{cid}.jpg';dest=output/f'{cid}.jpg'
            if not src.exists():
                src=ROOT/'data/menu-source'/f'{cid}.jpg';src.parent.mkdir(exist_ok=True)
                if not src.exists():shutil.copy2(dest,src)
            with Image.open(src) as im:
                w,h=im.size
                art=im.crop((round(w*.12),round(h*.192),round(w*.88),round(h*.70))).convert('RGB')
                art.thumbnail((512,512),Image.Resampling.LANCZOS);art.save(dest,quality=94)
    for slot,cid in [(31,40659562),(32,32012841),(33,62121)]:
        with Image.open(ROOT/'assets/cards'/f'{cid}.jpg') as im:
            w,h=im.size
            im.crop((round(w*.12),round(h*.192),round(w*.88),round(h*.70))).convert('RGB').save(ROOT/'assets/character-backgrounds'/f'{slot}.jpg',quality=94)
    print(f'Prepared {len(relics)} distinct relic crops and {len(MENU)} menu crops',flush=True)
if __name__=='__main__':generate()

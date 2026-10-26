from pathlib import Path
from PIL import Image
import sys,shutil,json,io
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
import content,campaign
def save_if_changed(image,dest,**options):
    # Unchanged crops keep their timestamp, so build_android does not re-copy them every sync.
    data=io.BytesIO();image.save(data,'JPEG',**options);data=data.getvalue()
    if not dest.exists() or dest.read_bytes()!=data:dest.write_bytes(data)
MENU=[3549275,17375316,28566710,81332143,30834988,71625222,75500286,23171610,32012841,91595718]
def generate():
    custom=json.loads((ROOT/'data/relic-custom-art.json').read_text())
    for key,v in content.ART_INFO.items():
        if v['art'] not in campaign.BY_NAME:
            assert key in custom and (ROOT/'assets/relics'/custom[key]).is_file(), f'Missing custom artwork: {key}'
    relics={campaign.BY_NAME[v['art']]['id'] for v in content.ART_INFO.values() if v['art'] in campaign.BY_NAME}
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
                art.thumbnail((512,512),Image.Resampling.LANCZOS);save_if_changed(art,dest,quality=94)
    for slot,cid in [(7,campaign.BY_NAME['Relinquished']['id']),(31,40659562),(32,32012841),(33,62121)]:
        with Image.open(ROOT/'assets/cards'/f'{cid}.jpg') as im:
            w,h=im.size
            save_if_changed(im.crop((round(w*.12),round(h*.192),round(w*.88),round(h*.70))).convert('RGB'),ROOT/'assets/character-backgrounds'/f'{slot}.jpg',quality=94)
    # Variant portraits reuse signature-card illustration crops, matching standard portraits.
    from character_variants import VARIANTS
    for index,row in VARIANTS.items():
        cid=campaign.BY_NAME[row['background_card']]['id']
        with Image.open(ROOT/'assets/cards'/f'{cid}.jpg') as im:
            w,h=im.size
            art=im.crop((round(w*.12),round(h*.192),round(w*.88),round(h*.70))).convert('RGB')
            art.thumbnail((512,512),Image.Resampling.LANCZOS)
            save_if_changed(art,ROOT/'assets'/row['background'],quality=90,optimize=True)
    print(f'Prepared {len(relics)} distinct relic crops and {len(MENU)} menu crops',flush=True)
if __name__=='__main__':generate()

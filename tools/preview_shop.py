import sys,uuid,random
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import frontend as ui, campaign as g, storage
base=ROOT/'temp'/('shop-preview-'+uuid.uuid4().hex);base.mkdir();storage.ROOT=base;g.SAVE=base/'run.json'
a=ui.App();a.title('Shadow Run - Shop Preview');a.geometry('1280x880');a.run=g.new_run(0,random.Random(2));g.auto_deck(a.run);a.run.update(stage='shop',round=2,gold=220,lp=6400);g.routes(a.run);g.restock(a.run,random.Random(22));ui.shop(a);a.mainloop()

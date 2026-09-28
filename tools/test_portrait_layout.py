from pathlib import Path
import sys,tkinter as tk,uuid,random
sys.path.insert(0,str(Path.cwd()))
import storage,campaign as g
storage.ROOT=Path('temp')/('layout-'+uuid.uuid4().hex);storage.ROOT.mkdir();g.SAVE=storage.ROOT/'run.json'
from artwork import Artwork
from character_view import CharacterSelect
from opponent_view import OpponentSelect
class App(tk.Tk):
 def __init__(self):
  super().__init__();self.attributes('-alpha',0);self.audio=type('Silent',(),{'effect':lambda *a:None})();self.art=Artwork(self);self.run=g.new_run(0);g.auto_deck(self.run);self.run['round']=8;g.routes(self.run)
 def home(self):pass
 def new_run(self,*a):pass
 def button(self,parent,text,command):
  b=tk.Button(parent,text=text,command=command);b.pack(fill='x',pady=6);return b
 def draft_back(self):pass
 def save(self):pass
 def launch_duel(self):pass
app=App()
for dims in [(1280,800),(1600,700),(900,700),(600,850)]:
 app.geometry('%dx%d'%dims);view=CharacterSelect(app);app.update();view.draw();app.update()
 x,y,x2,y2=view.bbox(view.begin_button and view.find_all()[-1]);assert x>=-2 and x2<=dims[0]+2 and y2<=dims[1]+2,(dims,(x,y,x2,y2))
 view.destroy();view=OpponentSelect(app);app.update();view.layout(type('Event',(),dict(width=dims[0],height=dims[1]))());app.update()
 for panel,item in view.cards:
  assert panel.winfo_width()<=dims[0]
  for child in panel.winfo_children():assert child.winfo_y()+child.winfo_height()<=panel.winfo_height()+2,(dims,child)
 print('PASS desktop layout',dims)
 view.destroy()
app.destroy()

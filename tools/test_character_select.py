import sys,uuid
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import frontend as ui,campaign as g,storage
base=ROOT/'temp'/('roster-'+uuid.uuid4().hex);base.mkdir();storage.ROOT=base;g.SAVE=base/'run.json'
a=ui.App();errors=[];a.report_callback_exception=lambda *args:errors.append(str(args));started=[];a.new_run=started.append
try:
 for resolution in ['1024x720','1280x880','1920x1080']:
  a.geometry(resolution);a.characters();a.update();scene=a.character_scene;scene.draw();a.update()
  assert len(scene.tiles)==36 and scene.unlocked=={0,1}
  for tile in scene.tiles.values():
   x,y,x2,y2=scene.bbox(tile)
   assert 0<=x<x2<=scene.winfo_width() and 0<=y<y2<=scene.winfo_height()
  for index in [0,1,2,35]:
   scene.select(index);a.update()
   assert scene.selected==index
   if index in [0,1]:scene.begin_button.invoke();assert started[-1]==index
   else:
    before=started[:];scene.begin_button.invoke();scene.begin();assert started==before
    assert str(scene.begin_button['state'])=='disabled' and scene.detail_text==g.unlock_text(index)
  assert scene.background.width()==scene.winfo_width()
  for widget in scene.widgets:
   assert 0<=widget.winfo_y() and widget.winfo_y()+widget.winfo_height()<=scene.winfo_height()
 p=storage.profile();p['unlocked']=list(range(39));storage.write(storage.ROOT/'profile.json',p)
 a.characters();a.update();a.character_scene.select(35);a.update();a.character_scene.begin_button.invoke();assert started[-1]==35
 assert not errors,errors
 print('PASS: 36 tiles, three resolutions, locked-character preview/start protection, unlocked selection and profile refresh')
finally:a.audio.close();a.destroy()

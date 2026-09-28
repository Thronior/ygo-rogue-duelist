import sys,time,tkinter as tk
from pathlib import Path
from types import SimpleNamespace
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import collection_view as cv,frontend,artwork
class App(tk.Tk):
 clear=frontend.App.clear
 button=frontend.App.button
 def home(self):self.screen='title';self.clear('Home')
a=App();a.geometry('1280x880+10000+10000');a.screen='title';a.art=artwork.Artwork(a);a.audio=SimpleNamespace(effect=lambda *x:None);errors=[];a.report_callback_exception=lambda *x:errors.append(str(x))
def pump(seconds=.3):
 end=time.perf_counter()+seconds
 while time.perf_counter()<end:a.update();time.sleep(.005)
try:
 start=time.perf_counter();cv.show(a,'Cards');elapsed=time.perf_counter()-start;pump()
 grid=cv._SHELL['grid'];total=len(grid.rows)
 assert total>1000 and 0<len(grid.tiles)<80,(total,len(grid.tiles))
 assert len(grid.images)<100 and len(grid.inflight)<=48
 initial=len(grid.tiles);grid.scroll('moveto',1);pump(.4);assert max(grid.tiles)==total-1
 assert len(grid.tiles)<80 and len(grid.images)<=128
 cv.show(a,'Cards',query='Mystical Space Typhoon');pump();assert len(grid.rows)==1 and len(grid.tiles)==1
 cv.show(a,'Cards',query='does not exist 999');pump();assert not grid.tiles
 cv.show(a,'Cards');pump();cv.show(a,'Packs');pump(.05);cv.show(a,'Cards');pump();assert len(grid.tiles)<80
 a.home();pump(.1);assert grid.closed and not errors,errors
 print(f'PASS: {total} cards, {initial} initial live tiles, open handler {elapsed*1000:.0f} ms, bounded loading/cache, bottom scroll, search, tabs and teardown')
finally:a.destroy()

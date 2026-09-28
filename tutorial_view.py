"""Shared illustrated guide displayed inside the desktop game window."""
import json,tkinter as tk
from pathlib import Path
import visual_ui as v
from artwork import ASSETS
PAGES=json.loads((Path(__file__).parent/'data/tutorial.json').read_text(encoding='utf8'))
def show(app,index=0):
 app.screen='tutorial';page=PAGES[index];app.clear('How to play',page['title'])
 nav=tk.Frame(app,bg=v.BG);nav.pack(fill='x',padx=24)
 for i,p in enumerate(PAGES):
  b=app.button(nav,str(i+1),lambda i=i:show(app,i));b.pack(side='left')
 app.button(nav,'Back to title',app.home).pack(side='right')
 panel=tk.Frame(app,bg=v.PANEL,padx=25,pady=20);panel.pack(fill='both',expand=True,padx=30,pady=18)
 app.art.label(panel,ASSETS/page['image'],(650,310),bg=v.PANEL).pack(pady=5)
 v.label(panel,page['text'],14,wraplength=900,justify='left').pack(pady=18)
 if page.get('video'):
  import webbrowser
  app.button(panel,'Watch official beginner video on YouTube (internet required)',lambda:webbrowser.open(page['video'])).pack(pady=8)


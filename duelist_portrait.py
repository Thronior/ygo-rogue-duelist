"""Shared character artwork treatment for desktop character and encounter panels."""
import tkinter as tk
from PIL import Image, ImageOps, ImageTk
from artwork import ASSETS
from content import CHARACTERS

class DuelistPortrait(tk.Canvas):
 def __init__(self,parent,index,compact=False):
  super().__init__(parent,height=120 if compact else 185,bg='#152e34',highlightthickness=1,highlightbackground='#789a9e')
  self.index=index;self.compact=compact;self.bind('<Configure>',self.draw)
 def draw(self,event=None):
  w=max(1,self.winfo_width());h=max(65,min(120 if self.compact else 185,round(w*.6)))
  if self.winfo_height()!=h:self.configure(height=h)
  with Image.open(ASSETS/'character-backgrounds'/f'{self.index}.jpg') as source:im=ImageOps.fit(source.convert('RGBA'),(w,h),Image.Resampling.LANCZOS)
  with Image.open(ASSETS/CHARACTERS[self.index]['sprite']) as source:
   sprite=source.convert('RGBA');box=sprite.getchannel('A').getbbox()
   if box:sprite=sprite.crop(box)
   sprite=ImageOps.contain(sprite,(w-6,max(1,h-8)),Image.Resampling.LANCZOS)
   im.alpha_composite(sprite,((w-sprite.width)//2,0))
  self.photo=ImageTk.PhotoImage(im,master=self);self.delete('all');self.create_image(0,0,image=self.photo,anchor='nw')
  name=CHARACTERS[self.index]['name'].upper();size=max(10,min(23,int(w/max(10,len(name)) *1.1)))
  font=('Segoe UI Black',size,'bold')
  for dx,dy in [(-1,-1),(1,-1),(-1,1),(1,1)]:self.create_text(w/2+dx,h-14+dy,text=name,font=font,fill='black')
  self.create_text(w/2,h-14,text=name,font=font,fill='white')

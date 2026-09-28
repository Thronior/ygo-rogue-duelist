"""Boss relic choices drawn inside the game window."""
import tkinter as tk
from PIL import Image,ImageOps,ImageTk
from artwork import ASSETS
from content import ARTIFACTS,ART_INFO
import campaign,cursed_relics

def show(app,done):
 app.screen='cursed-relics';app.audio.music('victory')
 for child in app.winfo_children():
  if not isinstance(child,tk.Toplevel):child.destroy()
 canvas=tk.Canvas(app,bg='#120b1a',highlightthickness=0);canvas.pack(fill='both',expand=True)
 images=[];widgets=[]
 def choose(key):
  cursed_relics.choose(app.run,key);campaign.save(app.run);done()
 def reroll():
  cursed_relics.reroll(app.run);campaign.save(app.run);draw()
 def draw(event=None):
  canvas.delete('all');images.clear()
  for widget in widgets:widget.destroy()
  widgets.clear()
  w=canvas.winfo_width();h=canvas.winfo_height()
  if w<100 or h<100:return
  with Image.open(ASSETS/'cursed-relic-background.png') as source:
   backdrop=ImageOps.fit(source.convert('RGB'),(w,h));shade=Image.new('RGB',(w,h),'#10091a');backdrop=Image.blend(backdrop,shade,.48)
  photo=ImageTk.PhotoImage(backdrop);images.append(photo);canvas.create_image(0,0,image=photo,anchor='nw')
  canvas.create_text(w/2,45,text='CHOOSE A CURSED RELIC',fill='#f4d4ff',font=('Segoe UI',24,'bold'))
  canvas.create_text(w/2,84,text='Choose 1. Its benefit and drawback last for this run.',fill='white',font=('Segoe UI',12))
  offer=app.run['cursed_offer'];cw=min(310,(w-80)/3);top=max(118,h*.21);height=min(h-215,440)
  for i,key in enumerate(offer['options']):
   x=w/2+(i-1)*(cw+18);left=int(x-cw/2);right=int(x+cw/2);bottom=int(top+height)
   region=backdrop.crop((left,int(top),right,bottom)).convert('RGBA')
   tint=Image.new('RGBA',region.size,(80,0,0,128))
   photo=ImageTk.PhotoImage(Image.alpha_composite(region,tint));images.append(photo)
   canvas.create_image(left,int(top),image=photo,anchor='nw')
   canvas.create_rectangle(left,top,right,bottom,outline='#bd7bc9',width=2)
   name,_,desc=ARTIFACTS[key]
   canvas.create_text(x,top+24,text=name,width=cw-24,fill='#ffe2a0',font=('Segoe UI',16,'bold'))
   card=campaign.BY_NAME[ART_INFO[key]['art']]
   with Image.open(ASSETS/'cards'/f'{card["id"]}.jpg') as source:
    sw,sh=source.size;art=ImageOps.fit(source.crop((sw*.12,sh*.22,sw*.88,sh*.62)),(int(cw-36),max(60,int(height*.30))))
   photo=ImageTk.PhotoImage(art);images.append(photo);canvas.create_image(x,top+54,image=photo,anchor='n')
   canvas.create_text(left+14,top+68+art.height,text=desc,width=cw-28,anchor='nw',fill='white',font=('Segoe UI',11))
   button=tk.Button(canvas,text='Choose relic',command=lambda k=key:choose(k),bg='#825194',fg='white',relief='flat',font=('Segoe UI',12,'bold'));widgets.append(button)
   canvas.create_window(x,bottom-12,window=button,width=cw-24,height=40,anchor='s')
  button=tk.Button(canvas,text='Reroll options (1 remaining)' if offer['rerolls_left'] else 'Reroll used',state='normal' if offer['rerolls_left'] else 'disabled',command=reroll,bg='#382142',fg='white',font=('Segoe UI',12),padx=24,pady=10);widgets.append(button);canvas.create_window(w/2,h-45,window=button)
 canvas.bind('<Configure>',draw);canvas.after_idle(draw)

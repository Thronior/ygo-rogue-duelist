"""Desktop-only portrait overlays, composed outside the EDOPro renderer."""
from PIL import Image,ImageOps,ImageDraw,ImageFont
from artwork import ASSETS
from content import CHARACTERS

# EDOPro drawing.cpp DrawMisc: LP frames are Resize(330,10,629,30)
# and Resize(691,10,990,30); names end at reference y=50.
# game.cpp Resize uses width/1024 and height/640 independently (DPI cancels).
REFERENCE_WIDTH=1024
REFERENCE_HEIGHT=640
LP_LEFT=330
LP_RIGHT=990
PORTRAIT_TOP=56
PORTRAIT_SIZE=96

def layout(width,height):
 width=max(1,int(width));height=max(1,int(height))
 sx=width/REFERENCE_WIDTH;sy=height/REFERENCE_HEIGHT
 size=max(1,int(PORTRAIT_SIZE*min(sx,sy)))
 top=int(PORTRAIT_TOP*sy)
 return [(int(LP_LEFT*sx),top,size,size),
         (int(LP_RIGHT*sx)-size,top,size,size)]

def portrait(index,size,enemy=False):
 c=CHARACTERS[index]
 with Image.open(ASSETS/'character-backgrounds'/f'{index}.jpg') as source:
  image=ImageOps.fit(source.convert('RGBA'),(size,size),Image.Resampling.LANCZOS)
 image.alpha_composite(Image.new('RGBA',(size,size),(7,20,29,115)))
 with Image.open(ASSETS/c['sprite']) as source:
  sprite=source.convert('RGBA');bounds=sprite.getchannel('A').getbbox()
  if bounds:sprite=sprite.crop(bounds)
  sprite=ImageOps.contain(sprite,(max(1,size-8),max(1,size-8)),Image.Resampling.LANCZOS)
  image.alpha_composite(sprite,((size-sprite.width)//2,size-sprite.height-3))
 draw=ImageDraw.Draw(image);draw.rounded_rectangle((1,1,size-2,size-2),radius=max(4,size//12),outline='#d891a5' if enemy else '#91c9e5',width=max(2,size//45))
 return image

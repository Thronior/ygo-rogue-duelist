"""Native Windows audio; no extra service or generated audio."""
import ctypes, json, random
from pathlib import Path
ROOT=Path(__file__).parent
# Reuse short existing sounds, with quieter gains for routine interactions.
CUES={'victory':('specialsummon',0.65),'confirm':('flip',0.22),'select':('flip',0.22),'purchase':('coinflip',0.38),'coinflip':('coinflip',0.38),'major':('activate',1.0),'rare-shimmer':('rare-shimmer',0.16),'pack-rare':('pack-rare',0.24)}
class Audio:
 def __init__(self,settings):self.music_context=None;self.settings=settings;self.suspended=False;self.track=None;self.music_file=None;self.previous={};self.opened=False;self.sfx_gain=1.0;self.mci=ctypes.windll.winmm.mciSendStringW
 def command(self,text):return self.mci(text,None,0,None)
 def music(self,name):
  if self.suspended:return
  if self.track==name and self.opened:return self.volume()
  self.command('close shadowmusic');self.opened=False;self.track=name
  lists=json.loads((ROOT/'assets/music/playlist.json').read_text())
  choices=lists.get(name,[name]);choices=[x for x in choices if x!=self.previous.get(name)] or choices
  self.music_file=random.choice(choices);self.previous[name]=self.music_file
  path=ROOT/'assets/music'/f'{self.music_file}.mp3'
  if path.exists() and self.settings['music']:
   self.opened=self.command(f'open "{path}" type mpegvideo alias shadowmusic')==0
   if self.opened:self.volume();self.command('play shadowmusic repeat')
 def volume(self):
  if self.suspended:return
  if self.track and not self.opened and self.settings['music']:return self.music(self.track)
  return self.command(f'setaudio shadowmusic volume to {int(self.settings["music"])*10}')
 def sound_volume(self):return self.command(f'setaudio shadowsfx volume to {round(int(self.settings["sound"])*10*self.sfx_gain)}')
 def stop(self):self.command('close shadowmusic');self.track=None;self.music_file=None;self.previous={};self.opened=False
 def effect(self,name='confirm'):
  if self.suspended:return
  if not self.settings['sound']:return
  custom=next((ROOT/'assets/sfx').glob(name+'.*'),ROOT/'assets/sfx'/f'{name}.mp3')
  name,self.sfx_gain=CUES.get(name,(name,0.35))
  folder=ROOT/'runtime/sound';files=[custom] if custom.exists() else list(folder.glob(name+'.*'))
  if not files:files=list(folder.glob('flip.wav'))
  if files:
   alias='shadowjackpot' if name=='pack-rare' else 'shadowsfx'
   self.command(f'close {alias}');self.command(f'open "{files[0]}" type mpegvideo alias {alias}');self.command(f'setaudio {alias} volume to {round(int(self.settings["sound"])*10*self.sfx_gain)}');self.command(f'play {alias}')
 def suspend(self):self.suspended=True;self.close()
 def resume(self):self.suspended=False
 def close(self):self.stop();self.command('close shadowsfx');self.command('close shadowjackpot')

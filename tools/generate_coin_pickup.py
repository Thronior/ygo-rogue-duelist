from pathlib import Path
import math,random,struct,wave
ROOT=Path(__file__).resolve().parents[1];RATE=44100;DURATION=.44
PATTERNS=[[(0,1318.51,.72),(.085,1760,.62),(.165,2637.02,.36)],[(0,1567.98,.68),(.065,2093,.57),(.145,3135.96,.30)],[(0,1174.66,.64),(.09,1760,.64),(.175,2349.32,.40)]]
def generate():
 for index,notes in enumerate(PATTERNS,1):
  rng=random.Random(25+index);samples=[0.0]*int(RATE*DURATION)
  for onset,freq,strength in notes:
   for i in range(int(onset*RATE),len(samples)):
    t=i/RATE-onset;attack=min(1.0,t/.0015)
    tone=math.sin(math.tau*freq*t)*math.exp(-t*20)+.34*math.sin(math.tau*freq*2.76*t)*math.exp(-t*42)+.12*math.sin(math.tau*freq*4.07*t)*math.exp(-t*65)
    samples[i]+=strength*attack*(tone+rng.uniform(-1,1)*.13*math.exp(-t*200))
  peak=max(map(abs,samples));frames=b''.join(struct.pack('<h',round(x/peak*.85*min(1.,(len(samples)-1-i)/(RATE*.025))*32767)) for i,x in enumerate(samples))
  name='coin-pickup'+('' if index==1 else '-'+str(index))+'.wav'
  for target in [ROOT/'runtime/sound'/name,ROOT/'android/web/sound'/name]:
   with wave.open(str(target),'wb') as output:output.setparams((1,2,RATE,len(samples),'NONE','not compressed'));output.writeframes(frames)
 print('Generated three 0.44s matched-level coin pickup sounds')
if __name__=='__main__':generate()

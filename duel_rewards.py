"""Shared, finite, small duel milestones. No character ID changes the payout."""
from collections import Counter

RULES=[]
def tiers(metric,label,steps):
 for threshold,coins in steps:RULES.append((metric,threshold,f'{label}: {threshold:,}+',coins))
# Progressive, countable milestones. Every crossed tier pays once per victorious duel.
for metric,label in [('summons','Monsters summoned'),('normal_summons','Normal Summons'),('special_summons','Special Summons'),('tribute_summons','Tribute Summons'),('normal_monsters','Normal Monsters summoned'),('effect_monsters','Effect Monsters summoned'),('sets','Cards set'),('monster_sets','Monsters set'),('spell_trap_sets','Spells/Traps set'),('battle_destroy','Enemy cards destroyed by battle'),('destroy','Enemy cards destroyed outside battle'),('destroyed_total','Enemy cards destroyed'),('spells','Spells activated'),('traps','Traps activated'),('effects','Monster effects activated'),('attacks','Attacks declared'),('banish','Cards banished')]:
 tiers(metric,label,[(1,2),(3,4),(5,6),(8,9),(12,12)])
for metric,label in [('flip_summons','Flip Summons'),('fusion','Fusion Monsters summoned'),('ritual','Ritual Monsters summoned'),('high_level','Level 5+ monsters summoned'),('level_eight','Level 8+ monsters summoned'),('unique_monsters','Different monsters summoned')]:
 tiers(metric,label,[(1,3),(2,5),(3,8),(5,12)])
for metric,label in [('races','Different monster Types summoned'),('attributes','Different Attributes summoned')]:
 tiers(metric,label,[(2,3),(3,5),(4,8),(6,15)])
for metric,label in [('damage','Damage dealt'),('effect_damage','Effect damage dealt'),('healed','LP recovered')]:
 tiers(metric,label,[(500,2),(1500,4),(3000,6),(5000,10),(8000,15)])
for metric,label in [('peak_attack','Highest face-up ATK'),('peak_defense','Highest face-up DEF')]:
 tiers(metric,label,[(2000,2),(2500,4),(3000,6),(4000,10),(5000,15)])
tiers('big_hit','Largest damage hit',[(1000,2),(2000,4),(3000,7),(4000,10),(6000,15)])
tiers('draws','Cards drawn beyond opening hand',[(2,2),(5,4),(8,6),(12,10)])
tiers('peak_field','Face-up monsters controlled at once',[(2,2),(3,4),(4,7),(5,10)])
for metric,label,coins in [('exact_lethal','Exact lethal damage',30),('untouched','Win without taking damage',8),('close_call','Win with 500 LP or less',15),('swift','Win within 4 total turns',60),('blitz','Win within 2 total turns',100),('boss_victory','Defeat a boss',10)]:RULES.append((metric,1,label,coins))
# Reproducible calibration from the 100-duel audit; unseen events keep a bounded reward.
from pathlib import Path
import json
_calibration=Path(__file__).resolve().parent/'data/reward-rarity.json'
if _calibration.exists():
 _payouts=json.loads(_calibration.read_text(encoding='utf8')).get('payouts',{})
 RULES[:]=[(m,t,l,int(_payouts.get(l,c))) for m,t,l,c in RULES]

RULES.append(('signature_played',1,'Play your signature card',10))

def metrics(run,events,by_id):
 m=Counter();summoned=set();races=set();attrs=set();known=False;spell_names=set();trap_names=set();effect_names=set();spell_types=set()
 signatures=set(run.get('guaranteed',[]))
 for e in events:
  if e.get('kind') in ('summon','activate') and e.get('card') in signatures:m['signature_played']=1
  kind=e.get('kind');card=by_id.get(e.get('card'));typ=card['data']['type'] if card else 0
  if kind=='duel_metrics':
   known=True
   for key in ('peak_attack','peak_defense','peak_field','turns'):m[key]=max(m[key],e.get(key,0))
  elif kind=='summon':
   m['summons']+=1;m[e.get('method','normal')+'_summons']+=1
   if card:
    summoned.add(card['id']);races.add(card['race']);attrs.add(card['attribute'])
    m['high_level']+=card['level']>=5;m['low_level']+=1<=card['level']<=3;m['level_eight']+=card['level']>=8
    for key,mask in [('normal_monsters',16),('effect_monsters',32),('fusion',64),('ritual',128)]:m[key]+=bool(typ&mask)
  elif kind=='activate':
   if typ&1:m['effects']+=1;effect_names.add(card['id'])
   if typ&2:
    m['spells']+=1;spell_names.add(card['id']);spell_types.add(typ&0x1f0000)
   if typ&4:m['traps']+=1;trap_names.add(card['id'])
   if typ&6:
    for key,mask in [('quick_spells',0x10000),('equip',0x40000),('field',0x80000),('continuous',0x20000),('counter',0x100000)]:m[key]+=bool(typ&mask)
  elif kind=='tribute_summons':m['tribute_summons']+=1
  elif kind=='exact_lethal':m['exact_lethal']=1
  elif kind=='damage':m['damage']+=e.get('amount',0);m['big_hit']=max(m['big_hit'],e.get('amount',0))
  elif kind in ('damage_taken','draw','recover'):m[kind]+=e.get('amount',0)
  elif kind in ('attack','battle_destroy','destroy','banish'):m[{'attack':'attacks'}.get(kind,kind)]+=1
  elif kind=='set':
   m['sets']+=1
   if card and typ&1:m['monster_sets']+=1
   if card and typ&6:m['spell_trap_sets']+=1
  elif kind=='effect_damage':m['effect_damage']+=e.get('amount',0)
 m.update(unique_monsters=len(summoned),races=len(races),attributes=len(attrs),mixed=int(m['spells']>0 and m['traps']>0),healed=m['recover'],no_spells=int(m['spells']==0),no_traps=int(m['traps']==0),no_summons=int(m['summons']==0 and m['monster_sets']==0),effect_win=int(m['effect_damage']>0))
 opening=(1 if 'rulebook' in run.get('artifacts',[]) else 5)+(1 if 'eye' in run.get('artifacts',[]) else 0)
 m['draws']=max(0,m['draw']-opening)
 m['untouched']=int(known and m['damage_taken']==0);m['close_call']=int(0<run['lp']<=500);m['healthy']=int(run['lp']>=8000)
 m['swift']=int(known and 0<m['turns']<=4);m['blitz']=int(known and 0<m['turns']<=2);m['quick']=int(known and 0<m['turns']<=6)
 m['slow_turns']=max(0,m['turns']-6)
 m['destroyed_total']=m['battle_destroy']+m['destroy']
 m['unique_activations']=len(spell_names|trap_names|effect_names)
 battle=max(0,m['damage']-m['effect_damage']);boss=(run.get('round',0)+1)%3==0
 conditions={
 'battle_and_effect':battle>0 and m['effect_damage']>0,
 'spell_and_monster':m['spells'] and m['effects'],'trap_and_monster':m['traps'] and m['effects'],
 'all_tools':m['spells'] and m['traps'] and m['effects'],
 'normal_and_effect':m['normal_monsters'] and m['effect_monsters'],
 'normal_and_special':m['normal_summons'] and m['special_summons'],
 'all_summons':m['normal_summons'] and m['special_summons'] and m['flip_summons'],
 'fusion_and_ritual':m['fusion'] and m['ritual'],'low_and_high':m['low_level'] and m['high_level'],
 'light_and_dark':{'LIGHT','DARK'}<=attrs,'four_elements':{'EARTH','WATER','FIRE','WIND'}<=attrs,
 'six_attributes':{'EARTH','WATER','FIRE','WIND','LIGHT','DARK'}<=attrs,
 'spell_variety':len(spell_types)>=3,'unique_spells':len(spell_names)>=3,'unique_traps':len(trap_names)>=2,'unique_effects':len(effect_names)>=3,
 'battle_and_removal':m['battle_destroy'] and m['destroy'],'healing_offense':m['recover']>0 and m['damage']>=3000,
 'recovery':m['damage_taken']>0 and m['recover']>=1000,'survivor':m['damage_taken']>=4000,
 'last_stand':0<run['lp']<=100,'no_special':m['summons']>0 and m['special_summons']==0,
 'normal_team':m['normal_monsters']>=3 and m['effect_monsters']==0,
 'spell_specialist':m['spells']>=5 and m['traps']==0,'trap_specialist':m['traps']>=3 and m['spells']==0,
 'monster_specialist':m['effects']>=3 and m['spells']==0 and m['traps']==0,
 'all_battle':battle>=3000 and m['effect_damage']==0,'all_effect':m['effect_damage']>=1000 and battle==0,
 'no_attacks':known and m['attacks']==0,'minimalist':m['summons']==1 and m['monster_sets']==0,
 'full_house':m['peak_field']>=5 and m['spells'] and m['traps'],
 'boss_victory':boss,'boss_untouched':boss and m['untouched'],'boss_swift':boss and m['quick'],
 'champion_victory':run.get('encore_active',False),
 'comeback_damage':m['damage_taken']>m['damage']>0,
 }
 m.update({k:int(bool(v)) for k,v in conditions.items()})
 return m

# These conditions can only be decided at victory; all other thresholds are monotonic.
VICTORY_ONLY={'untouched','close_call','healthy','swift','blitz','quick','no_spells','no_traps','no_summons','effect_win','survivor','last_stand','no_special','normal_team','spell_specialist','trap_specialist','monster_specialist','all_battle','all_effect','no_attacks','minimalist','boss_victory','boss_untouched','boss_swift','champion_victory','comeback_damage'}
def progress(run,events,by_id,victory=False):
 m=metrics(run,events,by_id)
 out={label:coins for metric,threshold,label,coins in RULES if (victory or metric not in VICTORY_ONLY) and m[metric]>=threshold}
 slow=-4*m['slow_turns']
 if slow:out['Slow duel']=slow
 return out


def score(run,events,by_id):
 m=metrics(run,events,by_id);tally={'Victory':30}
 for metric,threshold,label,coins in RULES:
  if m[metric]>=threshold:tally[label]=coins
 slow=-4*m['slow_turns']
 if slow:tally['Slow duel']=slow
 return tally,min(400,sum(tally.values()))

def show(app):
 from in_game_popup import Popup
 import tkinter as tk
 from tkinter import ttk
 import visual_ui as v
 popup=Popup(app);popup.title('Shared duel coin scorecard');popup.geometry('660x650');popup.configure(bg=v.BG)
 v.label(popup,'DUEL COIN SCORECARD',20,v.GOLD).pack(pady=12)
 v.label(popup,'Every duelist shares these conditions. Tiers stack once per duel.\nVictory: 30 coins. Each milestone: 1–4 coins. Total payout capped at 250.',10,wraplength=610).pack(pady=5)
 frame=tk.Frame(popup,bg=v.BG);frame.pack(fill='both',expand=True,padx=16,pady=12)
 tree=ttk.Treeview(frame,columns=('condition','coins','earned'),show='headings');bar=ttk.Scrollbar(frame,command=tree.yview);tree.configure(yscrollcommand=bar.set)
 for col,title,width in [('condition','Condition',420),('coins','Coins',65),('earned','Last win',80)]:tree.heading(col,text=title);tree.column(col,width=width,anchor='w')
 bar.pack(side='right',fill='y');tree.pack(fill='both',expand=True)
 earned=(app.run or {}).get('last_rewards',{})
 for _,_,label,coins in RULES:tree.insert('', 'end',values=(label,'+'+str(coins),'Earned' if label in earned else '-'))
 for label,coins in earned.items():
  if label!='Victory' and label not in {r[2] for r in RULES}:tree.insert('','end',values=(label,str(coins),'Relic / cap'))

def show_earned(app):
 """Post-victory receipt: only conditions actually earned in this duel."""
 import tkinter as tk
 from tkinter import ttk
 import visual_ui as v
 popup=tk.Frame(app,bg=v.BG,highlightbackground=v.GOLD,highlightthickness=2);popup.place(relx=.5,rely=.5,anchor='center',relwidth=.78,relheight=.85)
 v.label(popup,'VICTORY',14,v.GOLD).pack(pady=(18,4))
 from artwork import ASSETS
 amount=tk.Frame(popup,bg=v.BG);amount.pack(pady=5)
 v.label(amount,f'+{app.run.get("last_gold",0):,}',30,v.GOLD).pack(side='left')
 app.art.label(amount,ASSETS/'ui/coins.png',(38,38),bg=v.BG).pack(side='left',padx=(6,0))
 v.label(popup,f"LP: {app.run.get('last_healing',{}).get('before',app.run['lp']):,} → {app.run.get('last_healing',{}).get('after',app.run['lp']):,} after healing",12).pack(pady=5)
 for i,cid in enumerate(app.run.get('last_reward_cards') or ([app.run['last_reward_card']] if app.run.get('last_reward_card') else [])):
  import campaign as game
  loot=tk.Frame(popup,bg=v.PANEL);loot.pack(fill='x',padx=18,pady=5)
  app.art.card(loot,cid,(55,78),bg=v.PANEL).pack(side='left',padx=12)
  v.label(loot,('Victory card: ' if i==0 else 'Travel Satchel: ')+game.BY_ID[cid]['name'],13,v.GOLD).pack(side='left')
 frame=tk.Frame(popup,bg=v.BG);frame.pack(fill='both',expand=True,padx=18,pady=12)
 canvas=tk.Canvas(frame,bg=v.BG,highlightthickness=0);bar=tk.Scrollbar(frame,command=canvas.yview);canvas.configure(yscrollcommand=bar.set)
 bar.pack(side='right',fill='y');canvas.pack(fill='both',expand=True);body=tk.Frame(canvas,bg=v.BG);window=canvas.create_window(0,0,window=body,anchor='nw')
 body.bind('<Configure>',lambda e:canvas.configure(scrollregion=canvas.bbox('all')));canvas.bind('<Configure>',lambda e:canvas.itemconfigure(window,width=e.width))
 for reason,coins in app.run.get('last_rewards',{}).items():
  if not coins:continue
  row=tk.Frame(body,bg=v.PANEL,padx=18,pady=10);row.pack(fill='x',pady=3)
  v.label(row,reason,13).pack(side='left');v.label(row,f'{coins:+,}',16,v.GOLD).pack(side='right')
 app.button(popup,'Choose cursed relic' if app.run.get('cursed_offer') else 'View run summary' if app.run['stage']=='complete' else 'Open shop',popup.destroy).pack(pady=(0,15));popup.lift()
 return popup

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

# Pace bonuses stack to 205/105/70/60/50/5 coins by total turns 2/4/6/8/10/20.
RULES[:]=[(m,t,l,35 if m=='swift' else 100 if m=='blitz' else c) for m,t,l,c in RULES]
for metric,turns,coins in [('quick',6,10),('early_eight',8,10),('early_ten',10,45),('early_twenty',20,5)]:
 RULES.append((metric,1,f'Win within {turns} total turns',coins))

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
 # Going second displays the opponent's opening turn as 0, so extend every
 # turn-based coin threshold by one backend turn while keeping its label intact.
 turn_offset=int(run.get('first_player')==1)
 m['swift']=int(known and 0<m['turns']<=4+turn_offset);m['blitz']=int(known and 0<m['turns']<=2+turn_offset);m['quick']=int(known and 0<m['turns']<=6+turn_offset)
 m['early_eight']=int(known and 0<m['turns']<=8+turn_offset);m['early_ten']=int(known and 0<m['turns']<=10+turn_offset)
 m['early_twenty']=int(known and 0<m['turns']<=20+turn_offset)
 m['slow_turns']=max(0,m['turns']-10-turn_offset)
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
VICTORY_ONLY={'early_twenty','early_eight','early_ten','untouched','close_call','healthy','swift','blitz','quick','no_spells','no_traps','no_summons','effect_win','survivor','last_stand','no_special','normal_team','spell_specialist','trap_specialist','monster_specialist','all_battle','all_effect','no_attacks','minimalist','boss_victory','boss_untouched','boss_swift','champion_victory','comeback_damage'}
def pace_penalty(turns,turn_offset=0):
 """Continuous brackets: 7/turn after 10, 12/turn after 20, then +3 each decade."""
 turns=int(turns);offset=int(bool(turn_offset))
 extra=max(0,turns-10-offset);blocks,remainder=divmod(extra,10)
 return 70*blocks+15*blocks*(blocks-1)+remainder*(7+3*blocks)+2*max(0,turns-20-offset)

def progress(run,events,by_id,victory=False):
 m=metrics(run,events,by_id)
 out={label:coins for metric,threshold,label,coins in RULES if (victory or metric not in VICTORY_ONLY) and m[metric]>=threshold}
 slow=-pace_penalty(m['turns'],run.get('first_player')==1)
 if slow:out['Slow duel']=slow
 if victory and sum(out.values())<0:out['Victory minimum']=-sum(out.values())
 from custom_cards import coins
 bonus=coins(events)
 for i in range(bonus//50):out['Ancient Treasure'+(f' · {i+1}' if i else '')]=50
 return out


def score(run,events,by_id):
 m=metrics(run,events,by_id);tally={'Victory':30}
 for metric,threshold,label,coins in RULES:
  if m[metric]>=threshold:tally[label]=coins
 slow=-pace_penalty(m['turns'],run.get('first_player')==1)
 if slow:tally['Slow duel']=slow
 # Pace can remove milestone earnings, never the base victory award.
 total=sum(tally.values())
 if total<30:tally['Victory minimum']=30-total;total=30
 return tally,min(400,total)

"""Shared per-character challenge progression; missing levels remain level zero."""
import storage
DESCRIPTIONS=["No modifiers", "All enemies start with 8000 LP", "Boss curse penalties doubled; outgoing battle damage curse reduces damage to one third", "Duel coin rewards reduced by 25%", "Start with 4000 LP; between-duel healing capped at 4000 LP", "Start with a chosen curse. Curses persist through every duel; each boss adds one.", "Opponents receive a thematic combat relic"]
def highest(profile, character):
 return max(-1,min(6,int(profile.get('character_levels',{}).get(str(character),-1))))
def unlocked(profile, character):return min(6,highest(profile,character)+1)
def validate(character, level):
 level=int(level)
 if level==-1 and storage.profile().get('relicless_unlocked'):return -1
 if not 0<=level<=unlocked(storage.profile(),character):raise ValueError('Beat the previous level with this character first.')
 return level
def award(profile, run):
 level=int(run.get('challenge_level',0))
 if level<0:return
 before=highest(profile,run['character'])
 new=max(before,level)
 levels=profile.setdefault('character_levels',{})
 levels[str(run['character'])]=new
 if new>before and new+1<=6:run['level_unlocked']=new+1
def curse_scale(run):return 2 if run.get('challenge_level',0)>=2 else 1
def curse_opening_hand(run,hand):return max(1,int(hand)-2*curse_scale(run)*run.get('curses',[]).count('short_handed'))

def curse_description(run,key,default):
 if run.get('challenge_level',0)<2:return default
 return {'frailty':'Your monsters lose 400 ATK during this duel.', 'enemy_power':"The opponent's monsters gain 400 ATK.", 'hunger':'Your monsters lose 600 DEF.', 'tax':'Take 500 damage at the end of each of your turns.', 'mercy':'Your outgoing battle damage is reduced to one third.', 'drain':'Start this duel with 2000 fewer LP, minimum 1.', 'brittle':'Your monsters lose 200 ATK and 400 DEF.', 'short_handed':'Start this duel with 4 fewer cards in your hand, minimum 1.', 'exposed':'You take twice as much damage during this duel.', 'no_recovery':'You cannot recover LP during this duel.', 'mirror_stats':'Swap the original ATK and DEF of only your monsters.'}.get(key,default)

def active_modifiers(run):
 from content import CURSES
 if run.get('challenge_level')==-1:return [dict(kind='level',name='LVL -1',description='Disable all relics or curses')]
 rows=[]
 keys=run.get('curses') or ([run['boss_curse']] if run.get('boss_curse') else [])
 for key in dict.fromkeys(keys):
  if key in CURSES:
   name,desc=CURSES[key];count=keys.count(key);rows.append(dict(kind='curse',key=key,name=name+(' ×'+str(count) if count>1 else ''),description=curse_description(run,key,desc)+(' Applies '+str(count)+' times.' if count>1 else '')))
 for level in range(1,min(6,run.get('challenge_level',0))+1):
  rows.append(dict(kind='level',name='LVL '+str(level),description=DESCRIPTIONS[level]))
 from feedback_update import opponent_relic
 key=opponent_relic(run)
 if key:
  from content import ARTIFACTS
  rows.append(dict(kind='opponent-relic',id=key,name=ARTIFACTS[key][0],description=ARTIFACTS[key][2].replace('Your','Opponent’s').replace('you control','your opponent controls')))
 return rows


def suppress(run):
 """Enforce the relicless difficulty at campaign boundaries, including old saves."""
 if run.get('challenge_level')!=-1:return run
 run.update(artifacts=[],cursed_artifacts=[],curses=[],boss_curse=None,route_curses={},mirror_copy=None,starting_relic='none')
 run.pop('cursed_offer',None)
 run['shop']=[x for x in run.get('shop',[]) if x.get('kind')!='artifact']
 return run


def sync_engine_unlock(profile):
 """Derive progress from completed levels; preserve previously earned unlocks."""
 from content import CHARACTERS
 best=max((highest(profile,i) for i in range(len(CHARACTERS))),default=-1)
 profile['highest_challenge_level']=best
 if best>=5:
  profile['unlocked']=sorted(set(profile.get('unlocked',[0,1]))|{i for i,c in enumerate(CHARACTERS) if c.get('engine_deck')})

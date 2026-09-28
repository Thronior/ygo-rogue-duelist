"""Shared per-character challenge progression; missing levels remain level zero."""
import storage
DESCRIPTIONS=["No modifiers", "All enemies start with 8000 LP", "Boss curse penalties doubled; outgoing battle damage curse reduces damage to one quarter", "Duel coin rewards reduced by 25%", "Start with 4000 LP; between-duel healing capped at 4000 LP", "Take 200 damage after each player turn"]
def highest(profile, character):
 return max(-1,min(5,int(profile.get('character_levels',{}).get(str(character),-1))))
def unlocked(profile, character):return min(5,highest(profile,character)+1)
def validate(character, level):
 level=int(level)
 if not 0<=level<=unlocked(storage.profile(),character):raise ValueError('Beat the previous level with this character first.')
 return level
def award(profile, run):
 level=int(run.get('challenge_level',0));levels=profile.setdefault('character_levels',{})
 levels[str(run['character'])]=max(highest(profile,run['character']),level)
def curse_scale(run):return 2 if run.get('challenge_level',0)>=2 else 1

def curse_description(run,key,default):
 if run.get('challenge_level',0)<2:return default
 return {'frailty':'Your monsters lose 400 ATK during this boss duel.', 'enemy_power':"The boss's monsters gain 400 ATK.", 'hunger':'Your monsters lose 600 DEF.', 'tax':'Take 400 damage at the end of each of your turns.', 'mercy':'Your outgoing battle damage is reduced to one quarter.', 'drain':'Start this boss duel with 2000 fewer LP, minimum 1.'}.get(key,default)

def active_modifiers(run):
 from content import CURSES
 rows=[]
 keys=run.get('curses') or ([run['boss_curse']] if run.get('boss_curse') else [])
 for key in dict.fromkeys(keys):
  if key in CURSES:
   name,desc=CURSES[key];rows.append(dict(kind='curse',name=name,description=curse_description(run,key,desc)))
 for level in range(1,min(5,run.get('challenge_level',0))+1):
  rows.append(dict(kind='level',name='LVL '+str(level),description=DESCRIPTIONS[level]))
 return rows

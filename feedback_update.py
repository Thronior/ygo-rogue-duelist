"""Shared rules for the desktop usability and challenge-six update."""
RACE_VALUES=dict(zip(['Warrior','Spellcaster','Fairy','Fiend','Zombie','Machine','Aqua','Pyro','Rock','Winged Beast','Plant','Insect','Thunder','Dragon','Beast','Beast-Warrior','Dinosaur','Fish','Sea Serpent','Reptile','Psychic','Divine-Beast','Creator God','Wyrm','Cyberse','Illusion'],[1<<i for i in range(26)]))
ATTRIBUTE_VALUES={'EARTH':1,'WATER':2,'FIRE':4,'WIND':8,'LIGHT':16,'DARK':32,'DIVINE':64}
def nonstackable_curses(challenge_level=0):
 keys={'relic_seal','mirror_stats'}
 if challenge_level>=2:keys.add('no_recovery')
 return keys

def dedupe_curses(curses,challenge_level=0,per_encounter=False):
 unique=nonstackable_curses(challenge_level)
 if per_encounter:unique.add('mercy')
 seen=set();out=[]
 for key in curses:
  if key in unique:
   if key in seen:continue
   seen.add(key)
  out.append(key)
 return out

def draw_curses(rng,count,challenge_level=0,existing=(),distinct=False):
 from content import CURSES
 unique=nonstackable_curses(challenge_level);encounter_unique=unique|{'mercy'};blocked=set(existing) if distinct else set(existing)&unique;out=[]
 for _ in range(count):
  pool=[k for k in CURSES if (k not in encounter_unique or k not in blocked) and (not distinct or k not in blocked)]
  if not pool and not distinct:pool=[k for k in CURSES if k not in unique]
  if not pool:break
  key=rng.choices(pool,weights=[0.5 if k=='relic_seal' else 1 for k in pool],k=1)[0]
  out.append(key)
  if distinct or key in encounter_unique:blocked.add(key)
 return out
def require_type_choice(run):
 if run.get('challenge_level')!=-1 and 'dna_rewrite' in run.get('artifacts',[]) and run.get('monster_type') not in RACE_VALUES:raise ValueError('Choose a monster Type for DNA Rewrite first.')
def choose_type(run,value):
 if 'dna_rewrite' not in run.get('artifacts',[]) or run.get('monster_type') in RACE_VALUES:raise ValueError('No Type choice is pending.')
 if value not in RACE_VALUES:raise ValueError('Choose a valid monster Type.')
 run['monster_type']=value

def type_script(run):
 if 'dna_rewrite' not in run.get('artifacts',[]) or run.get('monster_type') not in RACE_VALUES:return ''
 return f'''do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD) e:SetCode(EFFECT_CHANGE_RACE)
e:SetTargetRange(LOCATION_ALL,0) e:SetTarget(function(e,c) return c:IsMonster() end)
e:SetValue({RACE_VALUES[run['monster_type']]}) Duel.RegisterEffect(e,0) end'''

def opponent_relic(run):
 if run.get('challenge_level',0)<6:return None
 if run.get('opponent_relic') and 'opponent_cards' not in run:return run['opponent_relic']
 from content import CHARACTERS,ART_INFO
 import campaign as g
 from collections import Counter
 # Use the opponent's actual deck, including opponents without playable variants.
 try:
  from content import opponent_record
  import endless
  deck=endless.encore_record(run) if run.get('encore_active') else opponent_record(run.get('round',0),run['opponent'],run.get('loop',0))
  races=Counter(g.BY_ID[c]['race'] for c in run.get('opponent_cards',deck['main']+deck.get('extra',[])) if c in g.BY_ID and g.BY_ID[c]['data']['type']&1)
 except (KeyError,IndexError,TypeError):races=Counter({CHARACTERS[run.get('opponent',0)].get('race','Spellcaster'):1})
 mapping={'Warrior':'blade','Beast-Warrior':'blade','Spellcaster':'mage','Dragon':'dragon','Winged Beast':'wing','Machine':'gear','Aqua':'shell','Fish':'shell','Sea Serpent':'shell','Dinosaur':'fossil','Reptile':'fossil','Insect':'hive','Plant':'hive','Zombie':'bone','Fairy':'halo','Beast':'fang','Fiend':'horn','Pyro':'storm_core','Thunder':'storm_core','Divine-Beast':'divine_might'}
 return mapping.get(races.most_common(1)[0][0] if races else '', 'sword')

def opponent_script(run):
 key=opponent_relic(run)
 if not key:return ''
 from content import ART_INFO
 info=ART_INFO[key];races=info['filter'].split('/') if info['filter'] else []
 if races and races[0] in ('Warrior','Beast'):races.append('Beast-Warrior')
 mask=sum(RACE_VALUES[r] for r in set(races) if r in RACE_VALUES)
 condition=f'c:IsRace({mask})' if mask else 'true'
 return f'''do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD) e:SetCode(EFFECT_UPDATE_ATTACK)
e:SetTargetRange(LOCATION_MZONE,0) e:SetTarget(function(e,c) return {condition} end)
e:SetValue({info['amount']}) Duel.RegisterEffect(e,1) end'''

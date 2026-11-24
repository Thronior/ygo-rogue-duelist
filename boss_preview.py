"""Next boss preview (Kzulu on Discord, user-approved 2026-11-15). Each stretch's boss and its curses are rolled when
the stretch starts (run start, right after a boss, each loop start) and saved as run['next_boss'], so tapping the run
progress strip can show them. routes() uses the saved boss when the boss round arrives; a boss reroll replaces it.

Solo only: Tag draws one boss per seat on its shared opponent screen, so its runs never keep a plan.
The rolls follow routes()'s own rules, only earlier: the same opponent pool for the boss round, the same curse count,
persistent LVL 6 curses, curse blocks for the boss deck (a fallen collector's in loops). The boss is kept out of the
ordinary opponents of its stretch so nobody is met twice in one loop.

At LVL 6 the first boss of a run must not repeat the curse taken in Duel 1, which is not chosen yet when the stretch
starts. The plan then keeps one roll per opening curse ('variants') and settles on the one taken after Duel 1."""
from content import BOSS_EVERY,CURSES,RUN_LENGTH,eligible_opponents

def boss_round(rd):return rd-rd%BOSS_EVERY+BOSS_EVERY-1

def active(run):return run.get('history_mode')!='tag' and not run.get('encore_active') and not run.get('secret_challenge')

def curse_count(run,rd):
 # Easy mode (2026-11-24): bosses have no curses.
 if run.get('easy') and run.get('history_mode')!='tag':return 0
 return 1 if run.get('challenge_level',0)>=6 else min(3,(rd+1)//BOSS_EVERY)+3*run.get('loop',0)

def planned(run):
 """The saved boss of this stretch, or None when there is none or it can no longer be met."""
 plan=run.get('next_boss')
 if not active(run) or not isinstance(plan,dict) or run.get('round',0)>=RUN_LENGTH:return None
 rd=boss_round(run['round']);loop=run.get('loop',0);opponent=plan.get('opponent')
 if plan.get('loop')!=loop or plan.get('round')!=rd or type(opponent) is not int:return None
 if opponent==run['character'] or opponent in run.get('defeated_opponents',[]) or opponent not in eligible_opponents(rd,loop):return None
 return plan

def fits(run,curses):
 """Whether saved boss curses still obey the rules routes() draws with (count, no repeats, persistent curses)."""
 from feedback_update import CLASHES,dedupe_curses,nonstackable_curses
 level=run.get('challenge_level',0);held=set(run.get('persistent_curses',[]))
 return (isinstance(curses,list) and len(curses)==curse_count(run,boss_round(run['round'])) and all(k in CURSES for k in curses)
  and curses==dedupe_curses(curses,level,per_encounter=True) and not set(curses)&held&nonstackable_curses(level)
  and not any(CLASHES.get(k) in held|set(curses) for k in curses))

def draw(run,opponent,rng,block,extra=()):
 """The boss's curses, drawn as routes() draws them on the boss round. block is campaign's boss_curse_block."""
 from feedback_update import draw_curses
 import fallen_collectors
 rd=boss_round(run['round']);boss=dict(run,round=rd,routes=[opponent]);fallen_collectors.add_route(boss,rng)
 return draw_curses(rng,curse_count(run,rd),run.get('challenge_level',0),list(run.get('persistent_curses',[]))+list(extra),excluded=block(boss,opponent))

def ensure_opponent(run,rng,choose,avoid=()):
 """On an ordinary round: the stretch's boss, rolled now when missing. choose is campaign's route_choices."""
 if not active(run):run.pop('next_boss',None);return None
 plan=planned(run)
 if plan:return plan
 rd=boss_round(run['round']);boss=dict(run,round=rd)
 choices=[i for i in choose(boss,rng) if i not in avoid] or choose(boss,rng)
 run['next_boss']=plan=dict(loop=run.get('loop',0),round=rd,opponent=rng.choice(choices),curses=None)
 return plan

def ensure_curses(run,rng,block):
 """On an ordinary round, after its routes: rolls the planned boss's curses, or settles the LVL 6 opening variant."""
 plan=planned(run)
 if not plan:return
 if run.get('challenge_level')==-1:plan.update(curses=[]);plan.pop('variants',None);return
 variants=plan.pop('variants',None)
 if variants is not None and run.get('persistent_curses'):plan['curses']=variants.get(','.join(run['persistent_curses']))
 elif variants is not None:plan['variants']=variants;return
 if plan.get('curses') is not None and fits(run,plan['curses']):return
 if run['round']==0 and not run.get('loop') and run.get('challenge_level',0)>=6 and not run.get('persistent_curses'):
  # Duel 1's curse is one of the opening routes' curses: keep the boss roll that goes with each of them.
  plan['curses']=None
  plan['variants']={','.join(c):draw(run,plan['opponent'],rng,block,extra=c) for c in (run.get('route_curses') or {}).values() if c}
  if plan['variants']:return
  plan.pop('variants')
 plan['curses']=draw(run,plan['opponent'],rng,block)

def record(run):
 """On the boss round: the boss and curses routes() settled on (the plan, or a reroll's new boss)."""
 if not active(run) or not run.get('routes'):run.pop('next_boss',None);return
 opponent=run['routes'][0]
 run['next_boss']=dict(loop=run.get('loop',0),round=run['round'],opponent=opponent,curses=list((run.get('route_curses') or {}).get(str(opponent),[])))

def ensure(run,rng,choose,block):
 """Saves from before the preview (and any run that lost its plan) roll it on load. True when the run changed."""
 if not active(run) or run.get('stage') not in ('draft','shop') or run.get('round',0)>=RUN_LENGTH:return False
 plan=planned(run);before=repr(run.get('next_boss'))
 if (run['round']+1)%BOSS_EVERY==0:
  if not (plan and run.get('routes') and plan['opponent']==run['routes'][0] and plan.get('curses') is not None):record(run)
 else:
  ensure_opponent(run,rng,choose,avoid=run.get('routes') or ())
  ensure_curses(run,rng,block)
 return repr(run.get('next_boss'))!=before

"""Saved boss draws and run-wide reroll prices."""
import random

def price(run):
 n=max(0,int(run.get('boss_rerolls',0)))
 return [30,50][n] if n<2 else 100+50*(n-2)

def reroll(game,run,rng=random):
 if run.get('stage') not in ('draft','shop') or (run['round']+1)%3 or run.get('cursed_offer'):
  raise ValueError('Boss rerolls are only available before a boss duel.')
 cost=price(run)
 if run['gold']<cost:raise ValueError('Not enough coins to reroll the boss.')
 old=run.get('routes',[])[:]
 game.routes(run,rng)
 # Prefer a different boss; eligibility still comes from the shared route rules.
 for _ in range(12):
  if run['routes']!=old:break
  game.routes(run,rng)
 run['gold']-=cost;run['boss_rerolls']=run.get('boss_rerolls',0)+1
 return cost


def reveal(run,opponent):
 import approved_relics as ar
 opponent=int(opponent)
 if run.get('stage') not in ('draft','shop') or opponent not in run.get('routes',[]):raise ValueError('Choose an available opponent.')
 known=run.setdefault('revealed_opponents',[])
 if opponent in known or ar.has(run,'deck_spyglass') or (run['round']+1)%3==0:return 0
 if run['gold']<15:raise ValueError('Not enough coins to reveal this opponent.')
 run['gold']-=15;known.append(opponent)
 return 15

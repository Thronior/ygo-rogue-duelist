"""Shared unlock observations; reads results without modifying duel gameplay."""
from collections import Counter
import duel_rewards

def observe(profile,run):
 profile['packs_variety']=max(profile.get('packs_variety',0),len(set(run.get('bought_pack_ids',[]))))
 profile['relic_variety']=max(profile.get('relic_variety',0),len(set(run.get('artifacts',[]))))
 # Per-run watermark makes repeated saves/profile refreshes idempotent.
 purchased=run.get('singles_bought',0)
 profile['singles_bought']=profile.get('singles_bought',0)+max(0,purchased-run.get('credited_singles',0))
 run['credited_singles']=purchased
 for key in run.get('character_challenges',[]):profile[key]=1
 if run.get('secret_challenge') and run.get('encore_won'):
  profile['relicless_unlocked' if run.get('secret_challenge')=='relicless' else 'gallery_unlocked']=True
 if not run.get('secret_challenge') and run.get('stage')=='complete' and not run.get('card_purchases',run.get('purchased',0)):
  profile['frugal_run']=1
 if not run.get('secret_challenge') and run.get('stage')=='complete' and not run.get('relics_bought',0):
  profile['relicless_shop']=1

def duel(game,run,result,won,boss):
 cards=[game.BY_ID[c] for c in game.deck(run) if not game.is_extra(c)]
 metrics=duel_rewards.metrics(run,result.get('events',[]),game.BY_ID)
 conditions={
  'six_attributes':{'LIGHT','DARK','FIRE','WATER','WIND','EARTH'}<=set(c.get('attribute') for c in cards if c['data']['type']&1),
  'tribute_roster':sum(c.get('level',0)>=5 and bool(c['data']['type']&1) for c in cards)>=6,
  'ten_thousand_lp':result['lp']>=10000,
  'singleton_win':bool(cards) and len({c['id'] for c in cards})==len(cards),
  'clutch_boss':boss and 0<result['lp']<=500,
  'two_rituals':metrics['ritual']>=2,
  'five_banished':any(e.get('kind')=='duel_metrics' and e.get('banished_count',0)>=5 for e in result.get('events',[])),
  'fusion_win':metrics['fusion']>0,
  'sixty_win':len(cards)==60,
  'normal_win':bool(cards) and all(c['data']['type']&1 and c['data']['type']&16 for c in cards),
  'champion_win':bool(run.get('encore_active')),
 }
 run['character_challenges']=sorted(set(run.get('character_challenges',[]))|{k for k,v in conditions.items() if v and (won or k=='two_rituals')})

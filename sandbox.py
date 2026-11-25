"""Sandbox duels (survey answers, 2026-11-25): any deck against any CPU deck, with relics for both sides.

The client keeps the duel to itself (mobile.js `sandbox`, like the tutorial duel): no run, response, result, stat,
replay, coin or achievement is written. This module only builds the duel's relic scripts, the same way Draft Duels
do (draft_relics.duel_setup), and the list of relics the sandbox offers (shipped in content.json as sandboxRelics)."""
import json, random, re
import content, passives, approved_relics as ar, relic_fusions, draft_relics

# Relics per side. Duplicates are not offered.
LIMIT=30
AI_LINE=re.compile(r'^-- SHADOW_RUN_AI .*$\n?',re.M)
# passives.script's coin-toss lines: the player (seat 0) loses their first turn, so the CPU starts.
CPU_FIRST='''-- Coin toss: opponent starts
Duel.SkipPhase(0,PHASE_DRAW,RESET_PHASE+PHASE_END,1)
Duel.SkipPhase(0,PHASE_STANDBY,RESET_PHASE+PHASE_END,1)
Duel.SkipPhase(0,PHASE_END,RESET_PHASE+PHASE_END,1)
Duel.SkipPhase(0,PHASE_MAIN1,RESET_PHASE+PHASE_END,1)
Duel.SkipPhase(1,PHASE_BATTLE,RESET_PHASE+PHASE_END,1)'''

def relics():
 """Every Draft Duel relic plus the fused relics whose script changes a duel (user, 2026-11-25: "Draft list + fused").
 Shop, coin and deck-building relics stay out: they do nothing in a single duel."""
 keys=list(draft_relics.eligible())
 # Blank lines don't count: Bottomless Purse and Grand Bazaar (coins and shop only) add nothing else to the script.
 strip=lambda s:'\n'.join(l for l in AI_LINE.sub('',s).splitlines() if l.strip())
 base=draft_relics._base(0);plain=strip(passives.multiplayer_script(base,1))
 for key in sorted(relic_fusions.KEYS):
  info=content.ART_INFO.get(key)
  if key in keys or not info or key in ar.REMOVED or key in ar.CHOICE_RELICS or key in draft_relics.NOT_IN_DUEL or info.get('tag')=='economy':continue
  if info.get('effect')=='opening' or strip(passives.multiplayer_script(dict(base,artifacts=[key]),1))!=plain:keys.append(key)
 return keys

def _relics(value,allowed):
 out=[]
 for key in value or []:
  if isinstance(key,str) and key in allowed and key not in out:out.append(key)
 return out[:LIMIT]

def _deck(value):
 import campaign as g
 deck=value if isinstance(value,dict) else {}
 return {zone:[int(c) for c in deck.get(zone,[]) if isinstance(c,int) and c in g.BY_ID][:200] for zone in ('main','extra')}

def duel_setup(value):
 """value: relics (two lists of keys, [player, CPU]), characters, decks ({main, extra}), seed and first (0: the
 player starts, 1: the CPU starts). Returns the passives script and both opening-hand sizes."""
 allowed=set(value.get('allowed') or relics())
 picked=[_relics(value['relics'][side],allowed) for side in (0,1)]
 decks=[_deck(value['decks'][side]) for side in (0,1)]
 seed=int(value['seed']);first=1 if value.get('first')==1 else 0
 setup=draft_relics.duel_setup(dict(relics=picked,characters=value['characters'],decks=decks,seed=seed))
 # One AI line for the CPU, built for the player's seat like the campaign's (passives.ai_modifiers): statRelics and
 # activeRelics are [player's, CPU's]. Draft's per-side lines would tell the CPU its own relics are the player's.
 sides=[]
 for side in (0,1):
  others=[a for a in picked[side] if a not in ('magic_mirror','blank_relic')]
  mirror=random.Random(f"{seed}:{side}").choice(others) if 'magic_mirror' in picked[side] and others else None
  sides.append((picked[side],mirror))
 run=draft_relics._base(value['characters'][0]);run.update(artifacts=sides[0][0],mirror_copy=sides[0][1],first_player=first)
 ai=passives.ai_modifiers(run)
 rival=[a for a in sides[1][0] if a!='magic_mirror']+([sides[1][1]] if sides[1][1] else [])
 ai['statRelics'][1]=[dict(content.ART_INFO[key],key=key) for key in rival]
 ai['activeRelics'][1]=rival
 ai['firstPlayer']=first
 body=AI_LINE.sub('',setup['passives']).replace('-- SHADOW_RUN_RNG 2\n','',1).replace('-- SHADOW_RUN_RNG 2','',1)
 lines=['-- SHADOW_RUN_RNG 2','if Duel.EnableRogueAntiStreak then Duel.EnableRogueAntiStreak() end','-- SHADOW_RUN_AI '+json.dumps(ai)]
 if first==1:lines.append(CPU_FIRST)
 if body.strip():lines.append(body)
 return {'passives':'\n'.join(lines),'draw':setup['draw'],'enemyDraw':setup['enemyDraw'],'relics':picked}

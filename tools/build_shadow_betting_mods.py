"""Shadow Betting character upgrades data: android/web/idle-bets-mods.json

For every CPU character with a deck in the minigame (content.json cpuWatchDecks):
  card    their signature card: the first of the character's signature cards (content characters[].cards) that is in
          one of their CPU Main Decks, else the strongest monster of those decks. Bought, the character starts each
          duel with it in hand (a Field Spell goes face-up to the Field Zone).
  relics  3 relics: their own starting relic when it acts in a duel, then the relics whose cards best match their CPU
          decks (relic_affinity.details), from the Draft pool (draft_relics.eligible, which already leaves out relics
          that only work outside duels); shadow relics are left out.
  curses  3 curses they put on their opponents, matched to their decks' style (beatdown, burn, defence, Normal
          Summons), from the curses that act inside a duel.
Each relic and curse carries its duel script for either seat (passives.multiplayer_script, as Draft builds them),
so the duel worker, which has no Python, only joins strings.

Usage (from the repository root): python/python.exe -B tools/build_shadow_betting_mods.py
"""
import json,re,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g, content, passives, draft_relics as dr, relic_affinity as ra, approved_relics as ar

WEB=ROOT/'android/web';OUT=WEB/'idle-bets-mods.json'
meta=json.loads((WEB/'content.json').read_text(encoding='utf8'))
chars={str(i):c for i,c in enumerate(meta['characters'])};chars.update(meta.get('cpuWatchOpponents') or {})
decks=meta['cpuWatchDecks']
BY_NAME={}
for cid,c in g.BY_ID.items():BY_NAME.setdefault(c['name'],cid)
strip=lambda s:re.sub(r'-- SHADOW_RUN_AI .*','',s)
rules=lambda s:'\n'.join(passives.duel_rules(s))

def base_run(cid,cards):
 run=dr._base(cid if int(cid)<len(meta['characters']) else 0)
 run.update(pool=list(cards),selected=list(range(len(cards))))
 return run

# ---- relic candidates: the Draft pool, minus shadow relics ----
pool=[k for k in dr.eligible() if not k.startswith('cursed_') and k!='rulebook']
# ---- curses that act inside a duel (their script differs from none); Withering Soul is LP, set by the worker ----
plain=strip(passives.multiplayer_script(dr._base(0),0))
CURSES=[k for k in content.CURSES if k!='relic_mirror' and (k=='drain' or strip(passives.multiplayer_script(dict(dr._base(0),curses=[k]),0))!=plain)]
STYLE={'beatdown':['enemy_power','frailty','exposed','shield_breaker','brittle','hunger'],
 'burn':['tax','no_recovery','rain_of_mercy','fireproof_vest'],
 'defence':['mercy','tax','drain'],
 'normal':['no_specials','shield_breaker'],
 'general':['spell_jammer','trap_jammer','monster_jammer','hand_limiter','drain','miller','relic_seal']}
BURN=re.compile(r'inflict \d* ?damage|inflicts? \d+ damage|damage equal to',re.I)

SPECIAL=re.compile(r'Special Summon',re.I)
def style_scores(cards,extra):
 known=[g.BY_ID[c] for c in cards if c in g.BY_ID];n=max(1,len(known))
 mons=[c for c in known if c.get('atk') is not None]
 atk=sum(1 for m in mons if (m.get('atk') or 0)>=1800)/n
 burn=sum(1 for c in known if BURN.search(c.get('desc','')))/n
 deff=sum(1 for m in mons if (m.get('defense') or 0)>(m.get('atk') or 0)+300)/n
 special=sum(1 for c in known if SPECIAL.search(c.get('desc','')))/n
 # Normal Summon decks: no Extra Deck and almost nothing that Special Summons.
 normal=1.0 if not extra and special<.05 else 0
 return {'beatdown':atk*3,'burn':burn*6,'defence':deff*4,'normal':normal,'general':.45}

def pick_curses(cid,cards,extra):
 """One curse from each of the deck's three strongest styles; within a style the pick turns with the character, so
 similar decks do not all get the same three."""
 sc=style_scores(cards,extra);picked=[]
 for style,score in sorted(sc.items(),key=lambda kv:(-kv[1],kv[0])):
  options=[k for k in STYLE[style] if k in CURSES and k not in picked]
  if options:picked.append(options[int(cid)%len(options)])
  if len(picked)==3:break
 for k in STYLE['general']:
  if len(picked)>=3:break
  if k in CURSES and k not in picked:picked.append(k)
 return picked

def signature(cid,mains):
 """The signature card in the most of the character's CPU Main Decks (their own signature cards first; else their
 strongest monster that the most decks share), so "starts with it" works in as many of their duels as possible."""
 names=(chars.get(cid) or {}).get('cards') or []
 cover=lambda code:sum(1 for m in mains if code in m)
 sig=[BY_NAME.get(n) for n in names if BY_NAME.get(n)]
 best=max(sig,key=lambda c:(cover(c),-sig.index(c)),default=None)
 if best and cover(best):return best
 inside=set(c for m in mains for c in m)
 mons=[c for c in inside if c in g.BY_ID and (g.BY_ID[c].get('atk') is not None)]
 return max(mons,key=lambda c:(cover(c),g.BY_ID[c].get('atk') or 0,-c)) if mons else None

out={'chars':{},'relics':{},'curses':{}}
for cid,records in decks.items():
 mains=[r.get('main',[]) for r in records if r and r.get('main')]
 if not mains or cid not in chars:continue
 cards=sorted(set(c for m in mains for c in m)|set(c for r in records if r for c in r.get('extra',[])))
 run=base_run(cid,cards)
 start=(chars.get(cid) or {}).get('starting_relic')
 fit=ra.details(pool,run)
 ranked=sorted((k for k in pool if fit[k][0] and fit[k][1]>0),key=lambda k:(-fit[k][1],k))
 relics=([start] if start in pool else [])+[k for k in ranked if k!=start]
 relics=relics[:3]
 if len(relics)<3:relics+=[k for k in pool if k not in relics][:3-len(relics)]
 for k in relics:
  key=f'{k}@{cid}'
  r=dict(run,artifacts=[k])
  out['relics'][key]={'relic':k,'name':content.ARTIFACTS[k][0],'text':content.ARTIFACTS[k][2],'art':(content.ARTIFACTS[k][0]+'.png') if (WEB/'assets/relics'/(content.ARTIFACTS[k][0]+'.png')).exists() else '','artCard':BY_NAME.get(str(content.ART_INFO[k].get('art','')).rsplit('.',1)[0]) or 0,
   's':[rules(passives.multiplayer_script(r,0)),rules(passives.multiplayer_script(r,1))]}
 code=signature(cid,mains)
 out['chars'][cid]={'card':code,'cardName':g.BY_ID[code]['name'] if code else '','field':bool(code and g.BY_ID[code].get('race')=='Field' and 'Spell' in str(g.BY_ID[code].get('type'))),'relics':[f'{k}@{cid}' for k in relics],'curses':pick_curses(cid,cards,[c for r in records if r for c in r.get('extra',[])])}
for k in CURSES:
 r=dict(dr._base(0),curses=[k])
 out['curses'][k]={'name':content.CURSES[k][0],'text':content.CURSES[k][1],
  's':['','']} if k=='drain' else {'name':content.CURSES[k][0],'text':content.CURSES[k][1],'s':[rules(passives.multiplayer_script(r,0)),rules(passives.multiplayer_script(r,1))]}
OUT.write_text(json.dumps(out,ensure_ascii=False,separators=(',',':')),encoding='utf8')
print(f"{len(out['chars'])} characters, {len(out['relics'])} relic scripts, {len(out['curses'])} curses -> {OUT} ({OUT.stat().st_size//1024} KB)")

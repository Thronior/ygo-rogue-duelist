"""Shadow Betting character upgrades data: android/web/idle-bets-mods.json

For every CPU character with a deck in the minigame (content.json cpuWatchDecks):
  card    their signature card: the first of the character's signature cards (content characters[].cards) that is in
          one of their CPU Main Decks, else the strongest monster of those decks. Bought, the character starts each
          duel with it in hand (a Field Spell goes face-up to the Field Zone).
  relics  3 relics tailored to the deck's plan (user, 2026-11-26: "really tailor the relics to each deck and strategy
          and make shadow relics possible ... Arthur should have relics that help him draw and stall so he can build
          Exodia"): a core relic (their own starting relic, else the Type / archetype relic most of their monsters
          fit), a relic for their deck's strategy (Exodia, burn, stall, beatdown, big tributes, small monsters, Normal
          Monsters, Fusion, Ritual, equips, Field Spells, tokens, coins and dice, removal) and a shadow relic for that
          strategy. All from the Draft pool (draft_relics.eligible: relics that act inside duels).
  curses  3 curses they put on their opponents, matched to their decks' style (beatdown, burn, defence, Normal
          Summons), from the curses that act inside a duel.
Each relic and curse carries its duel script for either seat (passives.multiplayer_script, as Draft builds them),
so the duel worker, which has no Python, only joins strings.

Usage (from the repository root): python/python.exe -B tools/build_shadow_betting_mods.py
Simulated picks: python/python.exe -B tools/build_shadow_betting_mods.py --candidates <file>, then
  runtime/ai/node.exe android/idle_bets_pick_mods.mjs android/web <file> tools/shadow-betting-mod-picks.json
  then the plain build again; it ships each character's best combination from that file.
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

# ---- relic candidates: the Draft pool (shadow relics too); relics that count across duels or add pool cards stay out ----
pool=[k for k in dr.eligible() if k not in ('rulebook','final_hour','cursed_ritual_scar','cursed_ominous_clock','cursed_narrow_gate','cursed_reversed_remedy','cursed_mulligans_offer')]
# Strategy -> (relics, shadow relics), best first. Scores come from the deck's cards (strategy_scores).
STRATS={
 'exodia':(['eye','buckler','phoenix_rebirth','spring'],['cursed_defense_proficiency','cursed_nocturnal_guard','cursed_brittle_armor']),
 'burn':(['static_coil','flame','prism'],['cursed_scorched_clock','cursed_hollow_chalice']),
 'stall':(['buckler','phoenix_rebirth','spring','protect_the_weak'],['cursed_brittle_armor','cursed_nocturnal_guard','cursed_defense_proficiency']),
 'beatdown':(['sword','pierce','desperate'],['cursed_blood_crown','cursed_berserkers_pact','cursed_zombies_bargain','cursed_cracked_sword','cursed_duelists_wager']),
 'tribute':(['tribute','tribute_free','boss_monster'],['cursed_giants_oath','cursed_anime_rule_3']),
 'small':(['small','village_banner','kindred_bond'],['cursed_ashen_nursery','cursed_conscription_drum']),
 'normals':(['normal','epitaph','normal_barrier','tenacity_of_the_weak'],['cursed_commoners_chain']),
 'fusion':(['fusion_time'],['cursed_fusion_fever']),
 'ritual':(['ten_thousand_hands','ritual_incense'],['cursed_iron_silence']),
 'equip':(['armory_crest'],['cursed_warriors_vow']),
 'field':(['terraforming_relic','field_amplifier'],['cursed_anime_rule_3']),
 'token':(['token_regiment','token_resonance','token_martyrs'],['cursed_conscription_drum']),
 'gamble':(['lets_go_gambling'],['cursed_jesters_coin','cursed_graceful_skull_dice','cursed_poison_of_the_old_man']),
 'control':(['arcane_resonance','returning_tide'],['cursed_anime_rule_2']),
 'empty_hand':(['last_word','inkwell'],['cursed_empty_hand_pact']),
}
# Broad relics are strategy picks, not a deck's core (they fit almost anything).
BROAD={k for a,b in STRATS.values() for k in a+b}|{'eclipse','menagerie','pendulum','solo','echo_glass','traps_no_more','spells_no_more','sword_and_shield','the_creator','loyalty','stand_tall','sacrifice_the_weak','fire_extinguisher','hot_deck','third_gate','exile_standard','waning_star','this_life_mine','token_defender','restless_stone'}|{k for k in pool if k.startswith(('attribute_','cursed_'))}
ORBS={'ember','tide','gale','earth','light','dark'}
EXODIA=re.compile(r'Forbidden One|Exodia')
COIN=re.compile(r'toss a coin|coin toss|roll a (?:six-sided )?die|dice roll',re.I)
REMOVAL=re.compile(r'destroy (?:1|one|all|up to|that|the target|target)',re.I)
def strategy_scores(cards,extra):
 known=[g.BY_ID[c] for c in cards if c in g.BY_ID];n=max(1,len(known))
 mons=[c for c in known if c.get('atk') is not None];nm=max(1,len(mons))
 spells=[c for c in known if 'Spell' in str(c.get('type'))];traps=[c for c in known if 'Trap' in str(c.get('type'))]
 desc=lambda c:c.get('desc','') or ''
 lv=lambda c:c.get('level') or 0
 frac=lambda xs,f,d:sum(1 for c in xs if f(c))/d
 fusions=sum(1 for c in extra if c in g.BY_ID and 'Fusion' in str(g.BY_ID[c].get('type')))
 return {
  'exodia':10 if sum(1 for c in known if EXODIA.search(c.get('name','')))>=3 else 0,
  'burn':frac(known,lambda c:BURN.search(desc(c)),n)*6,
  'stall':frac(mons,lambda c:(c.get('defense') or 0)>(c.get('atk') or 0)+300,nm)*3+frac(known,lambda c:re.search(r'gain \d+ (?:LP|Life Points)|cannot attack|negate the attack',desc(c),re.I),n)*4,
  'beatdown':frac(mons,lambda c:(c.get('atk') or 0)>=1800,nm)*2.2,
  'tribute':frac(mons,lambda c:lv(c)>=5 and 'Fusion' not in str(c.get('type')),nm)*2.4,
  'small':frac(mons,lambda c:0<lv(c)<=3,nm)*2.2,
  'normals':frac(mons,lambda c:c.get('type')=='Normal Monster',nm)*2,
  'fusion':min(1.6,fusions/10+frac(known,lambda c:'Polymerization' in c.get('name','') or 'Fusion Summon' in desc(c),n)*8),
  'ritual':frac(known,lambda c:'Ritual' in str(c.get('type')) or c.get('race')=='Ritual',n)*12,
  'equip':frac(spells,lambda c:c.get('race')=='Equip',max(1,len(spells)))*1.6,
  'field':frac(spells,lambda c:c.get('race')=='Field',max(1,len(spells)))*5,
  'token':frac(known,lambda c:'Token' in desc(c),n)*8,
  'gamble':frac(known,lambda c:COIN.search(desc(c)),n)*10,
  'control':frac(spells+traps,lambda c:REMOVAL.search(desc(c)),max(1,len(spells)+len(traps)))*1.4,
  'empty_hand':0,
 }
def pick_relics(cid,cards,extra,run,start,exodia_share):
 sc=strategy_scores(cards,extra);sc['exodia']=10 if exodia_share>=.5 else 0# Exodia in at least half their decks
 sc=dict(sc);order=[s for s,v in sorted(sc.items(),key=lambda kv:(-kv[1],kv[0])) if v>.15] or ['beatdown']
 picked=[]
 if sc['exodia']:# draw and stall until the five pieces are in hand
  return [k for k in ['eye','buckler','cursed_defense_proficiency'] if k in pool]
 # core: their own starting relic, else the Type / Attribute / archetype relic most of their monsters fit
 fit=ra.details(pool,run);mons=max(1,sum(1 for c in cards if c in g.BY_ID and g.BY_ID[c].get('atk') is not None))
 core=[k for k in pool if k not in BROAD and fit[k][0] and fit[k][1]/mons>=(.55 if k in ORBS else .3)]
 core.sort(key=lambda k:(-fit[k][1]/mons*(.7 if k in ORBS else 1),k))
 if start in pool:picked.append(start)
 elif core:picked.append(core[0])
 for s in order:# the strongest strategy that still has a plain relic left
  k=next((k for k in STRATS[s][0] if k in pool and k not in picked),None)
  if k:picked.append(k);break
 shadows=[k for s in order[:2] for k in STRATS[s][1] if k in pool and k not in picked]
 if shadows:picked.append(shadows[int(cid)%min(2,len(shadows))])
 for k in [*core,*(k for s in order for k in STRATS[s][0])]:# fill up
  if len(picked)>=3:break
  if k in pool and k not in picked:picked.append(k)
 return picked[:3],order[:3]
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

# ---- candidates and simulated picks (user, 2026-11-26: "emulate duels with each character with 10 different
# combinations and keep the ones that gave the most of an increase in winrate (across the same seeds)") ----
# --candidates PATH writes each character's candidate relics, curses and signature cards, 10 combinations (the first
# is the strategy pick above) and every duel script; android/idle_bets_pick_mods.mjs plays them all on the same seeds
# and writes PICKS; the normal build then ships each character's winning combination.
PICKS=ROOT/'tools/shadow-betting-mod-picks.json'
def sig_candidates(cid,mains,exo):
 """Signature cards in at least half of the character's decks: their own signature cards first (only when the decks
 really play them: Arthur's anime Blue-Eyes is not in his Exodia decks), the Exodia head for Exodia decks, then the
 monsters most decks share, strongest first."""
 cover=lambda code:sum(1 for m in mains if code in m);half=len(mains)/2
 names=(chars.get(cid) or {}).get('cards') or []
 own=[BY_NAME.get(n) for n in names if BY_NAME.get(n)]
 inside=set(c for m in mains for c in m)
 mons=sorted((c for c in inside if c in g.BY_ID and g.BY_ID[c].get('atk') is not None),key=lambda c:(-cover(c),-(g.BY_ID[c].get('atk') or 0),c))
 out=[c for c in own if cover(c)>=half]
 if exo>=.5:out+=[c for c in inside if c in g.BY_ID and g.BY_ID[c]['name']=='Exodia the Forbidden One']
 out+=[c for c in mons if cover(c)>=half]
 if not out:out=mons[:1]
 seen=[];[seen.append(c) for c in out if c not in seen]
 return seen[:4]
def relic_candidates(cid,cards,extra,run,start,exo,heur):
 sc=strategy_scores(cards,extra);order=[s for s,v in sorted(sc.items(),key=lambda kv:(-kv[1],kv[0])) if v>.15] or ['beatdown']
 fit=ra.details(pool,run);mons=max(1,sum(1 for c in cards if c in g.BY_ID and g.BY_ID[c].get('atk') is not None))
 core=sorted((k for k in pool if k not in BROAD and fit[k][0] and fit[k][1]/mons>=(.55 if k in ORBS else .3)),key=lambda k:(-fit[k][1]/mons*(.7 if k in ORBS else 1),k))
 c=list(heur)+([start] if start in pool else [])+core[:3]
 if exo>=.5:c+=STRATS['exodia'][0][:3]+STRATS['exodia'][1][:2]
 for s in order[:3]:c+=[k for k in STRATS[s][0] if k in pool][:2]
 for s in order[:2]:c+=[k for k in STRATS[s][1] if k in pool][:2]
 seen=[];[seen.append(k) for k in c if k in pool and k not in seen]
 return seen[:10]
def curse_candidates(cid,cards,extra,heur):
 sc=style_scores(cards,extra);c=list(heur)
 for style,_ in sorted(sc.items(),key=lambda kv:(-kv[1],kv[0]))[:3]:c+=STYLE[style]
 c+=STYLE['general']
 seen=[];[seen.append(k) for k in c if k in CURSES and k not in seen]
 return seen[:7]
def combos(cid,rc,cc,sc,heur_r,heur_c):
 import random
 rng=random.Random('shadow-betting-mods-'+cid)
 first=(tuple(heur_r),tuple(heur_c),sc[0] if sc else 0)
 out=[first];tries=0
 while len(out)<10 and tries<500:
  tries+=1
  c=(tuple(rng.sample(rc,min(3,len(rc)))),tuple(rng.sample(cc,min(3,len(cc)))),rng.choice(sc) if sc else 0)
  if c not in out:out.append(c)
 return [[list(a),list(b),cd] for a,b,cd in out]
def relic_entry(k,run):
 r=dict(run,artifacts=[k])
 return {'relic':k,'shadow':k.startswith('cursed_'),'name':content.ARTIFACTS[k][0],'text':content.ARTIFACTS[k][2],'art':(content.ARTIFACTS[k][0]+'.png') if (WEB/'assets/relics'/(content.ARTIFACTS[k][0]+'.png')).exists() else '','artCard':BY_NAME.get(str(content.ART_INFO[k].get('art','')).rsplit('.',1)[0]) or 0,
  's':[rules(passives.multiplayer_script(r,0)),rules(passives.multiplayer_script(r,1))]}
is_field=lambda code:bool(code and g.BY_ID[code].get('race')=='Field' and 'Spell' in str(g.BY_ID[code].get('type')))

import argparse
ap=argparse.ArgumentParser();ap.add_argument('--candidates',type=Path);args=ap.parse_args()
picks=json.loads(PICKS.read_text(encoding='utf8')) if PICKS.exists() and not args.candidates else {}
out={'chars':{},'relics':{},'curses':{}};cand={'chars':{},'relics':{}}
for cid,records in decks.items():
 mains=[r.get('main',[]) for r in records if r and r.get('main')]
 if not mains or cid not in chars:continue
 cards=sorted(set(c for m in mains for c in m)|set(c for r in records if r for c in r.get('extra',[])))
 run=base_run(cid,cards)
 start=(chars.get(cid) or {}).get('starting_relic')
 extra=[c for r in records if r for c in r.get('extra',[])]
 exo=sum(1 for mm in mains if sum(1 for c in set(mm) if c in g.BY_ID and EXODIA.search(g.BY_ID[c]['name']))>=3)/len(mains)
 relics=pick_relics(cid,cards,extra,run,start,exo)
 strategy=['exodia'] if isinstance(relics,list) else relics[1]
 if isinstance(relics,tuple):relics=relics[0]
 curses=pick_curses(cid,cards,extra);sigs=sig_candidates(cid,mains,exo);code=sigs[0] if sigs else None
 if args.candidates:
  rc=relic_candidates(cid,cards,extra,run,start,exo,relics);cc=curse_candidates(cid,cards,extra,curses)
  for k in rc:cand['relics'][f'{k}@{cid}']={'s':relic_entry(k,run)['s']}
  cand['chars'][cid]={'combos':[[[f'{k}@{cid}' for k in a],b,cd,is_field(cd)] for a,b,cd in combos(cid,rc,cc,sigs,relics,curses)]}
  continue
 sim=picks.get(cid)
 if sim:relics=[k.split('@')[0] for k in sim['relics']];curses=sim['curses'];code=sim['card'] or code
 for k in relics:out['relics'][f'{k}@{cid}']=relic_entry(k,run)
 out['chars'][cid]={'card':code,'cardName':g.BY_ID[code]['name'] if code else '','field':is_field(code),'relics':[f'{k}@{cid}' for k in relics],'plan':strategy,'curses':curses,
  **({'sim':{k:sim[k] for k in ('base','best','seeds')}} if sim else {})}
ICONS=dict(re.findall(r"(\w+):'([\w-]+)'",re.search(r'const CURSE_ICONS=\{(.*?)\};',(WEB/'experience-ui.js').read_text(encoding='utf8')).group(1)))
for k in CURSES:
 r=dict(dr._base(0),curses=[k])
 out['curses'][k]={'name':content.CURSES[k][0],'text':content.CURSES[k][1],
  's':['','']} if k=='drain' else {'name':content.CURSES[k][0],'text':content.CURSES[k][1],'s':[rules(passives.multiplayer_script(r,0)),rules(passives.multiplayer_script(r,1))]}
for k,c in out['curses'].items():c['icon']=f"assets/icons/yugipedia/genres-{ICONS.get(k,'cancel-out-effect')}.png"
if args.candidates:
 cand['curses']={k:{'s':v['s']} for k,v in out['curses'].items()}
 args.candidates.write_text(json.dumps(cand,ensure_ascii=False,separators=(',',':')),encoding='utf8')
 print(f"{len(cand['chars'])} characters, {len(cand['relics'])} candidate relic scripts -> {args.candidates}");raise SystemExit
OUT.write_text(json.dumps(out,ensure_ascii=False,separators=(',',':')),encoding='utf8')
print(f"{len(out['chars'])} characters ({sum(1 for c in out['chars'].values() if 'sim' in c)} from simulated picks), {len(out['relics'])} relic scripts, {len(out['curses'])} curses -> {OUT} ({OUT.stat().st_size//1024} KB)")

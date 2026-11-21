"""Hidden coin feats (jerichoholic and CITYDRIVER on Discord, list picked by the user 2026-11-20; duel_rewards.SECRET).
Each one pays on a win from the duel's sleeve_metrics summary (android/test_hidden_coin_feats_nov20.mjs checks the
recording). They stay out of content.battleCoinRules and battleBonusLabels (the shop Coin scorecard and the in-duel bonus
list), and update_profile records each one earned in profile['secret_coin_feats'], which the scorecard lists."""
import json,random,sys,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,storage,duel_rewards
from content import PLAYABLE_IDS
S=duel_rewards.SECRET
EXPECTED={'stolen_finish':15,'forbidden_slap':30,'little_finish':10,'one_turn_kill':50,'godlike':50,'last_stand':40,'brink':30,
 'outnumbered':20,'last_draw':100,'no_monsters':40,'wipeout':20,'god_tribute':10,'triple_threat':20,'three_gods':80,'lady_luck':15}
rules={m:(l,c) for m,t,l,c in duel_rewards.RULES if m in S}
assert {m:c for m,(l,c) in rules.items()}==EXPECTED,rules
assert all(rules[m][0]==S[m] for m in S) and len(duel_rewards.SECRET_LABELS)==len(S)
ARM=g.BY_NAME['Right Arm of the Forbidden One']['id'];LEG=g.BY_NAME['Left Leg of the Forbidden One']['id'];BEWD=g.BY_NAME['Blue-Eyes White Dragon']['id']

(ROOT/'temp').mkdir(exist_ok=True)
with tempfile.TemporaryDirectory(prefix='hidden-feats-',dir=ROOT/'temp') as tmp:
 base=Path(tmp);storage.ROOT=base;g.SAVE=base/'run.json';g.RUNTIME=base/'runtime';g.RUNTIME.mkdir()
 profile=storage.profile();profile['unlocked']=list(PLAYABLE_IDS);storage.write(base/'profile.json',profile)
 rng=random.Random(4);run=g.new_run(0,rng);run.update(stage='shop',round=1,gold=0,artifacts=[],first_player=0,lp=8000)
 # A plain 6-turn win with one summon: its summary earns no hidden feat.
 PLAIN={'winReason':1,'summons':1,'deck':30,'hand':2,'monsters':1,'oppMonsters':0,'lowestLp':8000,'finisher':BEWD}
 def duel(lp=8000,events=(),**sleeve):
  r=dict(run,lp=lp);ev=[{'kind':'duel_metrics','turns':6},{'kind':'summon','card':BEWD,'method':'special'},*events,{'kind':'sleeve_metrics',**{**PLAIN,**sleeve}}]
  return r,ev
 def earned(*a,reason=1,**k):
  r,ev=duel(*a,**k);tally,_=g.rewards(r,ev,reason);return {m for m in S if S[m] in tally},tally
 assert earned()[0]==set(),earned()
 cases={
  'stolen_finish':dict(stolenFinish=True),
  'forbidden_slap':dict(finisher=ARM),
  'little_finish':dict(weakFinish=True),
  'one_turn_kill':dict(oneTurnKill=True),
  'godlike':dict(bestOverkill=7000),
  'outnumbered':dict(monsters=1,oppMonsters=2),
  'last_draw':dict(deck=0),
  'wipeout':dict(bestOneEffect=4),
  'god_tribute':dict(tribute3=True),
  'triple_threat':dict(sameName=3),
  'three_gods':dict(divine=3),
  'lady_luck':dict(bestCoinStreak=3),
 }
 for metric,sleeve in cases.items():
  got,tally=earned(**sleeve);assert got=={metric},(metric,got);assert tally[S[metric]]==EXPECTED[metric],(metric,tally)
 # Just short of each threshold.
 for sleeve in [dict(finisher=LEG),dict(bestOverkill=6999),dict(monsters=2,oppMonsters=2),dict(deck=1),dict(bestOneEffect=3),dict(sameName=2),dict(divine=2),dict(bestCoinStreak=2)]:
  assert earned(**sleeve)[0]==set(),sleeve
 # LP-based ones read the LP the duel ended on.
 assert earned(lp=100)[0]=={'last_stand'} and earned(lp=101)[0]==set()
 assert earned(lp=4000,lowestLp=1000)[0]=={'brink'} and earned(lp=3999,lowestLp=1000)[0]==set() and earned(lp=8000,lowestLp=1001)[0]==set()
 assert earned(lowestLp=None)[0]==set()
 # No monsters needed: no summon or set in the events and none in the duel summary.
 r,ev=duel(summons=0);ev=[e for e in ev if e['kind']!='summon'];assert S['no_monsters'] in g.rewards(r,ev,1)[0]
 r,ev=duel(summons=0);ev=[e for e in ev if e['kind']!='summon']+[{'kind':'set','card':BEWD}];assert S['no_monsters'] not in g.rewards(r,ev,1)[0]
 r,ev=duel(summons=1);ev=[e for e in ev if e['kind']!='summon'];assert S['no_monsters'] not in g.rewards(r,ev,1)[0]
 r,ev=duel();ev=[e for e in ev if e['kind']!='summon'];ev[-1]=dict(ev[-1]);del ev[-1]['summons'];assert S['no_monsters'] not in g.rewards(r,ev,1)[0],'older summaries never count'
 # The blow must be the one that won: an Exodia or Final Countdown win does not pay the finisher feats.
 for metric in ('forbidden_slap','little_finish','one_turn_kill','godlike','stolen_finish'):
  assert S[metric] not in earned(reason=0x10,**{**cases[metric],'winReason':0x10})[1],metric
 # Finisher and end-of-duel feats are decided at victory; counted feats show in the in-duel bonus list when earned.
 victory_only={'stolen_finish','forbidden_slap','little_finish','one_turn_kill','godlike','last_stand','brink','outnumbered','last_draw','no_monsters'}
 assert victory_only<=duel_rewards.VICTORY_ONLY and not (set(S)-victory_only)&duel_rewards.VICTORY_ONLY
 r,ev=duel(bestCoinStreak=3,deck=0);live=duel_rewards.progress(r,ev,g.BY_ID,victory=False)
 assert S['lady_luck'] in live and S['last_draw'] not in live,live
 # They count toward the 400 cap like every other rule.
 _,total=g.rewards(*duel(lp=100,deck=0,divine=3,finisher=ARM,oneTurnKill=True,bestOverkill=9000),1);assert total<=400,total

 # Discovery: a win's hidden feats are recorded once and kept.
 r,ev=duel(deck=0,bestCoinStreak=3);r['last_rewards'],_=g.rewards(r,ev,1)
 g.update_profile(r,True);assert storage.profile()['secret_coin_feats']==['lady_luck','last_draw'],storage.profile().get('secret_coin_feats')
 r['last_rewards'],_=g.rewards(*duel(divine=3),1);g.update_profile(r,True)
 assert storage.profile()['secret_coin_feats']==['lady_luck','last_draw','three_gods']
 r['last_rewards'],_=g.rewards(*duel(),1);g.update_profile(r,True);assert len(storage.profile()['secret_coin_feats'])==3

# The public lists never name them; the client gets them only as secretCoinRules.
content=json.loads((ROOT/'android/web/content.json').read_text(encoding='utf-8-sig'))
public={r['label'] for r in content['battleCoinRules']}|set(content['battleBonusLabels'])
assert not public&duel_rewards.SECRET_LABELS,public&duel_rewards.SECRET_LABELS
assert {r['id']:r['coins'] for r in content['secretCoinRules']}==EXPECTED,content['secretCoinRules']
# Every label is translated in all 8 languages.
for lang in ('de','es','fr','it','ja','ko','pt','zh'):
 ui=json.loads((ROOT/f'data/i18n/ui/{lang}.json').read_text(encoding='utf-8-sig'))
 missing=[l for l in [*S.values(),'Hidden feats','Hidden feat!','Found'] if not ui.get(l)];assert not missing,(lang,missing)
print(f'PASS hidden coin feats: {len(S)} feats pay, stay out of the public lists and are recorded once found')

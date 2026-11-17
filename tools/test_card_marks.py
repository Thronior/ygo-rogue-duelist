"""Card marks and related singles (user, 2026-11-16; changed 2026-11-17). A Yes mark on a card outside the Deck counts as
2 copies of it for weighting; a Yes card in the Deck keeps its usual copies, and a No mark changes nothing. Singles related to a Deck or Yes card
(Related Cards tab links) weigh RELATED_BOOST times more. The backend 'mark' command stores and clears marks."""
import sys,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT));sys.path.insert(0,str(ROOT/'android'))
import campaign as g,relic_affinity as ra
dm=g.BY_NAME['Dark Magician']['id'];dmg=g.BY_NAME['Dark Magician Girl']['id'];kuri=g.BY_NAME['Kuriboh']['id']
run={'pool':[dm,dm,kuri],'selected':[0,2]}
assert ra.deck_cards(run)=={dm:1,kuri:1}
assert ra.deck_cards(dict(run,card_marks={str(dm):1}))=={dm:1,kuri:1},'Yes leaves a Deck card as it is'
assert ra.deck_cards(dict(run,card_marks={str(dmg):1}))=={dm:1,kuri:1,dmg:2},'Yes counts outside the Deck too'
assert ra.deck_cards(dict(run,card_marks={str(dm):-1}))=={dm:1,kuri:1},'No no longer removes weight'
assert ra.deck_cards(dict(run,card_marks={'junk':1,str(dm):0}))=={dm:1,kuri:1}
# Related singles: Dark Magician Girl names Dark Magician, so she is boosted for a Dark Magician Deck, also when it is
# marked No.
base=dict(run);ra.RELATED_BOOST=1.0;plain=ra.card_multipliers([g.BY_ID[dmg]],base)[dmg]
ra.RELATED_BOOST=2.0;boosted=ra.card_multipliers([g.BY_ID[dmg]],base)[dmg]
assert abs(boosted-min(ra.CARD_BOOST_CAP,plain*2))<1e-9,(plain,boosted)
assert ra.canonical_id(dmg) in ra.related_ids({dm:1})
no=dict(run,card_marks={str(dm):-1});assert ra.canonical_id(dmg) in ra.related_ids(ra.deck_cards(no))
# A Yes mark on a card outside the Deck brings its related cards in as well.
yes=dict(pool=[kuri],selected=[0],card_marks={str(dm):1});assert ra.canonical_id(dmg) in ra.related_ids(ra.deck_cards(yes))
# Backend command.
import mobile_backend as mb
src=(ROOT/'android/mobile_backend.py').read_text(encoding='utf8')
assert "elif action=='mark':" in src and "runPatch={'card_marks':run['card_marks']}" in src
# Tag: the host keeps each player's marks in their run, in any phase and while locked in, with a stale revision too
# (marks are independent actions); the shared shop weighs the teammate's marks through tag_partner.
import tempfile,storage
from tag_campaign import TagCampaign
base=Path(tempfile.mkdtemp(prefix='card-marks-',dir=ROOT/'temp'));storage.ROOT=base;g.SAVE=base/'run.json'
profile=storage.profile();s=TagCampaign([0,1],[profile,profile],seed=3)
s.command(0,{'id':'m1','revision':s.revision,'action':'mark','value':[dm,1]})
assert s.players[0]['card_marks']=={str(dm):1} and not s.players[1].get('card_marks')
assert s.view(0)['run']['card_marks']=={str(dm):1},'the view carries the marks'
s.command(0,{'id':'auto','revision':s.revision,'action':'auto','value':None})
choice=s.players[0]['routes'][0];s.command(0,{'id':'ch','revision':s.revision,'action':'choose','value':choice})
s.command(0,{'id':'rd','revision':s.revision,'action':'ready','value':None});assert s.ready[0]
s.command(0,{'id':'m2','revision':s.revision-1,'action':'mark','value':[kuri,-1]})
assert s.players[0]['card_marks']=={str(dm):1,str(kuri):-1},'marks work while locked in, from a stale revision'
s.command(0,{'id':'m3','revision':s.revision,'action':'mark','value':[dm,0]});assert s.players[0]['card_marks']=={str(kuri):-1}
for bad in ([999999999,1],[dm,2],'x',None):
 try:s.apply(0,'mark',bad);raise SystemExit(f'bad mark accepted: {bad}')
 except ValueError:pass
ra.TAG_PARTNER=dict(pool=[],selected=[],card_marks={str(dm):1})
mine=dict(pool=[kuri],selected=[0],history_mode='tag')
assert ra.deck_cards(ra.tag_partner(mine))=={dm:2},'a Yes mark of the teammate counts in the shared weighting'
ra.TAG_PARTNER=None
print('PASS card marks: Yes 2 copies outside the Deck, No unchanged, Tag host marks, related singles x%.1f (DMG %.2f -> %.2f)'%(ra.RELATED_BOOST,plain,boosted))

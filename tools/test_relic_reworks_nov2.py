"""Exodia pack cuts and the No Pain No Gain payout (2026-11-02)."""
from pathlib import Path
import json,sys
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
import campaign as g
from content import ARTIFACTS,ART_INFO

PIECES={33396948,7902349,70903634,8124921,44519536}
packs={p['name']:p for p in json.loads((ROOT/'data/packs.json').read_text(encoding='utf8').lstrip('﻿'))}
cards=lambda p:set(p['common'])|set(p['rare'])
for name in ('Arkana','Rebecca Hawkins','Shadi'):assert not PIECES&cards(packs[name]),name
for name in ('Solomon Muto','Yami Yugi'):assert PIECES<=cards(packs[name]),name

assert 'no_pain_no_gain' in ARTIFACTS and 'no_pain_no_gain' in ART_INFO
run={'artifacts':['no_pain_no_gain'],'curses':[],'gold':0,'lp':4000,'round':1,'selected':[],'pool':[],'character':0,'challenge_level':0,'guaranteed':[]}
try:
 tally=g.rewards(run,[{'kind':'lp_lost'}]*3+[{'kind':'recover','amount':500}])[0]
except KeyError as missing:
 raise SystemExit(f'test run needs {missing}')
assert tally.get('No Pain No Gain')==15,tally
assert 'No Pain No Gain' not in g.rewards({**run,'artifacts':[]},[{'kind':'lp_lost'}])[0]
print('PASS Exodia pack cuts and No Pain No Gain')

"""Relic fixes from the behaviour flags of 2026-11-26 (evening).
- Loyalty only keeps monsters you own: a monster you took with Enemy Controller still goes back (flag 3080f92a).
- Magician Staff's extra bonus counts Name Changer's "Dark Magician" monsters (Septarium, Discord).
- Hot Deck does not re-enter itself: its mill made the opponent's Parting Gift draw, and that draw called it again with no
  count, "an effect went wrong" (flag da667c60)."""
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import artifact_effects as fx

loyalty = fx.artifact_script('loyalty') if hasattr(fx, 'artifact_script') else None
src = (ROOT / 'artifact_effects.py').read_text(encoding='utf8')
loyal = src[src.index("if kind=='loyalty'"):src.index('\n', src.index("if kind=='loyalty'"))]
assert 'c:GetOwner()==e:GetHandlerPlayer()' in loyal, 'Loyalty targets only monsters you own'
hot = src[src.index("if kind=='hot_deck'"):src.index("if kind=='token_defender'")]
assert 'not busy' in hot and 'busy=true' in hot and 'busy=false' in hot and '(ev or 0)>0' in hot, 'Hot Deck has a re-entry guard'
import random
import campaign as g, passives
run = g.new_run(0, random.Random(1)); run['artifacts'] = ['mage']
assert 'IsSetCard(0x10a2)' in passives.script(run), 'Magician Staff: Name Changer "Dark Magician" monsters get the extra 300'
print('PASS relic fixes nov26b: Loyalty keeps only your own monsters; Hot Deck cannot re-enter itself; Magician Staff counts Name Changer')

"""Stars Aligned checks for a free Monster Zone again when it resolves (flag 1962e4d3, 2026-11-26): Machine Duplication
filled the last zone in the same End Phase, Stars Aligned still asked, and the chosen monster went to the GY by rule."""
import re, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import approved_relic_effects as e

out = e.effect('approved_stars_aligned')
lua = out if isinstance(out, str) else chr(10).join(out)
operation = lua[lua.index('local p=Duel.GetTurnPlayer() local l=level()'):lua.index('--[[relic-ask]]')]
assert 'Duel.GetLocationCount(0,LOCATION_MZONE)<=0' in operation, operation
print('PASS Stars Aligned: the resolving effect stops without a free Monster Zone before asking')

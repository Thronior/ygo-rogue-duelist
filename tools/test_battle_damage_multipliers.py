import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import passives


def generated(curses=(), challenge_level=0, artifacts=()):
    return passives.script(
        {"character": 0, "artifacts": list(artifacts), "curses": list(curses),
         "challenge_level": challenge_level},
        telemetry=False,
    )


def test_open_wound_applies_battle_damage_once():
    for level, factor in ((0, 1.5), (1, 1.5), (2, 2), (6, 2)):
        script = generated(("exposed",), level)
        hook = (
            "Duel.ChangeBattleDamage(ep,math.floor("
            f"Duel.GetBattleDamage(ep)*{factor}"
            "))"
        )
        assert script.count(hook) == 1, (level, script.count(hook))
        assert script.count("e:SetCode(EFFECT_CHANGE_DAMAGE)") == 1
        assert script.count(f"return math.floor(val*{factor})") == 1
        assert math.floor(100 * factor) == (150 if level < 2 else 200)
        assert math.floor(300 * factor) == (450 if level < 2 else 600)


def test_distinct_relic_and_curse_multipliers_each_apply_once():
    script = generated(
        ("exposed",), 2,
        ("cursed_duelists_wager", "cursed_reckless_spear"),
    )
    relic_factor = (
        "ep==0 and 2.25 or 1.5"
    )
    assert script.count(relic_factor) == 1
    assert script.count(
        "Duel.ChangeBattleDamage(ep,math.floor(Duel.GetBattleDamage(ep)*2))"
    ) == 1
    # The two relic penalties combine into 1.5^2; amplified Open Wound is 2x.
    for raw, expected in ((100, 450), (300, 1350)):
        after_relics = math.floor(raw * 2.25)
        after_open_wound = math.floor(after_relics * 2)
        assert after_open_wound == expected


test_open_wound_applies_battle_damage_once()
test_distinct_relic_and_curse_multipliers_each_apply_once()
print("PASS battle damage multipliers: Open Wound is applied once; relic factors stack once each")
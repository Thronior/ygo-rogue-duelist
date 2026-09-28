"""New relic batch: definitions, duel scripts, economy hooks and blank transform."""
import sys, random, uuid
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import campaign as g, storage, passives
from content import ARTIFACTS, ART_INFO, reload_tuning
from collections import Counter

base = ROOT / "temp" / ("newrelics-" + uuid.uuid4().hex)
base.mkdir()
storage.ROOT = base
g.SAVE = base / "run.json"
g.RUNTIME = base / "runtime"
g.RUNTIME.mkdir()
p = storage.profile()
from content import PLAYABLE_IDS
p["unlocked"] = list(PLAYABLE_IDS)
storage.write(base / "profile.json", p)

assert len(ARTIFACTS) == 69
for key in ["faulty_printer", "golden_sleeve", "magic_mirror", "underdog_clause",
            "traps_no_more", "spells_no_more", "legendary_shackles", "toon_world",
            "ritual_dagger", "fusion_chamber", "phoenix_rebirth", "champion_trophy",
            "glass_shard", "deck_spyglass", "rulebook", "blank_relic"]:
    assert key in ARTIFACTS, key
    assert ART_INFO[key]["art"] in g.BY_NAME, (key, ART_INFO[key]["art"])
assert reload_tuning() in (True, False)
assert ART_INFO["traps_no_more"]["effect"] == "trap_negate"

# Duel-script blocks for the engine relics.
run = {"artifacts": ["traps_no_more", "spells_no_more", "phoenix_rebirth"], "curses": [], "loop": 0}
script = passives.script(run)
assert "re:IsActiveType(TYPE_TRAP)" in script and "re:IsActiveType(TYPE_SPELL)" in script
assert "Duel.NegateEffect(ev)" in script and "EVENT_CHAIN_SOLVING" in script
assert "EVENT_ADJUST" in script and "Duel.SetLP(0,1000)" in script
run = {"artifacts": ["magic_mirror", "urn"], "mirror_copy": "urn", "curses": [], "loop": 0}
assert passives.script(run) == passives.script({"artifacts": ["urn"], "curses": [], "loop": 0})
run = {"artifacts": ["faulty_printer"], "faulty": {"89631139": [500, -200]}, "curses": [], "loop": 0}
assert "HINT_MESSAGE" not in passives.script(run, telemetry=False)

# Likelihood groups resolve to real cards.
exodia = ["Exodia the Forbidden One", "Right Arm of the Forbidden One",
          "Left Arm of the Forbidden One", "Right Leg of the Forbidden One",
          "Left Leg of the Forbidden One"]
assert all(n in g.BY_NAME for n in exodia)
assert sum(1 for c in g.CARDS if c["data"]["type"] & 0x400000) >= 5
assert any(c["data"]["type"] & 0x80 and c["data"]["type"] & 3 for c in g.CARDS)
assert any(c["data"]["type"] & 0x40 for c in g.CARDS)

# Economy hooks: golden summons, underdog pups, boss trophy, glass doubling, mirror gold.
run = g.new_run(0, random.Random(4))
g.auto_deck(run)
golden = g.BY_NAME["Dark Magician"]["id"]
run.update(artifacts=["golden_sleeve", "underdog_clause", "glass_shard"],
           golden_card=golden, gold=40, lp=8000, round=0)
events = [{"kind": "summon", "card": golden} for _ in range(6)]
tally, total = g.rewards(run, events)
assert tally["Golden Card"] == 50, tally.get("Golden Card")
pups = sum(1 for c in g.deck(run) if g.BY_ID[c]["data"]["type"] & 1
           and g.BY_ID[c]["data"]["type"] & 16 and g.BY_ID[c]["level"] <= 2)
assert tally.get("Underdog's Clause", 0) == pups, (tally.get("Underdog's Clause"), pups)
assert tally["Glass Shard"] == total // 2 and total == min(250, total)
run["round"] = 2
run["artifacts"].append("champion_trophy")
tally2, _ = g.rewards(run, [])
assert tally2["Champion Trophy"] == 30
run2 = g.new_run(1, random.Random(5))
g.auto_deck(run2)
run2.update(artifacts=["magic_mirror", "urn"], mirror_copy="urn")
tally_m, _ = g.rewards(run2, [])
assert tally_m["Artifacts"] == 30, tally_m.get("Artifacts")

# Faulty printer: deltas stay within range and never drop stats below zero.
run3 = g.new_run(0, random.Random(6))
g.auto_deck(run3)
run3.update(stage="shop", gold=999, artifacts=["faulty_printer"])
ox = g.BY_NAME["Battle Ox"]["id"]
seen = False
for seed in range(60):
    run3["shop"] = [dict(kind="single", id=ox, price=15, sold=False)]
    run3["gold"] = 999
    g.buy(run3, 0, random.Random(seed))
    run3["shop"][0]["sold"] = False
    if run3.get("card_mods"):
        seen = True
        break
assert seen, "printer never misprinted in 60 seeded buys"
for k, (datk, ddef) in run3["card_mods"].items():
    c = g.BY_ID[run3["pool"][int(k)]]
    assert -1000 <= datk <= 1000 and -1000 <= ddef <= 1000
    assert c["atk"] + datk >= 0 and c["defense"] + ddef >= 0

# Blank transform + phoenix burn-out through a real duel result.
run4 = g.new_run(0, random.Random(7))
g.auto_deck(run4)
run4["artifacts"] += ["blank_relic", "phoenix_rebirth"]
g.prepare_duel(run4, random.Random(7))
top = Counter(g.BY_ID[c].get("attribute") for c in g.deck(run4)
              if g.BY_ID[c]["data"]["type"] & 1 and g.BY_ID[c].get("attribute")).most_common(1)[0][0]
expect = {"LIGHT": "light", "DARK": "dark", "FIRE": "ember",
          "WATER": "tide", "WIND": "gale", "EARTH": "earth"}[top]
g.finish_duel(run4, dict(protocol=1, id=run4["duel"]["id"], winner=0, lp=800, events=[]))
assert "blank_relic" not in run4["artifacts"] and expect in run4["artifacts"], run4["artifacts"]
assert "phoenix_rebirth" not in run4["artifacts"] and run4.get("phoenix_spent")

# Rulebook opening hands in the generated duel script.
run5 = g.new_run(0, random.Random(8))
g.auto_deck(run5)
run5["artifacts"].append("rulebook")
g.prepare_duel(run5, random.Random(8))
lua = (g.RUNTIME / "puzzles/shadow-run.lua").read_text(encoding="utf8")
assert lua.count(",1,1)") >= 2, lua[-400:]

print("PASS: 16 new relics defined, scripted, economical and transformable (Loaded Dice omitted: core RNG not interceptable)")

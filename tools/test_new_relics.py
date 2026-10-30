"""New relic batch: definitions, duel scripts, economy hooks and blank transform."""
import sys, random, uuid, json
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

assert "bounty_list" in ARTIFACTS
assert ARTIFACTS["loyalty"][0:2] == ("Loyalty", 100)
assert ART_INFO["loyalty"]["effect"] == "loyalty"
loyalty_art = json.loads((ROOT / "data/relic-custom-art.json").read_text(encoding="utf8")).get("loyalty")
assert loyalty_art and (ROOT / "assets/relics" / loyalty_art).is_file()
for key in ["faulty_printer", "golden_sleeve", "magic_mirror", "underdog_clause",
            "traps_no_more", "spells_no_more", "legendary_shackles", "toon_world",
            "ritual_dagger", "fusion_chamber", "phoenix_rebirth", "champion_trophy",
            "glass_shard", "deck_spyglass", "rulebook", "blank_relic", "bounty_list"]:
    assert key in ARTIFACTS, key
    if ART_INFO[key]["art"] not in g.BY_NAME:
        custom = json.loads((ROOT / "data/relic-custom-art.json").read_text(encoding="utf8"))
        assert key in custom and (ROOT / "assets/relics" / custom[key]).is_file(), (key, ART_INFO[key]["art"])
assert reload_tuning() in (True, False)
assert ART_INFO["traps_no_more"]["effect"] == "trap_negate"
loyalty_script = passives.script({"artifacts": ["loyalty"], "curses": [], "loop": 0})
assert "EFFECT_CANNOT_CHANGE_CONTROL" in loyalty_script and "SetTargetRange(LOCATION_MZONE,0)" in loyalty_script

# Duel-script blocks for the engine relics.
run = {"artifacts": ["traps_no_more", "spells_no_more", "phoenix_rebirth"], "curses": [], "loop": 0}
script = passives.script(run)
assert "re:IsActiveType(TYPE_TRAP)" in script and "re:IsActiveType(TYPE_SPELL)" in script
assert "Duel.NegateEffect(ev)" in script and "EVENT_CHAIN_SOLVING" in script
assert "EVENT_ADJUST" in script and "Duel.SetLP(0,1000)" in script
run = {"artifacts": ["magic_mirror", "urn"], "mirror_copy": "urn", "curses": [], "loop": 0}
mirror_script=passives.script(run)
urn_script=passives.script({"artifacts": ["urn"], "curses": [], "loop": 0})
strip_ai=lambda value:"\n".join(line for line in value.splitlines() if not line.startswith("-- SHADOW_RUN_AI "))
assert strip_ai(mirror_script) == strip_ai(urn_script)
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
assert tally.get("Underdog's Clause", 0) == pups * ART_INFO["underdog_clause"]["amount"], (tally.get("Underdog's Clause"), pups)
assert tally["Glass Shard"] > 0 and total == tally["Glass Shard"] * 2
run["round"] = 2
run["artifacts"].append("champion_trophy")
tally2, _ = g.rewards(run, [])
assert tally2["Champion Trophy"] == ART_INFO["champion_trophy"]["amount"]
run2 = g.new_run(1, random.Random(5))
g.auto_deck(run2)
run2.update(artifacts=["magic_mirror", "urn"], mirror_copy="urn")
tally_m, _ = g.rewards(run2, [])
assert tally_m["Artifacts"] == ART_INFO["urn"]["amount"] * 2, tally_m.get("Artifacts")

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
for k, mod in run3["card_mods"].items():
    datk, ddef = mod[:2]
    c = g.BY_ID[run3["pool"][int(k)]]
    assert -1000 <= datk <= 1000 and -1000 <= ddef <= 1000
    assert c["atk"] + datk >= 0 and c["defense"] + ddef >= 0
# The purchase notice reports the misprint's original and new Type and Attribute.
from feedback_update import RACE_VALUES, ATTRIBUTE_VALUES
notice = run3["last_misprints"][-1]
mod = run3["card_mods"][str(notice["pool"])]
assert (notice["race"], notice["attribute"]) == (g.BY_ID[ox]["race"], g.BY_ID[ox]["attribute"]), notice
assert RACE_VALUES[notice["new_race"]] == mod[2] and ATTRIBUTE_VALUES[notice["new_attribute"]] == mod[3], (notice, mod)
# Misprints only roll Types that monsters in the card pool naturally have.
pool_types = {RACE_VALUES[c["race"]] for c in g.CARDS if c["data"]["type"] & 1 and c["race"] in RACE_VALUES}
assert not pool_types & {RACE_VALUES[t] for t in ("Psychic", "Wyrm", "Cyberse", "Illusion", "Creator God")}
faulty_amount = ART_INFO["faulty_printer"]["amount"]
ART_INFO["faulty_printer"]["amount"] = 100
try:
    run3["card_mods"] = {}
    for seed in range(300):
        run3["shop"] = [dict(kind="single", id=ox, price=15, sold=False)]
        run3["gold"] = 999
        g.buy(run3, 0, random.Random(1000 + seed))
finally:
    ART_INFO["faulty_printer"]["amount"] = faulty_amount
rolled = {mod[2] for mod in run3["card_mods"].values()}
assert len(run3["card_mods"]) == 300 and rolled <= pool_types and len(rolled) >= 15, (len(run3["card_mods"]), rolled - pool_types, len(rolled))

# Blank transform + phoenix burn-out through a real duel result.
run4 = g.new_run(0, random.Random(7))
g.auto_deck(run4)
run4["artifacts"] += ["blank_relic", "phoenix_rebirth"]
g.prepare_duel(run4, random.Random(7))
top = Counter(g.BY_ID[c].get("attribute") for c in g.deck(run4)
              if g.BY_ID[c]["data"]["type"] & 1 and g.BY_ID[c].get("attribute")).most_common(1)[0][0]
expect = {"LIGHT": "light", "DARK": "dark", "FIRE": "ember",
          "WATER": "tide", "WIND": "gale", "EARTH": "earth"}[top]
import copy
saved_run = copy.deepcopy(run4)
# A low-LP win that Phoenix Feather never saved (e.g. Straw Doll took the hit) keeps it.
g.finish_duel(run4, dict(protocol=1, id=run4["duel"]["id"], winner=0, lp=800, events=[]))
assert "blank_relic" not in run4["artifacts"] and expect in run4["artifacts"], run4["artifacts"]
assert "phoenix_rebirth" in run4["artifacts"] and not run4.get("phoenix_spent")
# The save itself spends it.
run5 = copy.deepcopy(saved_run)
g.finish_duel(run5, dict(protocol=1, id=run5["duel"]["id"], winner=0, lp=800, events=[{"kind": "relic_used", "relic": "phoenix_rebirth"}]))
assert "phoenix_rebirth" not in run5["artifacts"] and run5.get("phoenix_spent")
# Tag duels carry no save signal, so a Tag win at 1,000 LP or less still counts as the save.
run6 = copy.deepcopy(saved_run)
g.finish_duel(run6, dict(protocol=1, id=run6["duel"]["id"], winner=0, lp=800, events=[], phoenix_signal=False))
assert "phoenix_rebirth" not in run6["artifacts"] and run6.get("phoenix_spent")

# Rulebook opening hands in the generated duel script.
run5 = g.new_run(0, random.Random(8))
g.auto_deck(run5)
run5["artifacts"].append("rulebook")
g.prepare_duel(run5, random.Random(8))
lua = (g.RUNTIME / "puzzles/shadow-run.lua").read_text(encoding="utf8")
assert lua.count(",1,1)") >= 2, lua[-400:]

print("PASS: relic definitions, scripts, economy and transforms (Loaded Dice omitted: core RNG not interceptable)")

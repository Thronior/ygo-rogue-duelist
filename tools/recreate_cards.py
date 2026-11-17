"""Validate the real-card recreation batches against the local era pool."""
import argparse
from collections import Counter, defaultdict
import copy
import csv
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import randomizer as r

RECREATE = ROOT / "temp/recreate"
BATCH_SIZE = 50
SLOTS = r.ALL | {"m_none"}
KINDS = {"activated", "continuous", "rule"}
FRAME_TAGS = {
    "flip": r.TYPE_FLIP,
    "spirit": 0x200,
    "union": 0x400,
    "toon": 0x400000,
    "gemini": 0x800,
}


def load_json(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def era_cards():
    return sorted(load_json(ROOT / "data/era-cards.json"), key=lambda card: card["id"])


def load_entries(batches=RECREATE / "cards"):
    entries = []
    for path in sorted(batches.glob("batch-*.json")):
        entries.extend(load_json(path))
    return entries


def convert_selector(part):
    """Turn Type and Attribute names in a block's parameters into the engine's bit masks."""
    if isinstance(part.get("race"), str):
        part["race"] = r.RACES[part["race"]]
    if isinstance(part.get("exclude_race"), str):
        part["exclude_race"] = r.RACES[part["exclude_race"]]
    if isinstance(part.get("races"), list):
        part["race"] = sum(r.RACES[name] for name in part.pop("races"))
    if isinstance(part.get("attr"), str):
        part["attr"] = r.ATTRIBUTES[part["attr"]]
    if isinstance(part.get("attrs"), list):
        part["attr"] = sum(r.ATTRIBUTES[name] for name in part.pop("attrs"))


def export_cards(out_path, ids=(), batches=RECREATE / "cards"):
    cards = {card["id"]: card for card in era_cards()}
    entries = {entry["id"]: entry for entry in load_entries(batches)}
    selected_ids = list(ids) if ids else sorted(entries)
    missing_ids = [card_id for card_id in selected_ids if card_id not in entries or card_id not in cards]
    if missing_ids:
        raise ValueError(f"No recreation found for IDs: {missing_ids[:10]}")

    exported = []
    skipped = 0
    for index, card_id in enumerate(selected_ids):
        real = cards[card_id]
        entry = entries[card_id]
        custom_id = 191900000 + index
        if custom_id >= 191999000:
            raise ValueError("Export exceeds the available recreation ID range")
        blocks = []
        has_unavailable_block = False
        for effect in entry["effects"]:
            for category, parts in r.CATEGORIES.items():
                for part in effect[category]:
                    if r.CATEGORIES[category][part["k"]].get("lua") is False:
                        break
                else:
                    continue
                break
            else:
                blocks.append(effect)
                continue
            has_unavailable_block = True
        if has_unavailable_block:
            skipped += 1
            continue

        rand = {"slot": entry["slot"], "frame": entry["frame"], "effects": []}
        for effect in entry["effects"]:
            normalized = {key: [dict(part) for part in effect[key]] for key in r.CATEGORIES}
            for category, parts in normalized.items():
                for part in parts:
                    convert_selector(part)
            rand["effects"].append(normalized)
        if entry.get("mats"):
            rand["mats"] = entry["mats"]
        if entry.get("ritual_for") is not None:
            rand["ritual_for"] = entry["ritual_for"]
            rand["ritual_level"] = entry["ritual_level"]
        script = (
            "if not Randomizer then Duel.LoadScript(\"randomizer.lua\") end\n"
            "local s,id=GetID()\n"
            f"s.rand={r._lua(rand)}\n"
            "function s.initial_effect(c) Randomizer.BuildReal(c,s,id) end\n"
        )
        data = dict(real["data"])
        data["code"] = custom_id
        material_list = [dict(material) for material in entry.get("mats", [])]
        real_card = {
            "id": custom_id,
            "name": real["name"],
            "desc": real["desc"],
            "type": real["type"],
            "race": real["race"],
            "attribute": real["attribute"],
            "level": real["level"],
            "atk": real["atk"],
            "defense": real["defense"],
            "sets": real.get("sets", []),
            "strings": real.get("strings", [""] * 16),
            "image": f"assets/cards/{card_id}.jpg",
            "date": real.get("date", ""),
            "data": data,
            "randomized": {
                "real": True,
                "frame": entry["frame"],
                "slot": entry["slot"],
                "materials": material_list,
                **({"ritual_for": entry["ritual_for"]} if entry.get("ritual_for") is not None else {}),
            },
        }
        exported.append({"card": real_card, "script": script})
    out_path = Path(out_path)
    if not out_path.is_absolute():
        out_path = ROOT / out_path
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps({"cards": exported}, ensure_ascii=False, indent=1) + "\n", encoding="utf8")
    print(f"Exported {len(exported)} cards, skipped {skipped} cards with lua=False blocks to {out_path}")


CSV_FIELDS = [
    "section", "group", "key", "value", "real_count", "real_percent", "real_base",
    "random_count", "random_percent", "random_base",
]


def percent(count, base):
    return f"{100 * count / base:.2f}" if base else "0.00"


def stats(out_path, batches=RECREATE / "cards", engine_report=None):
    real_cards = era_cards()
    cards_by_id = {card["id"]: card for card in real_cards}
    entries = {entry["id"]: entry for entry in load_entries(batches)}
    if set(entries) != set(cards_by_id):
        raise ValueError("Statistics require one recreation for every era card")

    random_cards = r.make_cards(20261116, [(None, None)] * 2000)
    random_parts = []
    forced_rows = []
    for card in random_cards:
        parts = copy.deepcopy(card["parts"])
        logs = card.get("log")
        forced = isinstance(logs, list) and any(line.startswith("added 'Once per turn'") for line in logs)
        converted = isinstance(logs, list) and any(line.startswith("'Once per turn' became") for line in logs)
        if forced:
            forced_key = "hopt" if converted else "opt"
            for index, part in enumerate(parts["limits"]):
                if part["k"] == forced_key:
                    parts["limits"].pop(index)
                    break
        elif logs is None:
            if card["slot"] in r.ACTIVATED:
                for part in parts["limits"]:
                    if part["k"] in {"opt", "hopt"}:
                        forced_rows.append((card["slot"], part["k"]))
        random_parts.append(parts)

    real_rows = []
    for card in real_cards:
        entry = entries[card["id"]]
        real_rows.append({
            "id": card["id"], "card": card, "entry": entry, "slot": entry["slot"],
            "frame": entry["frame"], "frame_tags": entry["frame_tags"], "effects": entry["effects"],
        })
    random_rows = []
    for card, parts in zip(random_cards, random_parts):
        game = r.as_game_card(card)["card"]
        bits = game["data"]["type"]
        frame = card.get("frame", card.get("randomized", {}).get("frame", ""))
        tags = [tag for tag, bit in FRAME_TAGS.items() if bits & bit]
        kind = "activated"
        if any(part["k"] in r.UNIQUE_RULES for part in parts["acts"]):
            kind = "rule"
        elif any(part["k"] in r.AURAS for part in parts["acts"]):
            kind = "continuous"
        random_rows.append({
            "id": game["id"], "card": game, "slot": card["slot"], "frame": frame,
            "frame_tags": tags, "effects": [dict(kind=kind, **parts)], "parts": parts,
        })

    rows = []

    def add_row(section, group, key, value, real_count, real_base, random_count, random_base):
        rows.append({
            "section": section, "group": group, "key": key, "value": value,
            "real_count": real_count, "real_percent": percent(real_count, real_base), "real_base": real_base,
            "random_count": random_count, "random_percent": percent(random_count, random_base), "random_base": random_base,
        })

    def card_kind(row):
        bits = row["card"]["data"]["type"]
        if bits & r.TYPE_MONSTER:
            return "monsters"
        if bits & r.TYPE_SPELL:
            return "Spells"
        return "Traps"

    def count_attr(collection, key_fn):
        return Counter(key_fn(row) for row in collection)

    for key in ("monsters", "Spells", "Traps"):
        add_row("card_kinds", "all", key, "cards",
                sum(card_kind(row) == key for row in real_rows), len(real_rows),
                sum(card_kind(row) == key for row in random_rows), len(random_rows))

    monster_frames = ("normal", "effect", "fusion", "ritual")
    real_monsters = [row for row in real_rows if card_kind(row) == "monsters"]
    random_monsters = [row for row in random_rows if card_kind(row) == "monsters"]
    for frame in monster_frames:
        add_row("monster_frames", "frame", frame, "cards",
                sum(row["frame"] == frame for row in real_monsters), len(real_monsters),
                sum(row["frame"] == frame for row in random_monsters), len(random_monsters))
    for tag in FRAME_TAGS:
        add_row("monster_frames", "frame_tag", tag, "cards",
                sum(tag in row["frame_tags"] for row in real_monsters), len(real_monsters),
                sum(tag in row["frame_tags"] for row in random_monsters), len(random_monsters))

    for section, type_rows, subtype_fn, values in (
        ("spell_types", [row for row in real_rows if card_kind(row) == "Spells"], lambda row: row["card"]["race"], tuple(r.SPELL_TYPES)),
        ("trap_types", [row for row in real_rows if card_kind(row) == "Traps"], lambda row: row["card"]["race"], tuple(r.TRAP_TYPES)),
    ):
        card_kind_name = "Spells" if section == "spell_types" else "Traps"
        random_type_rows = [row for row in random_rows if card_kind(row) == card_kind_name]
        for subtype in values:
            real_count = sum(subtype_fn(row) == subtype for row in type_rows)
            random_count = sum(subtype_fn(row) == subtype for row in random_type_rows)
            add_row(section, "all", subtype, "cards", real_count, len(type_rows), random_count, len(random_type_rows))

    def non_normal(row):
        return row["slot"] != "m_none"

    def effect_bin(count):
        return "5+" if count >= 5 else str(count)

    effect_groups = [(row, effect) for row in real_rows for effect in row["effects"]]
    random_effect_groups = [(row, effect) for row in random_rows for effect in row["effects"]]
    real_card_groups = [row for row in real_rows if non_normal(row)]
    random_card_groups = [row for row in random_rows if non_normal(row)]
    for group_name, real_subset, random_subset in [("all", real_card_groups, random_card_groups)]:
        for value in ("0", "1", "2", "3", "4", "5+"):
            add_row("effects_per_card", group_name, value, "cards",
                    sum(effect_bin(len(row["effects"])) == value for row in real_subset), len(real_subset),
                    sum(effect_bin(len(row["effects"])) == value for row in random_subset), len(random_subset))
    for slot in sorted({row["slot"] for row in real_card_groups + random_card_groups}):
        real_subset = [row for row in real_card_groups if row["slot"] == slot]
        random_subset = [row for row in random_card_groups if row["slot"] == slot]
        for value in ("0", "1", "2", "3", "4", "5+"):
            add_row("effects_per_card", slot, value, "cards",
                    sum(effect_bin(len(row["effects"])) == value for row in real_subset), len(real_subset),
                    sum(effect_bin(len(row["effects"])) == value for row in random_subset), len(random_subset))

    for kind in ("activated", "continuous", "rule"):
        add_row("effect_kinds", "all", kind, "effects",
                sum(effect.get("kind") == kind for _, effect in effect_groups), len(effect_groups),
                sum(effect.get("kind") == kind for _, effect in random_effect_groups), len(random_effect_groups))

    def uses_by_category(rows_collection):
        result = {category: Counter() for category in r.CATEGORIES}
        cards_containing = {category: defaultdict(set) for category in r.CATEGORIES}
        slots_containing = {category: defaultdict(lambda: defaultdict(set)) for category in r.CATEGORIES}
        for row in rows_collection:
            for effect in row["effects"]:
                for category in r.CATEGORIES:
                    for part in effect.get(category, []):
                        key = part["k"]
                        result[category][key] += 1
                        cards_containing[category][key].add(row["id"])
                        slots_containing[category][key][row["slot"]].add(row["id"])
        return result, cards_containing, slots_containing

    real_uses, real_cards_using, real_slot_using = uses_by_category(real_rows)
    random_uses, random_cards_using, random_slot_using = uses_by_category(random_rows)
    real_card_total, random_card_total = len(real_rows), len(random_rows)
    for category, table in r.CATEGORIES.items():
        for key in sorted(set(real_uses[category]) | set(random_uses[category])):
            real_n = len(real_cards_using[category][key])
            random_n = len(random_cards_using[category][key])
            add_row("block_appearances", category, key, "cards", real_n, real_card_total, random_n, random_card_total)
            for slot in sorted(set(real_slot_using[category][key]) | set(random_slot_using[category][key])):
                real_base = sum(row["slot"] == slot for row in real_rows)
                random_base = sum(row["slot"] == slot for row in random_rows)
                add_row("block_appearances", slot, f"{key}@{slot}", "cards",
                        len(real_slot_using[category][key][slot]), real_base,
                        len(random_slot_using[category][key][slot]), random_base)
            add_row("block_appearances", category, key, "total_uses",
                    real_uses[category][key], sum(len(row["effects"]) for row in real_rows),
                    random_uses[category][key], sum(len(row["effects"]) for row in random_rows))

    def distribution_count(effects, category):
        return Counter(min(4, len(effect.get(category, []))) for effect in effects)

    for category in r.CATEGORIES:
        add_distribution = ("0", "1", "2", "3", "4+")
        all_real = [effect for _, effect in effect_groups]
        all_random = [effect for _, effect in random_effect_groups]
        for group, real_effects, random_effects in [("all", all_real, all_random)]:
            real_counts = distribution_count(real_effects, category)
            random_counts = distribution_count(random_effects, category)
            for value, numeric in zip(add_distribution, range(5)):
                add_row("block_count_distribution", group, f"{category}:{value}", "effects",
                        real_counts[numeric], len(real_effects), random_counts[numeric], len(random_effects))
        for slot in sorted({row["slot"] for row in real_rows + random_rows}):
            real_effects = [effect for row, effect in effect_groups if row["slot"] == slot]
            random_effects = [effect for row, effect in random_effect_groups if row["slot"] == slot]
            real_counts = distribution_count(real_effects, category)
            random_counts = distribution_count(random_effects, category)
            for value, numeric in zip(add_distribution, range(5)):
                add_row("block_count_distribution", slot, f"{category}:{value}", "effects",
                        real_counts[numeric], len(real_effects), random_counts[numeric], len(random_effects))
        for slot in sorted({row["slot"] for row in real_rows + random_rows}):
            real_cards_in_slot = [row for row in real_rows if row["slot"] == slot]
            random_cards_in_slot = [row for row in random_rows if row["slot"] == slot]
            real_counts = Counter(min(4, sum(len(effect.get(category, [])) for effect in row["effects"])) for row in real_cards_in_slot)
            random_counts = Counter(min(4, sum(len(effect.get(category, [])) for effect in row["effects"])) for row in random_cards_in_slot)
            for value, numeric in zip(add_distribution, range(5)):
                add_row("block_count_distribution", f"card:{slot}", f"{category}:{value}", "cards",
                        real_counts[numeric], len(real_cards_in_slot), random_counts[numeric], len(random_cards_in_slot))

    def record_parameters(rows_collection):
        amounts = defaultdict(Counter)
        params = defaultdict(Counter)
        pairs = Counter()
        for row in rows_collection:
            for effect in row["effects"]:
                names = []
                for category in r.CATEGORIES:
                    for part in effect.get(category, []):
                        key = part["k"]
                        names.append((category, key))
                        for field in ("n", "l", "d"):
                            if field in part:
                                amounts[(key, field)][part[field]] += 1
                        for field in ("race", "attr"):
                            if field in part:
                                params[(key, field)][part[field]] += 1
                for left in range(len(names)):
                    for right in range(left + 1, len(names)):
                        pairs[tuple(sorted((f"{names[left][0]}:{names[left][1]}", f"{names[right][0]}:{names[right][1]}")))] += 1
        return amounts, params, pairs

    real_amounts, real_params, real_pairs = record_parameters(real_rows)
    random_amounts, random_params, random_pairs = record_parameters(random_rows)
    for key in sorted(set(real_amounts) | set(random_amounts)):
        real_dist, random_dist = real_amounts[key], random_amounts[key]
        base = sum(real_dist.values())
        random_base = sum(random_dist.values())
        for value in sorted(set(real_dist) | set(random_dist)):
            add_row("amounts", "all", f"{key[0]}:{key[1]}", str(value), real_dist[value], base, random_dist[value], random_base)
    for key in sorted(set(real_params) | set(random_params)):
        real_dist, random_dist = real_params[key], random_params[key]
        base = sum(real_dist.values())
        random_base = sum(random_dist.values())
        for value in sorted(set(real_dist) | set(random_dist), key=str):
            add_row("params", key[0], key[1], str(value), real_dist[value], base, random_dist[value], random_base)
    pair_keys = set(real_pairs) | set(random_pairs)
    top_pairs = sorted(pair_keys, key=lambda pair: (-(real_pairs[pair] + random_pairs[pair]), pair))[:100]
    for pair in top_pairs:
        add_row("pairs", "same_effect", " + ".join(pair), "pairs",
                real_pairs[pair], sum(real_pairs.values()), random_pairs[pair], sum(random_pairs.values()))

    def monster_stat_counts(collection):
        counts = Counter()
        for row in collection:
            if card_kind(row) != "monsters":
                continue
            card = row["card"]
            counts[(row["frame"], "level", str(card["level"]))] += 1
            for stat, field in (("atk", "atk"), ("def", "defense")):
                value = card[field]
                bucket = "unknown" if value < 0 else f"{value // 500 * 500}-{value // 500 * 500 + 499}"
                counts[(row["frame"], stat, bucket)] += 1
        return counts

    real_monster_stats = monster_stat_counts(real_rows)
    random_monster_stats = monster_stat_counts(random_rows)
    for key in sorted(set(real_monster_stats) | set(random_monster_stats)):
        real_base = sum(card_kind(row) == "monsters" and row["frame"] == key[0] for row in real_rows)
        random_base = sum(card_kind(row) == "monsters" and row["frame"] == key[0] for row in random_rows)
        add_row("monster_stats", key[0], f"{key[1]}:{key[2]}", "monsters",
                real_monster_stats[key], real_base, random_monster_stats[key], random_base)

    rejected = Counter()
    for row in real_rows:
        for effect in row["effects"]:
            try:
                found = r.problem(copy.deepcopy({category: effect.get(category, []) for category in r.CATEGORIES}), row["slot"])
            except (KeyError, TypeError, ValueError):
                found = ("invalid", 0, "effect could not be checked by problem()")
            if found:
                rejected[found[2]] += 1
    for message, count in sorted(rejected.items()):
        add_row("generator_rules", "problem", message, "effects", count, len(effect_groups), 0, 0)

    coverage = Counter(entry["coverage"] for entry in entries.values())
    for kind in ("full", "partial"):
        add_row("coverage", "cards", kind, "cards", coverage[kind], len(real_rows), 0, 0)
    false_lua = {key for category in r.CATEGORIES.values() for key, meta in category.items() if meta.get("lua") is False}
    for key in sorted(false_lua):
        count = sum(any(part["k"] == key for category in r.CATEGORIES for part in effect.get(category, [])) for row in real_rows for effect in row["effects"])
        add_row("coverage", "lua_false", key, "cards", count, len(real_rows), 0, 0)
    passed = 0
    if engine_report and Path(engine_report).exists():
        report = load_json(Path(engine_report))
        passed = sum(not card.get("errors", 0) for card in report.get("cards", []))
    add_row("coverage", "engine_test", "passed", "cards", passed, len(real_rows), 0, 0)
    for category, table in r.CATEGORIES.items():
        for key, meta in table.items():
            if not meta.get("real_only"):
                continue
            count = len(real_cards_using[category][key])
            add_row("new_blocks", category, key, "cards", count, len(real_rows), 0, 0)
    for slot, key in forced_rows:
        add_row("limits_forced", slot, key, "cards", 1, len(random_rows), 0, 0)

    out_path = Path(out_path)
    if not out_path.is_absolute():
        out_path = ROOT / out_path
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=CSV_FIELDS)
        writer.writeheader()
        writer.writerows(rows)

    real_block_rates = {}
    random_block_rates = {}
    for category in r.CATEGORIES:
        for key in set(real_cards_using[category]) | set(random_cards_using[category]):
            real_block_rates[(category, key)] = 100 * len(real_cards_using[category][key]) / len(real_rows)
            random_block_rates[(category, key)] = 100 * len(random_cards_using[category][key]) / len(random_rows)
    used_blocks = sorted(
        ((category, key, len(real_cards_using[category][key])) for category in r.CATEGORIES for key in real_cards_using[category]),
        key=lambda item: (-item[2], item[0], item[1]),
    )[:20]
    rate_gaps = sorted(
        ((abs(real_block_rates.get(pair, 0) - random_block_rates.get(pair, 0)), pair, real_block_rates.get(pair, 0), random_block_rates.get(pair, 0)) for pair in set(real_block_rates) | set(random_block_rates)),
        key=lambda item: (-item[0], item[1]),
    )[:20]
    lua_false_lines = sorted(false_lua)
    report_path = RECREATE / "REPORT.md"
    with report_path.open("w", encoding="utf-8") as handle:
        handle.write("# Real card recreation statistics\n\n")
        handle.write(f"Cards: {len(real_rows)} real and {len(random_rows)} generated.\n\n")
        handle.write(f"Coverage: {coverage['full']} full, {coverage['partial']} partial. Effect groups: {len(effect_groups)}.\n\n")
        handle.write("## 20 most used blocks\n\n")
        handle.write("| Category | Block | Cards |\n|---|---|---:|\n")
        for category, key, count in used_blocks:
            handle.write(f"| {category} | {key} | {count} |\n")
        handle.write("\n## 20 largest real/random percentage gaps\n\n")
        handle.write("| Category | Block | Real % | Random % | Gap (pp) |\n|---|---|---:|---:|---:|\n")
        for gap, (category, key), real_rate, random_rate in rate_gaps:
            handle.write(f"| {category} | {key} | {real_rate:.2f} | {random_rate:.2f} | {gap:.2f} |\n")
        handle.write("\n## Blocks without Lua implementations\n\n")
        handle.write("\n".join(f"- {key}" for key in lua_false_lines) if lua_false_lines else "None.")
        handle.write("\n\n## Skipped or unverified\n\n")
        handle.write(f"{coverage['partial']} cards still have uncovered or unverified text. Engine-tested recreations passed: {passed}.\n")
    print(f"Wrote {len(rows)} statistics rows to {out_path}")
    print(f"Wrote report to {report_path}")


def card_frame(card):
    bits = card["data"]["type"]
    if bits & r.TYPE_MONSTER:
        tags = [tag for tag, bit in FRAME_TAGS.items() if bits & bit]
        if bits & r.TYPE_FUSION:
            return "m_fusion", "fusion", tags
        if bits & r.TYPE_RITUAL:
            return "m_ritual", "ritual", tags
        if bits & r.TYPE_NORMAL and not bits & r.TYPE_EFFECT:
            return "m_none", "normal", tags
        return "m_main", "effect", tags
    if bits & r.TYPE_SPELL:
        for mask, slot in (
            (r.TYPE_QUICKPLAY, "s_quick"), (r.TYPE_CONTINUOUS, "s_cont"),
            (r.TYPE_EQUIP, "s_equip"), (r.TYPE_FIELD, "s_field"),
            (r.TYPE_RITUAL, "s_ritual"),
        ):
            if bits & mask:
                return slot, "", []
        return "s_normal", "", []
    if bits & r.TYPE_TRAP:
        if bits & r.TYPE_COUNTER:
            return "t_counter", "", []
        if bits & r.TYPE_CONTINUOUS:
            return "t_cont", "", []
        return "t_normal", "", []
    raise ValueError(f"Unknown card type for {card['id']}: {bits}")


def check_entry(entry, card, issue, valid_ritual_ids):
    if entry.get("name") != card["name"]:
        issue("name differs from the era card")
    slot, frame, tags = card_frame(card)
    if entry.get("slot") not in SLOTS:
        issue("invalid slot")
    if (entry.get("slot"), entry.get("frame")) != (slot, frame):
        issue(f"expected slot/frame {slot}/{frame}")
    supplied_tags = entry.get("frame_tags")
    if not isinstance(supplied_tags, list) or sorted(map(str, supplied_tags)) != sorted(tags):
        issue(f"expected frame tags {tags}")
    missing = entry.get("missing")
    if not isinstance(missing, list) or any(
        not isinstance(gap, str) or not gap.strip() for gap in missing
    ):
        issue("missing must be a list of nonempty descriptions")
    if entry.get("coverage") != ("partial" if missing else "full"):
        issue("coverage disagrees with missing")
    if not isinstance(entry.get("notes"), str):
        issue("notes must be a string")
    effects = entry.get("effects")
    if not isinstance(effects, list):
        issue("effects must be a list")
        return
    if slot == "m_none" and effects:
        issue("Normal Monsters must have no effects")
    material_only_fusion = (
        entry.get("frame") == "fusion"
        and isinstance(entry.get("mats"), list)
        and bool(entry["mats"])
        and all(line.strip().startswith('"') for line in card["desc"].splitlines())
    )
    if slot != "m_none" and not material_only_fusion and not effects:
        issue("effect-bearing card has no effect groups")
    for index, effect in enumerate(effects, 1):
        if not isinstance(effect, dict) or effect.get("kind") not in KINDS:
            issue(f"effect {index} has an invalid kind")
            continue
        for category, table in r.CATEGORIES.items():
            parts = effect.get(category)
            if not isinstance(parts, list):
                issue(f"effect {index} {category} must be a list")
                continue
            for part in parts:
                key = part.get("k") if isinstance(part, dict) else None
                if not isinstance(key, str) or key not in table:
                    issue(f"effect {index} has unknown {category} block {key!r}")
                elif entry.get("slot") not in table[key].get("fits", set()):
                    issue(f"effect {index} {category} block {key!r} does not fit {entry.get('slot')}")
    mats = entry.get("mats", [])
    if not isinstance(mats, list):
        issue("mats must be a list")
    else:
        for material in mats:
            if not isinstance(material, dict) or material.get("k") not in {"race", "attr", "low", "high", "normal", "code"}:
                issue("fusion material has an invalid kind")
    if slot == "s_ritual" and entry.get("coverage") == "full":
        ritual_for = entry.get("ritual_for")
        if type(ritual_for) is not int or ritual_for not in valid_ritual_ids:
            issue("Ritual Spell must name a Ritual Monster in ritual_for")


def check(batches, through_batch=None):
    cards = era_cards()
    by_id = {card["id"]: card for card in cards}
    valid_ritual_ids = {
        card["id"] for card in cards
        if card["data"]["type"] & r.TYPE_MONSTER and card["data"]["type"] & r.TYPE_RITUAL
    }
    counts = Counter()
    issues = []
    partial = 0
    files = sorted(batches.glob("batch-*.json"))
    for path in files:
        try:
            entries = load_json(path)
        except (OSError, ValueError) as error:
            issues.append(f"{path.name}: {error}")
            continue
        if not isinstance(entries, list):
            issues.append(f"{path.name}: expected a JSON array")
            continue
        for index, entry in enumerate(entries, 1):
            label = f"{path.name} entry {index}"

            def issue(message):
                issues.append(f"{label}: {message}")

            if not isinstance(entry, dict):
                issue("expected a card object")
                continue
            card_id = entry.get("id")
            if type(card_id) is not int or card_id not in by_id:
                issue(f"unknown card id {card_id!r}")
                continue
            counts[card_id] += 1
            partial += entry.get("coverage") == "partial"
            card = by_id[card_id]
            label = f"{path.name} {card_id} {card['name']}"
            check_entry(entry, card, issue, valid_ritual_ids)
    expected = cards if through_batch is None else cards[:through_batch * BATCH_SIZE]
    missing = [card["id"] for card in expected if card["id"] not in counts]
    duplicates = [card_id for card_id, count in counts.items() if count > 1]
    if missing:
        issues.append(f"{len(missing)} missing IDs (first 10: {missing[:10]})")
    if duplicates:
        issues.append(f"{len(duplicates)} duplicate IDs (first 10: {duplicates[:10]})")
    for message in issues:
        print(message)
    print(f"{len(files)} batches, {len(counts)}/{len(cards)} cards, "
          f"{partial} partial, {len(issues)} problems")
    return bool(issues)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", nargs="?", choices=["check", "export", "stats"], default="check")
    parser.add_argument("output", nargs="?")
    parser.add_argument("ids", nargs="*", type=int)
    parser.add_argument("--batches", type=Path, default=RECREATE / "cards")
    parser.add_argument("--through-batch", type=int, help="require the first N batches")
    args = parser.parse_args()
    if args.command == "export":
        if not args.output:
            parser.error("export requires an output JSON path")
        try:
            export_cards(args.output, args.ids, args.batches)
        except ValueError as error:
            parser.error(str(error))
        return 0
    if args.command == "stats":
        if not args.output:
            parser.error("stats requires an output CSV path")
        engine_report = RECREATE / "real-cards.engine.json"
        stats(args.output, args.batches, engine_report if engine_report.exists() else None)
        return 0
    if args.output or args.ids:
        parser.error("check does not accept an output path or card IDs")
    if args.through_batch is not None and args.through_batch < 1:
        parser.error("--through-batch must be positive")
    return check(args.batches, args.through_batch)


if __name__ == "__main__":
    sys.exit(main())

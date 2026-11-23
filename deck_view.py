"""Order of the Deck Spyglass window (Discord, Nori, 2026-11-23): Monsters, then Spells, then Traps, then the Extra Deck,
copies of a card side by side (by name)."""
EXTRA = 0x40 | 0x2000 | 0x800000 | 0x4000000  # Fusion, Synchro, Xyz, Link


def ordered(ids, by_id):
    def key(cid):
        card = by_id.get(cid) or {}
        t = int((card.get('data') or {}).get('type', 0))
        group = 3 if t & 1 and t & EXTRA else 0 if t & 1 else 1 if t & 2 else 2 if t & 4 else 4
        return group, card.get('name', ''), cid
    return sorted(ids, key=key)

"""Combine duplicate booster pools while retaining retired-ID compatibility."""
from copy import deepcopy
import json
from pathlib import Path

_MANIFEST = Path(__file__).resolve().parent / 'data' / 'pack-merges.json'
MERGE_GROUPS = json.loads(_MANIFEST.read_text(encoding='utf8'))


def _append_unique(target, values):
    seen = set(target)
    for value in values:
        if value not in seen:
            target.append(value)
            seen.add(value)


def _merge_group(canonical, members):
    # Preserve curated ordering from the canonical pack, then append only new
    # entries in the original source-pack order.
    for field in ('common', 'rare', 'rare_display', 'starter_support', 'super_rare_display'):
        if any(field in pack for pack in members):
            values = []
            for pack in members:
                _append_unique(values, pack.get(field, []))
            canonical[field] = values

    # A card printed at multiple rarities should occupy one draw bucket in
    # the merged pack. Keep it Rare if any source edition marks it Rare.
    if 'common' in canonical and 'rare' in canonical:
        rare_ids = set(canonical['rare'])
        canonical['common'] = [card_id for card_id in canonical['common'] if card_id not in rare_ids]

    rarity_map = {}
    for pack in members:
        for card_id, rarities in pack.get('rarities', {}).items():
            values = rarity_map.setdefault(str(card_id), [])
            _append_unique(values, rarities if isinstance(rarities, list) else [rarities])
    if rarity_map:
        canonical['rarities'] = rarity_map

    sources = []
    for pack in members:
        source = pack.get('rarity_source')
        if source and source not in sources:
            sources.append(source)
    if sources:
        canonical['rarity_source'] = ' | '.join(sources)

    # Carry gameplay flags across the merge. For optional scalar metadata,
    # keep the canonical value and fill only values absent from it.
    for field in ('draft_only', 'shop_only'):
        if any(pack.get(field) for pack in members):
            canonical[field] = True
    for field in ('reward_pack', 'game_set', 'source_set'):
        if not canonical.get(field):
            canonical_value = next((pack.get(field) for pack in members[1:] if pack.get(field)), None)
            if canonical_value:
                canonical[field] = canonical_value
    return canonical


def merge_pack_catalog(packs, groups=None, *, allow_missing=False):
    """Return a merged catalog and aliases for every retired source ID.

    The operation is idempotent, so it can run both against source data and
    an already-merged catalog. ``allow_missing`` is for partial catalog
    builders that intentionally emit only a subset of all pack families.
    """
    groups = MERGE_GROUPS if groups is None else groups
    catalog = deepcopy(packs)
    by_id = {pack['id']: pack for pack in catalog}
    if len(by_id) != len(catalog):
        raise ValueError('Pack catalog contains duplicate IDs before merging')

    aliases = {}
    retired = set()
    for group in groups:
        canonical_id = group['canonical']
        source_ids = group.get('merge', [])
        if canonical_id in retired or canonical_id in aliases:
            raise ValueError(f'Pack merge groups overlap at canonical ID {canonical_id}')
        canonical = by_id.get(canonical_id)
        if canonical is None:
            if allow_missing:
                continue
            raise ValueError(f'Missing canonical pack {canonical_id}')
        members = [canonical]
        for source_id in source_ids:
            if source_id == canonical_id or source_id in aliases or source_id in retired:
                raise ValueError(f'Invalid or repeated retired pack ID {source_id}')
            aliases[source_id] = canonical_id
            retired.add(source_id)
            source = by_id.get(source_id)
            if source is not None:
                members.append(source)
        _merge_group(canonical, members)

    merged = [pack for pack in catalog if pack['id'] not in retired]
    return merged, aliases

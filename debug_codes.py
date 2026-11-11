"""Debug-menu codes that mark one duelist as having beaten one Challenge Level (user, 2026-11-11).

A code is three digits, the duelist's short name, "lvl" and the level 0-6: 521joeylvl6 gives Joey Wheeler a Level 6
clear. The digits are fixed for each duelist and level and look random, so knowing one code does not give the others.
`python -B debug_codes.py` prints the whole list.
"""
import hashlib, re

NAMES = {0: 'yamiyugi', 1: 'kaiba', 2: 'joey', 3: 'mai', 4: 'keith', 5: 'lumisumbra', 6: 'yamibakura', 7: 'pegasus', 8: 'rex', 9: 'bonz',
         10: 'weevil', 11: 'yamimarik', 12: 'tristan', 13: 'yugi', 14: 'ishizu', 15: 'odion', 16: 'espa', 17: 'arkana', 18: 'mako', 19: 'duke',
         20: 'noah', 21: 'paradox', 22: 'tea', 23: 'solomon', 24: 'mokuba', 28: 'rebecca', 29: 'serenity', 30: 'marik', 31: 'anubis', 32: 'shadi',
         33: 'panik', 34: 'dartz', 35: 'rafael', 36: 'bakura', 37: 'copycat', 38: 'engine'}
BY_NAME = {name: character for character, name in NAMES.items()}
# Chosen so that Joey's Level 6 code is the user's example, 521joeylvl6.
SALT = 'bae3997ce73adf8a'
PATTERN = re.compile(r'(\d{3})([a-z]+)lvl([0-6])')


def digits(name, level):
    return '%03d' % (int(hashlib.sha256(f'{SALT}:{name}:{level}'.encode()).hexdigest(), 16) % 1000)


def code(character, level):
    return digits(NAMES[character], level) + NAMES[character] + 'lvl' + str(level)


def parse(value):
    """(character, level) for a valid code, else None. Spaces and capitals are ignored."""
    match = PATTERN.fullmatch(re.sub(r'\s+', '', str(value or '')).lower())
    if not match or match[2] not in BY_NAME or match[1] != digits(match[2], int(match[3])):
        return None
    return BY_NAME[match[2]], int(match[3])


def apply(profile, character, level):
    """The duelist is unlocked and has beaten that level; a higher clear already there is kept."""
    import challenge_levels
    levels = profile.setdefault('character_levels', {})
    levels[str(character)] = max(int(levels.get(str(character), -1)), level)
    profile['unlocked'] = sorted(set(profile.get('unlocked', [0, 1])) | {character})
    challenge_levels.sync_engine_unlock(profile)
    return levels[str(character)]


if __name__ == '__main__':
    import content
    for character in content.PLAYABLE_IDS:
        print(content.CHARACTERS[character]['name'].ljust(22), '  '.join(code(character, level) for level in range(7)))

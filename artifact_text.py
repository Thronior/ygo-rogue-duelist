"""PSCT terminology for duel rules; plain rules text for campaign-only rewards.
Artifact phase effects are continuous rules and do not start a Chain: no colon.
"""
def description(key,info,previous):
 a=info['amount'];f=info['filter'];p=info.get('parameters',{});kind=info['effect'];n=lambda x:f'{x:,}'
 subject=(f+' monsters' if f else 'Monsters')+' you control'
 patterns={
 'atk':f'{subject} gain {n(a)} ATK.', 'def':f'Monsters you control gain {n(a)} DEF.',
 'both':f'{subject} gain {n(a)} ATK/DEF.',
 'normal':f'Normal Monsters you control gain {n(a)} ATK.',
 'tribute':f'Level 5 or higher monsters you control gain {n(a)} ATK.',
 'small':f'Level 3 or lower monsters you control gain {n(a)} DEF.',
 'opening':f'Your opening hand contains {a} additional card'+('s.' if a!=1 else '.'),
 'gold':f'Earn {a} additional coins after each victory.',
 'victory_heal':f'After each victory, gain {n(a)} LP, up to your current healing limit.',
 'shop_heal':f'After each victory, gain {n(a)} LP before entering the shop, up to your current healing limit.',
 'enemy_lp':f'Your opponent starts each Duel with {n(a)} fewer LP. Challenge-level starting LP rules take priority.',
 'standby':f'Once per turn, at the start of your Standby Phase, gain {n(a)} LP.',
 'burn':f'Once per turn, at the start of your End Phase, inflict {n(a)} damage to your opponent.',
 'reduce':f'Each time you would take effect damage, reduce that damage by {n(a)} (min. 0).',
 'pierce':'If a monster you control attacks a Defense Position monster, inflict piercing battle damage.',
 'reward_card':"After each victory, add 1 additional random card from your opponent's duel decklist to your card pool. This does not apply to Copycat or Dueling Engine.",
 'discount':f'Shop prices are reduced by {a}%.',
 'interest':f'After each victory, earn additional coins equal to {a}% of your held coins, rounded down (max. 30).',
 'extra_artifact':f'Shops offer {a} additional artifact'+('s.' if a!=1 else '.'),
 'empty_hand':f'While you have no cards in your hand, monsters you control gain {n(a)} ATK.',
 'solo':f'While you control exactly 1 monster, it gains {n(a)} ATK.',
 'diversity':f'Monsters you control gain {n(a)} ATK for each different Type among face-up monsters you control (max. {n(p.get("cap",500))}).',
 'normal_grave':f'Monsters you control gain {n(a)} ATK for each Normal Monster in your GY (max. {n(p.get("cap",600))}).',
 'eclipse':f'While you have both a LIGHT and a DARK monster in your GY, monsters you control gain {n(a)} ATK/DEF.',
 'dial':f'During your turn, monsters you control gain {n(a)} ATK. During your opponent\'s turn, monsters you control gain {n(p.get("defense",600))} DEF.',
 'underdog':f'While your LP are lower than your opponent\'s and you control fewer monsters than they do, monsters you control gain {n(a)} ATK.',
 'empty_draw':f'Once per turn, at the start of your End Phase, if you have no cards in your hand, draw {a} card'+('s.' if a!=1 else '.'),
 'pack_refund':f'After buying a booster pack, receive a refund of {a} coins (up to the price paid minus 1).',
 'lean_bonus':f'If you win a Duel with exactly 20 cards in your Main Deck, earn {a} additional coins.',
 'clutch_bonus':f'If you win a Duel with less than 2000 LP, earn {a} additional coins. Check your LP before post-duel healing.',
 'single_stamp':f'Every {a} single-card purchase'+('s' if a!=1 else '')+' includes 1 additional random Normal Monster at no cost.',
 'echo':'Once per Duel, the first time your opponent Normal, Flip, or Special Summons a face-up Level 4 or lower monster, add a copy of 1 such monster to your hand.',
 'faulty':f'Each monster purchased as a single or pulled from a purchased booster has a {a}% chance to become a misprint. A misprint changes that copy\'s original ATK and DEF independently by a random amount from -1000 to +1000 (min. 0).',
 'golden':f'Designate 1 card in the deck editor. If you win a Duel, earn {a} additional coins for each time you Summoned, Set, or activated a card with that name during that Duel (max. 5 times).',
 'mirror':'At the start of each Duel, this artifact copies the effects of 1 random other artifact you own, except "Blank Relic", for that Duel.',
 'underdog_gold':f'After each victory, earn {a} additional coins for each Level 2 or lower Normal Monster in your Main Deck.',
 'trap_negate':'Negate all Trap effects on the field and all activated Trap effects.',
 'spell_negate':'Negate all Spell effects on the field and all activated Spell effects.',
 'like_exodia':'Adds one extra random Exodia piece to every shop and reroll.',
 'like_toon':'Adds one extra random card with "Toon" in its name to every shop and reroll.',
 'like_ritual':'Ritual Monsters and Ritual Spells appear more often in shops.',
 'like_fusion':'Fusion Monsters, "Polymerization", and "Fusion Sage" appear more often in shops.',
 'phoenix':f'Once per Duel, if your LP become 0, your LP become {n(a)} instead and you do not lose the Duel for having 0 LP. After this effect is applied, this artifact is consumed.',
 'boss_gold':f'Earn {a} additional coins after each boss victory.',
 'glass':f'Your starting LP become {n(a)} in each Duel, before boss LP penalties. Double your victory coin rewards.',
 'spyglass':"Reveals opponent portraits and lets you view their decks on the opponent-selection screen.",
 'rulebook':'Both players start each Duel with 1 card in their hand, regardless of other opening-hand bonuses.',
 }
 if key=='ankh':return 'When acquired, gain 2000 LP. Your healing limit outside boss victories becomes 10,000 LP. This overrides challenge-level healing limits.'
 if key=='blank_relic':return 'After your next Duel, this artifact becomes an Attribute Orb matching the most common Attribute among monsters in your Main and Extra Decks. If there are no monsters, it becomes Earth Orb.'
 return patterns.get(kind,previous)

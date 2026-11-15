# Randomizer block system

Goal (user, 2026-11-15): every effect of every card in the game can be written as a combination of these blocks.
The randomizer rolls blocks. A real card is a fixed combination of the same blocks. A block is one piece of Lua
in `randomizer.lua` with a text template, and it is written once.

Coverage check: all 1,461 cards with an effect were audited against this list (`temp/randomizer-audit/`).
The first version covered 1,056 of them. The 444 gaps the audit found (on 405 cards) were folded in, and a
second audit of those 405 cards covered 391. Its last 14 gaps are folded in too. Every effect in the game now has
the blocks it needs.

Built so far (Nov 15): about 70 core blocks, plus every effect type from the user's list of 50 unusual cards (Exodia, Destiny
Board, Final Countdown, Last Turn, Fiber Jar, Magical Hats, ... Great Dezard). Those live in `UNIQUE_ACTS` /
`UNIQUE_RULES` in `randomizer.py` and in `U` / `R.Rule` in `randomizer.lua`. The rest of this spec is not built yet.

A card is a list of **effects**. Each effect has:

    kind:     ACTIVATED (ignition / trigger / quick / Spell-Trap activation) | CONTINUOUS (always-on) | RULE (summon rules, card properties)
    conds:    0+ CONDITION blocks (at most one EVENT; any number of STATE)
    costs:    0+ COST blocks
    acts:     1+ ACTION blocks, joined by a SEQUENCE block
    limits:   0+ LIMIT blocks
    others:   0+ OTHER blocks (coin, dice, choice, branch, upkeep, delayed, counters, memory)

Most blocks take parameters. The parameters do most of the work: one `move` block covers destroy, banish, bounce,
spin, mill, add to hand and so on, from any zone, for anyone's cards and any filter.

## 1. Shared parameters

**PLAYER** (who): you, the opponent, either, both, the turn player, the event's player (the one who
activated / summoned / took damage), the owner of a REF, the controller of a REF (incl. "the controller of the
card that destroyed this card"), this card's current controller.

**SELECTOR**: which cards an action, cost or condition talks about.

| field | values |
|---|---|
| side | a PLAYER |
| zones | hand, deck, deck top N, deck bottom, extra, GY, GY bottom card, banished, monster zone, S/T zone, field zone, field (any), a specific zone or column, "face-up in the Deck" |
| kind | monster, Spell, Trap, Spell/Trap, any card, token, a Trap Card treated as a monster |
| filter | any AND / OR / **NOT** of the terms below, plus **"other than" a REF** ("except this card", "another monster", "non-Token", "only EARTH, WATER or FIRE") |
| filter terms | Type, Attribute, Level (=, <=, >=), ATK/DEF (=, <=, >=, original or current), name, "name includes" (archetype, including cards **treated as** that archetype), frame (Normal / Effect / Fusion / Ritual / Flip / Spirit / Union / Toon / Gemini), Spell/Trap sub-type, face-up / face-down, Attack / Defense Position, original owner, has a counter / **can have a counter of type X placed**, equipped / not equipped / **equipped with a named card**, can be Normal Summoned, lists this card's name, **is named in a REF's text**, **is a listed material of a REF**, **has an effect of a category (negates Trap effects, destroys, draws...)** |
| compare to | any term compared to a **REF** or an **AMOUNT**: same name / Type / Attribute / kind as REF, Level higher or lower than REF, ATK <= the opponent's LP. Non-monsters count as Level 0 |
| summon method | Normal, Tribute, Special, Flip, Fusion, Ritual Summoned, **Summoned by the effect of a named card**, Summoned this turn |
| history | **this turn / last turn / since this card was activated or turned face-up**: sent to the GY (by battle / effect / cost / as Fusion Material / by an opponent's effect), destroyed by battle, has attacked, battled with REF, was involved in damage calculation, was moved by this effect |
| refs | this card; the target(s); the event card(s) (attacker, attack target, summoned / destroyed / activated / negated card); the equipped monster; the equip card; the card(s) moved by the previous action; **the monsters Tributed for this card's Summon**; **the Fusion Materials of this card or of a REF**; **the monster this card destroyed**; **the card that destroyed this card**; a card of the declared name / Type / Attribute / category |
| count | exactly N, up to N, all, X (an AMOUNT), **with different names**, **whose total Levels are =, >= N** |
| pick | chosen by a PLAYER, random, all matching, **the highest / lowest ATK, DEF or Level (ties: all or choose one)**, in the order the cards entered the zone |
| targets | yes / no / "targets exactly N" |

**AMOUNT**: a fixed N; half / double; a card's ATK, DEF, Level or original ATK/DEF; LP (yours, the opponent's,
combined, the difference); the damage or LP from the event; the number of counters; the coin or die result; a
declared number; the number of cards matching a SELECTOR. Also:
- **sums over a SELECTOR**: total ATK, DEF or Level
- **what was paid**: the LP paid as a cost, the number of cards paid as a cost, the Tributes used for this Summon, the LP paid by a REF's upkeep, the LP paid last turn
- **this-turn tallies**: cards drawn, discarded, Tributed or destroyed this turn
- **free zones** on a side
- **arithmetic**: A + B, A − B (including "until N": N minus cards in hand, or "until N remain"), A × N, Level + 1, the stat difference between two cards, the minimum or maximum of two amounts
- **memory**: a value saved by an earlier resolution, including one that grows each use

**DURATION**: instant; **during damage calculation only**; **during the Damage Step only**; **until the end of the
Battle Phase**; until the end of the turn; until the end of a PLAYER's next turn; until the Nth Standby / End
Phase; **while a Summon or activation can be responded to (its response window)**; while this card is face-up;
while equipped; while a STATE holds; permanent.

**WHEN (delay)**: now; at the start or end of the Damage Step; at the end of the Battle Phase; during the End
Phase; during the next Draw Phase (before or after the draw); during the next Standby Phase (yours / the
opponent's / each); after N turns. Delayed actions are an OTHER block that wraps actions.

## 2. CONDITION blocks

EVENT (the timing; one per effect):
- `summoned` {how: Normal / Tribute (**with N Tributes**) / Flip / Special / Fusion / Ritual / any, **from: zone**, **by the effect of: a named card**, whose: this card / SELECTOR}
- `flipped` (FLIP:), `set`
- `sent_to` {zone: GY / hand / deck / banished, from: zone(s), reason: destroyed / battle / effect / cost / discarded / Tributed / **used as a Tribute for the Summon of a SELECTOR** / **as Fusion Material** / any, **by: a PLAYER's card / a card kind (Spell, Trap, Continuous Spell, monster) / a named card**, whose: this card / SELECTOR, **several at once: N or more matching cards at the same time**}
- `leaves_field` {this card / SELECTOR}
- `battle` {step: **start of the Battle Phase** / attack declared / attacked / **start of the Damage Step** / before damage / damage calculation / after damage / **end of the Damage Step** / **end of the Battle Phase**, side: this card / your monster / the opponent's monster / direct attack}
- `battle_result` {destroys a monster / is destroyed / inflicts battle damage / takes battle damage / not destroyed}
- `damage` {who, battle / effect, **amount op N**, **"would take" (before it happens)**, **by: a source filter or "not by a named card"**}, `lp_gained` {who}
- `activated` {who, what: Spell / Trap / monster effect / card or effect, **name: a named card**, **does: an effect category (draws, discards, destroys, Special Summons...)**, **targets: a SELECTOR / exactly N cards / only this card / a card in a zone / a player**, would destroy}
- `resolved` {**an activation finished resolving**, same filters as `activated`}
- `negated` {**you negated an activation or Summon (with a Counter Trap)**, of what kind}
- `would` {Summon / be destroyed / be banished / activate} (Counter Trap and replacement timing)
- `phase` {Draw / Standby / Main 1 / Main 2 / Battle / End, whose turn}
- `drawn` {this card / by a player / by an effect}, `discarded`, `revealed`
- `equipped` / `unequipped`, `targeted` {this card}
- `counter_placed` {N counters reached}
- `control_changed`, `position_changed` {**from**, **to**}, `chain_resolved`
- `coin_tossed` / `dice_rolled` {**by an effect, its results**}
- `state_reached` {**a STATE becomes true**: "when there are 7 face-up...", "if your LP drop to..."; checked as the board changes}
- `quick` (free chain on either turn), `none` (ignition / plain activation)

STATE (any number, joined by AND / OR / NOT):
- `count` {SELECTOR} {op N / op another count}: covers "you control a Dragon", "no cards in hand", "3+ monsters in GY", "your opponent controls more monsters"
- `all` {SELECTOR} {filter}: **every matching card satisfies the filter** ("all are in Attack Position")
- `lp` {who} {op N / op the opponent's LP **+ or − N**}
- `turn` {yours / the opponent's, phase (Main 1 or 2), turn number, "the turn this card was Summoned / Set", **N turns since an EVENT happened to a REF**}
- `this_card` {face-up, position, summoned by method or by the effect of a named card, equipped, has N counters, was Set this turn, in a zone, **has been flipped face-up (ever / this turn)**, **was face-down at the start of the Damage Step**, **destroyed a monster by battle this turn / this Battle Phase**, **was moved to a zone this turn**, **arrived in the GY by a reason**}
- `history` {**a SELECTOR had an EVENT this turn / last turn**}: "a monster was sent to your GY this turn", "you activated a Trap last turn"
- `was` {**a STATE held at a past moment** ("at the end of your opponent's last End Phase you controlled this card and had no cards in hand")}
- `activity` {player did / did not Summon / attack / activate / conduct the Battle Phase this turn}, `effect_used` {**this effect was already used this turn**}
- `chain` {link number, chained to something}
- `field_card` {a named card is on the field}, `flag` {**a REF fulfilled its Summon condition** (Fushioh Richie)}

## 3. COST blocks
Any `move`, `tribute`, `pay` or `reveal` applied to your own cards, paid on activation:
- `pay_lp` {AMOUNT incl. half}, `pay_lp_each` (per card etc.)
- `move_cost` {SELECTOR, to: GY / banished / hand / deck / discard}: discard N, banish N from the GY, send the top N, return a card, send this card
- `tribute_cost` {SELECTOR, count, **or total Levels >= N**}
- `reveal_cost` {SELECTOR}
- `remove_counters` {N, **from this card or any card you control**}
- `skip_cost` {your next Draw Phase / Battle Phase}
- `declare` {card name / Type / Attribute / number / Level / **card category (monster, Spell, Trap)**, **N values at once**}: also used by actions; a `branch` can test "matches one of the declared values"
- `attack_cost` {**pay LP / Tribute / discard / send cards to declare an attack, for this card or for a SELECTOR (Toll, Dark Elf, Toons)**}

## 4. ACTION blocks
- `move` {SELECTOR, to: hand / deck (top / bottom / shuffle / **face-up**) / extra / GY / banished face-up / banished face-down / field (Set, **or face-up in the S/T zone, in a fixed order**) / another player's side, reason: effect / destroy, **as: Tribute (by an effect, or the opponent's monster for your Tribute Summon)**}: destroy, banish, bounce, spin, mill, search, recycle, discard, Set S/T
- `banish_return` {**SELECTOR, return at WHEN**}: temporary banish
- `special_summon` {SELECTOR, position (**or "as before"**), side: yours / the opponent's / **its former controller's**, ignoring conditions?, as: Fusion / Ritual / normal, **as a Normal Monster with given stats (Spell/Trap cards, Magical Hats)**}
- `normal_summon_extra` {extra Normal Summon / Set this turn}, `tribute_summon_change` {fewer or more Tributes, **may or must Tribute a specific opponent's monster**}
- `fusion_summon` {materials from: hand / field / GY / deck, banish them or **Tribute them without Polymerization**, **"the corresponding" monster for a named material set**}, `ritual_summon` {level rule: = / >=, tributes from}
- `token` {N, name, Type, Attribute, Level, ATK, DEF, position, side, restrictions}
- `draw` {who, AMOUNT}, `shuffle` {deck / hand}, `look_at` {SELECTOR (hand / top N), then reorder / move one}
- `excavate` {**reveal cards from the top until N match a filter; act on the matches; act on the rest**}
- `reveal` {SELECTOR} (instant), `confirm` (look at a face-down card), `reveal_flip` {**reveal a face-down card, then act depending on what it is, then return it face-down**}
- `lp` {who, gain / lose / damage / set to, AMOUNT}
- `stat` {SELECTOR, ATK / DEF / both, +/- / set / double / halve / swap ATK and DEF / **swap with another card** / become original, **current or original**, AMOUNT, DURATION}
- `change` {SELECTOR, Level / Type / Attribute / name / **add an archetype (treated as "X")** / becomes a Normal Monster, DURATION}
- `position` {SELECTOR, to: Attack / Defense / face-down / flip face-up / **toggle (the other position)**, **without activating Flip effects**}
- `control` {SELECTOR, take / give / switch, DURATION}
- `equip` {card: this / SELECTOR, to: SELECTOR}: Equip Spells, Union monsters and "equip a monster as an Equip Spell"
- `negate` {activation / effect / Summon / attack, of: the event / SELECTOR, then: destroy / banish / to hand}
- `disable` {SELECTOR, DURATION, **only its effects on the field (activations still allowed)**}
- `counters` {place / remove, type (Spell Counter etc.), N, on: SELECTOR}
- `battle_mod` {SELECTOR, can attack directly / twice / **AMOUNT more times** / all monsters / **again after destroying a monster** / **while in Defense Position (using its DEF for damage calculation)** / cannot attack / **cannot attack directly** / **cannot attack while in Defense Position** / must attack / **must attack a filtered target** / piercing / no battle damage / reflect battle damage / **set battle damage to N** / **cannot be selected as an attack target (except by / unless a filter)** / **becomes the attacker in place of another monster** / change the attack target (**then go straight to damage calculation, no replay**) / **skip damage calculation** / end the Battle Phase / skip the Battle Phase / **extra Battle Phase**, DURATION}
- `protect` {SELECTOR, cannot be destroyed by battle / effect, cannot be targeted, unaffected by (Spells / Traps / monster effects / other cards / **a named card**), **cannot be Tributed**, **control cannot change**, **its Summon cannot be negated**, **cannot be banished / moved / affected while in the GY**, **only against a source filter** (Spell/Trap, non-targeting, monsters with ATK >= N), DURATION}
- `restrict` {player, cannot: Summon / Special Summon / Set / activate (Spells / Traps / monster effects, **or effects of a filtered kind**) / attack / draw (**except in the Draw Phase**) / change position (**except by card effects**) / declare / **Tribute** / **banish cards** / **look at the GY** / **unequip** / **use a zone** / **activate Spells unless Set the turn before**, filter, DURATION}
- `allow` {**permission**: activate Traps from the hand / **the turn they are Set**, Fusion Summon at will (Fusion Gate)}
- `damage_mod` {who, battle / effect damage: 0 / halved / doubled / reflected / becomes LP gain / **LP gain becomes damage** / **becomes effect damage** / **set to N**, **only for battles involving a SELECTOR**, DURATION}
- `skip_phase` {whose, which phase, how many turns, **the whole turn**, **skip to the End Phase**}
- `zones` {**lock N zones**, **rearrange your monsters**, **shuffle face-down cards**, **swap two players' zones (GY ↔ Deck)**}
- `redirect` {**change the target of an effect to another legal card**, **change the player an effect applies to**}
- `force_activate` {**activate a card you control** (Bait Doll)}, `play_from` {**use a card in the opponent's GY as if it were in your hand**}
- `reroll` {**toss the coin or roll the die again / replace the result**}
- `apply_declared` {use a declared name / Type / Attribute / number / category in the action}
- `guess` {the opponent guesses a card in your hand / you guess a hidden card / which hand: right → effect A, wrong → effect B}
- `copy` {copy the effect / name / stats of SELECTOR}
- `win` {**win the Duel / win the Match / the Duel is a draw**, condition SELECTOR}: Exodia, Destiny Board, Last Turn, Victory Dragon
- `rule` {named special rule}: see section 7

## 5. CONTINUOUS (always-on) blocks
The same verbs as ACTION, with an always-on duration and a range (this card's zone):
- `aura_stat` (**including reversing stat changes**), `aura_change`, `aura_protect`, `aura_restrict`, `aura_battle`, `aura_damage`, `aura_disable` (**with exceptions by owner**, **or keyed on the effect: effects that target a card in a zone, or that activate in a zone**), `aura_position` (**monsters are changed to a position while this is on the field**), `aura_reveal` (**a hand or drawn cards stay revealed**)
- `replace` {if SELECTOR would be destroyed / sent to the GY / **banished** / take damage: instead do ACTION}
- `redirect_zone` {cards that would go to the GY are banished instead, etc.}
- `replace_draw` {**skip the normal draw to do ACTION instead**}, `replace_set` {**a Set becomes a face-up Defense Summon**}
- `count_bonus` {gains AMOUNT for each SELECTOR}
- `tribute_value` {**this card counts as N Tributes for the Tribute Summon of a SELECTOR**}
- `material_sub` {**this card can be used as a named Fusion Material**}
- `summon_rule` {cannot be Normal Summoned / Set; must be Special Summoned by ...; Special Summon from the hand by Tributing / banishing SELECTOR (a summon procedure); Tribute Summon needs X; cannot be Special Summoned except by ...; **only right after a named card's effect resolved with a given result (Dark Sage)**; Fusion materials; Ritual by "Card"}
- `field_rule` {hand limit, Normal Summons per turn, **at most N monsters / N cards per side**, **one Type per side**, **at most N attacks per Battle Phase**}
- `tax` {**a PLAYER must pay a cost to Summon / Set / activate / attack (Chain Energy, Gravekeeper's Servant)**}, `waive` {**ignore a cost: Spell LP costs (Spell Economics), another card's upkeep**}
- `self_destroy` {**destroy this card when a STATE holds**}
- `override` {**control of monsters returns to the owner while this is face-up**}
- `choose_targets` {**a PLAYER chooses the attack targets of the other side's attacks** (Patrician of Darkness)}
- `suppress_rule` {**a named rule block does not apply** (spirit_return under Spiritual Energy Settle Machine)}

## 6. LIMIT blocks
- `once_per_turn` {soft / hard (card name) / once per Duel / once per Chain / **once per battle** / **once while this card is face-up** / **only the first time**}
- `oath` {for the rest of the turn you cannot ...}
- `only_during` {phase (**Main Phase 1 or 2**) / a PLAYER's turn / Damage Step ok}
- `cannot_respond` ("your opponent cannot activate cards in response"), `cannot_be_negated`
- `equip_only_to` {SELECTOR}, `activate_only_if` (= STATE condition)
- `max_copies_on_field` ("you can only control 1")
- `placement` {**this card can only be placed by the effect of a named card** (Spirit Message, Sarcophagus)}

## 7. OTHER blocks
- `coin` / `call` / `dice` / `dice_mult` / `dice_branch` / `multi_coin` {N coins: per Heads / all Heads / **at least K Heads**} / `dice_pick` {**roll N dice and choose one result**} / `dice_duel` {**both players roll; compare; reroll on a tie**}
- `choose` {apply 1 of these sub-effects, **or "1 or both"**, chosen by a PLAYER or at random}
- `branch` {**if / otherwise on a property of a moved, revealed, random or negated card, a stat comparison, or whether the previous action happened; "apply every matching branch"**}
- `each` {repeat the action for each card or player in a SELECTOR}, `repeat_cap` {**at most N times, reset when a STATE ends**}
- `sequence` {"then" (one after the other) / "and if you do" (only if the previous action happened) / "also" (at the same time)}
- `upkeep` {pay LP / discard / Tribute / **remove counters**, **each player's Standby Phase**, or destroy this card}
- `delayed` {WHEN, actions, **or wait until an EVENT**}, `turn_counter` {after N turns, **advance all turn counters**}
- `temp_trigger` {**create an EVENT effect that lasts for a DURATION** (Secret of the Bandit, Dice Re-Roll)}
- `next_action` {**changes a later action this turn**: the next Fusion Summon may use GY materials}
- `linger` {**the effect outlives this card and stays with the cards it made** (Ojama Trio's Tokens)}
- `self_destination` {**this card stays on the field / is Set again / goes elsewhere after resolving**}
- `counter_gain` {each time EVENT, place counters on this card, **up to a maximum of N**}
- `memory` {**save an AMOUNT for later resolutions**}
- Named rule blocks for mechanics that are rules rather than effects: `spirit_return`, `union` (equip / unequip / substitute destruction), `toon` (needs Toon World, cannot attack the turn it is Summoned, direct attack), `gemini`, `flip_effect` marker, `trap_monster` (a Trap that Special Summons itself as a monster), **`deck_upside_down`** (Convulsion of Nature), **`destiny_board`** (letters placed in order, then win), **`last_turn`** (end-of-turn win or draw judgement), **`equip_by_placement`** (a Spell that becomes an Equip Card when placed by a named card)

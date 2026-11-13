"""Approved September relics. Cursed IDs are never stocked as regular artifacts."""
# id, name, price, rules text, illustration
REGULAR=[
('solemn_relic','Solemn Relic',150,"Once per duel, negate your opponent's first Spell, Trap, or monster effect activation that can be negated.",'Solemn Judgment'),
('dice_jar','Dice Jar',100,'Gain 1 free reroll in each shop and 1 additional reroll for each cursed relic choice.','Dice Jar'),
('morphing_jar_2','Morphing Jar #2',100,'Shop rerolls restock your character booster pack, allowing you to buy it again.','Morphing Jar #2'),
('cyber_jar','Cyber Jar',100,'Gain 1 free opponent reveal per encounter and 1 free boss reroll per boss encounter.','Cyber Jar'),
('duelist_catalogue',"Duelist's Catalogue",120,'Character draft packs can appear in the random booster slots on shop visits and rerolls. This relic appears less often than other relics.','Exchange'),
('booster_shelf','Booster Box',90,'Shops offer a fourth booster pack. Adds the extra pack immediately when purchased and on every shop visit and reroll.','Jar of Greed'),
('second_wind','Second Wind',110,'Once per Duel, at the start of your End Phase, if your hand is empty, draw 2 cards.','Pot of Greed'),
('grave_lantern','Grave Lantern',80,'Monsters you control gain 100 DEF for each monster in your GY (max. 800).','Spirit of the Pharaoh'),
('ritual_vestment','Ritual Vestment',85,'Ritual Monsters you control gain 300 ATK/DEF.','Black Illusion Ritual'),
('fusion_insignia','Fusion Weapon',85,'Fusion Monsters you control gain 300 ATK/DEF.','Polymerization'),
('tribute_dividend','Tribute Dividend',75,'Earn 15 additional coins for each successful Tribute Summon if you win the Duel.','Soul Exchange'),
('patient_guardian','Patient Guardian',90,'Once per turn, at the start of your Standby Phase, if you control no Attack Position monsters, gain 300 LP.','Waboku'),
('healing_echo','Healing Echo',100,'Each time you gain LP by an effect other than Healing Echo, gain 200 additional LP.','Dian Keto the Cure Master'),
('trap_weaver','Trap Weaver',80,'Trap Monsters you control gain 400 ATK/DEF.','Embodiment of Apophis'),
('twin_banner','Twin Banner',85,'While you control exactly 2 face-up monsters with different Types and no other monsters, they gain 200 ATK/DEF.','United We Stand'),
('quiet_library','Quiet Library',80,'Once per turn, at the start of your End Phase, if you did not declare an attack this turn, gain 250 LP.','Solemn Wishes'),
('prospector_lens',"Prospector's Lens",80,'Each shop visit and reroll offers 1 additional ultra rare card in the general stock.','The Eye of Truth'),
# Muniqui's relic suggestions, reviewed with Thronior on 2026-10-28.
('battle_proficiency','Battle Proficiency',110,'Increase battle damage your opponent takes by 50% (rounded down).','Lightning Blade'),
('burn_proficiency','Burn Proficiency',100,'Increase effect damage you inflict to your opponent by 50% (rounded down).','Hinotama'),
('straw_doll','Straw Doll',250,"Once per turn, during your opponent's turn, the first time you would take battle damage, you take no damage instead.",'Scapegoat'),
('almighty','Almighty',300,'The ATK/DEF of monsters you control cannot be reduced.','Gate Guardian'),
('deck_thinning','Deck Thinning',100,'Your Main Deck minimum is 10 cards lower (min. 20).','Magical Mallet'),
('relic_picker','Relic Picker',100,'When acquired, choose 1 of 3 random regular relics you do not own and gain it (1 reroll). This relic is then consumed.','Magical Merchant'),
('card_picker','Card Picker',200,'When acquired, choose any card in the game and add it to your card pool. This relic is then consumed.','Witch of the Black Forest'),
('name_changer','Name Changer',150,'When acquired, choose an archetype. Monsters in your hand, Deck, GY and on the field are also treated as that archetype.','Shapesnatch'),
('anime_rule','Anime Rule #1',55,'You can Normal Summon monsters in face-up Defense Position.','Light of Intervention'),
('mind_reader','Mind Reader',80,'Once per turn, at the start of your Standby Phase, look at 1 Set card your opponent controls. It stays Set.','Mind Haxorz'),
# Discord relic suggestions (Dragunfire, M) with Thronior's edits, added on the user's request on 2026-11-11.
# Names and art for Overkill Bounty, Parting Gift and Tactical Espionage are mine; their authors gave none.
('illusionary_tribute','Illusionary Tribute',150,'Once per Duel, you can Tribute Spells and Traps you control for a Tribute Summon in place of monsters.','Thousand-Eyes Idol'),
('overkill_bounty','Overkill Bounty',90,"If you win the Duel, earn 20 additional coins for each 1000 damage the final blow dealt beyond your opponent's remaining LP.",'Meteor of Destruction'),
('parting_gift','Parting Gift',80,"Once per turn, when a monster you own is sent to your GY by an opponent's card effect: draw 1 card.",'Last Will'),
('tactical_espionage','Tactical Espionage',100,'When you Normal Summon a monster, no Trap Cards can be activated.','Tactical Espionage Expert'),
('stars_aligned','Stars Aligned',130,'Once per turn, during your End Phase, if all monsters in your GY and on your field have the same Level: Special Summon 1 monster of that Level from your hand.','Hoshiningen'),
# Requested by the user on 2026-11-04.
('deep_pockets','Deep Pockets',70,'Your hand size limit is increased by 3.','Infinite Cards'),
# Requested by the user on 2026-11-06.
('corpse_ritual','Corpse Ritual',80,'When you Ritual Summon, you can banish monsters from your GY as material instead of Tributing them from your hand or field.','Revival of Dokurorider'),
# Discord relic suggestions (Dragunfire), with the user's edits of 2026-11-12. Double Cyclone is not in the card pool,
# so Typhoon shows Mystical Space Typhoon. Dimensional Rift's name and Spell Provider's art are mine; none was given.
('typhoon','Typhoon',135,"Once per turn, during your opponent's End Phase, you can destroy 1 Spell or Trap Card on your side of the field. If you do, destroy 1 Spell or Trap Card your opponent controls.",'Mystical Space Typhoon'),
('machine_duplication','Machine Duplication',110,"Once per turn, during your End Phase, you can target 1 Machine monster you control: Special Summon 1 Clone Token in Attack Position with half that monster's ATK and DEF (rounded down).",'Machine Duplication'),
('ghost_destruction','Ghost Destruction',80,"If a monster you control inflicts battle damage to your opponent: You can target 1 monster in your or your opponent's GY; banish it.",'Kycoo the Ghost Destroyer'),
('omni_banishment','Omni Banishment',150,'Once per turn, during your Standby Phase, you can banish 1 card from your Deck.','Return from the Different Dimension'),
('dimensional_rift','Dimensional Rift',300,'All cards that would be sent to the GY are banished instead. This relic appears less often than other relics.','Banisher of the Light'),
('spell_provider','Spell Provider',60,'Once per turn, during your Standby Phase, you can place 1 Spell Counter on a card you control that can hold a Spell Counter.','Magical Plant Mandragola'),
# Deds's "Disturbed Sleep" as the user reworded it, and the user's three Gadget relics in place of Prunk44's Gadget Pack
# (Discord review, 2026-11-13). Gadget Call's art is mine; none was given. Gadget Gadget is their fusion (relic_fusions).
('disturbed_sleep','Disturbed Sleep',80,"During each player's End Phase, flip all face-down Defense Position monsters to face-up Attack Position.",'Shifting Shadows'),
('gadget_call','Gadget Call',90,"Whenever a \"Gadget\" monster's effect would add another \"Gadget\" monster to your hand, Special Summon it instead, if you can.",'Yellow Gadget'),
('gadget_stronghold','Gadget Stronghold',70,'Add 1 "Stronghold the Moving Fortress" to your starting hand.','Stronghold the Moving Fortress'),
# TRUANT's suggestions (Discord, 2026-11-13) with the user's prices; Spiritual Retribution became once per Duel.
# Cardian's art picks are not in the card pool: their crops are custom art (data/relic-custom-art.json).
('armory_aid','Armory Aid',70,'At the start of each Duel, add 1 random Equip Spell from your Deck to your hand.','Hidden Armory'),
('spiritual_retribution','Spiritual Retribution',70,'Once per Duel, you can Tribute Summon a Spirit monster by banishing monsters from your GY as the Tributes.','Stars Align Above the Shrine')]
CURSED=[
(1,'blood_crown','Blood Crown','Monsters you control gain 500 ATK. Once per turn, at the start of your End Phase, take 300 damage.','Axe of Despair'),
(2,'hollow_chalice','Hollow Chalice','Once per turn, at the start of your Standby Phase, gain 600 LP. Increase all damage you receive by 50% (rounded down).','Dian Keto the Cure Master'),
(3,'loaded_purse','Loaded Purse','Earn 60 additional coins after each victory. Your opponent starts each Duel with 4000 additional LP.','Jar of Greed'),
(4,'brittle_armor','Brittle Armor','Monsters you control gain 900 DEF, but lose 300 ATK.','Silver Bow and Arrow'),
(5,'cracked_sword','Cracked Sword','Monsters you control gain 300 ATK, but lose 1000 DEF.','Sword of Deep-Seated'),
(7,'starving_library','Starving Library','Draw 1 additional card for your normal draw during your Draw Phase. Your hand size limit is 3.','Pot of Greed'),
(8,'ashen_nursery','Ashen Nursery','Level 3 or lower monsters you control gain 700 ATK. Level 5 or higher monsters you control lose 700 ATK.','Baby Dragon'),
(9,'giants_oath',"Giant's Oath",'Level 5 or higher monsters you control gain 800 ATK. Level 4 or lower monsters you control lose 400 ATK.','Summoned Skull'),
(10,'commoners_chain',"Commoner's Chain",'Normal Monsters you control gain 300 ATK/DEF. Effect Monsters you control lose 200 ATK/DEF.','Kunai with Chain'),
(14,'zombies_bargain',"Zombie's Bargain",'Monsters you control gain 800 ATK. You cannot gain LP.','Vampire Lord'),
(16,'warriors_vow',"Warrior's Vow",'Monsters you control gain 200 ATK. You cannot manually change your monsters from Attack Position to Defense Position.','Axe Raider'),
(17,'ritual_scar','Ritual Scar','Monsters you control lose 500 ATK. They gain 100 ATK for each time you Ritual Summon a monster during this run, across all Duels.','Relinquished'),
(18,'fusion_fever','Fusion Fever','Fusion Monsters you control gain 1000 ATK and inflict piercing battle damage. You cannot Tribute Summon or Tribute Set monsters.','Polymerization'),
(19,'empty_hand_pact','Empty-Hand Pact','While your hand is empty, monsters you control gain 1000 ATK. Your hand size limit is reduced by 2 (min. 0).','Card Destruction'),
(20,'solitary_tyrant','Solitary Tyrant','While you control exactly 1 monster, it gains 400 ATK. While you control 2 or more monsters, they lose 500 ATK.','Dark Ruler Ha Des'),
(21,'crowded_crypt','Crowded Crypt','Monsters you control gain 75 ATK for each monster in your GY (max. 750). Your hand size limit is reduced by 4 (min. 0).','Call of the Haunted'),
(23,'glass_treasury','Glass Treasury','Earn 25% more victory coins (rounded down). You cannot recover LP between Duels.','Gamble'),
(24,'wounded_merchant','Wounded Merchant','Shop prices are reduced by 50%. You start each Duel with 1000 fewer LP (min. 1).','Goblin of Greed'),
(25,'rusted_compass','Rusted Compass','Each shop offers 2 additional regular relics. All shop prices are increased by 15%.','Different Dimension Capsule'),
(26,'cursed_refund','Cursed Refund','After buying a booster pack, receive a refund of 20 coins (up to its price minus 1). Single-card prices are increased by 50%.','Jar of Greed'),
(28,'collectors_burden',"Collector's Burden",'After each victory, add 2 additional random cards from the defeated opponent\'s Deck to your card pool. Your Main Deck minimum is 10 cards higher.','Card Destruction'),
(29,'golden_grave','Golden Grave','After each victory, earn 6 additional coins for each monster in your GY (max. 90). Monsters you control lose 400 DEF.','Foolish Burial'),
(33,'scorched_clock','Scorched Clock','Once per turn, at the start of your Standby Phase, inflict 400 damage to your opponent. Once per turn, at the start of your End Phase, take 300 damage.','Ookazi'),
(35,'duelists_wager',"Duelist's Wager",'Increase battle damage either player takes by 50% (rounded down).','Gamble'),
(37,'reckless_spear','Reckless Spear','Monsters you control can attack directly. They lose 1000 ATK.','Fairy Meteor Crush'),
(38,'nocturnal_guard','Nocturnal Guard','During your opponent\'s turn, monsters you control gain 600 DEF. During your turn, monsters you control lose 300 ATK.','Castle Walls'),
(40,'narrow_gate','Narrow Gate','Neither player can use the fourth or fifth Main Monster Zone or Spell & Trap Zone. Field Zones are unaffected.','Ground Collapse'),
(42,'trapbound_idol','Trapbound Idol','Your Trap Monsters cannot be destroyed by battle. You pay 300 LP to activate each Spell Card.','Embodiment of Apophis'),
(44,'iron_silence','Iron Silence',"Monsters you control gain 600 ATK/DEF, but their effects are negated. Negate all your monsters' activated effects everywhere.",'Skill Drain'),
(47,'blind_fortune','Blind Fortune','Earn 20 additional coins after each victory. You always go second.','Time Wizard'),
(48,'premature_triumph','Premature Triumph','You always go first. Your opening hand contains 2 fewer cards (min. 0).','Time Wizard'),
(49,'black_market_seal','Black Market Seal','Single-card prices are reduced by 40%. Booster-pack prices are increased by 40%.','Goblin of Greed'),
(52,'defense_proficiency','Defense Proficiency','Halve all damage you take (rounded down). Halve all battle damage your opponent takes (rounded down).','Spirit Barrier'),
(53,'singleton_pact','Singleton Pact','Your Main Deck minimum is always 20 cards. Your Deck can contain only 1 copy of each card.','Prohibition'),
(51,'jesters_coin',"Jester's Coin",'At the start of your Standby Phase, toss a coin. Heads: monsters you control gain 300 ATK/DEF until your next Standby Phase. Tails: they lose 300 ATK/DEF until then.','Fairy Box'),
(54,'blood_toll','Blood Toll','You pay with LP instead of coins: 10 LP for every coin a purchase or reroll costs, after discounts. You cannot pay if it would leave you below 1 LP.','Toll'),
# Thronior's picks from the 2026-10-29 cursed relic ideas.
(55,'berserkers_pact',"Berserker's Pact",'Monsters you control can make a second attack during each Battle Phase. You cannot Set monsters or Special Summon them in Defense Position.','Berserk Gorilla'),
(56,'shield_bash','Shield Bash','Defense Position monsters you control can attack, using their DEF for damage calculation. Attack Position monsters you control cannot attack.','Total Defense Shogun'),
(59,'reversed_remedy','Reversed Remedy','Each time either player would take effect damage or pay LP, they gain that much LP instead. Each time either player would gain LP during a Duel, they take that much damage instead.','Bad Reaction to Simochi'),
(61,'conscription_drum','Conscription Drum','You can Normal Summon or Set 1 additional monster each turn. Monsters you control cannot attack the turn they are Normal Summoned.','Ultimate Offering'),
# Eriko's suggestion (Discord, 2026-11-11), name and art as posted.
(63,'anime_rule_2','Anime Rule #2',"Each time you destroy an opponent's monster by card effect, inflict damage to your opponent equal to half its ATK. Monsters you control cannot attack directly.",'Mirror Force'),
(62,'ominous_clock','Ominous Clock',"At the start of your opponent's Standby Phase, inflict 600 damage to them. Every 10 turns, across all your duels, this drops by 100. Below 0, it heals them instead.",'Ominous Fortunetelling'),
# Iceman's "Duelist Kingdom Format" with the user's downside, and Kzulu's cursed reroll relic as the user reworded it
# (Discord, 2026-11-12). Anime Rule #3's art is mine; none was given.
(64,'anime_rule_3','Anime Rule #3','You can Normal Summon or Set Level 5 or higher monsters without Tributing. Monsters you control lose 1000 ATK and DEF unless you control a face-up Field Spell.','Mountain'),
(65,'cursed_restock','Cursed Restock','You get 2 free rerolls per shop. You can only buy one item per reroll.','Card Shuffle'),
# TRUANT's cursed relic (Discord, 2026-11-13), added as posted.
(66,'vampiric_contact','Vampiric Contact','Each time you destroy a monster by battle, gain 500 LP. Each time a monster you control is destroyed by battle, you lose LP equal to its ATK.',"Vampire's Domain")]
CURSED_IDS=tuple('cursed_'+r[1] for r in CURSED)
# How the cursed relic screen splits a relic into its upside and drawback, where the rules text alone does not
# split cleanly. Other relics split at ", but" or after their first sentence (experience-ui.js cursedParts).
CURSED_PARTS={
 'cursed_trapbound_idol':('Your Trap Monsters cannot be destroyed by battle.','You pay 300 LP to activate each Spell Card.'),
 'cursed_jesters_coin':('At the start of your Standby Phase, toss a coin. Heads: monsters you control gain 300 ATK/DEF until your next Standby Phase.','Tails: they lose 300 ATK/DEF until then.'),
 'glass_shard':('Coin rewards are doubled.','You start every duel with 2000 LP.'),
 'cursed_duelists_wager':('Battle damage you inflict is increased by 50%.','Battle damage you take is increased by 50%.'),
 'cursed_ominous_clock':("At the start of your opponent's Standby Phase, inflict 600 damage to them.",'Every 10 turns, across all your duels, this drops by 100. Below 0, it heals them instead.'),
 'cursed_narrow_gate':('Your opponent has only 3 Main Monster Zones and 3 Spell & Trap Zones.','You also have only 3 of each. Field Zones are unaffected.'),
 # The automatic split would leave "lose 300 ATK." or "They ..." on its own, or put Ritual Scar's drawback first.
 'cursed_brittle_armor':('Monsters you control gain 900 DEF.','Monsters you control lose 300 ATK.'),
 'cursed_cracked_sword':('Monsters you control gain 300 ATK.','Monsters you control lose 1000 DEF.'),
 'cursed_iron_silence':('Monsters you control gain 600 ATK/DEF.',"Their effects are negated. Negate all your monsters' activated effects everywhere."),
 'cursed_reckless_spear':('Monsters you control can attack directly.','Monsters you control lose 1000 ATK.'),
 'cursed_ritual_scar':('Monsters you control gain 100 ATK for each time you Ritual Summon a monster during this run, across all Duels.','Monsters you control lose 500 ATK.'),
}

def install(artifact):
 for key,name,price,text,art in REGULAR:artifact(key,name,price,text,art,'approved_'+key,0,'economy')
 for number,key,name,text,art in CURSED:artifact('cursed_'+key,name,0,text,art,'approved_'+key,0,'offense')

# Relics no longer in the game. Saved runs and Tag rooms can still hold them, so drop them on load.
REMOVED=frozenset({'purse','cursed_shared_hex','cursed_champions_burden','ominous_clock'})

def drop_removed(run):
 run['artifacts']=[a for a in run.get('artifacts',[]) if a not in REMOVED]
 run['cursed_artifacts']=[a for a in run.get('cursed_artifacts',[]) if a not in REMOVED]
 run['shop']=[item for item in run.get('shop',[]) if not (item.get('kind')=='artifact' and item.get('id') in REMOVED)]
 if run.get('mirror_copy') in REMOVED:run.pop('mirror_copy',None)
 if run.get('starting_relic') in REMOVED:run['starting_relic']='none'

def has(run,key):
 if run.get('challenge_level')==-1:return False
 if key in run.get('artifacts',[]) or run.get('mirror_copy')==key:return True
 from relic_fusions import includes
 return includes(run,key)

def encounter_key(run):return str(run.get('loop',0))+':'+str(run.get('round',0))

def free_use(run,relic,kind):return has(run,relic) and run.get('jar_'+kind+'_used')!=encounter_key(run)

def use_free(run,kind):run['jar_'+kind+'_used']=encounter_key(run)

# Cursed Restock (2026-11-12): 2 free rerolls in each shop, counted per encounter like Dice Jar's, and one purchase per
# stock. Greed's free relic is not a purchase.
def restock_free_left(run):
 if not has(run,'cursed_cursed_restock'):return 0
 used=run.get('restock_rerolls') or {}
 return max(0,2*copies(run,'cursed_cursed_restock')-(int(used.get('n',0)) if used.get('at')==encounter_key(run) else 0))

def use_restock_free(run):
 used=run.get('restock_rerolls') or {}
 run['restock_rerolls']={'at':encounter_key(run),'n':(int(used.get('n',0)) if used.get('at')==encounter_key(run) else 0)+1}

def restock_locked(run,item):return bool(run.get('restock_bought')) and has(run,'cursed_cursed_restock') and not item.get('greed') and not item.get('sold')

def copies(run,key):return 0 if run.get('challenge_level')==-1 else run.get('artifacts',[]).count(key)+int(run.get('mirror_copy')==key)

def minimum(run):
 from content import BOSS_EVERY, fixed_deck
 if fixed_deck(run):return 20
 # Derive from completed rounds so existing saves and repeat loops agree.
 progress=run.get('secret_deck_minimum',40) if run.get('secret_challenge') else 40 if run.get('loop',0)>0 else min(40,20+10*(max(0,run.get('round',0))//BOSS_EVERY))
 if has(run,'cursed_singleton_pact'):return 20
 # A secret challenge keeps its own minimum, so Deck Thinning does not lower it.
 thinning=0 if run.get('secret_challenge') else copies(run,'deck_thinning')
 return max(20,progress+10*copies(run,'cursed_collectors_burden')-10*thinning)

def copy_limit(run):
 """Copies of one card a deck may hold; None means no limit (Broken Limiter)."""
 if 'broken_limiter' in run.get('artifacts',[]):return None
 return 1 if has(run,'cursed_singleton_pact') else 3

# Relics that ask for a choice when acquired; Tag Duels and Magic Mirror never use them.
CHOICE_RELICS=('relic_picker','card_picker','name_changer','weighted_coins','weighted_dice')
CONSUMED_RELICS=('relic_picker','card_picker')

# The opening hand can go down to 0 cards (user, 2026-11-11), like the hand size limit.
def opening(run,normal):return max(0,normal-2*copies(run,'cursed_premature_triumph'))

def first(run,random_first):
 reconcile_turn_order(run)
 if has(run,'cursed_blind_fortune'):return 1
 if has(run,'cursed_premature_triumph'):return 0
 return random_first

def heal_scale(run):return .5**copies(run,'undying_legion')

def can_heal(run,between=False):return not has(run,'cursed_zombies_bargain') and not (between and has(run,'cursed_glass_treasury'))

def price_mult(run):return (.5**copies(run,'cursed_wounded_merchant'))*(1.15**copies(run,'cursed_rusted_compass'))*(.85**copies(run,'grand_bazaar'))

def price(run,kind,value):
 mult=price_mult(run)
 if kind=='single':mult*=1.5**copies(run,'cursed_cursed_refund')*.6**copies(run,'cursed_black_market_seal')
 if kind=='pack':mult*=1.4**copies(run,'cursed_black_market_seal')
 return max(1,round(value*mult))

def eligible(run,key):
 if key in REMOVED or key in run.get('blocked_cursed',[]):return False
 from content import CHARACTERS, fixed_deck
 fixed=CHARACTERS[run.get('character',0)]
 if (fixed.get('copycat') or fixed.get('engine_deck')) and key in {'cursed_cursed_refund','cursed_black_market_seal'}:return False
 if key=='cursed_collectors_burden':
  if run.get('round',0)<6 or has(run,'cursed_singleton_pact'):return False
  # Never impose an impossible minimum on the two characters with fixed decks.
  if fixed_deck(run):return False
  import campaign
  from collections import Counter
  if sum(min(3,n) for n in Counter(campaign.card_identity(c) for c in run.get('pool',[]) if not campaign.is_extra(c)).values())<minimum(run)+10:return False
 if key=='cursed_singleton_pact':
  # Its fixed 20-card minimum would cancel these, and highlander needs 20 different cards.
  if fixed_deck(run) or run.get('history_mode')=='tag' or run.get('secret_challenge'):return False
  if 'broken_limiter' in run.get('artifacts',[]) or has(run,'cursed_collectors_burden'):return False
  import campaign
  if len({campaign.card_identity(c) for c in run.get('pool',[]) if not campaign.is_extra(c)})<20:return False
 if key=='cursed_blind_fortune' and has(run,'cursed_premature_triumph'):return False
 # Tag shops are shared and locked in together, so a one-purchase limit has no clear owner there.
 if key=='cursed_cursed_restock' and run.get('history_mode')=='tag':return False
 # Zombie's Bargain's own reversal would cancel Reversed Remedy's in the core.
 if key=='cursed_reversed_remedy' and has(run,'cursed_zombies_bargain'):return False
 if key=='cursed_zombies_bargain' and has(run,'cursed_reversed_remedy'):return False
 if key=='cursed_premature_triumph' and has(run,'cursed_blind_fortune'):return False
 return True

def rewards(run,events,boss):
 out={}
 for key,name in [('loaded_purse','Loaded Purse'),('blind_fortune','Blind Fortune')]:
  if has(run,'cursed_'+key):out[name]=(60 if key=='loaded_purse' else 20)*copies(run,'cursed_'+key)
 if has(run,'tribute_dividend'):
  summons=sum(e.get('kind')=='summon' and e.get('method')=='tribute' for e in events)
  hints=sum(e.get('kind')=='tribute_dividend' for e in events)
  count=summons or hints//max(1,copies(run,'tribute_dividend')) # Each relic copy emits its own fallback hint.
  if count:out['Tribute Dividend']=15*count*copies(run,'tribute_dividend')
 if has(run,'overkill_bounty'):
  # The client reports how far the final blow went past the opponent's remaining LP (duel.js 'overkill').
  excess=next((int(e.get('amount',0)) for e in reversed(events) if e.get('kind')=='overkill'),0)
  if excess>=1000:out['Overkill Bounty']=20*(excess//1000)*copies(run,'overkill_bounty')
 if has(run,'cursed_golden_grave'):
  n=next((e.get('grave_monsters',0) for e in reversed(events) if e.get('kind')=='duel_metrics'),0)
  out['Golden Grave']=min(90,6*n)*copies(run,'cursed_golden_grave')
 return out


def reconcile_turn_order(run):
 pair={'cursed_blind_fortune','cursed_premature_triumph'}
 found=[a for a in run.get('artifacts',[]) if a in pair]
 if not found:return
 newest=found[-1]
 for field in ('artifacts','cursed_artifacts'):
  if field in run:run[field]=[a for a in run[field] if a not in pair or a==newest]
 if run.get('mirror_copy') in pair and run['mirror_copy']!=newest:run.pop('mirror_copy',None)


def mirror_view(run):
 """Relic Mirror's copied relics, shaped like a run so the usual relic rules can read them."""
 keys=run.get('mirrored_relics',[]) if 'relic_mirror' in run.get('curses',[]) else []
 return dict(run,artifacts=list(keys),curses=[],boss_curse=None,mirrored_relics=[],first_player=0,mirror_copy=run.get('mirror_copy') if 'magic_mirror' in keys else None,mirror_only=True)

def duel_run(run):
 """A duel-only view; never remove owned relics from the saved campaign."""
 if run.get('challenge_level')==-1:return dict(run,artifacts=[],curses=[],boss_curse=None,mirror_copy=None,duel_modifications=[],relics_suppressed=True)
 if 'relic_seal' not in run.get('curses',[]):return run
 return dict(run,artifacts=[],mirror_copy=None,duel_modifications=[],relics_suppressed=True)

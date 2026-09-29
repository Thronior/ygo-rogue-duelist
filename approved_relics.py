"""Approved September relics. Cursed IDs are never stocked as regular artifacts."""
# id, name, price, rules text, illustration
REGULAR=[
('second_wind','Second Wind',110,'Once per Duel, at the start of your End Phase, if your hand is empty, draw 2 cards.','Pot of Greed'),
('grave_lantern','Grave Lantern',80,'Monsters you control gain 100 DEF for each monster in your GY (max. 800).','Spirit of the Pharaoh'),
('ritual_vestment','Ritual Vestment',85,'Ritual Monsters you control gain 300 ATK/DEF.','Black Illusion Ritual'),
('fusion_insignia','Fusion Insignia',85,'Fusion Monsters you control gain 300 ATK/DEF.','Polymerization'),
('tribute_dividend','Tribute Dividend',75,'If you successfully Tribute Summon during a Duel, earn 15 additional coins if you win that Duel.','Soul Exchange'),
('patient_guardian','Patient Guardian',90,'Once per turn, at the start of your Standby Phase, if you control no Attack Position monsters, gain 300 LP.','Waboku'),
('healing_echo','Healing Echo',100,'Each time you gain LP by a card effect other than this relic, gain 200 additional LP.','Dian Keto the Cure Master'),
('trap_weaver','Trap Weaver',80,'Trap Monsters you control gain 400 ATK/DEF.','Embodiment of Apophis'),
('twin_banner','Twin Banner',85,'While you control exactly 2 monsters with different Types, they gain 200 ATK/DEF.','United We Stand'),
('quiet_library','Quiet Library',80,'Once per turn, at the start of your End Phase, if you did not declare an attack this turn, gain 250 LP.','Solemn Wishes'),
('prospector_lens',"Prospector's Lens",80,'Each shop visit and reroll offers 1 additional general-stock single.','The Eye of Truth')]
CURSED=[
(1,'blood_crown','Blood Crown','Monsters you control gain 500 ATK. Once per turn, at the start of your End Phase, take 300 damage.','Axe of Despair'),
(2,'hollow_chalice','Hollow Chalice','Once per turn, at the start of your Standby Phase, gain 600 LP. Halve battle damage you inflict.','Dian Keto the Cure Master'),
(3,'loaded_purse','Loaded Purse','Earn 20 additional coins after each victory. Your opponent starts each Duel with 2000 additional LP.','Jar of Greed'),
(4,'brittle_armor','Brittle Armor','Monsters you control gain 900 DEF, but lose 300 ATK.','Silver Bow and Arrow'),
(5,'cracked_sword','Cracked Sword','Monsters you control gain 300 ATK, but lose 400 DEF.','Sword of Deep-Seated'),
(7,'starving_library','Starving Library','Draw 1 additional card for your normal draw during your Draw Phase. Your hand size limit is 3.','Pot of Greed'),
(8,'ashen_nursery','Ashen Nursery','Level 3 or lower monsters you control gain 700 ATK. Level 5 or higher monsters you control lose 700 ATK.','Baby Dragon'),
(9,'giants_oath',"Giant's Oath",'Level 5 or higher monsters you control gain 800 ATK. Level 4 or lower monsters you control lose 400 ATK.','Summoned Skull'),
(10,'commoners_chain',"Commoner's Chain",'Normal Monsters you control gain 300 ATK/DEF. Effect Monsters you control lose 200 ATK/DEF.','Kunai with Chain'),
(14,'zombies_bargain',"Zombie's Bargain",'Monsters you control gain 400 ATK. You cannot gain LP.','Vampire Lord'),
(16,'warriors_vow',"Warrior's Vow",'Monsters you control gain 200 ATK. You cannot manually change your monsters from Attack Position to Defense Position.','Axe Raider'),
(17,'ritual_scar','Ritual Scar','Ritual Monsters you control gain 1000 ATK. Each time you Ritual Summon, take 1000 damage.','Relinquished'),
(18,'fusion_fever','Fusion Fever','Fusion Monsters you control gain 800 ATK. Each time you Fusion Summon, discard 1 card if possible.','Polymerization'),
(19,'empty_hand_pact','Empty-Hand Pact','While your hand is empty, monsters you control gain 1000 ATK. Your hand size limit is 4.','Card Destruction'),
(20,'solitary_tyrant','Solitary Tyrant','While you control exactly 1 monster, it gains 400 ATK. While you control 2 or more monsters, they lose 500 ATK.','Dark Ruler Ha Des'),
(21,'crowded_crypt','Crowded Crypt','Monsters you control gain 75 ATK for each monster in your GY (max. 750). Your opening hand contains 3 fewer cards (min. 1).','Call of the Haunted'),
(23,'glass_treasury','Glass Treasury','Earn 25% more victory coins (rounded down). You cannot recover LP between Duels.','Gamble'),
(24,'wounded_merchant','Wounded Merchant','Shop prices are reduced by 50%. You start each Duel with 1000 fewer LP (min. 1).','Goblin of Greed'),
(25,'rusted_compass','Rusted Compass','Each shop offers 2 additional regular relics. All shop prices are increased by 15%.','Different Dimension Capsule'),
(26,'cursed_refund','Cursed Refund','After buying a booster pack, receive a refund of 20 coins (up to its price minus 1). Single-card prices are increased by 50%.','Jar of Greed'),
(28,'collectors_burden',"Collector's Burden",'After each victory, add 2 additional random cards from the defeated opponent\'s Deck to your card pool. Your Main Deck must contain at least 40 cards.','Card Destruction'),
(29,'golden_grave','Golden Grave','After each victory, earn 2 additional coins for each monster in your GY (max. 30). Monsters you control lose 200 DEF.','Foolish Burial'),
(33,'scorched_clock','Scorched Clock','Once per turn, at the start of your Standby Phase, inflict 400 damage to your opponent. Once per turn, at the start of your End Phase, take 300 damage.','Ookazi'),
(35,'duelists_wager',"Duelist's Wager",'Increase battle damage either player takes by 50% (rounded down).','Gamble'),
(37,'reckless_spear','Reckless Spear','If a monster you control attacks a Defense Position monster, inflict piercing battle damage. Increase battle damage you take by 50% (rounded down).','Fairy Meteor Crush'),
(38,'nocturnal_guard','Nocturnal Guard','During your opponent\'s turn, monsters you control gain 600 DEF. During your turn, monsters you control lose 300 ATK.','Castle Walls'),
(40,'narrow_gate','Narrow Gate','Neither player can use the fourth or fifth Main Monster Zone or Spell & Trap Zone. Field Zones are unaffected.','Ground Collapse'),
(42,'trapbound_idol','Trapbound Idol','Trap Monsters you control gain 1000 ATK/DEF. Other monsters you control lose 300 ATK.','Embodiment of Apophis'),
(44,'iron_silence','Iron Silence','Monsters you control gain 600 ATK/DEF, but their effects are negated. Negate your activated monster effects in all locations.','Skill Drain'),
(47,'blind_fortune','Blind Fortune','Earn 20 additional coins after each victory. You always go second.','Time Wizard'),
(48,'premature_triumph','Premature Triumph','You always go first. Your opening hand contains 2 fewer cards (min. 1).','Time Wizard'),
(49,'black_market_seal','Black Market Seal','Single-card prices are reduced by 40%. Booster-pack prices are increased by 40%.','Goblin of Greed'),
(50,'champions_burden',"Champion's Burden",'Earn 60 additional coins after each boss victory. During boss Duels, monsters your opponent controls gain 300 ATK/DEF.','Blue-Eyes White Dragon')]
CURSED_IDS=tuple('cursed_'+r[1] for r in CURSED)

def install(artifact):
 for key,name,price,text,art in REGULAR:artifact(key,name,price,text,art,'approved_'+key,0,'economy')
 for number,key,name,text,art in CURSED:artifact('cursed_'+key,name,0,text,art,'approved_'+key,0,'offense')

def has(run,key):return run.get('challenge_level')!=-1 and (key in run.get('artifacts',[]) or run.get('mirror_copy')==key)

def copies(run,key):return 0 if run.get('challenge_level')==-1 else run.get('artifacts',[]).count(key)+int(run.get('mirror_copy')==key)

def minimum(run):return 40 if has(run,'cursed_collectors_burden') else 20

def opening(run,normal):return max(1,normal-3*copies(run,'cursed_crowded_crypt')-2*copies(run,'cursed_premature_triumph'))

def first(run,random_first):
 reconcile_turn_order(run)
 if has(run,'cursed_blind_fortune'):return 1
 if has(run,'cursed_premature_triumph'):return 0
 return random_first

def can_heal(run,between=False):return not has(run,'cursed_zombies_bargain') and not (between and has(run,'cursed_glass_treasury'))

def price(run,kind,value):
 mult=(.5**copies(run,'cursed_wounded_merchant'))*(1.15**copies(run,'cursed_rusted_compass'))
 if kind=='single':mult*=1.5**copies(run,'cursed_cursed_refund')*.6**copies(run,'cursed_black_market_seal')
 if kind=='pack':mult*=1.4**copies(run,'cursed_black_market_seal')
 return max(1,round(value*mult))

def eligible(run,key):
 if key in run.get('blocked_cursed',[]):return False
 if key=='cursed_collectors_burden':
  if run.get('round',0)<6:return False
  # Never impose an impossible minimum on the two characters with fixed decks.
  from content import CHARACTERS
  if CHARACTERS[run['character']].get('copycat') or CHARACTERS[run['character']].get('engine_deck'):return False
  import campaign
  from collections import Counter
  if sum(min(3,n) for n in Counter(campaign.card_identity(c) for c in run.get('pool',[]) if not campaign.is_extra(c)).values())<40:return False
 if key=='cursed_blind_fortune' and has(run,'cursed_premature_triumph'):return False
 if key=='cursed_premature_triumph' and has(run,'cursed_blind_fortune'):return False
 return True

def rewards(run,events,boss):
 out={}
 for key,name in [('loaded_purse','Loaded Purse'),('blind_fortune','Blind Fortune')]:
  if has(run,'cursed_'+key):out[name]=20*copies(run,'cursed_'+key)
 if has(run,'cursed_champions_burden') and boss:out["Champion's Burden"]=60*copies(run,'cursed_champions_burden')
 if has(run,'tribute_dividend') and any(e.get('kind')=='tribute_dividend' or e.get('kind')=='summon' and e.get('method')=='tribute' for e in events):out['Tribute Dividend']=15*copies(run,'tribute_dividend')
 if has(run,'cursed_golden_grave'):
  n=next((e.get('grave_monsters',0) for e in reversed(events) if e.get('kind')=='duel_metrics'),0)
  out['Golden Grave']=min(30,2*n)*copies(run,'cursed_golden_grave')
 return out


def reconcile_turn_order(run):
 pair={'cursed_blind_fortune','cursed_premature_triumph'}
 found=[a for a in run.get('artifacts',[]) if a in pair]
 if not found:return
 newest=found[-1]
 for field in ('artifacts','cursed_artifacts'):
  if field in run:run[field]=[a for a in run[field] if a not in pair or a==newest]
 if run.get('mirror_copy') in pair and run['mirror_copy']!=newest:run.pop('mirror_copy',None)


def duel_run(run):
 """A duel-only view; never remove owned relics from the saved campaign."""
 if run.get('challenge_level')==-1:return dict(run,artifacts=[],curses=[],boss_curse=None,mirror_copy=None,duel_modifications=[],relics_suppressed=True)
 if 'relic_seal' not in run.get('curses',[]):return run
 return dict(run,artifacts=[],mirror_copy=None,duel_modifications=[],relics_suppressed=True)

"""2026-11-13 Discord review: Good Spirits rework, Disturbed Sleep, Gadget Call, Gadget Stronghold, their fusion Gadget
Gadget, and the Rain of Mercy boss curse. Campaign side: prices, the fusion, the Stronghold kept in the Duel's Deck,
curse texts and rolls, and translations. The duel effects are tested in android/test_relics_nov13.mjs."""
import json,random,sys,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,content,storage,relic_fusions,relic_affinity,challenge_levels,feedback_update,passives
base=Path(tempfile.mkdtemp(prefix='relics-nov13-',dir=ROOT/'temp'));storage.ROOT=base;g.SAVE=base/'run.json'
profile=storage.profile();profile['unlocked']=list(content.PLAYABLE_IDS);storage.write(base/'profile.json',profile)
checks=0
def ok(value,why):
 global checks
 assert value,why;checks+=1

A=content.ARTIFACTS
ok(A['disturbed_sleep'][:2]==('Disturbed Sleep',80),'Disturbed Sleep costs 80')
ok(A['gadget_call'][:2]==('Gadget Call',90) and A['gadget_stronghold'][:2]==('Gadget Stronghold',70),'Gadget Call 90, Gadget Stronghold 70')
ok(A['gadget_gadget'][0]=='Gadget Gadget' and relic_fusions.RECIPES['gadget_gadget']==('gadget_call','gadget_stronghold'),'Gadget Gadget fuses the two')
ok(A['good_spirits'][1]==80 and 'do not have to return' in A['good_spirits'][2],'Good Spirits keeps its price, new text')
ok(content.ART_INFO['good_spirits']['effect']=='spirit_may_return','Good Spirits uses the optional return')

# Owning both Gadget relics fuses them; the pieces are used up.
run=g.new_run(0,random.Random(5),0);run['artifacts']+=['gadget_call','gadget_stronghold']
made=relic_fusions.fuse(run)
ok([m['relic'] for m in made]==['gadget_gadget'] and 'gadget_call' not in run['artifacts'] and 'gadget_gadget' in run['artifacts'],'the pieces fuse into Gadget Gadget')

# Gadget decks and Flip decks see these relics more often.
red=g.BY_NAME['Red Gadget'];fort=g.BY_NAME['Stronghold the Moving Fortress']
ok('gadget' in relic_affinity.card_tags(red) and 'gadget' in relic_affinity.card_tags(fort),'Gadgets and the Stronghold count for the Gadget relics')
ok(relic_affinity.RULES['disturbed_sleep'][0]==('flip',),'Disturbed Sleep leans on Flip monsters')

# Gadget Stronghold: a Stronghold is added to the Duel's Deck when the player left it out, as Metal Coating does.
STRONG=fort['id']
def duel_lua(artifacts):
 run=g.new_run(0,random.Random(2));run['artifacts']+=artifacts
 normals=[cid for cid,c in g.BY_ID.items() if c['data']['type']==0x11][:20]
 start=len(run['pool']);run['pool']+=normals+normals;run['selected']=list(range(start,len(run['pool'])))
 run.update(stage='draft');g.routes(run,random.Random(3));run['opponent']=run['routes'][0]
 g.prepare_duel(run,random.Random(4))
 return (g.RUNTIME/'puzzles/shadow-run.lua').read_text(encoding='utf8')
ok(f'Debug.AddCard({STRONG},0,0,LOCATION_DECK' in duel_lua(['gadget_stronghold']),'Gadget Stronghold puts a Stronghold in the Deck')
ok(f'Debug.AddCard({STRONG},0,0,LOCATION_DECK' not in duel_lua([]),'without the relic no Stronghold is added')

# Rain of Mercy: 400 LP, 800 when amplified; never rolled with Effect Reverser.
ok(content.CURSES['rain_of_mercy']==('Rain of Mercy',"At the start of your opponent's Standby Phase, they gain 400 LP."),'Rain of Mercy text')
ok(challenge_levels.curse_description({'challenge_level':2},'rain_of_mercy','x').endswith('they gain 800 LP.'),'amplified: 800 LP')
for level,amount in ((0,400),(2,800)):
 lua=passives.script({'artifacts':[],'cursed_artifacts':[],'curses':['rain_of_mercy'],'challenge_level':level},telemetry=False)
 ok(f'Duel.Recover(1,{amount},REASON_EFFECT)' in lua,f'level {level} heals the opponent {amount}')
seen=set()
for seed in range(3000):
 drawn=feedback_update.draw_curses(random.Random(seed),3)
 seen|=set(drawn)
 ok(not {'rain_of_mercy','effect_reverser'}<=set(drawn),'Rain of Mercy never comes with Effect Reverser')
 ok(not ('effect_reverser' in feedback_update.draw_curses(random.Random(seed),1,existing=['rain_of_mercy'])),'nor after it')
ok('rain_of_mercy' in seen,'Rain of Mercy is rolled')

# Every new text in all 8 languages.
texts=[A[k][0] for k in ('disturbed_sleep','gadget_call','gadget_stronghold','gadget_gadget')]+[A[k][2] for k in ('good_spirits','disturbed_sleep','gadget_call','gadget_stronghold','gadget_gadget')]
texts+=['Rain of Mercy',content.CURSES['rain_of_mercy'][1],challenge_levels.curse_description({'challenge_level':2},'rain_of_mercy','')]
for lang in ('de','es','fr','it','pt','ja','ko','zh'):
 bundle=json.loads((ROOT/f'android/web/i18n/{lang}.json').read_text(encoding='utf8'))['ui']
 for text in texts:ok(text in bundle,f'{lang}: {text}')
# TRUANT's relics: prices, the cursed relic, weights, custom art and translations.
import shop_rewards,cursed_relics
ok(A['armory_aid'][1]==70 and A['spiritual_retribution'][1]==70,'Armory Aid and Spiritual Retribution cost 70')
ok('cursed_vampiric_contact' in cursed_relics.approved(),'Vampiric Contact is a cursed relic')
ok('Once per Duel' in A['spiritual_retribution'][2],'Spiritual Retribution is once per Duel')
ok(relic_affinity.RULES['armory_aid'][0]==('equip',) and relic_affinity.RULES['spiritual_retribution'][0]==('spirit',) and relic_affinity.RULES['cursed_vampiric_contact'][0]==('heal',),'collection weights')
ok('armory_aid' in shop_rewards.CATEGORY_RELICS['equip'] and 'spiritual_retribution' in shop_rewards.CATEGORY_RELICS['spirit'],'shop categories')
art=json.loads((ROOT/'data/relic-custom-art.json').read_text(encoding='utf8'))
for key in ('armory_aid','spiritual_retribution','cursed_vampiric_contact'):ok((ROOT/'assets/relics'/art[key]).is_file(),key+' has its artwork')
for lang in ('de','es','fr','it','pt','ja','ko','zh'):
 bundle=json.loads((ROOT/f'android/web/i18n/{lang}.json').read_text(encoding='utf8'))['ui']
 for key in ('armory_aid','spiritual_retribution','cursed_vampiric_contact'):ok(A[key][0] in bundle and A[key][2] in bundle,f'{lang}: {A[key][0]}')
print('PASS Nov 13:',checks,'checks')

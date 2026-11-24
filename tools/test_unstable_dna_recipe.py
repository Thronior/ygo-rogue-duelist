"""Unstable DNA (Eriko, Discord 2026-11-21): DNA Rewrite + Kindred Bond + any 1 Surgery relic. Only the Surgery it uses is
spent, so spare Surgeries still count towards Attribute Mutation. Run: python -B tools/test_unstable_dna_recipe.py"""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import relic_fusions as f
import content
SURGERY=['attribute_'+a for a in ('light','dark','fire','water','wind','earth')]
def fused(artifacts):
 run={'artifacts':list(artifacts),'cursed_artifacts':[],'history_mode':'tag'};made=f.fuse(run);return made,run['artifacts']
# Both fixed pieces and 1 Surgery: fuses, using exactly one Surgery.
made,arts=fused(['dna_rewrite','kindred_bond','attribute_fire','attribute_dark'])
assert [m['relic'] for m in made]==['unstable_dna'] and len(arts)==2 and 'unstable_dna' in arts and arts[0] in ('attribute_fire','attribute_dark'),arts
# Missing a fixed piece: never fuses, whatever the Surgeries.
for missing in ('dna_rewrite','kindred_bond'):
 made,arts=fused([p for p in ['dna_rewrite','kindred_bond','attribute_fire'] if p!=missing])
 assert not made,made
# 2 spare Surgeries + the 3rd: Unstable DNA takes one, Attribute Mutation needs 3 of the rest.
made,arts=fused(['dna_rewrite','kindred_bond']+SURGERY[:4])
# Both fused relics then fuse into Genetic Override (user, 2026-11-24).
assert [m['relic'] for m in made]==['unstable_dna','attribute_mutation','genetic_override'] and arts==['genetic_override'],made
# Attribute Mutation already fused: a new Surgery still completes Unstable DNA instead of joining Attribute Mutation.
made,arts=fused(['attribute_mutation','dna_rewrite','kindred_bond','attribute_water'])
assert [m['relic'] for m in made]==['unstable_dna','genetic_override'] and 'attribute_water' not in arts,arts
# Once fused, a later Surgery is not absorbed by Unstable DNA.
made,arts=fused(['unstable_dna','attribute_wind'])
assert not made and 'attribute_wind' in arts,arts
# Price: its pieces' cost (DNA Rewrite + Kindred Bond + the cheapest Surgery).
name,price,text=content.ARTIFACTS['unstable_dna']
assert price==content.ARTIFACTS['dna_rewrite'][1]+content.ARTIFACTS['kindred_bond'][1]+min(content.ARTIFACTS[s][1] for s in SURGERY),price
assert content.ART_INFO['unstable_dna']['art']=='Swamp Mirrorer'
assert 'race=Duel.AnnounceRace(0,1,' in f.effect('fused_unstable_dna')
print('PASS Unstable DNA recipe: 2 fixed pieces + 1 Surgery, spare Surgeries kept, price',price)
# Offers: after Attribute Mutation, Surgeries come back only once DNA Rewrite and Kindred Bond are both owned.
assert f.absorbed({'artifacts':['attribute_mutation']},'attribute_fire')
assert f.absorbed({'artifacts':['attribute_mutation','dna_rewrite']},'attribute_fire')
assert not f.absorbed({'artifacts':['attribute_mutation','dna_rewrite','kindred_bond']},'attribute_fire')
assert not f.absorbed({'artifacts':['attribute_mutation']},'dna_rewrite') and f.absorbed({'artifacts':['unstable_dna']},'kindred_bond')
print('PASS Unstable DNA offers')

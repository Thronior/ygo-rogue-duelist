"""Permanent Golden Card Sleeve choices shared by solo and tag campaigns."""
def choices(run):
 cards=run.setdefault('golden_cards',[])
 if not cards and run.get('golden_card'):
  cards.append(run.pop('golden_card'))
 return cards

def pending(run):
 return max(0,run.get('artifacts',[]).count('golden_sleeve')-len(choices(run)))

def choose(run,card):
 card=int(card)
 if run.get('challenge_level')==-1 or not pending(run):raise ValueError('No Golden Card Sleeve is waiting for a choice.')
 if card not in [run['pool'][i] for i in run.get('selected',[])]:raise ValueError('Choose a card from your current deck.')
 if card in choices(run):raise ValueError('This card already has a permanent Golden Card Sleeve.')
 choices(run).append(card)

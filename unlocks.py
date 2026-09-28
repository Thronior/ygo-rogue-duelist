"""Cards and packs are permanently available; only characters have unlock rules.

The compatibility helpers remain shared by drafting, shops and old saves.
"""
PACK_RULES={}
CARD_RULES={}

def available(kind,key,p=None):return True

def card_allowed(card,p=None):return True

def entries():return iter(())

def award(profile,run,opponent=None):
 # Old collection unlock receipts are obsolete, not new achievement rewards.
 run['content_unlocks_earned']=[]

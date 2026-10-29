"""Run purchases: coins, or LP with the Blood Toll cursed relic (10 LP per coin, after every discount)."""
KEY='cursed_blood_toll';LP_PER_COIN=10
def in_lp(run):return KEY in run.get('artifacts',[]) and run.get('history_mode')!='tag'
def cost(run,coins):return coins*LP_PER_COIN if in_lp(run) else coins
def can_pay(run,coins):return coins<=0 or (run['lp']-coins*LP_PER_COIN>=1 if in_lp(run) else run['gold']>=coins)
def pay(run,coins,what='that'):
 """Charge a purchase; raises ValueError with the shortfall in the right currency."""
 if coins<=0:return
 if not can_pay(run,coins):raise ValueError(f'Not enough LP for {what}: it costs {coins*LP_PER_COIN} LP and you must keep 1.' if in_lp(run) else f'Not enough coins for {what}.')
 if in_lp(run):
  run['lp']-=coins*LP_PER_COIN;stats=run.setdefault('stats',{});stats['lp_spent']=stats.get('lp_spent',0)+coins*LP_PER_COIN
 else:run['gold']-=coins

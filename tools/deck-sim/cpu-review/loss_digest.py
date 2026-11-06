"""Condense card_trace.mjs duels into turn-by-turn digests: our choices (with the hand), battles, chain uses,
selections, the opponent's summons/chains and every damage line. Read the losses to find CPU mistakes.
Usage: python loss_digest.py <run dir> [glob, default *LOSS*.txt] > digest.txt
"""
import glob, re, sys, os
os.chdir(sys.argv[1])
pattern = sys.argv[2] if len(sys.argv) > 2 else '*LOSS*.txt'
for f in sorted(glob.glob(pattern)):
    t = open(f, encoding='utf8').read().split('\n')
    print('\n########', f)
    print(t[0])
    last_me = last_opp = None
    for i, l in enumerate(t):
        if l.startswith('=== Turn'):
            print(l.strip())
        elif l.startswith('  [IDLE'):
            me, opp, ch = t[i + 1].strip(), t[i + 2].strip(), t[i + 4].strip()
            hand = l.split('hand:')[1].strip()
            if ch.startswith('=> ') and ch not in ('=> 6', '=> 7', '=> to Battle', '=> END TURN'):
                print(f'   {ch[3:]:<40} | hand: {hand[:110]}')
            elif ch in ('=> 6', '=> 7'):
                print(f'   [{"to battle" if ch == "=> 6" else "end"}] {me[:120]}  VS  {opp[5:125]}')
        elif l.startswith('  [BATTLE]'):
            ch = l.split('=>')[1].strip()
            print(f'   BATTLE: {ch} | {t[i + 1].strip()[:110]}  VS  {t[i + 2].strip()[5:110]}')
        elif l.startswith('  [CHAIN') and not l.endswith('=> pass'):
            print('   ' + l.strip()[:160])
        elif re.match(r'\s+> (OPP|ME ) (summoning|spsummoning|chains)', l):
            print('     ' + l.strip()[:120])
        elif 'damage to' in l:
            print('     ' + l.strip())
        elif l.startswith('  [SELECT_CARD') or l.startswith('  [SELECT_TRIBUTE'):
            print('      ' + l.strip()[:170])

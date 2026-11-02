// Coins stop at 999,999 (campaign_expansion.py); from there the wallet reads as infinite. Display only.
export const MAX_COINS=999999;
export const coinLabel=n=>Number(n)>=MAX_COINS?'∞':Number(n||0).toLocaleString();

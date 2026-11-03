// One short tip for the loading screens. Keep these true: they repeat for every player.
export const LOADING_TIPS=[
 'Winning with exact lethal damage pays bonus coins.',
 'Summoning or activating your signature cards earns coins.',
 'Tribute Summoning high-Level monsters earns coins.',
 'Burn damage and healing both earn coins.',
 'Winning in fewer turns pays a bigger bonus.',
 'Character packs are usually better value than other packs.',
 'If you have the coins, reroll the shop for better relics.',
 'Reveal an opponent before you pick them, and prepare for their deck.',
 'Deck Spyglass shows every opponent\'s decklist.',
 'Keep some backrow removal in your deck.',
 'Hold a card in the deck editor to inspect it.',
 'Tap a monster in a duel to see which relics and cards are changing it.',
 'Clear a run to unlock the next Challenge Level for that character.',
 'Clear Challenge Level 2 with a character to unlock their second loadout.',
 'Change how big deck cards are under Settings, Display.'
];
export const loadingTip=(random=Math.random)=>LOADING_TIPS[Math.floor(random()*LOADING_TIPS.length)];

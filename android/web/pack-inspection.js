const ALL_CARD_PACKS = {
  'WC4-20': 'Spell',
  'WC4-21': 'Trap',
  'WC4-22': 'Effect Monster',
  'WC4-23': 'Monster',
  'WC4-24': '',
};

export function allCardsPackDescription(pack) {
  if (!pack || !Object.hasOwn(ALL_CARD_PACKS, pack.id)) return '';
  const category = ALL_CARD_PACKS[pack.id];
  return `This pack includes all ${category ? category + ' ' : ''}cards in the game.`;
}

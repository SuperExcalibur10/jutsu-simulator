export const RANKS = [
  { name: 'Accademia', min: 0, color: '#94A3B8' },
  { name: 'Genin', min: 200, color: '#22C55E' },
  { name: 'Chunin', min: 1000, color: '#3B82F6' },
  { name: 'Jonin', min: 3000, color: '#A855F7' },
  { name: 'Kage', min: 7000, color: '#F97316' }
];

export const getCurrentRank = (xp) => {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (xp >= RANKS[i].min) return RANKS[i];
  }
  return RANKS[0];
};

export const getNextRank = (xp) => {
  for (let i = 0; i < RANKS.length; i++) {
    if (xp < RANKS[i].min) return RANKS[i];
  }
  return null;
};

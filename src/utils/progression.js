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

export const MASTERY_LEVELS = [
  { level: 0, label: '—',        color: '#444',    min: 0  },
  { level: 1, label: 'Allievo',  color: '#cd7f32', min: 1  },
  { level: 2, label: 'Ninja',    color: '#94A3B8', min: 5  },
  { level: 3, label: 'Esperto',  color: '#FFD700', min: 15 },
  { level: 4, label: 'Maestro',  color: '#67e8f9', min: 30 },
  { level: 5, label: 'Leggenda', color: '#e879f9', min: 50 },
];

export const getMasteryLevel = (count) => {
  for (let i = MASTERY_LEVELS.length - 1; i >= 0; i--) {
    if (count >= MASTERY_LEVELS[i].min) return MASTERY_LEVELS[i];
  }
  return MASTERY_LEVELS[0];
};

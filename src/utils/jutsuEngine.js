export const JUTSUS = {
  HEAL: {
    id: 'HEAL',
    name: 'Shōsen Jutsu',
    subtitle: 'Palmo Mistico',
    character: 'Sakura · Tsunade',
    sequence: ['Pecora'],
    effectType: 'heal',
    color: '#10B981',
    glowColor: 'rgba(16,185,129,0.7)',
    kanji: '掌仙術',
    imageId: 'sakura_heal',
    minXp: 0
  },
  BUNSHIN: {
    id: 'BUNSHIN',
    name: 'Bunshin no Jutsu',
    subtitle: 'Moltiplicazione del Corpo',
    character: 'Naruto',
    sequence: ['Croce'],
    effectType: 'clone',
    color: '#C084FC',
    glowColor: 'rgba(192,132,252,0.6)',
    kanji: '分身の術',
    imageId: 'naruto_moltiplicazione',
    minXp: 0
  },
  KATON: {
    id: 'KATON',
    name: 'Katon · Gōkakyū',
    subtitle: 'Grande Sfera di Fuoco',
    character: 'Sasuke · Clan Uchiha',
    sequence: ['Serpente', 'Cavallo', 'Tigre'],
    effectType: 'fire',
    color: '#EF4444',
    glowColor: 'rgba(239,68,68,0.6)',
    kanji: '火遁・豪火球の術',
    imageId: 'sasuke_palla_di_fuoco',
    minXp: 0
  },
  RASENGAN: {
    id: 'RASENGAN',
    name: 'Rasengan',
    subtitle: 'Sfera Rotante',
    character: 'Naruto',
    sequence: ['Rana', 'Cinghiale', 'Ariete'],
    effectType: 'wind',
    color: '#F97316',
    glowColor: 'rgba(249,115,22,0.6)',
    kanji: '螺旋丸',
    imageId: 'naruto_rasengan',
    minXp: 0
  },
  CHIDORI: {
    id: 'CHIDORI',
    name: 'Chidori',
    subtitle: 'Mille Falchi',
    character: 'Sasuke · Kakashi',
    sequence: ['Bue', 'Lepre', 'Scimmia'],
    effectType: 'lightning',
    color: '#38BDF8',
    glowColor: 'rgba(56,189,248,0.6)',
    kanji: '千鳥',
    imageId: 'kakashi_mille_falchi',
    minXp: 600
  },
  KAGE_BUNSHIN: {
    id: 'KAGE_BUNSHIN',
    name: 'Kage Bunshin',
    subtitle: "Cloni d'Ombra",
    character: 'Naruto',
    sequence: ['Serpente', 'Ariete', 'Cane'],
    effectType: 'shadow',
    color: '#A855F7',
    glowColor: 'rgba(168,85,247,0.6)',
    kanji: '影分身の術',
    imageId: 'naruto_moltiplicazione',
    minXp: 1200
  },
  KUCHIYOSE: {
    id: 'KUCHIYOSE',
    name: 'Kuchiyose no Jutsu',
    subtitle: 'Tecnica del Richiamo',
    character: 'Jiraiya · Rospi del Monte Myoboku',
    sequence: ['Cinghiale', 'Cane', 'Uccello', 'Scimmia', 'Pecora'],
    effectType: 'summon',
    color: '#FCD34D',
    glowColor: 'rgba(252,211,77,0.6)',
    kanji: '口寄せの術',
    imageId: 'gamapunta',
    minXp: 2500
  },
  SUITON: {
    id: 'SUITON',
    name: 'Suiton · Suiryūdan',
    subtitle: 'Drago Acquatico',
    character: 'Kisame · Clan Hoshigaki',
    sequence: ['Bue', 'Scimmia', 'Uccello', 'Pecora', 'Cane', 'Tigre'],
    effectType: 'water',
    color: '#3B82F6',
    glowColor: 'rgba(59,130,246,0.6)',
    kanji: '水遁・水龍弾の術',
    imageId: 'kisame_drago_acquatico',
    minXp: 4500
  },
  TSUKUYOMI: {
    id: 'TSUKUYOMI',
    name: 'Tsukuyomi',
    subtitle: "Genjutsu dello Specchio Lunare",
    character: 'Itachi · Clan Uchiha',
    sequence: ['Tigre', 'Bue', 'Serpente'],
    effectType: 'sharingan',
    color: '#DC2626',
    glowColor: 'rgba(220,38,38,0.8)',
    kanji: '月読',
    imageId: 'itachi_susanoo',
    minXp: 6000
  },
  SUSANOO: {
    id: 'SUSANOO',
    name: 'Susanoo',
    subtitle: 'Armatura Spettrale',
    character: 'Itachi · Clan Uchiha',
    sequence: ['Tigre', 'Cinghiale', 'Serpente', 'Ariete'],
    effectType: 'susanoo',
    color: '#A855F7',
    glowColor: 'rgba(168,85,247,0.8)',
    kanji: '須佐能乎',
    imageId: 'itachi_susanoo',
    minXp: 8000
  },
  SHINRA_TENSEI: {
    id: 'SHINRA_TENSEI',
    name: 'Shinra Tensei',
    subtitle: 'Sottomissione Celestiale',
    character: 'Pain · Sei Sentieri',
    sequence: ['Ariete', 'Serpente', 'Tigre', 'Uccello'],
    effectType: 'push',
    color: '#FFFFFF',
    glowColor: 'rgba(255,255,255,0.8)',
    kanji: '神羅天征',
    imageId: 'pain_shinratensei',
    minXp: 12000
  }
};

// All unique seals needed across all jutsu
export const SEALS_LIST = [...new Set(
  Object.values(JUTSUS).flatMap(j => j.sequence)
)];

export const BOSSES = {
  orochimaru: { name: 'Orochimaru', maxHp: 150, minXp: 0,    specialAttack: 'Spada delle Mille Foglie', specialDamage: 25, weakness: 'fire'      },
  pain:        { name: 'Pain',        maxHp: 175, minXp: 1000, specialAttack: 'Shinra Tensei',            specialDamage: 30, weakness: 'wind'      },
  obito:       { name: 'Obito',       maxHp: 175, minXp: 3000, specialAttack: 'Kamui',                    specialDamage: 30, weakness: 'lightning' },
  madara:      { name: 'Madara',      maxHp: 200, minXp: 7000, specialAttack: 'Meteora Celeste',          specialDamage: 35, weakness: 'shadow'    },
  kaguya:      { name: 'Kaguya',      maxHp: 200, minXp: 9000, specialAttack: 'Cenere Polverizzatrice',   specialDamage: 40, weakness: 'push'      },
};

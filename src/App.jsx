import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import WebcamView from './components/WebcamView';
import JutsuEffect from './components/JutsuEffect';
import Leaderboard from './components/Leaderboard';
import ProfileStats from './components/ProfileStats';
import { auth, googleProvider, db } from './lib/firebase';
import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { extractFeatures, classifySeal } from './utils/sealClassifier';
import { JUTSUS, SEALS_LIST, BOSSES } from './utils/jutsuEngine';
import { getCurrentRank, getNextRank, getMasteryLevel } from './utils/progression';
import { ACHIEVEMENTS } from './utils/achievements';

const ASSET_V = Date.now(); // stable cache-bust token — computed once at module load

const SEAL_HOLD_FRAMES = 10;
const STORAGE_KEY_SEALS = 'jutsu_sim_v4_seals';
const STORAGE_KEY_XP = 'jutsu_sim_v4_xp';
const STORAGE_KEY_MASTERY = 'jutsu_sim_v4_mastery';
const STORAGE_KEY_ACHIEVEMENTS = 'jutsu_sim_v4_achievements';
const STORAGE_KEY_STATS = 'jutsu_sim_v4_stats';
const STORAGE_KEY_VOLUME = 'jutsu_sim_v4_volume';

const DEFAULT_STATS = { totalJutsus: 0, wins: 0, losses: 0, jutsuCounts: {}, fastestJutsu: null };
const DEFAULT_VOLUME = { music: 0.25, effects: 0.5 };

const BACKGROUND_MUSIC = [
  { title: "Blue Bird", file: "/sounds/Blue Bird.mp3" },
  { title: "Distance", file: "/sounds/Distance.mp3" },
  { title: "Haruka Kanata", file: "/sounds/Haruka Kanata.mp3" },
  { title: "Hero's Come Back", file: "/sounds/Hero's come back.mp3" },
  { title: "Itachi's Theme", file: "/sounds/Itachi's theme.mp3" },
  { title: "Naruto Italian Opening", file: "/sounds/Naruto Italian Opening.mp3" },
  { title: "Rhapsody of Youth", file: "/sounds/Rhapsody of Youth.mp3" },
  { title: "Sign", file: "/sounds/Sign.mp3" },
  { title: "Silhouette", file: "/sounds/Silhouette.mp3" }
];

function App() {
  /* ── Core state ─────────────────────────────── */
  const [calibratedSeals, setCalibratedSeals] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SEALS);
      return saved ? JSON.parse(saved) : {};
    } catch {
      localStorage.removeItem(STORAGE_KEY_SEALS);
      return {};
    }
  });
  const calibratedSealsRef = useRef(calibratedSeals);
  const currentFeaturesBufferRef = useRef(null);

  // mode: 'jutsu-select' | 'calibration' | 'perform' | 'effect'
  const [mode, setMode] = useState('jutsu-select');
  const [user, setUser] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [selectedForRecal, setSelectedForRecal] = useState(new Set());
  const chakraFillRef = useRef(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  /* ── Progression state ──────────────────────── */
  const [totalXp, setTotalXp] = useState(() => {
    const parsed = parseInt(localStorage.getItem(STORAGE_KEY_XP), 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  });
  const [lastXpEarned, setLastXpEarned] = useState(0);
  const [showXpPopup, setShowXpPopup] = useState(false);
  const [xpPopupTitle, setXpPopupTitle] = useState('TECNICA COMPLETATA!');
  const performanceStartTimeRef = useRef(0);

  /* ── Mastery / Achievements / Stats ────────────── */
  const [jutsuMastery, setJutsuMastery] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY_MASTERY) || '{}'); } catch { return {}; }
  });
  const [achievements, setAchievements] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY_ACHIEVEMENTS) || '[]'); } catch { return []; }
  });
  const [stats, setStats] = useState(() => {
    try { return { ...DEFAULT_STATS, ...JSON.parse(localStorage.getItem(STORAGE_KEY_STATS) || '{}') }; } catch { return DEFAULT_STATS; }
  });
  const [newAchievement, setNewAchievement] = useState(null);

  /* ── Volume ─────────────────────────────────────── */
  const [volume, setVolume] = useState(() => {
    try { return { ...DEFAULT_VOLUME, ...JSON.parse(localStorage.getItem(STORAGE_KEY_VOLUME) || '{}') }; } catch { return DEFAULT_VOLUME; }
  });
  const [showVolumePanel, setShowVolumePanel] = useState(false);

  /* ── Connectivity ───────────────────────────────── */
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  /* ── Battle state ───────────────────────────── */
  const [battle, setBattle] = useState({
    active: false,
    enemy: null,
    userHp: 100,
    userMaxHp: 100,
    enemyHp: 100,
    enemyMaxHp: 100,
    timer: 0,
    turn: 'player',
    status: '',
    damageFlash: false
  });
  
  const [selectedJutsu, setSelectedJutsu] = useState(null);
  const selectedJutsuRef = useRef(null);

  /* ── Calibration state ──────────────────────── */
  const [calibrationQueue, setCalibrationQueue] = useState([]);
  const [calibrationIndex, setCalibrationIndex] = useState(0);
  const [countdown, setCountdown] = useState(null);
  const [lastCaptured, setLastCaptured] = useState(false);
  const captureInProgressRef = useRef(false);

  /* ── Performance (guided sequence) state ────── */
  const [sequenceStep, setSequenceStep] = useState(0);  // which seal in the sequence we're waiting for
  const [stepFlash, setStepFlash] = useState(false);    // green flash when step confirmed
  const sealHoldCountRef = useRef(0);                   // consecutive frames same seal detected
  const sequenceStepRef = useRef(0);

  /* ── Jutsu effect ───────────────────────────── */
  const [activeJutsu, setActiveJutsu] = useState(null);

  /* ── Music state ────────────────────────────── */
  const [currentSong, setCurrentSong] = useState(null);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const audioRef = useRef(new Audio());
  const musicStartedRef = useRef(false);

  /* ── Derived state refs (always-fresh reads inside callbacks) ── */
  const battleRef = useRef(battle);
  const modeRef = useRef(mode);
  const totalXpRef = useRef(totalXp);
  const rankClicksRef = useRef([]);
  const jutsuMasteryRef = useRef(jutsuMastery);
  const achievementsRef = useRef(achievements);
  const statsRef = useRef(stats);

  /* ── Keep refs in sync ──────────────────────── */
  useEffect(() => { calibratedSealsRef.current = calibratedSeals; }, [calibratedSeals]);
  useEffect(() => { selectedJutsuRef.current = selectedJutsu; }, [selectedJutsu]);
  useEffect(() => { sequenceStepRef.current = sequenceStep; }, [sequenceStep]);
  useEffect(() => { battleRef.current = battle; }, [battle]);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { totalXpRef.current = totalXp; }, [totalXp]);
  useEffect(() => { jutsuMasteryRef.current = jutsuMastery; }, [jutsuMastery]);
  useEffect(() => { achievementsRef.current = achievements; }, [achievements]);
  useEffect(() => { statsRef.current = stats; }, [stats]);

  /* ── Music Logic ────────────────────────────── */
  const playRandom = useCallback(() => {
    const randomSong = BACKGROUND_MUSIC[Math.floor(Math.random() * BACKGROUND_MUSIC.length)];
    setCurrentSong(randomSong);
    audioRef.current.src = randomSong.file;
    audioRef.current.volume = volume.music;
    audioRef.current.play()
      .then(() => { setIsMusicPlaying(true); musicStartedRef.current = true; })
      .catch(() => {
        const startOnInteract = () => {
          if (!musicStartedRef.current) {
            audioRef.current.play().then(() => setIsMusicPlaying(true));
            musicStartedRef.current = true;
          }
          window.removeEventListener('click', startOnInteract);
        };
        window.addEventListener('click', startOnInteract);
      });
  }, [volume.music]);

  const toggleMusic = useCallback(() => {
    if (audioRef.current.paused) {
      audioRef.current.play();
      setIsMusicPlaying(true);
    } else {
      audioRef.current.pause();
      setIsMusicPlaying(false);
    }
  }, []);

  const skipMusic = useCallback(() => {
    playRandom();
  }, [playRandom]);

  useEffect(() => {
    const audio = audioRef.current;
    audio.onended = playRandom;
    playRandom();

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []); // Only on mount
  /* ── Volume sync ───────────────────────────── */
  useEffect(() => { audioRef.current.volume = volume.music; }, [volume.music]);

  /* ── Online / Offline ───────────────────────── */
  useEffect(() => {
    const up = () => setIsOnline(true);
    const down = () => setIsOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);

  /* ── Achievement helper ─────────────────────── */
  const unlockAchievement = useCallback((id) => {
    if (achievementsRef.current.includes(id)) return;
    const updated = [...achievementsRef.current, id];
    setAchievements(updated);
    achievementsRef.current = updated;
    localStorage.setItem(STORAGE_KEY_ACHIEVEMENTS, JSON.stringify(updated));
    const ach = ACHIEVEMENTS.find(a => a.id === id);
    if (ach) setNewAchievement(ach);
  }, [setAchievements, setNewAchievement]);

  /* ── Achievement: all seals calibrated ──────── */
  useEffect(() => {
    if (Object.keys(calibratedSeals).length >= SEALS_LIST.length) unlockAchievement('seal_calibrator');
  }, [calibratedSeals, unlockAchievement]);

  /* ── Achievement: XP rank milestones ─────────── */
  useEffect(() => {
    if (totalXp >= 7000) unlockAchievement('kage_rank');
  }, [totalXp, unlockAchievement]);

  /* ── Init: Firebase Auth Listener ──────────── */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          setUser(firebaseUser);
          setPlayerName(firebaseUser.displayName);
          setShowLoginPrompt(false);
          
          // Sync with Firestore
          const userRef = doc(db, 'players', firebaseUser.uid);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const cloudData = userSnap.data();
            const cloudXp = cloudData.xp || 0;
            if (cloudData.name) {
              setPlayerName(cloudData.name);
            }
            // Usa sempre i dati del cloud per gli account esistenti (previene ereditarietà tra account)
            setTotalXp(cloudXp);
            localStorage.setItem(STORAGE_KEY_XP, cloudXp.toString());
          } else {
            // Create user in Firestore — use XP already in state (from lazy localStorage init)
            const localXp = totalXpRef.current;
            const isAdmin = firebaseUser.email === import.meta.env.VITE_ADMIN_EMAIL;
            await setDoc(userRef, {
              name: firebaseUser.displayName,
              xp: localXp,
              rank: getCurrentRank(localXp).name,
              photo: firebaseUser.photoURL,
              isHidden: isAdmin,
              lastSeen: new Date()
            });
          }
        } else {
          setUser(null);
          setPlayerName('');
          setShowLoginPrompt(true);
        }
      } catch (error) {
        console.error("Errore durante la sincronizzazione utente:", error);
      } finally {
        setIsAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = useCallback(async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed:", error);
      alert("Errore durante il login con Google. Riprova.");
    }
  }, []);

  const handleLogout = useCallback(() => {
    signOut(auth);
    setTotalXp(0);
    localStorage.removeItem(STORAGE_KEY_XP);
  }, []);

  const syncXpToCloud = useCallback(async (newTotal) => {
    if (user) {
      const userRef = doc(db, 'players', user.uid);
      try {
        await setDoc(userRef, {
          xp: newTotal,
          rank: getCurrentRank(newTotal).name,
          mastery: jutsuMasteryRef.current,
          isHidden: user.email === import.meta.env.VITE_ADMIN_EMAIL,
          lastSeen: new Date()
        }, { merge: true });
      } catch (e) {
        console.error("Cloud sync failed:", e);
      }
    }
  }, [user]);

  const handleSaveName = useCallback(async () => {
    if (!tempName || !user) return;
    const sanitizedName = tempName.replace(/[^a-zA-Z0-9_ -]/g, '').trim().substring(0, 15);
    if (!sanitizedName) return;
    try {
      const userRef = doc(db, 'players', user.uid);
      await setDoc(userRef, { name: sanitizedName }, { merge: true });
      setPlayerName(sanitizedName);
      setIsEditingName(false);
    } catch (e) {
      console.error("Failed to update name:", e);
      alert("Errore durante l'aggiornamento del nome.");
    }
  }, [tempName, user]);


  /* ── Jutsu selection ────────────────────────── */
  const handleSelectJutsu = (jutsu) => {
    setSelectedJutsu(jutsu);
    selectedJutsuRef.current = jutsu;

    // Find which seals for this jutsu are not yet calibrated
    const missing = jutsu.sequence.filter(s => !calibratedSealsRef.current[s]);
    if (missing.length > 0) {
      setCalibrationQueue(missing);
      setCalibrationIndex(0);
      setMode('calibration');
    } else {
      startPerform(0);
    }
  };

  const startPerform = (step = 0) => {
    setSequenceStep(step);
    sequenceStepRef.current = step;
    sealHoldCountRef.current = 0;
    setStepFlash(false);
    // eslint-disable-next-line react-hooks/purity -- intentional: called from event handlers only, not during render
    performanceStartTimeRef.current = performance.now();
    
    // Reset UI refs manually to ensure clean state
    if (chakraFillRef.current) chakraFillRef.current.style.width = '0%';
    const sealEl = document.getElementById('ui-current-seal-name');
    if (sealEl) {
      sealEl.innerText = '· · ·';
      sealEl.style.color = 'var(--text-muted)';
      sealEl.style.textShadow = 'none';
    }
    const progEl = document.getElementById('ui-seal-progress');
    if (progEl) progEl.innerText = 'In attesa...';
    
    setMode('perform');
  };

  /* ── Calibration ────────────────────────────── */
  const captureNow = useCallback(() => {
    const features = currentFeaturesBufferRef.current;
    if (!features) { alert('Nessuna mano rilevata! Riprova.'); return; }
    const sealName = calibrationQueue[calibrationIndex];
    if (!sealName) return;

    setCalibratedSeals(prev => {
      const updated = { ...prev, [sealName]: features };
      localStorage.setItem(STORAGE_KEY_SEALS, JSON.stringify(updated));
      calibratedSealsRef.current = updated;
      return updated;
    });

    setLastCaptured(true);
    currentFeaturesBufferRef.current = null;
    setTimeout(() => setLastCaptured(false), 600);

    if (calibrationIndex < calibrationQueue.length - 1) {
      setCalibrationIndex(i => i + 1);
    } else {
      // All needed seals calibrated
      setTimeout(() => {
        if (selectedJutsuRef.current) {
          startPerform(0);
        } else {
          setMode('jutsu-select');
        }
      }, 800);
    }
  }, [calibrationQueue, calibrationIndex]);

  const captureNowRef = useRef(captureNow);
  useEffect(() => { captureNowRef.current = captureNow; }, [captureNow]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(t);
    } else {
      if (!captureInProgressRef.current) {
        captureInProgressRef.current = true;
        captureNowRef.current();
        setTimeout(() => { captureInProgressRef.current = false; }, 1000);
      }
      setTimeout(() => setCountdown(null), 0);
    }
  }, [countdown, captureNow]);

  /* ── Webcam results ─────────────────────────── */
  const handleWebcamResults = useCallback((results) => {
    if (!results?.landmarks?.length) {
      sealHoldCountRef.current = 0;
      if (chakraFillRef.current) chakraFillRef.current.style.width = '0%';
      const sealEl = document.getElementById('ui-current-seal-name');
      if (sealEl) {
        sealEl.innerText = '· · ·';
        sealEl.style.color = 'var(--text-muted)';
        sealEl.style.textShadow = 'none';
      }
      const progEl = document.getElementById('ui-seal-progress');
      if (progEl) progEl.innerText = 'In attesa...';
      return;
    }
    const features = extractFeatures(results.landmarks);
    window.currentHandLandmarks = results.landmarks;
    if (!features) return;

    if (modeRef.current === 'calibration') {
      currentFeaturesBufferRef.current = features;
      return;
    }

    if (modeRef.current === 'perform') {
      const jutsu = selectedJutsuRef.current;
      if (!jutsu) return;
      const targetSeal = jutsu.sequence[sequenceStepRef.current];
      const recognized = classifySeal(features, calibratedSealsRef.current);
      
      const sealEl = document.getElementById('ui-current-seal-name');
      if (sealEl) {
        sealEl.innerText = recognized || '· · ·';
        sealEl.style.color = recognized ? jutsu.color : 'var(--text-muted)';
        sealEl.style.textShadow = recognized ? `0 0 12px ${jutsu.glowColor}` : 'none';
      }

      if (recognized === targetSeal) {
        sealHoldCountRef.current++;
        const progress = Math.min((sealHoldCountRef.current / SEAL_HOLD_FRAMES) * 100, 100);
        if (chakraFillRef.current) chakraFillRef.current.style.width = `${progress}%`;
        
        const progEl = document.getElementById('ui-seal-progress');
        if (progEl) progEl.innerText = `✓ Tieni fermo... ${Math.round(progress)}%`;

        if (sealHoldCountRef.current >= SEAL_HOLD_FRAMES) {
          sealHoldCountRef.current = 0;
          if (chakraFillRef.current) chakraFillRef.current.style.width = '0%';
          if (progEl) progEl.innerText = 'In attesa...';
          
          const nextStep = sequenceStepRef.current + 1;
          setStepFlash(true);
          setTimeout(() => setStepFlash(false), 500);

          if (nextStep >= jutsu.sequence.length) {
            // All seals completed → activate jutsu!
            setTimeout(() => {
              setActiveJutsu(jutsu);
              setMode('effect');
            }, 400);
          } else {
            sequenceStepRef.current = nextStep;
            setSequenceStep(nextStep);
          }
        }
      } else {
        if (sealHoldCountRef.current > 0) {
          sealHoldCountRef.current = 0;
          if (chakraFillRef.current) chakraFillRef.current.style.width = '0%';
          const progEl = document.getElementById('ui-seal-progress');
          if (progEl) progEl.innerText = 'In attesa...';
        }
      }
    }
  }, []);

  /* ── Battle Logic ───────────────────────────── */
  const pickRandomJutsuForBattle = useCallback(() => {
    const allUnlocked = Object.values(JUTSUS).filter(j => {
      if (totalXp < (j.minXp || 0)) return false;
      // In battle, don't pick healing if HP is full
      if (j.effectType === 'heal' && battleRef.current.userHp >= (battleRef.current.userMaxHp || 100)) {
        return false;
      }
      return true;
    });
    
    // Prioritize jutsus that have already been fully calibrated to prevent battle flow interruption
    let unlocked = allUnlocked.filter(j => 
      j.sequence.every(s => calibratedSealsRef.current[s])
    );
    
    // Fallback if no fully calibrated jutsus are available
    if (unlocked.length === 0) {
      unlocked = allUnlocked;
    }
    
    const random = unlocked[Math.floor(Math.random() * unlocked.length)];
    setSelectedJutsu(random);
    selectedJutsuRef.current = random;
    
    // Reset timer for the new command
    const isPlayerTurn = battleRef.current.turn === 'player';
    const boss = BOSSES[battleRef.current.enemy];
    const statusMsg = isPlayerTurn 
      ? `ATTACCA! USA ${random.name}!` 
      : `DIFENDITI DA ${boss?.specialAttack?.toUpperCase() || 'ATTACCO'}! USA ${random.name}!`;
    setBattle(prev => ({ ...prev, timer: 12, status: statusMsg }));
    
    // Check if calibrated
    const missing = random.sequence.filter(s => !calibratedSealsRef.current[s]);
    if (missing.length > 0) {
      setCalibrationQueue(missing);
      setCalibrationIndex(0);
      setMode('calibration');
    } else {
      // Start performance for this jutsu
      setSequenceStep(0);
      sequenceStepRef.current = 0;
      sealHoldCountRef.current = 0;
      performanceStartTimeRef.current = performance.now();
      setMode('perform');
    }
  }, [totalXp, setSelectedJutsu, setMode, setCalibrationQueue, setCalibrationIndex, setSequenceStep]);

  const startBattle = (bossId = null) => {
    const availableEnemies = Object.entries(BOSSES).filter(([, b]) => totalXp >= b.minXp);
    
    let selectedEnemyId, bossData;
    if (bossId && BOSSES[bossId]) {
      selectedEnemyId = bossId;
      bossData = BOSSES[bossId];
    } else {
      [selectedEnemyId, bossData] = availableEnemies[Math.floor(Math.random() * availableEnemies.length)];
    }

    setBattle({
      active: true,
      enemy: selectedEnemyId,
      userHp: currentRank.maxHp,
      userMaxHp: currentRank.maxHp,
      enemyHp: bossData.maxHp,
      enemyMaxHp: bossData.maxHp,
      timer: 0,
      turn: 'player',
      status: 'PREPARATI AL COMBATTIMENTO! TOCCA A TE ATTACCARE.',
      damageFlash: false
    });

    setMode('battle');
  };

  useEffect(() => {
    if (!battle.active || mode !== 'perform') return;
    const t = setInterval(() => {
      setBattle(prev => {
        if (prev.timer <= 1) {
          const boss = BOSSES[prev.enemy];
          const bossDmg = boss?.specialDamage ?? 20;

          if (prev.turn === 'player') {
            // Player missed attack turn
            setTimeout(pickRandomJutsuForBattle, 0);
            return { 
              ...prev, 
              timer: 12, 
              turn: 'enemy', 
              status: 'TEMPO SCADUTO! HAI MANCATO IL COLPO.' 
            };
          } else {
            // Player missed defense turn
            const penaltyDmg = Math.round(bossDmg * 1.3);
            const newHp = Math.max(0, prev.userHp - penaltyDmg);
            setTimeout(pickRandomJutsuForBattle, 0);
            return { 
              ...prev, 
              timer: 12, 
              turn: 'player', 
              userHp: newHp, 
              status: `NON HAI REAGITO A ${boss?.specialAttack?.toUpperCase() || 'ATTACCO'}! COLPITO IN PIENO (-${penaltyDmg} HP).`, 
              damageFlash: true 
            };
          }
        }
        return { ...prev, timer: prev.timer - 1, damageFlash: false };
      });
    }, 1000);
    return () => clearInterval(t);
  }, [battle.active, mode, pickRandomJutsuForBattle]);

  useEffect(() => {
    if (battle.active && battle.userHp <= 0) {
      setTimeout(() => {
        const newStats = { ...statsRef.current, losses: (statsRef.current.losses || 0) + 1 };
        setStats(newStats); statsRef.current = newStats;
        localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(newStats));
        setBattle(prev => ({ ...prev, active: false, status: 'SCONFITTO...' }));
        setMode('jutsu-select');
        alert("Sei stato sconfitto! Torna ad allenarti.");
      }, 0);
    }
    if (battle.active && battle.enemyHp <= 0) {
      const defeatedEnemy = battle.enemy;
      const bossData = BOSSES[defeatedEnemy];
      const bonus = bossData?.xpReward || 500;
      
      setTimeout(() => {
        // Stats
        const newStats = { ...statsRef.current, wins: (statsRef.current.wins || 0) + 1 };
        setStats(newStats); statsRef.current = newStats;
        localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(newStats));
        // Achievements
        if (newStats.wins === 1) unlockAchievement('battle_winner');
        if (newStats.wins === 5) unlockAchievement('battle_five');
        if (defeatedEnemy === 'kaguya') unlockAchievement('kaguya_defeated');
        // XP
        setTotalXp(prev => { const next = prev + bonus; localStorage.setItem(STORAGE_KEY_XP, next.toString()); return next; });
        syncXpToCloud(totalXpRef.current + bonus);
        setLastXpEarned(bonus);
        setXpPopupTitle(`HAI SCONFITTO ${bossData?.name.toUpperCase() || defeatedEnemy.toUpperCase()}!`);
        setShowXpPopup(true);
        setBattle(prev => ({ ...prev, active: false, status: 'VITTORIA!' }));
        setMode('jutsu-select');
        setTimeout(() => setShowXpPopup(false), 4000);
      }, 500);
    }
  }, [battle.userHp, battle.enemyHp, battle.active, battle.enemy, syncXpToCloud, unlockAchievement]);

  /* ── Jutsu complete ─────────────────────────── */
  const handleJutsuComplete = useCallback(() => {
    const duration = (performance.now() - performanceStartTimeRef.current) / 1000;
    const jutsu = selectedJutsuRef.current;
    const currentBattle = battleRef.current;

    setActiveJutsu(null);
    setSelectedJutsu(null);
    selectedJutsuRef.current = null;
    setSequenceStep(0);
    sequenceStepRef.current = 0;
    setMode(currentBattle.active ? 'battle' : 'jutsu-select');

    if (!jutsu) return;

    // ── Mastery tracking ──
    const prevCount = jutsuMasteryRef.current[jutsu.id] || 0;
    const newMastery = { ...jutsuMasteryRef.current, [jutsu.id]: prevCount + 1 };
    setJutsuMastery(newMastery);
    jutsuMasteryRef.current = newMastery;
    localStorage.setItem(STORAGE_KEY_MASTERY, JSON.stringify(newMastery));

    // ── Stats tracking ──
    const prevStats = statsRef.current;
    const newJutsuCounts = { ...(prevStats.jutsuCounts || {}), [jutsu.id]: ((prevStats.jutsuCounts || {})[jutsu.id] || 0) + 1 };
    const newTotal_ = (prevStats.totalJutsus || 0) + 1;
    const prevFastest = prevStats.fastestJutsu;
    const newFastest = (!prevFastest || duration < prevFastest.seconds) ? { jutsuId: jutsu.id, seconds: duration } : prevFastest;
    const newStats = { ...prevStats, totalJutsus: newTotal_, jutsuCounts: newJutsuCounts, fastestJutsu: newFastest };
    setStats(newStats);
    statsRef.current = newStats;
    localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(newStats));

    // ── XP ──
    const base = 50 + (jutsu.sequence.length * 10);
    const speedBonus = Math.max(1, 1.5 - (duration / 20));
    const earned = Math.round(base * speedBonus);
    const newTotal = totalXpRef.current + earned;
    setTotalXp(prev => { const next = prev + earned; localStorage.setItem(STORAGE_KEY_XP, next.toString()); return next; });
    syncXpToCloud(newTotal);

    // ── Achievements ──
    if (newTotal_ === 1)   unlockAchievement('first_steps');
    if (newTotal_ === 10)  unlockAchievement('jutsu_ten');
    if (newTotal_ === 50)  unlockAchievement('jutsu_fifty');
    if (newTotal_ === 100) unlockAchievement('jutsu_hundred');
    if (jutsu.sequence.length >= 3 && duration < 8) unlockAchievement('speed_ninja');
    if (jutsu.effectType === 'heal' && currentBattle.active) unlockAchievement('heal_battle');
    if (newMastery[jutsu.id] >= 50) unlockAchievement('master_jutsu');

    setLastXpEarned(earned);
    setXpPopupTitle('TECNICA COMPLETATA!');
    setShowXpPopup(true);
    setTimeout(() => setShowXpPopup(false), 3000);

    if (!currentBattle.active) return;

    if (jutsu.effectType === 'heal') {
      const healAmt = 30;
      setBattle(prev => ({ 
        ...prev, 
        userHp: Math.min(prev.userMaxHp || 100, prev.userHp + healAmt), 
        timer: 12, 
        turn: prev.turn === 'player' ? 'enemy' : 'player',
        status: `FERITE RIMARGINATE! (+${healAmt} HP)` 
      }));
      setTimeout(pickRandomJutsuForBattle, 800);
      return;
    }

    // ── Boss interaction (Attack or Defense) ──
    const bossData = BOSSES[currentBattle.enemy];
    const masteryLvl = getMasteryLevel(newMastery[jutsu.id] || 0).level;
    const baseVal = (jutsu.damage || 20) + masteryLvl * 5;
    const weaknessBonus = bossData?.weakness === jutsu.effectType ? 15 : 0;

    if (currentBattle.turn === 'player') {
      // Player attacks
      const speedMult = duration < 5 ? 1.3 : (duration < 9 ? 1.0 : 0.6);
      const damage = Math.round((baseVal + weaknessBonus) * speedMult);
      const newEnemyHp = Math.max(0, currentBattle.enemyHp - damage);
      
      let hitStatus = `OTTIMO COLPO! -${damage} HP`;
      if (speedMult > 1) hitStatus = `COLPO CRITICO! -${damage} HP!`;
      else if (speedMult < 1) hitStatus = `NEMICO HA PARATO! -${damage} HP`;
      else if (weaknessBonus > 0) hitStatus = `DEBOLEZZA NEMICA! -${damage} HP!`;

      setBattle(prev => ({ 
        ...prev, 
        enemyHp: newEnemyHp, 
        timer: 12, 
        turn: 'enemy', 
        status: `${hitStatus}. DIFENDITI DA ${bossData?.specialAttack?.toUpperCase() || 'ATTACCO'}!` 
      }));
      if (newEnemyHp > 0) setTimeout(pickRandomJutsuForBattle, 800);
    } else {
      // Player defends
      const bossDmg = bossData?.specialDamage ?? 20;
      const defenseMult = duration < 5 ? 0 : (duration < 9 ? 0.2 : 1.0);
      const damageTaken = Math.round(bossDmg * defenseMult);
      const newUserHp = Math.max(0, currentBattle.userHp - damageTaken);
      
      let defStatus = `COLPITO! -${damageTaken} HP`;
      if (defenseMult === 0) defStatus = `PARATA PERFETTA! 0 DANNI`;
      else if (defenseMult < 1) defStatus = `PARATA PARZIALE! -${damageTaken} HP`;

      setBattle(prev => ({ 
        ...prev, 
        userHp: newUserHp, 
        timer: 12, 
        turn: 'player', 
        status: `${defStatus}. ORA ATTACCA!`,
        damageFlash: damageTaken > 0
      }));
      if (newUserHp > 0) setTimeout(pickRandomJutsuForBattle, 800);
    }
    // newEnemyHp === 0 → battle.enemyHp useEffect handles victory
  }, [pickRandomJutsuForBattle, syncXpToCloud, setSelectedJutsu, setMode, unlockAchievement]);

  /* ── Recalibration ──────────────────────────── */
  const toggleSeal = (name) => {
    setSelectedForRecal(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const startRecalibration = (all = false) => {
    const queue = all ? [...SEALS_LIST] : SEALS_LIST.filter(s => selectedForRecal.has(s));
    if (!queue.length) return;
    setCalibrationQueue(queue);
    setCalibrationIndex(0);
    setSelectedForRecal(new Set());
    // Go back to jutsu select after recalibration
    setSelectedJutsu(null);
    selectedJutsuRef.current = null;
    setMode('calibration');
  };

  /* ── Render ─────────────────────────────────── */
  const currentRank = useMemo(() => getCurrentRank(totalXp), [totalXp]);
  const nextRank = useMemo(() => getNextRank(totalXp), [totalXp]);
  const currentSealName = mode === 'calibration' ? calibrationQueue[calibrationIndex] : null;
  const calibrationPct = calibrationQueue.length
    ? Math.round((calibrationIndex / calibrationQueue.length) * 100) : 0;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', gap: '1.25rem', padding: '1.25rem', boxSizing: 'border-box' }}>

      {/* Sidebar Background (For layering) */}
      <div className="sidebar-bg glass-panel" style={{ position: 'absolute', top: '1.25rem', left: '1.25rem', bottom: '1.25rem', width: '310px', zIndex: 1, pointerEvents: 'none' }}></div>

      {/* Decorative Kakashi (Between background and content) */}
      <img src={`/assets/kakashi.png?v=${ASSET_V}`} className="deco-kakashi" style={{ zIndex: 2 }} alt="" />

      {/* ── Left Sidebar ─────────────────────── */}
      <div className="sidebar" style={{ width: '310px', flexShrink: 0, display: 'flex', flexDirection: 'column', padding: '1.5rem', gap: '1.25rem', overflowY: 'auto', zIndex: 10, position: 'relative' }}>






        {/* Logo + connectivity + volume */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="title-main">忍術 Simulator</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {/* Connectivity dot */}
              <div title={isOnline ? 'Online' : 'Offline — XP salvato localmente'} style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: isOnline ? '#22c55e' : '#ef4444',
                boxShadow: `0 0 6px ${isOnline ? '#22c55e88' : '#ef444488'}`,
                flexShrink: 0,
              }} />
              {/* Volume button */}
              <button
                onClick={() => setShowVolumePanel(v => !v)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'var(--text-muted)', padding: '0.1rem', lineHeight: 1 }}
                title="Volume"
              >🔊</button>
            </div>
          </div>
          <div className="title-kanji">Shinobi Hand Seal Trainer</div>

          {/* Volume panel */}
          {showVolumePanel && (
            <div style={{
              marginTop: '0.6rem', padding: '0.75rem', borderRadius: '0.75rem',
              background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex', flexDirection: 'column', gap: '0.5rem',
            }}>
              {[
                { label: '🎵 Musica', key: 'music' },
                { label: '💥 Effetti', key: 'effects' },
              ].map(({ label, key }) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', minWidth: '60px' }}>{label}</span>
                  <input
                    type="range" min="0" max="1" step="0.05"
                    value={volume[key]}
                    onChange={e => {
                      const val = parseFloat(e.target.value);
                      setVolume(prev => {
                        const next = { ...prev, [key]: val };
                        localStorage.setItem(STORAGE_KEY_VOLUME, JSON.stringify(next));
                        return next;
                      });
                    }}
                    style={{ flex: 1, accentColor: 'var(--naruto-orange)' }}
                  />
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', minWidth: '28px' }}>{Math.round(volume[key] * 100)}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Player Profile */}
        {isAuthLoading ? (
          <div className="glass-panel" style={{ padding: '0.8rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
             <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', animation: 'pulse-glow 1.5s infinite' }} />
             <div style={{ flex: 1 }}>
               <div style={{ width: '40px', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', marginBottom: '6px' }} />
               <div style={{ width: '80px', height: '14px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }} />
             </div>
          </div>
        ) : user && (
          <div className="glass-panel" style={{ padding: '0.8rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flex: 1 }}>
              {user.photoURL && <img src={user.photoURL} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)' }} referrerPolicy="no-referrer" />}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Shinobi</div>
                {isEditingName ? (
                  <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.2rem' }}>
                    <input 
                      autoFocus
                      value={tempName}
                      onChange={e => setTempName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                      style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid var(--naruto-orange)', color: '#fff', borderRadius: '0.3rem', padding: '0.2rem 0.4rem', fontSize: '0.9rem', width: '100%', outline: 'none' }}
                      maxLength={15}
                    />
                    <button onClick={handleSaveName} style={{ background: 'var(--naruto-orange)', color: '#fff', border: 'none', borderRadius: '0.3rem', padding: '0.2rem 0.5rem', cursor: 'pointer', fontSize: '0.8rem' }}>✓</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.1rem' }}>
                    <span style={{ fontFamily: 'var(--font-title)', fontSize: '1.1rem', color: '#fff' }}>{playerName}</span>
                    <button onClick={() => { setTempName(playerName); setIsEditingName(true); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem', padding: '0.1rem' }} title="Modifica Nome">✏️</button>
                  </div>
                )}
              </div>
            </div>
            <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.2rem', padding: '0.5rem' }} title="Disconnetti">
              🚪
            </button>
          </div>
        )}

        {/* ── Progression Widget ── */}
        <div 
          className="glass-panel" 
          style={{ padding: '1rem', background: 'rgba(0,0,0,0.4)', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }}
          onClick={() => {
            const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;
            if (!user || user.email !== ADMIN_EMAIL) return;

            const now = Date.now();
            rankClicksRef.current = rankClicksRef.current.filter(t => now - t < 1000);
            rankClicksRef.current.push(now);
            if (rankClicksRef.current.length >= 3) {
              const bonus = 10000;
              const newTotal = totalXpRef.current + bonus;
              setTotalXp(prev => {
                const next = prev + bonus;
                localStorage.setItem(STORAGE_KEY_XP, next.toString());
                return next;
              });
              syncXpToCloud(newTotal);
              rankClicksRef.current = [];
              alert("ADMIN CHAKRA! Hai ottenuto 10.000 XP.");
            }
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.6rem' }}>
            <div>
              <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>Grado Ninja</div>
              <div style={{
                fontFamily: 'var(--font-title)', fontSize: '1.5rem',
                color: currentRank.color,
                textShadow: `0 0 10px ${currentRank.color}44`
              }}>
                {currentRank.name}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Punti Esperienza</div>
              <div style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '1rem' }}>{totalXp} XP</div>
            </div>
          </div>

          {nextRank && (
            <>
              <div className="calibration-progress" style={{ height: '6px', background: 'rgba(255,255,255,0.05)' }}>
                <div
                  className="calibration-progress-fill"
                  style={{
                    width: `${((totalXp - currentRank.min) / (nextRank.min - currentRank.min)) * 100}%`,
                    background: currentRank.color
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                <span>{currentRank.min}</span>
                <span>Prossimo Grado: {nextRank.name} ({nextRank.min})</span>
              </div>
            </>
          )}
        </div>

        {/* ─── BATTLE MODE ─── */}
        {mode === 'battle' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1.5rem', textAlign: 'center', animation: 'status-bounce 0.4s ease-out' }}>
            <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <div style={{ fontSize: '0.7rem', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '0.5rem' }}>Scontro Ninja</div>
              <div style={{ fontFamily: 'var(--font-title)', fontSize: '1.8rem', color: '#fff' }}>SFIDA CONTRO {(BOSSES[battle.enemy]?.name ?? battle.enemy)?.toUpperCase()}</div>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
              <img src={`/villain/${battle.enemy}.png`} alt="" style={{ height: '180px', filter: 'drop-shadow(0 0 15px rgba(239,68,68,0.4))' }} />
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Il nemico è pronto ad attaccare. Reagisci velocemente alle tecniche che ti verranno ordinate!
              </div>
            </div>

            <button className="ninja-btn primary" style={{ width: '100%', padding: '1.2rem', fontSize: '1.2rem' }}
              onClick={pickRandomJutsuForBattle}>
              ⚡ INIZIA LO SCONTRO
            </button>
            
            <button className="ninja-btn" style={{ width: '100%' }}
              onClick={() => { setBattle(prev => ({ ...prev, active: false })); setMode('jutsu-select'); }}>
              🏳️ RITIRATI
            </button>
          </div>
        )}

        {/* ─── JUTSU SELECT ─── */}
        {mode === 'jutsu-select' && (
          <>
            <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.07)', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              🥷 Scegli la tecnica che vuoi eseguire. Ti verrà mostrato ogni sigillo da fare in sequenza.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {Object.values(JUTSUS).map(jutsu => {
                const allCalibrated = jutsu.sequence.every(s => calibratedSeals[s]);
                const isLocked = totalXp < (jutsu.minXp || 0);
                const masteryData = getMasteryLevel(jutsuMastery[jutsu.id] || 0);
                
                return (
                  <button
                    key={jutsu.id}
                    className={`jutsu-card-refined ${isLocked ? 'locked' : ''}`}
                    onClick={() => !isLocked && handleSelectJutsu(jutsu)}
                    style={{
                      '--card-glow': isLocked ? '#222' : jutsu.glowColor.replace('0.6','0.3'),
                      background: isLocked ? 'rgba(0,0,0,0.5)' : `linear-gradient(135deg, ${jutsu.glowColor.replace('0.6','0.12')}, rgba(0,0,0,0.3))`,
                      border: isLocked ? '1px solid rgba(255,255,255,0.05)' : `1px solid ${jutsu.glowColor.replace('0.6','0.35')}`,
                      borderRadius: '1rem', padding: '0.9rem 1rem',
                      cursor: isLocked ? 'not-allowed' : 'pointer', textAlign: 'left', color: isLocked ? '#666' : 'var(--text-main)',
                      position: 'relative', overflow: 'hidden',
                      display: 'block', width: '100%',
                      filter: isLocked ? 'grayscale(1)' : 'none',
                      opacity: isLocked ? 0.7 : 1
                    }}
                  >
                    {/* Character background image */}
                    {!isLocked && (
                      <div style={{
                        position: 'absolute', right: '0%', top: '50%', transform: 'translateY(-50%)', 
                        height: '130%', width: '60%', opacity: 0.35, pointerEvents: 'none', 
                        mixBlendMode: 'screen', filter: 'grayscale(30%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <img src={`/characters/${jutsu.imageId}.png`} alt="" style={{ height: '100%', objectFit: 'contain' }} onError={e => e.target.style.display='none'} />
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ zIndex: 2 }}>
                        <div style={{ fontFamily: 'var(--font-title)', fontSize: '1.1rem', letterSpacing: '0.08em', color: isLocked ? '#777' : jutsu.color }}>
                          {jutsu.name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: isLocked ? '#555' : 'var(--text-muted)', marginTop: '0.1rem' }}>{jutsu.subtitle}</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem', zIndex: 2 }}>
                        <span style={{ fontSize: '1.5rem', opacity: isLocked ? 0.2 : 0.5 }}>{jutsu.kanji}</span>
                        {isLocked ? (
                          <span style={{ fontSize: '0.6rem', color: '#999', background: 'rgba(255,255,255,0.05)', padding: '0.1rem 0.4rem', borderRadius: '0.3rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                            🔒 Sblocca a {jutsu.minXp} XP
                          </span>
                        ) : !allCalibrated ? (
                          <span style={{ fontSize: '0.6rem', color: '#F97316', background: 'rgba(249,115,22,0.15)', padding: '0.1rem 0.4rem', borderRadius: '0.3rem', border: '1px solid rgba(249,115,22,0.3)' }}>
                            ⚡ Calibra
                          </span>
                        ) : masteryData.level > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                            <div style={{ display: 'flex', gap: '2px' }}>
                              {[1,2,3,4,5].map(i => (
                                <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: i <= masteryData.level ? masteryData.color : 'rgba(255,255,255,0.1)', boxShadow: i <= masteryData.level ? `0 0 3px ${masteryData.color}` : 'none' }} />
                              ))}
                            </div>
                            <span style={{ fontSize: '0.55rem', color: masteryData.color }}>{masteryData.label}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {!isLocked && (
                      <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                        {jutsu.sequence.map(s => (
                          <span key={s} style={{
                            fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '0.35rem',
                            background: calibratedSeals[s] ? `${jutsu.glowColor.replace('0.6','0.2')}` : 'rgba(255,255,255,0.05)',
                            border: `1px solid ${calibratedSeals[s] ? jutsu.glowColor.replace('0.6','0.4') : 'rgba(255,255,255,0.08)'}`,
                            color: calibratedSeals[s] ? jutsu.color : 'var(--text-muted)',
                          }}>{s}</span>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
              <button className="ninja-btn primary" style={{ 
                width: '100%', padding: '1rem', fontSize: '1.15rem', 
                boxShadow: '0 0 25px var(--naruto-orange-glow)',
                marginTop: '0.5rem',
                border: '1px solid rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem'
              }}
                onClick={() => setMode('boss-select')} disabled={battle.active}>
                <span style={{ fontSize: '1.4rem' }}>⚔️</span> SCONTRO NINJA
              </button>
            </div>

            {/* Utility & Social Section (Sticky Footer) */}
            <div className="glass-panel" style={{ 
              marginTop: 'auto', 
              padding: '1.2rem', 
              background: 'rgba(12, 12, 22, 0.95)', 
              backdropFilter: 'blur(12px)',
              display: 'flex', 
              flexDirection: 'column', 
              gap: '0.75rem',
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 -10px 25px rgba(0,0,0,0.5)',
              position: 'sticky',
              bottom: '-1.5rem', /* Adjusted for sidebar padding */
              marginRight: '-0.5rem',
              marginLeft: '-0.5rem',
              zIndex: 5
            }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.2rem', textAlign: 'center' }}>
                Accademia & Community
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <button className="ninja-btn" style={{ 
                  padding: '0.75rem 0.5rem', fontSize: '0.8rem', width: '100%', 
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', 
                  background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.25)', 
                  color: 'var(--chidori-blue)', borderRadius: '0.8rem' 
                }}
                  onClick={() => setMode('leaderboard')}>
                  <span style={{ fontSize: '1.4rem' }}>🏆</span>
                  Classifica
                </button>
                <button className="ninja-btn" style={{ 
                  padding: '0.75rem 0.5rem', fontSize: '0.8rem', width: '100%', 
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', 
                  background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.25)', 
                  color: '#a855f7', borderRadius: '0.8rem' 
                }}
                  onClick={() => setMode('profile')}>
                  <span style={{ fontSize: '1.4rem' }}>📊</span>
                  Profilo
                </button>
              </div>

              <button className="ninja-btn danger" style={{ 
                width: '100%', padding: '0.7rem', fontSize: '0.85rem', 
                marginTop: '0.2rem', border: '1px solid rgba(239,68,68,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}
                onClick={() => { setSelectedForRecal(new Set()); setMode('recalibrate-menu'); }}>
                <span style={{ fontSize: '1.1rem' }}>⚙️</span> Ricalibra Sigilli
              </button>
            </div>
          </>
        )}

        {/* ─── CALIBRATION ─── */}
        {mode === 'calibration' && calibrationQueue.length > 0 && (
          <>
            <div style={{ padding: '0.85rem', background: 'var(--naruto-orange-dim)', borderRadius: '0.75rem', border: '1px solid rgba(249,115,22,0.3)' }}>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--naruto-orange)', marginBottom: '0.35rem' }}>
                {selectedJutsu ? `Calibrazione per ${selectedJutsu.name}` : 'Calibrazione Sigilli'}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Mantieni la posa e premi il pulsante
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Sigillo {calibrationIndex + 1} di {calibrationQueue.length}
              </div>
              <div className="calibration-progress" style={{ marginBottom: '1.25rem' }}>
                <div className="calibration-progress-fill" style={{ width: `${calibrationPct}%` }} />
              </div>
              <div style={{ fontSize: '2.2rem', fontFamily: 'var(--font-title)', letterSpacing: '0.1em', color: 'var(--naruto-orange)', marginBottom: '0.75rem' }}>
                {currentSealName}
              </div>

              {/* Reference image */}
              <div style={{
                width: '100%', aspectRatio: '1', borderRadius: '1rem',
                overflow: 'hidden', border: '2px solid rgba(249,115,22,0.5)',
                boxShadow: '0 0 24px rgba(249,115,22,0.3)',
                marginBottom: '0.75rem', position: 'relative', background: 'rgba(0,0,0,0.4)',
              }}>
                <img
                  key={currentSealName}
                  src={`/seals/${currentSealName?.toLowerCase()}.png`}
                  alt={`Sigillo ${currentSealName}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  onError={e => { e.target.style.display = 'none'; }}
                />
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                  padding: '0.5rem', fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', textAlign: 'center',
                }}>Imita questa posa</div>
              </div>

              {countdown !== null
                ? <div className="countdown-ring">{countdown > 0 ? countdown : '✓'}</div>
                : lastCaptured
                  ? <div className="countdown-ring" style={{ borderColor: '#22c55e', color: '#22c55e', boxShadow: '0 0 20px rgba(34,197,94,0.5)' }}>✓</div>
                  : null
              }
            </div>

            <button className="ninja-btn primary" style={{ width: '100%' }}
              disabled={countdown !== null}
              onClick={() => setCountdown(3)}>
              {countdown !== null ? `Attendi... ${countdown}` : '▶ Avvia Timer (3s)'}
            </button>

            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.5rem' }}>In coda</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {calibrationQueue.map((s, i) => (
                  <span key={s} style={{
                    padding: '0.2rem 0.6rem', borderRadius: '0.4rem', fontSize: '0.75rem',
                    background: i < calibrationIndex ? 'rgba(34,197,94,0.12)' : i === calibrationIndex ? 'var(--naruto-orange-dim)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${i < calibrationIndex ? 'rgba(34,197,94,0.3)' : i === calibrationIndex ? 'rgba(249,115,22,0.4)' : 'rgba(255,255,255,0.08)'}`,
                    color: i < calibrationIndex ? '#22c55e' : i === calibrationIndex ? 'var(--naruto-orange)' : 'var(--text-muted)',
                  }}>{s}</span>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ─── PERFORM (guided sequence) ─── */}
        {mode === 'perform' && selectedJutsu && (
          <>
            {battle.active && (
              <div style={{ 
                background: '#ef4444', color: '#fff', fontSize: '0.7rem', fontWeight: 'bold', 
                padding: '0.3rem 0.8rem', borderRadius: '2rem', textAlign: 'center',
                textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.8rem',
                animation: 'pulse-glow 1s infinite'
              }}>
                ⚡ COMANDO DI BATTAGLIA ⚡
              </div>
            )}
            <div style={{
              padding: '0.85rem', borderRadius: '0.75rem', textAlign: 'center',
              background: `linear-gradient(135deg, ${selectedJutsu.glowColor.replace('0.6','0.15')}, rgba(0,0,0,0.3))`,
              border: `1px solid ${selectedJutsu.glowColor.replace('0.6','0.3')}`,
            }}>
              <div style={{ fontFamily: 'var(--font-title)', fontSize: '1.3rem', color: selectedJutsu.color, letterSpacing: '0.1em' }}>
                {selectedJutsu.name}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{selectedJutsu.subtitle}</div>
            </div>

            {/* Detected seal */}
            <div className="seal-detector">
              <div className="seal-detector-label">Sigillo Rilevato</div>
              <div className="seal-detector-value" id="ui-current-seal-name" style={{
                color: 'var(--text-muted)',
                textShadow: 'none',
              }}>
                · · ·
              </div>
              <div className="chakra-gauge-container">
                <div ref={chakraFillRef} className="chakra-gauge-fill" />
              </div>
            </div>

            {/* Sequence steps */}
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.75rem' }}>
                Sequenza Sigilli
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {selectedJutsu.sequence.map((sealName, i) => {
                  const isDone = i < sequenceStep;
                  const isCurrent = i === sequenceStep;
                  // const isNext = i > sequenceStep;
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '0.6rem 0.85rem', borderRadius: '0.65rem',
                      background: isDone ? 'rgba(34,197,94,0.1)' : isCurrent ? `${selectedJutsu.glowColor.replace('0.6','0.15')}` : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${isDone ? 'rgba(34,197,94,0.35)' : isCurrent ? selectedJutsu.glowColor.replace('0.6','0.5') : 'rgba(255,255,255,0.07)'}`,
                      boxShadow: isCurrent && stepFlash ? `0 0 20px ${selectedJutsu.glowColor}` : isCurrent ? `0 0 10px ${selectedJutsu.glowColor.replace('0.6','0.3')}` : 'none',
                      transition: 'all 0.3s',
                    }} className={isCurrent && stepFlash ? 'seal-step-success' : ''}>
                      <div style={{
                        width: '28px', height: '28px', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: isDone ? '#22c55e' : isCurrent ? selectedJutsu.color : 'rgba(255,255,255,0.08)',
                        fontSize: '0.75rem', fontWeight: 700, color: isDone || isCurrent ? '#000' : 'var(--text-muted)',
                        flexShrink: 0,
                      }}>
                        {isDone ? '✓' : i + 1}
                      </div>
                      {/* Seal mini image */}
                      <div style={{
                        width: '40px', height: '40px', background: 'rgba(255,255,255,0.05)',
                        borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: `1px solid ${isCurrent ? selectedJutsu.color : 'rgba(255,255,255,0.1)'}`,
                        position: 'relative', overflow: 'hidden'
                      }}>
                        <img
                          src={`/seals/${sealName.toLowerCase()}.png`}
                          alt=""
                          style={{ width: '80%', height: '80%', objectFit: 'contain', filter: isCurrent ? 'none' : 'grayscale(1) opacity(0.5)' }}
                          onError={e => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                        <div style={{ display: 'none', fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>
                          {sealName[0]}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontFamily: 'var(--font-title)', fontSize: '0.95rem', letterSpacing: '0.06em', color: isDone ? '#22c55e' : isCurrent ? selectedJutsu.color : 'var(--text-muted)' }}>
                          {sealName}
                        </div>
                        {isCurrent && (
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }} id="ui-seal-progress">
                            In attesa...
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <button className="ninja-btn" style={{ width: '100%', marginTop: 'auto' }}
              onClick={() => { setMode('jutsu-select'); setSelectedJutsu(null); selectedJutsuRef.current = null; }}>
              ← Cambia Tecnica
            </button>
          </>
        )}
      </div>

      {/* ── Webcam ───────────────────────────── */}
      <div className={`glass-panel webcam-container ${battle.damageFlash ? 'damage-flash' : ''}`} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        
        {/* Battle UI Overlay */}
        {battle.active && (
          <>
            {/* Enemy HP Bar */}
            <div style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', width: '60%', zIndex: 100 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#fff', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 'bold', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                <span>{BOSSES[battle.enemy]?.name ?? battle.enemy}</span>
                <span>{battle.enemyHp} / {battle.enemyMaxHp ?? battle.enemyHp} HP</span>
              </div>
              <div className="calibration-progress" style={{ height: '10px', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)' }}>
                <div className="calibration-progress-fill" style={{ width: `${(battle.enemyHp / (battle.enemyMaxHp ?? battle.enemyHp)) * 100}%`, background: 'linear-gradient(90deg, #ef4444, #b91c1c)' }} />
              </div>
            </div>

            {/* User HP Bar */}
            <div style={{ position: 'absolute', bottom: '100px', left: '50%', transform: 'translateX(-50%)', width: '50%', zIndex: 100 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#fff', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>
                <span>Tu ({currentRank.name})</span>
                <span>{battle.userHp} / {battle.userMaxHp} HP</span>
              </div>
              <div className="calibration-progress" style={{ height: '8px', background: 'rgba(0,0,0,0.6)' }}>
                <div className="calibration-progress-fill" style={{ width: `${(battle.userHp / (battle.userMaxHp || 100)) * 100}%`, background: 'linear-gradient(90deg, #22c55e, #15803d)' }} />
              </div>
            </div>

            {/* Battle Timer & Status */}
            <div style={{ position: 'absolute', top: '50%', right: '40px', transform: 'translateY(-50%)', textAlign: 'right', zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
              
              <div style={{ 
                padding: '0.4rem 1rem', 
                background: battle.turn === 'player' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                border: `1px solid ${battle.turn === 'player' ? '#22c55e' : '#ef4444'}`,
                borderRadius: '0.5rem',
                fontFamily: 'var(--font-title)', fontSize: '0.8rem', 
                color: battle.turn === 'player' ? '#22c55e' : '#ef4444',
                textAlign: 'center',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                boxShadow: `0 0 15px ${battle.turn === 'player' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
              }}>
                {battle.turn === 'player' ? '✦ TUO TURNO: ATTACCO ✦' : '💀 TURNO NEMICO: DIFESA 💀'}
              </div>

              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '0.5rem' }}>Tempo rimasto</div>
              <div style={{ fontFamily: 'var(--font-title)', fontSize: '4rem', color: battle.timer <= 3 ? '#ef4444' : '#fff', lineHeight: 1 }}>
                {battle.timer}
              </div>
              <div style={{ marginTop: '0.5rem', fontFamily: 'var(--font-title)', fontSize: '1.2rem', color: 'var(--naruto-orange)', maxWidth: '250px' }}>
                {battle.status}
              </div>
            </div>

            {/* Enemy Image Overlay */}
            <div style={{ position: 'absolute', top: '15%', left: '30px', zIndex: 20, opacity: 0.85, filter: 'drop-shadow(0 0 20px rgba(0,0,0,0.5))' }}>
              <img src={`/villain/${battle.enemy}.png`} alt="" style={{ height: '240px', objectFit: 'contain' }} />
            </div>
          </>
        )}

        {/* Naruto Logo (Now inside webcam) */}
        <img src={`/assets/naruto_logo.png?v=${ASSET_V}`} className="deco-logo" alt="Naruto Logo" />

        <WebcamView 
          onResults={handleWebcamResults} 
          currentSong={currentSong} 
          isMusicPlaying={isMusicPlaying}
          toggleMusic={toggleMusic}
          skipMusic={skipMusic}
        />

        {/* Decorative Sasuke & Naruto (Clipped inside webcam frame) */}
        <img src={`/assets/sasuke.png?v=${ASSET_V}`} className="deco-sasuke" alt="" />
        <img src={`/assets/naruto.png?v=${ASSET_V}`} className="deco-naruto" alt="" />

        
        {/* ── Jutsu Effect (Nested) ── */}
        {activeJutsu && (
          <JutsuEffect
            jutsu={activeJutsu}
            handLandmarks={window.currentHandLandmarks}
            onComplete={handleJutsuComplete}
            effectsVolume={volume.effects}
          />
        )}

        {/* ── XP Popup ── */}
        {showXpPopup && (
          <div className="xp-popup">
            <div className="xp-popup-title">{xpPopupTitle}</div>
            <div className="xp-popup-value">+{lastXpEarned} XP</div>
          </div>
        )}

        {/* ── Achievement Toast ── */}
        {newAchievement && (
          <div
            key={newAchievement.id}
            style={{
              position: 'absolute', bottom: '140px', right: '20px', zIndex: 200,
              background: 'rgba(0,0,0,0.85)', border: '1px solid rgba(249,115,22,0.5)',
              borderRadius: '0.75rem', padding: '0.75rem 1rem',
              display: 'flex', alignItems: 'center', gap: '0.6rem',
              animation: 'jutsuReveal 0.4s ease-out',
              backdropFilter: 'blur(8px)',
              maxWidth: '260px',
            }}
            onAnimationEnd={() => setTimeout(() => setNewAchievement(null), 3500)}
          >
            <span style={{ fontSize: '1.5rem' }}>{newAchievement.icon}</span>
            <div>
              <div style={{ fontSize: '0.6rem', color: 'var(--naruto-orange)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Obiettivo Sbloccato!</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>{newAchievement.name}</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{newAchievement.desc}</div>
            </div>
          </div>
        )}
      </div>

      {/* ── Recalibrate Menu (overlay) ────────── */}
      {mode === 'recalibrate-menu' && (
        <div className="recal-overlay">
          <div className="glass-panel" style={{ maxWidth: '560px', width: '100%', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '1.8rem', letterSpacing: '0.1em', margin: 0, color: 'var(--naruto-orange)' }}>Ricalibrazione Sigilli</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.4rem' }}>Seleziona i sigilli da ricalibrare, oppure ricalibrali tutti.</p>
            </div>
            <div className="recal-grid">
              {SEALS_LIST.map(seal => {
                const isCalibrated = !!calibratedSeals[seal];
                const isSelected = selectedForRecal.has(seal);
                return (
                  <button key={seal} className={`recal-seal-btn${isSelected ? ' selected' : ''}`} onClick={() => toggleSeal(seal)}>
                    <div style={{ fontWeight: 600 }}>{seal}</div>
                    <div className="check">{isCalibrated ? '✓ Calibrato' : '✗ Mancante'}</div>
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button className="ninja-btn primary" style={{ flex: 1 }} disabled={selectedForRecal.size === 0}
                onClick={() => startRecalibration(false)}>
                Calibra Selezionati ({selectedForRecal.size})
              </button>
              <button className="ninja-btn danger" onClick={() => startRecalibration(true)}>
                Ricalibre Tutti
              </button>
              <button className="ninja-btn" onClick={() => setMode('jutsu-select')}>
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Leaderboard Overlay ── */}
      {mode === 'leaderboard' && (
        <Leaderboard
          currentPlayer={{ uid: user?.uid, name: playerName, xp: totalXp, rank: currentRank.name, photo: user?.photoURL }}
          isHidden={user?.email === import.meta.env.VITE_ADMIN_EMAIL}
          onBack={() => setMode('jutsu-select')}
        />
      )}

      {/* ── Boss Selection Overlay ── */}
      {mode === 'boss-select' && (
        <div className="recal-overlay">
          <div className="glass-panel" style={{ maxWidth: '800px', width: '95%', maxHeight: '90vh', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflow: 'hidden' }}>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '2.2rem', letterSpacing: '0.1em', margin: 0, color: 'var(--naruto-orange)' }}>SELEZIONA AVVERSARIO</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Scegli chi sfidare o tenta la sorte con una battaglia casuale.</p>
            </div>

            <button 
              className="ninja-btn primary" 
              style={{ padding: '1.2rem', fontSize: '1.2rem', background: 'linear-gradient(45deg, #f97316, #ea580c)' }}
              onClick={() => startBattle(null)}
            >
              🎲 BATTAGLIA CASUALE
            </button>

            <div style={{ 
              flex: 1, 
              overflowY: 'auto', 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', 
              gap: '1rem',
              padding: '0.5rem'
            }} className="sidebar">
              {Object.entries(BOSSES).map(([id, boss]) => {
                const isLocked = totalXp < boss.minXp;
                return (
                  <div 
                    key={id}
                    className={`glass-panel boss-card ${isLocked ? 'locked' : ''}`}
                    style={{
                      padding: '1rem',
                      textAlign: 'center',
                      cursor: isLocked ? 'not-allowed' : 'pointer',
                      border: isLocked ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(255,255,255,0.1)',
                      opacity: isLocked ? 0.5 : 1,
                      position: 'relative',
                      transition: 'all 0.3s'
                    }}
                    onClick={() => !isLocked && startBattle(id)}
                  >
                    <img src={`/villain/${id}.png`} alt="" style={{ width: '80px', height: '80px', objectFit: 'contain', marginBottom: '0.8rem', filter: isLocked ? 'grayscale(1) brightness(0.5)' : 'none' }} />
                    <div style={{ fontWeight: 'bold', fontSize: '1rem', color: isLocked ? 'var(--text-muted)' : '#fff' }}>{boss.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--naruto-orange)', marginTop: '0.2rem' }}>{boss.maxHp} HP</div>
                    {isLocked && (
                      <div style={{ fontSize: '0.65rem', color: '#ef4444', marginTop: '0.5rem' }}>
                        🔒 Richiede {boss.minXp} XP
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button className="ninja-btn" onClick={() => setMode('jutsu-select')}>
              ANNULLA
            </button>
          </div>
        </div>
      )}

      {/* ── Profile Stats Overlay ── */}
      {mode === 'profile' && (
        <ProfileStats
          stats={stats}
          mastery={jutsuMastery}
          achievements={achievements}
          currentPlayer={{ name: playerName, xp: totalXp, rank: currentRank.name }}
          onBack={() => setMode('jutsu-select')}
        />
      )}

      {/* ── Login Prompt Overlay ── */}
      {showLoginPrompt && (
        <div className="recal-overlay" style={{ zIndex: 300 }}>
          <div className="glass-panel" style={{ maxWidth: '400px', width: '100%', padding: '2.5rem', textAlign: 'center', animation: 'jutsuReveal 0.4s ease-out' }}>
            <div className="title-main" style={{ fontSize: '2rem', marginBottom: '1rem' }}>BENVENUTO, NINJA</div>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Per scalare la classifica mondiale e salvare i tuoi progressi in modo sicuro, accedi con il tuo account Google.</p>
            
            <button className="ninja-btn primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', padding: '1.2rem' }} onClick={handleLogin}>
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              ACCEDI CON GOOGLE
            </button>
            
            <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginTop: '1.5rem' }}>
              I tuoi dati verranno crittografati e gestiti in modo sicuro tramite Firebase.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

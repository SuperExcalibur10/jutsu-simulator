import { useState, useRef, useEffect, useCallback } from 'react';
import WebcamView from './components/WebcamView';
import JutsuEffect from './components/JutsuEffect';
import Leaderboard from './components/Leaderboard';
import { auth, googleProvider, db } from './lib/firebase';
import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { extractFeatures, classifySeal } from './utils/sealClassifier';
import { JUTSUS, SEALS_LIST } from './utils/jutsuEngine';
import { RANKS, getCurrentRank, getNextRank } from './utils/progression';

const SEAL_HOLD_FRAMES = 10; // Faster recognition
const STORAGE_KEY_SEALS = 'jutsu_sim_v4_seals';
const STORAGE_KEY_XP = 'jutsu_sim_v4_xp';
const STORAGE_KEY_NAME = 'jutsu_sim_v4_name';

const BACKGROUND_MUSIC = [
  { title: "Blue Bird", file: "/sounds/Blue Bird.mp3" },
  { title: "Sign", file: "/sounds/Sign.mp3" },
  { title: "Silhouette", file: "/sounds/Silhouette.mp3" }
];

function App() {
  /* ── Core state ─────────────────────────────── */
  const [calibratedSeals, setCalibratedSeals] = useState({});
  const calibratedSealsRef = useRef({});
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
  const [totalXp, setTotalXp] = useState(0);
  const [lastXpEarned, setLastXpEarned] = useState(0);
  const [showXpPopup, setShowXpPopup] = useState(false);
  const [xpPopupTitle, setXpPopupTitle] = useState('TECNICA COMPLETATA!');
  const performanceStartTimeRef = useRef(0);

  /* ── Battle state ───────────────────────────── */
  const [battle, setBattle] = useState({
    active: false,
    enemy: null,
    userHp: 100,
    enemyHp: 100,
    timer: 0,
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
  const audioRef = useRef(new Audio());
  const musicStartedRef = useRef(false);

  /* ── Keep refs in sync ──────────────────────── */
  useEffect(() => { calibratedSealsRef.current = calibratedSeals; }, [calibratedSeals]);
  useEffect(() => { selectedJutsuRef.current = selectedJutsu; }, [selectedJutsu]);
  useEffect(() => { sequenceStepRef.current = sequenceStep; }, [sequenceStep]);

  /* ── Music Logic ────────────────────────────── */
  useEffect(() => {
    const playRandom = () => {
      const randomSong = BACKGROUND_MUSIC[Math.floor(Math.random() * BACKGROUND_MUSIC.length)];
      setCurrentSong(randomSong);
      audioRef.current.src = randomSong.file;
      audioRef.current.volume = 0.25;
      audioRef.current.play().catch(() => {
        // Fallback: wait for first interaction if blocked
        const startOnInteract = () => {
          if (!musicStartedRef.current) {
            audioRef.current.play();
            musicStartedRef.current = true;
          }
          window.removeEventListener('click', startOnInteract);
        };
        window.addEventListener('click', startOnInteract);
      });
    };

    audioRef.current.onended = playRandom;
    playRandom();

    return () => {
      audioRef.current.pause();
      audioRef.current.src = '';
    };
  }, []);
  /* ── Init: load saved data ──────────── */
  useEffect(() => {
    const savedSeals = localStorage.getItem(STORAGE_KEY_SEALS);
    if (savedSeals) {
      try {
        const parsed = JSON.parse(savedSeals);
        setCalibratedSeals(parsed);
        calibratedSealsRef.current = parsed;
      } catch (e) { localStorage.removeItem(STORAGE_KEY_SEALS); }
    }

    const savedXp = localStorage.getItem(STORAGE_KEY_XP);
    if (savedXp) {
      const parsedXp = parseInt(savedXp, 10);
      setTimeout(() => setTotalXp(parsedXp), 0);
    }

    // Firebase Auth Listener
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
            // Create user in Firestore
            await setDoc(userRef, {
              name: firebaseUser.displayName,
              xp: parseInt(savedXp, 10) || 0,
              rank: getCurrentRank(parseInt(savedXp, 10) || 0).name,
              photo: firebaseUser.photoURL,
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

    setMode('jutsu-select');
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
          lastSeen: new Date()
        }, { merge: true });
      } catch (e) {
        console.error("Cloud sync failed:", e);
      }
    }
  }, [user]);

  const handleSaveName = async () => {
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
  };


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

    if (mode === 'calibration') {
      currentFeaturesBufferRef.current = features;
      return;
    }

    if (mode === 'perform') {
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
  }, [mode]);

  /* ── Battle Logic ───────────────────────────── */
  const pickRandomJutsuForBattle = useCallback(() => {
    const allUnlocked = Object.values(JUTSUS).filter(j => totalXp >= (j.minXp || 0));
    
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
    setBattle(prev => ({ ...prev, timer: 12, status: `PRESTO! USA ${random.name}!` }));
    
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
  }, [totalXp]);

  const startBattle = () => {
    const enemies = [
      { id: 'orochimaru', minXp: 0 },
      { id: 'pain', minXp: 1000 },
      { id: 'obito', minXp: 3000 },
      { id: 'madara', minXp: 7000 },
      { id: 'kaguya', minXp: 9000 }
    ];
    
    // Filter enemies by player XP
    const availableEnemies = enemies.filter(e => totalXp >= e.minXp);
    const selectedEnemy = availableEnemies[Math.floor(Math.random() * availableEnemies.length)].id;
    
    setBattle({
      active: true,
      enemy: selectedEnemy,
      userHp: 100,
      enemyHp: 100,
      timer: 12,
      status: 'PREPARATI AL COMBATTIMENTO!',
      damageFlash: false
    });
    
    setMode('battle');
  };

  useEffect(() => {
    if (battle.active && battle.timer > 0 && mode !== 'effect') {
      const t = setInterval(() => {
        setBattle(prev => {
          if (prev.timer <= 1) {
            // User takes damage!
            const newHp = Math.max(0, prev.userHp - 20);
            return { ...prev, timer: 12, userHp: newHp, status: 'COLPITO!', damageFlash: true };
          }
          return { ...prev, timer: prev.timer - 1, damageFlash: false };
        });
      }, 1000);
      return () => clearInterval(t);
    }
  }, [battle.active, battle.timer, mode]);

  useEffect(() => {
    if (battle.active && battle.userHp <= 0) {
      setTimeout(() => {
        setBattle(prev => ({ ...prev, active: false, status: 'SCONFITTO...' }));
        setMode('jutsu-select');
        alert("Sei stato sconfitto! Torna ad allenarti.");
      }, 0);
    }
    if (battle.active && battle.enemyHp <= 0) {
      const bonus = 500;
      const defeatedEnemy = battle.enemy;
      setTimeout(() => {
        setTotalXp(prev => {
          const next = prev + bonus;
          localStorage.setItem(STORAGE_KEY_XP, next.toString());
          return next;
        });
        setLastXpEarned(bonus);
        setXpPopupTitle(`HAI SCONFITTO ${defeatedEnemy.toUpperCase()}!`);
        setShowXpPopup(true);
        setBattle(prev => ({ ...prev, active: false, status: 'VITTORIA!' }));
        setMode('jutsu-select');
        setTimeout(() => setShowXpPopup(false), 4000);
      }, 500);
    }
  }, [battle.userHp, battle.enemyHp, battle.active]);

  /* ── Jutsu complete ─────────────────────────── */
  const handleJutsuComplete = useCallback(() => {
    // Calculate XP
    const duration = (performance.now() - performanceStartTimeRef.current) / 1000;
    const jutsu = selectedJutsuRef.current;
    
    let isEnemyDefeated = false;

    if (jutsu) {
      const base = 50 + (jutsu.sequence.length * 10);
      const speedBonus = Math.max(1, 1.5 - (duration / 20));
      const earned = Math.round(base * speedBonus);
      
      setTotalXp(prev => {
        const next = prev + earned;
        localStorage.setItem(STORAGE_KEY_XP, next.toString());
        syncXpToCloud(next);
        return next;
      });
      setLastXpEarned(earned);
      setXpPopupTitle('TECNICA COMPLETATA!');
      setShowXpPopup(true);
      setTimeout(() => setShowXpPopup(false), 3000);

      const newEnemyHp = Math.max(0, battle.enemyHp - 25);
      isEnemyDefeated = battle.active && jutsu.effectType !== 'heal' && newEnemyHp === 0;

      // Battle Damage or Healing
      setBattle(prev => {
        if (prev.active) {
          if (jutsu.effectType === 'heal') {
            return {
              ...prev,
              userHp: Math.min(100, prev.userHp + 30),
              timer: 12,
              status: 'FERITE RIMARGINATE!'
            };
          } else {
            return {
              ...prev,
              enemyHp: newEnemyHp,
              timer: 12,
              status: 'OTTIMO COLPO!'
            };
          }
        }
        return prev;
      });
    }

    setActiveJutsu(null);
      
      // If in battle, pick the next move AUTOMATICALLY (only if enemy is not defeated)
      if (battle.active && !isEnemyDefeated) {
         setTimeout(() => {
           pickRandomJutsuForBattle();
         }, 800); // Shorter pause for higher pace
      }

      setMode(battle.active ? 'battle' : 'jutsu-select');
    setSelectedJutsu(null);
    selectedJutsuRef.current = null;
    setSequenceStep(0);
    sequenceStepRef.current = 0;
  }, [battle.active, pickRandomJutsuForBattle, syncXpToCloud]);

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
  const currentSealName = mode === 'calibration' ? calibrationQueue[calibrationIndex] : null;
  const calibrationPct = calibrationQueue.length
    ? Math.round((calibrationIndex / calibrationQueue.length) * 100) : 0;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', gap: '1.25rem', padding: '1.25rem', boxSizing: 'border-box' }}>

      {/* Sidebar Background (For layering) */}
      <div className="sidebar-bg glass-panel" style={{ position: 'absolute', top: '1.25rem', left: '1.25rem', bottom: '1.25rem', width: '310px', zIndex: 1, pointerEvents: 'none' }}></div>

      {/* Decorative Kakashi (Between background and content) */}
      <img src={`/assets/kakashi.png?v=${new Date().getTime()}`} className="deco-kakashi" style={{ zIndex: 2 }} alt="" />

      {/* ── Left Sidebar ─────────────────────── */}
      <div className="sidebar" style={{ width: '310px', flexShrink: 0, display: 'flex', flexDirection: 'column', padding: '1.5rem', gap: '1.25rem', overflowY: 'auto', zIndex: 10, position: 'relative' }}>






        {/* Logo */}
        <div>
          <div className="title-main">忍術 Simulator</div>
          <div className="title-kanji">Shinobi Hand Seal Trainer</div>
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
          onClick={(e) => {
            const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;
            if (!user || user.email !== ADMIN_EMAIL) return;

            const now = Date.now();
            if (!window.rankClicks) window.rankClicks = [];
            window.rankClicks = window.rankClicks.filter(t => now - t < 1000);
            window.rankClicks.push(now);
            if (window.rankClicks.length >= 3) {
              setTotalXp(prev => {
                const next = prev + 10000;
                localStorage.setItem(STORAGE_KEY_XP, next.toString());
                syncXpToCloud(next);
                return next;
              });
              window.rankClicks = [];
              alert("💥 ADMIN CHAKRA! Hai ottenuto 10.000 XP.");
            }
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.6rem' }}>
            <div>
              <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>Grado Ninja</div>
              <div style={{ 
                fontFamily: 'var(--font-title)', fontSize: '1.5rem', 
                color: getCurrentRank(totalXp).color, 
                textShadow: `0 0 10px ${getCurrentRank(totalXp).color}44` 
              }}>
                {getCurrentRank(totalXp).name}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Punti Esperienza</div>
              <div style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '1rem' }}>{totalXp} XP</div>
            </div>
          </div>
          
          {getNextRank(totalXp) && (
            <>
              <div className="calibration-progress" style={{ height: '6px', background: 'rgba(255,255,255,0.05)' }}>
                <div 
                  className="calibration-progress-fill" 
                  style={{ 
                    width: `${((totalXp - getCurrentRank(totalXp).min) / (getNextRank(totalXp).min - getCurrentRank(totalXp).min)) * 100}%`,
                    background: getCurrentRank(totalXp).color
                  }} 
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                <span>{getCurrentRank(totalXp).min}</span>
                <span>Prossimo Grado: {getNextRank(totalXp).name} ({getNextRank(totalXp).min})</span>
              </div>
            </>
          )}
        </div>

        {/* ─── BATTLE MODE ─── */}
        {mode === 'battle' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1.5rem', textAlign: 'center', animation: 'status-bounce 0.4s ease-out' }}>
            <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <div style={{ fontSize: '0.7rem', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '0.5rem' }}>Scontro Ninja</div>
              <div style={{ fontFamily: 'var(--font-title)', fontSize: '1.8rem', color: '#fff' }}>SFIDA CONTRO {battle.enemy?.toUpperCase()}</div>
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
                        ) : !allCalibrated && (
                          <span style={{ fontSize: '0.6rem', color: '#F97316', background: 'rgba(249,115,22,0.15)', padding: '0.1rem 0.4rem', borderRadius: '0.3rem', border: '1px solid rgba(249,115,22,0.3)' }}>
                            ⚡ Calibra
                          </span>
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
              <button className="ninja-btn primary" style={{ width: '100%', padding: '0.8rem', fontSize: '1.1rem' }}
                onClick={startBattle} disabled={battle.active}>
                ⚔️ SCONTRO NINJA
              </button>
            </div>

              <button className="ninja-btn danger" style={{ width: '100%', marginTop: 'auto' }}
                onClick={() => { setSelectedForRecal(new Set()); setMode('recalibrate-menu'); }}>
                ⚙ Ricalibra Sigilli
              </button>
              
              <button className="ninja-btn" style={{ width: '100%', border: '1px solid var(--chidori-blue)', color: 'var(--chidori-blue)', background: 'rgba(56,189,248,0.05)' }}
                onClick={() => setMode('leaderboard')}>
                🏆 Classifica Globale
              </button>
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
                <span>{battle.enemy}</span>
                <span>{battle.enemyHp}%</span>
              </div>
              <div className="calibration-progress" style={{ height: '10px', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)' }}>
                <div className="calibration-progress-fill" style={{ width: `${battle.enemyHp}%`, background: 'linear-gradient(90deg, #ef4444, #b91c1c)' }} />
              </div>
            </div>

            {/* User HP Bar */}
            <div style={{ position: 'absolute', bottom: '100px', left: '50%', transform: 'translateX(-50%)', width: '50%', zIndex: 100 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#fff', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>
                <span>Tu (Salute)</span>
                <span>{battle.userHp}%</span>
              </div>
              <div className="calibration-progress" style={{ height: '8px', background: 'rgba(0,0,0,0.6)' }}>
                <div className="calibration-progress-fill" style={{ width: `${battle.userHp}%`, background: 'linear-gradient(90deg, #22c55e, #15803d)' }} />
              </div>
            </div>

            {/* Battle Timer & Status */}
            <div style={{ position: 'absolute', top: '50%', right: '40px', transform: 'translateY(-50%)', textAlign: 'right', zIndex: 100 }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tempo rimasto</div>
              <div style={{ fontFamily: 'var(--font-title)', fontSize: '4rem', color: battle.timer <= 3 ? '#ef4444' : '#fff', lineHeight: 1 }}>
                {battle.timer}
              </div>
              <div style={{ marginTop: '1rem', fontFamily: 'var(--font-title)', fontSize: '1.2rem', color: 'var(--naruto-orange)' }}>
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
        <img src={`/assets/naruto_logo.png?v=${new Date().getTime()}`} className="deco-logo" alt="Naruto Logo" />

        <WebcamView onResults={handleWebcamResults} currentSong={currentSong} />

        {/* Decorative Sasuke & Naruto (Clipped inside webcam frame) */}
        <img src={`/assets/sasuke.png?v=${new Date().getTime()}`} className="deco-sasuke" alt="" />
        <img src={`/assets/naruto.png?v=${new Date().getTime()}`} className="deco-naruto" alt="" />

        
        {/* ── Jutsu Effect (Nested) ── */}
        {activeJutsu && (
          <JutsuEffect
            jutsu={activeJutsu}
            handLandmarks={window.currentHandLandmarks}
            onComplete={handleJutsuComplete}
          />
        )}

        {/* ── XP Popup ── */}
        {showXpPopup && (
          <div className="xp-popup">
            <div className="xp-popup-title">{xpPopupTitle}</div>
            <div className="xp-popup-value">+{lastXpEarned} XP</div>
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
          currentPlayer={{ uid: user?.uid, name: playerName, xp: totalXp, rank: getCurrentRank(totalXp).name, photo: user?.photoURL }}
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

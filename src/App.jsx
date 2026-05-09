import React, { useState, useEffect, useRef, useCallback } from 'react';
import WebcamView from './components/WebcamView';
import JutsuEffect from './components/JutsuEffect';
import { extractFeatures, classifySeal } from './utils/sealClassifier';
import { JUTSUS, SEALS_LIST } from './utils/jutsuEngine';

const SEAL_HOLD_FRAMES = 18; // ~600ms at 30fps before a seal is "confirmed"
const STORAGE_KEY_SEALS = 'jutsu_sim_v4_seals';

const BACKGROUND_MUSIC = [
  { title: "Blue Bird", file: "/sounds/Blue Bird.mp3" },
  { title: "Sign", file: "/sounds/Sign.mp3" },
  { title: "Silhouette", file: "/sounds/Silhouette.mp3" }
];

function App() {
  /* ── Core state ─────────────────────────────── */
  const [calibratedSeals, setCalibratedSeals] = useState({});
  const calibratedSealsRef = useRef({});

  // mode: 'jutsu-select' | 'calibration' | 'perform' | 'effect'
  const [mode, setMode] = useState('jutsu-select');
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
  const [currentSeal, setCurrentSeal] = useState(null); // currently detected seal
  const [stepFlash, setStepFlash] = useState(false);    // green flash when step confirmed
  const sealHoldCountRef = useRef(0);                   // consecutive frames same seal detected
  const sequenceStepRef = useRef(0);

  /* ── Jutsu effect ───────────────────────────── */
  const [activeJutsu, setActiveJutsu] = useState(null);

  /* ── Music state ────────────────────────────── */
  const [currentSong, setCurrentSong] = useState(null);
  const audioRef = useRef(new Audio());
  const musicStartedRef = useRef(false);

  /* ── Recalibrate menu ───────────────────────── */
  const [selectedForRecal, setSelectedForRecal] = useState(new Set());

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

  /* ── Init: load saved calibration ──────────── */
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY_SEALS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const firstKey = Object.keys(parsed)[0];
        if (firstKey && parsed[firstKey] && parsed[firstKey].length !== 60) {
          throw new Error('Obsolete format');
        }
        setCalibratedSeals(parsed);
        calibratedSealsRef.current = parsed;
      } catch {
        localStorage.removeItem(STORAGE_KEY_SEALS);
      }
    }
    setMode('jutsu-select');
  }, []);

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
    setCurrentSeal(null);
    setStepFlash(false);
    setMode('perform');
  };

  /* ── Calibration ────────────────────────────── */
  const captureNow = useCallback(() => {
    const features = window.currentFeaturesBuffer;
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
    window.currentFeaturesBuffer = null;
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
      setCountdown(null);
    }
  }, [countdown]);

  /* ── Webcam results ─────────────────────────── */
  const handleWebcamResults = useCallback((results) => {
    if (!results?.landmarks?.length) {
      setCurrentSeal(null);
      sealHoldCountRef.current = 0;
      return;
    }
    const features = extractFeatures(results.landmarks);
    window.currentHandLandmarks = results.landmarks;
    if (!features) return;

    if (mode === 'calibration') {
      window.currentFeaturesBuffer = features;
      return;
    }

    if (mode === 'perform') {
      const jutsu = selectedJutsuRef.current;
      if (!jutsu) return;
      const targetSeal = jutsu.sequence[sequenceStepRef.current];
      const recognized = classifySeal(features, calibratedSealsRef.current);
      setCurrentSeal(recognized);

      if (recognized === targetSeal) {
        sealHoldCountRef.current++;
        const progress = Math.min((sealHoldCountRef.current / SEAL_HOLD_FRAMES) * 100, 100);
        const fill = document.getElementById('chakra-fill');
        if (fill) fill.style.width = `${progress}%`;

        if (sealHoldCountRef.current >= SEAL_HOLD_FRAMES) {
          sealHoldCountRef.current = 0;
          if (fill) fill.style.width = '0%';
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
          const fill = document.getElementById('chakra-fill');
          if (fill) fill.style.width = '0%';
        }
      }
    }
  }, [mode]);

  /* ── Jutsu complete ─────────────────────────── */
  const handleJutsuComplete = useCallback(() => {
    setActiveJutsu(null);
    setMode('jutsu-select');
    setSelectedJutsu(null);
    selectedJutsuRef.current = null;
    setSequenceStep(0);
    sequenceStepRef.current = 0;
  }, []);

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

        {/* ─── JUTSU SELECT ─── */}
        {mode === 'jutsu-select' && (
          <>
            <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.07)', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              🥷 Scegli la tecnica che vuoi eseguire. Ti verrà mostrato ogni sigillo da fare in sequenza.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {Object.values(JUTSUS).map(jutsu => {
                const allCalibrated = jutsu.sequence.every(s => calibratedSeals[s]);
                return (
                  <button
                    key={jutsu.id}
                    className="jutsu-card-refined"
                    onClick={() => handleSelectJutsu(jutsu)}
                    style={{
                      '--card-glow': jutsu.glowColor.replace('0.6','0.3'),
                      background: `linear-gradient(135deg, ${jutsu.glowColor.replace('0.6','0.12')}, rgba(0,0,0,0.3))`,
                      border: `1px solid ${jutsu.glowColor.replace('0.6','0.35')}`,
                      borderRadius: '1rem', padding: '0.9rem 1rem',
                      cursor: 'pointer', textAlign: 'left', color: 'var(--text-main)',
                      position: 'relative', overflow: 'hidden',
                      display: 'block', width: '100%'
                    }}
                  >
                    {/* Character background image */}
                    <div style={{
                      position: 'absolute', right: '0%', top: '50%', transform: 'translateY(-50%)', 
                      height: '130%', width: '60%', opacity: 0.35, pointerEvents: 'none', 
                      mixBlendMode: 'screen', filter: 'grayscale(30%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <img src={`/characters/${jutsu.imageId}.png`} alt="" style={{ height: '100%', objectFit: 'contain' }} onError={e => e.target.style.display='none'} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontFamily: 'var(--font-title)', fontSize: '1.1rem', letterSpacing: '0.08em', color: jutsu.color }}>
                          {jutsu.name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{jutsu.subtitle}</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem' }}>
                        <span style={{ fontSize: '1.5rem', opacity: 0.5 }}>{jutsu.kanji}</span>
                        {!allCalibrated && (
                          <span style={{ fontSize: '0.6rem', color: '#F97316', background: 'rgba(249,115,22,0.15)', padding: '0.1rem 0.4rem', borderRadius: '0.3rem', border: '1px solid rgba(249,115,22,0.3)' }}>
                            ⚡ Calibra
                          </span>
                        )}
                      </div>
                    </div>
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
                  </button>
                );
              })}
            </div>

            <button className="ninja-btn danger" style={{ width: '100%', marginTop: 'auto' }}
              onClick={() => { setSelectedForRecal(new Set()); setMode('recalibrate-menu'); }}>
              ⚙ Ricalibra Sigilli
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
              <div className="seal-detector-value" style={{
                color: currentSeal ? selectedJutsu.color : 'var(--text-muted)',
                textShadow: currentSeal ? `0 0 12px ${selectedJutsu.glowColor}` : 'none',
              }}>
                {currentSeal || '· · ·'}
              </div>
              <div className="chakra-gauge-container">
                <div id="chakra-fill" className="chakra-gauge-fill" />
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
                  const isNext = i > sequenceStep;
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
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                            {currentSeal === sealName
                              ? `✓ Tieni fermo... ${Math.round((sealHoldCountRef.current / SEAL_HOLD_FRAMES) * 100)}%`
                              : 'In attesa...'}
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
      <div className="glass-panel webcam-container" style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
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
    </div>
  );
}

export default App;

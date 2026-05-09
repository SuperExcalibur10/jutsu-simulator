import React, { useEffect, useRef, useCallback, useState } from 'react';

const smokeImg = new Image();
smokeImg.src = '/effects/smoke.png';

/* ── Audio ──────────────────────────────────────── */
const playSound = (type, audioCtx) => {
  try {
    if (type === 'lightning') {
      // Chidori: chirping electric crackle
      for (let i = 0; i < 8; i++) {
        setTimeout(() => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          const filter = audioCtx.createBiquadFilter();
          filter.type = 'bandpass'; filter.frequency.value = 2000 + Math.random() * 3000;
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(800 + Math.random() * 1200, audioCtx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.08);
          gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
          osc.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
          osc.start(); osc.stop(audioCtx.currentTime + 0.1);
        }, i * 120);
      }
    } else if (type === 'wind') {
      // Rasengan: deep spinning whoosh
      const bufferSize = audioCtx.sampleRate * 2;
      const buf = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.2;
      const src = audioCtx.createBufferSource(); src.buffer = buf;
      const filter = audioCtx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 500;
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.4, audioCtx.currentTime + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 2.5);
      src.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
      src.start();
      // Add spinning hum
      const osc = audioCtx.createOscillator(); osc.type = 'sine';
      osc.frequency.setValueAtTime(80, audioCtx.currentTime);
      osc.frequency.linearRampToValueAtTime(200, audioCtx.currentTime + 1.5);
      const g2 = audioCtx.createGain();
      g2.gain.setValueAtTime(0.15, audioCtx.currentTime);
      g2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 2);
      osc.connect(g2); g2.connect(audioCtx.destination);
      osc.start(); osc.stop(audioCtx.currentTime + 2);
    } else if (type === 'fire') {
      // Katon: deep roar + crackle
      const osc = audioCtx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 60;
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.35, audioCtx.currentTime + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 3);
      const filter = audioCtx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 300;
      osc.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
      osc.start(); osc.stop(audioCtx.currentTime + 3);
    } else if (type === 'shadow' || type === 'clone') {
      // Kage Bunshin / Bunshin: poof sound (white noise + low thud)
      const bufferSize = audioCtx.sampleRate * 0.4;
      const buf = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.2;
      const noise = audioCtx.createBufferSource(); noise.buffer = buf;
      const nGain = audioCtx.createGain();
      nGain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      nGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
      const nFilter = audioCtx.createBiquadFilter(); nFilter.type = 'lowpass'; nFilter.frequency.value = 1200;
      noise.connect(nFilter); nFilter.connect(nGain); nGain.connect(audioCtx.destination);
      noise.start();

      const osc = audioCtx.createOscillator(); osc.type = 'sine';
      osc.frequency.setValueAtTime(110, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.2);
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(); osc.stop(audioCtx.currentTime + 0.4);
    }
  } catch (e) { /* ignore */ }
};

/* ── Lightning (Chidori) Canvas ─────────────────── */
const renderChidori = (ctx, w, h, hand, t, particles) => {
  ctx.clearRect(0, 0, w, h);
  const cx = hand[9].x * w, cy = hand[9].y * h;
  const tip = hand[8]; // index fingertip
  const tx = tip.x * w, ty = tip.y * h;

  // Background flash pulse
  const flash = 0.04 + 0.03 * Math.sin(t * 0.3);
  const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 220);
  bg.addColorStop(0, `rgba(180,230,255,${flash})`);
  bg.addColorStop(1, 'transparent');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

  // Core glow on hand
  const coreGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 90);
  coreGlow.addColorStop(0, 'rgba(255,255,255,0.7)');
  coreGlow.addColorStop(0.2, 'rgba(100,200,255,0.5)');
  coreGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = coreGlow;
  ctx.beginPath(); ctx.arc(cx, cy, 90, 0, Math.PI * 2); ctx.fill();

  // Arcing bolts from center to fingertip
  ctx.shadowBlur = 20; ctx.shadowColor = '#38BDF8';
  for (let i = 0; i < 12; i++) {
    ctx.strokeStyle = i < 4 ? 'rgba(255,255,255,0.9)' : `rgba(100,190,255,${0.4 + Math.random() * 0.4})`;
    ctx.lineWidth = i < 4 ? 2 : 1;
    ctx.beginPath(); ctx.moveTo(cx + (Math.random()-0.5)*30, cy + (Math.random()-0.5)*30);
    let x = cx, y = cy;
    const steps = 5 + Math.floor(Math.random() * 4);
    for (let j = 0; j < steps; j++) {
      const progress = j / steps;
      x = cx + (tx - cx) * progress + (Math.random()-0.5) * 60 * (1-progress);
      y = cy + (ty - cy) * progress + (Math.random()-0.5) * 60 * (1-progress);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(tx, ty);
    ctx.stroke();
  }

  // Fingertip concentration
  const tipGlow = ctx.createRadialGradient(tx, ty, 0, tx, ty, 40);
  tipGlow.addColorStop(0, 'rgba(255,255,255,1)');
  tipGlow.addColorStop(0.3, 'rgba(56,189,248,0.8)');
  tipGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = tipGlow;
  ctx.beginPath(); ctx.arc(tx, ty, 40, 0, Math.PI * 2); ctx.fill();

  // Spark particles
  particles.forEach((p, i) => {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.shadowBlur = 8; ctx.shadowColor = '#38BDF8';
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
    p.x += p.vx; p.y += p.vy;
    p.vy += 0.1; p.life -= 0.025; p.size *= 0.97;
    if (p.life <= 0) {
      particles[i] = spawnSpark(cx, cy, tx, ty);
    }
  });
  ctx.globalAlpha = 1; ctx.shadowBlur = 0;
};

const spawnSpark = (cx, cy, tx, ty) => {
  const t = Math.random();
  return {
    x: cx + (tx-cx)*t + (Math.random()-0.5)*40,
    y: cy + (ty-cy)*t + (Math.random()-0.5)*40,
    vx: (Math.random()-0.5)*4,
    vy: (Math.random()-0.5)*4 - 1,
    life: Math.random()*0.6+0.3,
    size: Math.random()*3+1,
    color: Math.random()>0.5 ? '#fff' : '#38BDF8',
  };
};

/* ── Rasengan Canvas ─────────────────────────────── */
const renderRasengan = (ctx, w, h, hand, t, particles) => {
  ctx.clearRect(0, 0, w, h);
  const cx = hand[9].x * w, cy = hand[9].y * h;
  const radius = 55 + 5 * Math.sin(t * 0.08);

  // Outer chakra aura
  const aura = ctx.createRadialGradient(cx, cy, radius * 0.3, cx, cy, radius * 2.5);
  aura.addColorStop(0, 'rgba(100,180,255,0.2)');
  aura.addColorStop(1, 'transparent');
  ctx.fillStyle = aura; ctx.fillRect(0, 0, w, h);

  // Spinning outer rings
  ctx.save();
  ctx.translate(cx, cy);
  for (let ring = 0; ring < 4; ring++) {
    const rr = radius + ring * 18;
    const speed = (ring % 2 === 0 ? 1 : -1) * t * (0.04 + ring * 0.01);
    const alpha = 0.6 - ring * 0.12;
    ctx.strokeStyle = `rgba(100,210,255,${alpha})`;
    ctx.lineWidth = 3 - ring * 0.5;
    ctx.shadowBlur = 15; ctx.shadowColor = '#38BDF8';
    ctx.beginPath();
    ctx.arc(0, 0, rr, speed, speed + Math.PI * 1.7);
    ctx.stroke();
    // Counter-arc
    ctx.beginPath();
    ctx.arc(0, 0, rr, speed + Math.PI, speed + Math.PI * 1.7 + Math.PI * 0.3);
    ctx.stroke();
  }
  ctx.restore();

  // Core sphere
  const core = ctx.createRadialGradient(cx - radius*0.2, cy - radius*0.2, 2, cx, cy, radius);
  core.addColorStop(0, 'rgba(255,255,255,0.95)');
  core.addColorStop(0.3, 'rgba(140,210,255,0.85)');
  core.addColorStop(0.7, 'rgba(30,120,255,0.6)');
  core.addColorStop(1, 'rgba(0,60,200,0.1)');
  ctx.fillStyle = core;
  ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.fill();

  // Wind particles spiraling in
  ctx.shadowBlur = 0;
  particles.forEach((p, i) => {
    ctx.globalAlpha = p.life * 0.7;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
    const angle = Math.atan2(cy - p.y, cx - p.x);
    const dist = Math.hypot(p.x - cx, p.y - cy);
    p.x += Math.cos(angle + 0.3) * 3;
    p.y += Math.sin(angle + 0.3) * 3;
    p.life -= 0.015;
    if (p.life <= 0 || dist < radius * 0.5) {
      const a = Math.random() * Math.PI * 2;
      const d = radius * 1.5 + Math.random() * 80;
      particles[i] = { x: cx + Math.cos(a)*d, y: cy + Math.sin(a)*d, life: 0.8, size: Math.random()*3+1, color: Math.random()>0.5?'#a0d8ff':'#fff' };
    }
  });
  ctx.globalAlpha = 1;
};

/* ── Katon (Fire) Canvas ─────────────────────────── */
const renderKaton = (ctx, w, h, hand, t, particles) => {
  ctx.clearRect(0, 0, w, h);
  const cx = hand[9].x * w;
  const cy = hand[9].y * h;
  // Fireball stays centered and expands
  const bx = w / 2;
  const by = h / 2;
  const ballR = 40 + t * 1.5; // Expands more slowly now

  // Heat shimmer background
  const shimmer = ctx.createRadialGradient(bx, by, 0, bx, by, ballR * 3);
  shimmer.addColorStop(0, 'rgba(255,120,20,0.15)');
  shimmer.addColorStop(1, 'transparent');
  ctx.fillStyle = shimmer; ctx.fillRect(0, 0, w, h);

  // Outer flame glow
  const outerFlame = ctx.createRadialGradient(bx, by, ballR * 0.5, bx, by, ballR * 1.8);
  outerFlame.addColorStop(0, 'rgba(255,160,30,0.5)');
  outerFlame.addColorStop(0.5, 'rgba(220,60,10,0.3)');
  outerFlame.addColorStop(1, 'transparent');
  ctx.fillStyle = outerFlame;
  ctx.beginPath(); ctx.arc(bx, by, ballR * 1.8, 0, Math.PI*2); ctx.fill();

  // Core fireball
  const fire = ctx.createRadialGradient(bx - ballR*0.2, by - ballR*0.2, 2, bx, by, ballR);
  fire.addColorStop(0, 'rgba(255,255,180,1)');
  fire.addColorStop(0.3, 'rgba(255,160,20,0.95)');
  fire.addColorStop(0.7, 'rgba(220,50,0,0.7)');
  fire.addColorStop(1, 'rgba(100,0,0,0.1)');
  ctx.fillStyle = fire;
  ctx.shadowBlur = 40; ctx.shadowColor = '#f97316';
  ctx.beginPath(); ctx.arc(bx, by, ballR, 0, Math.PI*2); ctx.fill();
  ctx.shadowBlur = 0;

  // Ember particles
  particles.forEach((p, i) => {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.shadowBlur = 6; ctx.shadowColor = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
    p.x += p.vx; p.y += p.vy;
    p.vy -= 0.15; p.vx += (Math.random()-0.5)*0.3;
    p.life -= 0.018; p.size *= 0.98;
    if (p.life <= 0) {
      const a = Math.random() * Math.PI * 2;
      particles[i] = {
        x: bx + Math.cos(a)*ballR*(0.3+Math.random()*0.7),
        y: by + Math.sin(a)*ballR*(0.3+Math.random()*0.7),
        vx: (Math.random()-0.5)*6, vy: -(Math.random()*5+2),
        life: Math.random()*0.7+0.2, size: Math.random()*6+2,
        color: ['rgba(255,220,50,1)','rgba(255,120,20,1)','rgba(220,40,0,1)'][Math.floor(Math.random()*3)],
      };
    }
  });
  ctx.globalAlpha = 1; ctx.shadowBlur = 0;
};

/* ── Kage Bunshin (Shadow) Canvas ───────────────── */
const renderShadow = (ctx, w, h, hand, t, clones) => {
  ctx.clearRect(0, 0, w, h);
  const cx = hand[9].x * w, cy = hand[9].y * h;

  // Dark smoke aura
  const smoke = ctx.createRadialGradient(cx, cy, 10, cx, cy, 160);
  smoke.addColorStop(0, 'rgba(80,20,120,0.3)');
  smoke.addColorStop(1, 'transparent');
  ctx.fillStyle = smoke; ctx.fillRect(0, 0, w, h);

  // Clone silhouettes appearing
  clones.forEach(c => {
    const progress = Math.min(t / c.spawnTime, 1);
    ctx.globalAlpha = progress * 0.55;
    ctx.fillStyle = `rgba(80,0,120,0.7)`;
    ctx.shadowBlur = 20 * progress; ctx.shadowColor = '#a855f7';
    // Draw simple humanoid shadow shape
    const sx = c.x, sy = c.y;
    const sc = 0.5 + progress * 0.5;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(sc, sc);
    // Body oval
    ctx.beginPath(); ctx.ellipse(0, 10, 20, 40, 0, 0, Math.PI*2); ctx.fill();
    // Head
    ctx.beginPath(); ctx.arc(0, -40, 18, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    // Smoke effect from image
    if (smokeImg.complete && progress < 0.8) {
      ctx.globalAlpha = (1 - (progress / 0.8)) * 0.6;
      ctx.drawImage(smokeImg, sx - 100, sy - 150, 200, 200);
    }
  });

  // Swirling smoke rings
  ctx.globalAlpha = 1;
  for (let ring = 0; ring < 5; ring++) {
    const angle = t * 0.02 * (ring % 2 === 0 ? 1 : -1) + ring * 1.2;
    const r = 60 + ring * 25;
    const alpha = (0.4 - ring * 0.06) * (0.5 + 0.5 * Math.sin(t * 0.05 + ring));
    ctx.strokeStyle = `rgba(168,85,247,${alpha})`;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 10; ctx.shadowColor = '#a855f7';
    ctx.beginPath();
    ctx.arc(cx, cy, r, angle, angle + Math.PI * 1.3);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
};

/* ── Bunshin (Clone) Canvas ──────────────────────── */
let maskCanvas = null;
let maskCtx = null;
let userCanvas = null;
let userCtx = null;
let isSegmenting = false; // Flag to track if userCanvas has content

const renderClone = (ctx, w, h, t) => {
  ctx.clearRect(0, 0, w, h);
  const video = window.currentVideoElement;
  const segmenter = window.currentSegmenter;
  
  if (!video || video.readyState < 2) return;

  const vW = video.videoWidth;
  const vH = video.videoHeight;
  
  if (!maskCanvas || maskCanvas.width !== vW) {
    maskCanvas = document.createElement('canvas');
    maskCanvas.width = vW; maskCanvas.height = vH;
    maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
    
    userCanvas = document.createElement('canvas');
    userCanvas.width = vW; userCanvas.height = vH;
    userCtx = userCanvas.getContext('2d', { willReadFrequently: true });
    isSegmenting = false;
  }

  // Segment user to remove background
  if (segmenter && video.currentTime !== video.dataset.lastTime) {
    video.dataset.lastTime = video.currentTime;
    try {
      segmenter.segmentForVideo(video, performance.now(), (result) => {
        if (result.confidenceMasks && result.confidenceMasks.length > 0) {
          const mask = result.confidenceMasks[0].getAsFloat32Array();
          const imgData = maskCtx.createImageData(vW, vH);
          for (let i = 0; i < mask.length; i++) {
            imgData.data[i * 4 + 3] = mask[i] * 255;
          }
          maskCtx.putImageData(imgData, 0, 0);

          userCtx.clearRect(0, 0, vW, vH);
          userCtx.drawImage(video, 0, 0, vW, vH);
          userCtx.globalCompositeOperation = 'destination-in';
          userCtx.drawImage(maskCanvas, 0, 0);
          userCtx.globalCompositeOperation = 'source-over';
          isSegmenting = true;
        }
      });
    } catch (e) {
      console.error("Segmentation error:", e);
    }
  }

  const progress = Math.min(t / 25, 1);
  
  // Use the segmented canvas ONLY if it has been populated, otherwise fallback to raw video
  const drawSource = isSegmenting ? userCanvas : video;
  
  // Clone dimensions (Portrait crop)
  const scale = 0.8;
  const dw = (w * 0.45) * scale;
  const dh = h * scale;

  // Duo formation: [Left, Right] flank the center
  const squad = [
    { x: w * 0.02, y: h * 0.12, isReal: false, alpha: 0.85 },
    { x: w * 0.62, y: h * 0.12, isReal: false, alpha: 0.85 }
  ];

  squad.forEach((member) => {
    const memberAlpha = progress * member.alpha;
    ctx.globalAlpha = memberAlpha;

    ctx.save();
    
    // Mirroring logic
    ctx.translate(member.x + dw, member.y);
    ctx.scale(-1, 1);
    
    // Source cropping: take the center 50% of the webcam feed
    const srcX = vW * 0.25;
    const srcW = vW * 0.5;

    // Draw the isolated user (segmented) as a clone
    ctx.drawImage(drawSource, srcX, 0, srcW, vH, 0, 0, dw, dh);

    ctx.restore();
  });

  // Poof smoke clouds only for the 2 clones
  if (t < 25) {
    const smokeAlpha = (1 - t / 25);
    ctx.globalAlpha = smokeAlpha;
    squad.forEach(member => {
      const sx = member.x + dw / 2;
      const sy = member.y + dh / 2;
      for(let i=0; i<3; i++) {
        const ox = (Math.random()-0.5)*dw;
        const oy = (Math.random()-0.5)*dh;
        const size = dw * (1.2 + Math.random() * 0.5);
        if (smokeImg.complete) {
          ctx.drawImage(smokeImg, sx + ox - size/2, sy + oy - size/2, size, size);
        } else {
          ctx.fillStyle = `rgba(240,240,240,0.8)`;
          ctx.beginPath();
          ctx.arc(sx+ox, sy+oy, 50, 0, Math.PI*2);
          ctx.fill();
        }
      }
    });
  }

  ctx.globalAlpha = 1;
};

/* ── Summon (Kuchiyose) Canvas ──────────────────── */
const summonsImages = {};
const loadSummonImage = (name) => {
  if (summonsImages[name]) return summonsImages[name];
  const img = new Image();
  img.src = `/characters/${name}.png`;
  summonsImages[name] = img;
  return img;
};

const renderSummon = (ctx, w, h, t, animalName) => {
  ctx.clearRect(0, 0, w, h);
  if (!animalName) return;
  const img = loadSummonImage(animalName);

  const progress = Math.min(t / 25, 1);
  const dw = w * 0.6;
  const dh = h * 0.9;
  const x = -w * 0.05; // Further to the side
  const y = h * 0.05;

  // Poof effect
  if (t < 30) {
    const smokeAlpha = Math.max(0, 1 - t / 30);
    ctx.globalAlpha = smokeAlpha;
    ctx.fillStyle = 'rgba(240,240,240,0.95)';
    for (let i = 0; i < 15; i++) {
      const ox = x + dw / 2 + (Math.random() - 0.5) * dw * 0.8;
      const oy = y + dh / 2 + (Math.random() - 0.5) * dh * 0.8;
      ctx.beginPath();
      ctx.arc(ox, oy, 50 + Math.random() * 50, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Draw animal image
  if (img.complete && img.naturalWidth !== 0) {
    ctx.globalAlpha = progress * 0.7; // Added transparency
    ctx.drawImage(img, x, y, dw, dh);
  }
  ctx.globalAlpha = 1;
};

/* ── Component ────────────────────────────────────── */
const JutsuEffect = ({ jutsu, handLandmarks, onComplete }) => {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const tRef = useRef(0);
  const particlesRef = useRef([]);
  const clonesRef = useRef([]);
  const [showCutIn, setShowCutIn] = useState(true);
  const [summonedAnimal, setSummonedAnimal] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setShowCutIn(false), 1200);
    if (jutsu.effectType === 'summon') {
      setSummonedAnimal('gamapunta');
    }
    return () => clearTimeout(timer);
  }, [jutsu]);

  const initParticles = useCallback((type, cx, cy) => {
    if (type === 'lightning') {
      particlesRef.current = Array.from({ length: 30 }, () => spawnSpark(cx, cy, cx, cy - 80));
    } else if (type === 'wind') {
      particlesRef.current = Array.from({ length: 40 }, () => {
        const a = Math.random() * Math.PI * 2;
        const d = 60 + Math.random() * 80;
        return { x: cx + Math.cos(a)*d, y: cy + Math.sin(a)*d, life: 0.8, size: Math.random()*3+1, color: Math.random()>0.5?'#a0d8ff':'#fff' };
      });
    } else if (type === 'fire') {
      const colors = ['rgba(255,220,50,1)','rgba(255,120,20,1)','rgba(220,40,0,1)'];
      particlesRef.current = Array.from({ length: 60 }, () => ({
        x: cx + (Math.random()-0.5)*40, y: cy + (Math.random()-0.5)*40,
        vx: (Math.random()-0.5)*6, vy: -(Math.random()*5+2),
        life: Math.random()*0.7+0.2, size: Math.random()*6+2,
        color: colors[Math.floor(Math.random()*colors.length)],
      }));
    } else if (type === 'shadow') {
      clonesRef.current = [-200, -120, 120, 200].map(offset => ({
        x: cx + offset, y: cy,
        spawnTime: 30 + Math.abs(offset) * 0.3,
      }));
    }
  }, []);

  useEffect(() => {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    playSound(jutsu.effectType, audioCtx);
    const timeout = setTimeout(onComplete, 6000);
    return () => { clearTimeout(timeout); audioCtx.close(); if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [jutsu, onComplete]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    tRef.current = 0;

    // Use initial landmarks if available for starting position
    const initialHand = handLandmarks?.[0];
    const cx = initialHand ? initialHand[9].x * w : w / 2;
    const cy = initialHand ? initialHand[9].y * h : h / 2;
    initParticles(jutsu.effectType, cx, cy);

    const loop = () => {
      tRef.current++;
      const t = tRef.current;
      const liveHand = window.currentHandLandmarks?.[0];
      const usedHand = liveHand || initialHand || [{ x: 0.5, y: 0.5 }, ...Array(20).fill({ x: 0.5, y: 0.5 })];

      if (!usedHand[9]) { 
        rafRef.current = requestAnimationFrame(loop); 
        return; 
      }

      if (jutsu.effectType === 'lightning') renderChidori(ctx, w, h, usedHand, t, particlesRef.current);
      else if (jutsu.effectType === 'wind') renderRasengan(ctx, w, h, usedHand, t, particlesRef.current);
      else if (jutsu.effectType === 'fire') renderKaton(ctx, w, h, usedHand, t, particlesRef.current);
      else if (jutsu.effectType === 'shadow') renderShadow(ctx, w, h, usedHand, t, clonesRef.current);
      else if (jutsu.effectType === 'clone') renderClone(ctx, w, h, t);
      else if (jutsu.effectType === 'summon') renderSummon(ctx, w, h, t, summonedAnimal);

      rafRef.current = requestAnimationFrame(loop);
    };
    loop();
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [jutsu, initParticles, summonedAnimal]); // Added summonedAnimal to dependencies

  if (!jutsu) return null;

  const bgMap = {
    lightning: 'radial-gradient(ellipse at center, rgba(14,165,233,0.18) 0%, rgba(0,5,20,0.85) 100%)',
    wind: 'radial-gradient(ellipse at center, rgba(30,100,200,0.18) 0%, rgba(0,5,20,0.85) 100%)',
    fire: 'radial-gradient(ellipse at center, rgba(200,60,10,0.2) 0%, rgba(10,0,0,0.88) 100%)',
    shadow: 'radial-gradient(ellipse at center, rgba(100,10,160,0.2) 0%, rgba(0,0,10,0.88) 100%)',
    clone: 'rgba(0,0,0,0.0)',
  };

  // The clone effect draws raw video frames — no CSS mirror transform needed (it handles it internally)
  const canvasStyle = jutsu.effectType === 'clone'
    ? { position: 'absolute', inset: 0, width: '100%', height: '100%' }
    : { position: 'absolute', inset: 0, width: '100%', height: '100%', transform: 'scaleX(-1)' };

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 8, pointerEvents: 'none',
      background: bgMap[jutsu.effectType] || 'rgba(0,0,0,0.8)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      borderRadius: 'inherit',
    }} className={jutsu.effectType === 'fire' || jutsu.effectType === 'lightning' ? 'shake-heavy' : ''}>
      <canvas
        ref={canvasRef}
        width={window.currentVideoElement?.videoWidth || 640} 
        height={window.currentVideoElement?.videoHeight || 480}
        style={canvasStyle}
      />
      <div style={{
        position: 'relative', zIndex: 60, textAlign: 'center', pointerEvents: 'none',
        animation: 'jutsuReveal 0.5s ease-out',
      }}>
        <div style={{
          fontFamily: 'var(--font-title)', fontSize: '3.5rem', letterSpacing: '0.12em',
          color: jutsu.color, filter: `drop-shadow(0 0 30px ${jutsu.glowColor}) drop-shadow(0 0 60px ${jutsu.glowColor})`,
          textShadow: `0 0 40px ${jutsu.glowColor}`,
          animation: 'jutsuPulse 0.8s ease-in-out infinite alternate',
        }}>
          {jutsu.name}
        </div>
        <div style={{
          fontSize: '5rem', color: jutsu.color, opacity: 0.6,
          fontFamily: 'serif', lineHeight: 1,
          filter: `drop-shadow(0 0 20px ${jutsu.glowColor})`,
        }}>
          {jutsu.kanji}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9rem', marginTop: '0.75rem', fontStyle: 'italic' }}>
          {jutsu.subtitle} — {jutsu.character}
        </div>
      </div>

      {/* ── Cut-In Overlay ── */}
      {showCutIn && (
        <div className="cutin-overlay">
          <div className="cutin-bg" style={{ background: `linear-gradient(45deg, transparent, ${jutsu.glowColor.replace('0.6','0.8')})` }}></div>
          <img className="cutin-character" src={`/characters/${jutsu.imageId}.png`} alt="" onError={e => e.target.style.display='none'} />
          <div className="cutin-text" style={{ color: jutsu.color }}>{jutsu.name}</div>
        </div>
      )}

      <button
        onClick={onComplete}
        style={{
          position: 'absolute', bottom: '10%', zIndex: 110, pointerEvents: 'auto',
          background: 'rgba(255,255,255,0.1)', border: `1px solid ${jutsu.color}`,
          color: jutsu.color, padding: '0.6rem 1.6rem', borderRadius: '2rem',
          cursor: 'pointer', fontSize: '0.9rem', backdropFilter: 'blur(8px)',
          boxShadow: `0 0 20px ${jutsu.glowColor}`,
        }}
      >
        Tecnica Completata ✓
      </button>
    </div>
  );
};

export default JutsuEffect;

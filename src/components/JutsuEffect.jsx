import { useEffect, useRef, useCallback, useState } from 'react';

const smokeImg = new Image();
smokeImg.src = '/effects/smoke.png';

const dragonImg = new Image();
dragonImg.src = '/effects/drago acquatico.png';

const susanooImg = new Image();
susanooImg.src = '/effects/susanoo.png';

/* ── Audio ──────────────────────────────────────── */
const playSound = (type, audioCtx, volume = 0.5) => {
  try {
    const master = audioCtx.createGain();
    master.gain.value = volume;
    master.connect(audioCtx.destination);
    const dst = master;
    if (type === 'lightning') {
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
          osc.connect(filter); filter.connect(gain); gain.connect(dst);
          osc.start(); osc.stop(audioCtx.currentTime + 0.1);
        }, i * 120);
      }
    } else if (type === 'wind') {
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
      src.connect(filter); filter.connect(gain); gain.connect(dst);
      src.start();
      const osc = audioCtx.createOscillator(); osc.type = 'sine';
      osc.frequency.setValueAtTime(80, audioCtx.currentTime);
      osc.frequency.linearRampToValueAtTime(200, audioCtx.currentTime + 1.5);
      const g2 = audioCtx.createGain();
      g2.gain.setValueAtTime(0.15, audioCtx.currentTime);
      g2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 2);
      osc.connect(g2); g2.connect(dst);
      osc.start(); osc.stop(audioCtx.currentTime + 2);
    } else if (type === 'fire') {
      const osc = audioCtx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 60;
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.35, audioCtx.currentTime + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 3);
      const filter = audioCtx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 300;
      osc.connect(filter); filter.connect(gain); gain.connect(dst);
      osc.start(); osc.stop(audioCtx.currentTime + 3);
    } else if (type === 'shadow' || type === 'clone') {
      const bufferSize = audioCtx.sampleRate * 0.4;
      const buf = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.2;
      const noise = audioCtx.createBufferSource(); noise.buffer = buf;
      const nGain = audioCtx.createGain();
      nGain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      nGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
      const nFilter = audioCtx.createBiquadFilter(); nFilter.type = 'lowpass'; nFilter.frequency.value = 1200;
      noise.connect(nFilter); nFilter.connect(nGain); nGain.connect(dst);
      noise.start();
      const osc = audioCtx.createOscillator(); osc.type = 'sine';
      osc.frequency.setValueAtTime(110, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.2);
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
      osc.connect(gain); gain.connect(dst);
      osc.start(); osc.stop(audioCtx.currentTime + 0.4);
    } else if (type === 'heal') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.5);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 2);
      osc.connect(gain); gain.connect(dst);
      osc.start(); osc.stop(audioCtx.currentTime + 2);
      for(let i=0; i<3; i++) {
        setTimeout(() => {
          const osc2 = audioCtx.createOscillator();
          const g2 = audioCtx.createGain();
          osc2.frequency.setValueAtTime(1000 + Math.random()*500, audioCtx.currentTime);
          g2.gain.setValueAtTime(0.1, audioCtx.currentTime);
          g2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
          osc2.connect(g2); g2.connect(dst);
          osc2.start(); osc2.stop(audioCtx.currentTime + 0.3);
        }, 200 + i * 300);
      }
    } else if (type === 'sharingan') {
      // Low ominous drone
      const drone = audioCtx.createOscillator();
      drone.type = 'sine'; drone.frequency.value = 55;
      const droneGain = audioCtx.createGain();
      droneGain.gain.setValueAtTime(0, audioCtx.currentTime);
      droneGain.gain.linearRampToValueAtTime(0.25, audioCtx.currentTime + 1.2);
      droneGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 6);
      drone.connect(droneGain); droneGain.connect(dst);
      drone.start(); drone.stop(audioCtx.currentTime + 6);
      // Hypnotic shimmer with vibrato
      const shimmer = audioCtx.createOscillator();
      shimmer.type = 'sine'; shimmer.frequency.value = 880;
      const lfo = audioCtx.createOscillator();
      lfo.type = 'sine'; lfo.frequency.value = 5;
      const lfoDepth = audioCtx.createGain(); lfoDepth.gain.value = 35;
      lfo.connect(lfoDepth); lfoDepth.connect(shimmer.frequency);
      const shimmerGain = audioCtx.createGain();
      shimmerGain.gain.setValueAtTime(0, audioCtx.currentTime);
      shimmerGain.gain.linearRampToValueAtTime(0.07, audioCtx.currentTime + 0.8);
      shimmerGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 5.5);
      shimmer.connect(shimmerGain); shimmerGain.connect(dst);
      lfo.start(); shimmer.start();
      lfo.stop(audioCtx.currentTime + 5.5); shimmer.stop(audioCtx.currentTime + 5.5);
      // Crow caw bursts
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          const bSz = audioCtx.sampleRate * 0.25;
          const buf = audioCtx.createBuffer(1, bSz, audioCtx.sampleRate);
          const d = buf.getChannelData(0);
          for (let j = 0; j < bSz; j++) d[j] = (Math.random() * 2 - 1) * 0.4;
          const src = audioCtx.createBufferSource(); src.buffer = buf;
          const flt = audioCtx.createBiquadFilter(); flt.type = 'bandpass';
          flt.frequency.value = 900 + Math.random() * 700; flt.Q.value = 12;
          const gn = audioCtx.createGain();
          gn.gain.setValueAtTime(0.18, audioCtx.currentTime);
          gn.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);
          src.connect(flt); flt.connect(gn); gn.connect(dst);
          src.start();
        }, 600 + i * 900 + Math.random() * 300);
      }
    }
  } catch { /* ignore */ }
};

/* ── Helper Functions ──────────────────────────── */
const spawnSpark = (_cx, _cy, tx, ty) => {
  return {
    x: tx + (Math.random()-0.5)*40,
    y: ty + (Math.random()-0.5)*40,
    vx: (Math.random()-0.5)*4,
    vy: (Math.random()-0.5)*4 - 1,
    life: Math.random()*0.6+0.3,
    size: Math.random()*3+1,
    color: Math.random()>0.5 ? '#fff' : '#38BDF8',
  };
};

const summonsImages = {};
const loadSummonImage = (name) => {
  if (summonsImages[name]) return summonsImages[name];
  const img = new Image();
  img.src = `/characters/${name}.png`;
  summonsImages[name] = img;
  return img;
};

/* ── Component ────────────────────────────────────── */
const JutsuEffect = ({ jutsu, handLandmarks, onComplete, effectsVolume = 0.5 }) => {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const tRef = useRef(0);
  const frameRef = useRef(0);
  const particlesRef = useRef([]);
  const clonesRef = useRef([]);
  
  // Segmentation refs
  const maskCanvasRef = useRef(null);
  const maskCtxRef = useRef(null);
  const userCanvasRef = useRef(null);
  const userCtxRef = useRef(null);
  const isSegmentingRef = useRef(false);
  const faceEstimRef = useRef(null);
  const faceEstimAgeRef = useRef(999);
  const thumbCanvasRef = useRef(null);
  const thumbCtxRef = useRef(null);

  const [showCutIn, setShowCutIn] = useState(true);
  const [summonedAnimal, setSummonedAnimal] = useState(null);

  // Lightweight face estimation from the segmentation mask thumbnail (80×60).
  // Returns { cx, cy, eyeSpacing } in canvas-pixel coordinates, or null.
  const estimateFacePos = useCallback((canvasW, canvasH) => {
    if (!maskCanvasRef.current || !isSegmentingRef.current) return null;
    const SW = 80, SH = 60;
    if (!thumbCanvasRef.current) {
      thumbCanvasRef.current = document.createElement('canvas');
      thumbCanvasRef.current.width = SW;
      thumbCanvasRef.current.height = SH;
      thumbCtxRef.current = thumbCanvasRef.current.getContext('2d', { willReadFrequently: true });
    }
    thumbCtxRef.current.clearRect(0, 0, SW, SH);
    thumbCtxRef.current.drawImage(maskCanvasRef.current, 0, 0, SW, SH);
    const d = thumbCtxRef.current.getImageData(0, 0, SW, SH).data;

    let yTop = SH;
    outer: for (let y = 0; y < SH; y++) {
      for (let x = 0; x < SW; x++) {
        if (d[(y * SW + x) * 4 + 3] > 48) { yTop = y; break outer; }
      }
    }
    if (yTop >= SH) return null;

    // Measure head width in the first ~22 rows below the head top
    let xMin = SW, xMax = 0;
    const scanBot = Math.min(yTop + 22, SH);
    for (let y = yTop; y < scanBot; y++) {
      for (let x = 0; x < SW; x++) {
        if (d[(y * SW + x) * 4 + 3] > 48) {
          if (x < xMin) xMin = x;
          if (x > xMax) xMax = x;
        }
      }
    }
    if (xMax <= xMin) return null;

    const scaleX = canvasW / SW, scaleY = canvasH / SH;
    const headCX = ((xMin + xMax) / 2) * scaleX;
    const headW = (xMax - xMin) * scaleX;
    // Eyes at ~55% of head-width below the head top; half inter-eye ≈ 22% of head-width
    return { cx: headCX, cy: yTop * scaleY + headW * 0.55, eyeSpacing: headW * 0.22 };
  }, []);

  const updateSegmentation = useCallback((video, segmenter, vW, vH) => {
    if (!maskCanvasRef.current || maskCanvasRef.current.width !== vW) {
      maskCanvasRef.current = document.createElement('canvas'); maskCanvasRef.current.width = vW; maskCanvasRef.current.height = vH;
      maskCtxRef.current = maskCanvasRef.current.getContext('2d', { willReadFrequently: true });
      userCanvasRef.current = document.createElement('canvas'); userCanvasRef.current.width = vW; userCanvasRef.current.height = vH;
      userCtxRef.current = userCanvasRef.current.getContext('2d', { willReadFrequently: true });
      isSegmentingRef.current = false;
    }

    if (segmenter && video.currentTime !== video.dataset.lastTime) {
      video.dataset.lastTime = video.currentTime;
      try {
        segmenter.segmentForVideo(video, performance.now(), (result) => {
          if (result.confidenceMasks && result.confidenceMasks.length > 0) {
            const mask = result.confidenceMasks[0].getAsFloat32Array();
            const imgData = maskCtxRef.current.createImageData(vW, vH);
            for (let i = 0; i < mask.length; i++) {
              imgData.data[i * 4 + 3] = mask[i] * 255;
            }
            maskCtxRef.current.putImageData(imgData, 0, 0);

            userCtxRef.current.clearRect(0, 0, vW, vH);
            userCtxRef.current.drawImage(video, 0, 0, vW, vH);
            userCtxRef.current.globalCompositeOperation = 'destination-in';
            userCtxRef.current.drawImage(maskCanvasRef.current, 0, 0);
            userCtxRef.current.globalCompositeOperation = 'source-over';
            isSegmentingRef.current = true;
          }
        });
      } catch {
        console.error("Segmentation error");
      }
    }
  }, []);

  /* ── Render Functions ──────────────────────────── */
  const renderChidori = useCallback((ctx, w, h, hand, t, particles) => {
    ctx.clearRect(0, 0, w, h);
    const cx = hand[9].x * w, cy = hand[9].y * h;
    const tip = hand[8];
    const tx = tip.x * w, ty = tip.y * h;
    const flash = 0.04 + 0.03 * Math.sin(t * 0.3);
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 220);
    bg.addColorStop(0, `rgba(180,230,255,${flash})`);
    bg.addColorStop(1, 'transparent');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    const coreGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 90);
    coreGlow.addColorStop(0, 'rgba(255,255,255,0.7)');
    coreGlow.addColorStop(0.2, 'rgba(100,200,255,0.5)');
    coreGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = coreGlow;
    ctx.beginPath(); ctx.arc(cx, cy, 90, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 20; ctx.shadowColor = '#38BDF8';
    for (let i = 0; i < 12; i++) {
      ctx.strokeStyle = i < 4 ? 'rgba(255,255,255,0.9)' : `rgba(100,190,255,${0.4 + Math.random() * 0.4})`;
      ctx.lineWidth = i < 4 ? 2 : 1;
      ctx.beginPath(); ctx.moveTo(cx + (Math.random()-0.5)*30, cy + (Math.random()-0.5)*30);
      let _lx, _ly;
      const steps = 5 + Math.floor(Math.random() * 4);
      for (let j = 0; j < steps; j++) {
        const progress = j / steps;
        _lx = cx + (tx - cx) * progress + (Math.random()-0.5) * 60 * (1-progress);
        _ly = cy + (ty - cy) * progress + (Math.random()-0.5) * 60 * (1-progress);
        ctx.lineTo(_lx, _ly);
      }
      ctx.lineTo(tx, ty);
      ctx.stroke();
    }
    const tipGlow = ctx.createRadialGradient(tx, ty, 0, tx, ty, 40);
    tipGlow.addColorStop(0, 'rgba(255,255,255,1)');
    tipGlow.addColorStop(0.3, 'rgba(56,189,248,0.8)');
    tipGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = tipGlow;
    ctx.beginPath(); ctx.arc(tx, ty, 40, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      p.x += p.vx; p.y += p.vy;
      p.vy += 0.1; p.life -= 0.025; p.size *= 0.97;
      if (p.life <= 0) particles[i] = spawnSpark(cx, cy, tx, ty);
    }
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  }, []);

  const renderRasengan = useCallback((ctx, w, h, hand, t, particles) => {
    ctx.clearRect(0, 0, w, h);
    const cx = hand[9].x * w, cy = hand[9].y * h;
    const radius = 55 + 5 * Math.sin(t * 0.08);
    const aura = ctx.createRadialGradient(cx, cy, radius * 0.3, cx, cy, radius * 2.5);
    aura.addColorStop(0, 'rgba(100,180,255,0.2)');
    aura.addColorStop(1, 'transparent');
    ctx.fillStyle = aura; ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.translate(cx, cy);
    for (let ring = 0; ring < 4; ring++) {
      const rr = radius + ring * 18;
      const speed = (ring % 2 === 0 ? 1 : -1) * t * (0.04 + ring * 0.01);
      const alpha = 0.6 - ring * 0.12;
      ctx.strokeStyle = `rgba(100,210,255,${alpha})`;
      ctx.lineWidth = 3 - ring * 0.5;
      ctx.shadowBlur = 15; ctx.shadowColor = '#38BDF8';
      ctx.beginPath(); ctx.arc(0, 0, rr, speed, speed + Math.PI * 1.7); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, rr, speed + Math.PI, speed + Math.PI * 1.7 + Math.PI * 0.3); ctx.stroke();
    }
    ctx.restore();
    const core = ctx.createRadialGradient(cx - radius*0.2, cy - radius*0.2, 2, cx, cy, radius);
    core.addColorStop(0, 'rgba(255,255,255,0.95)');
    core.addColorStop(0.3, 'rgba(140,210,255,0.85)');
    core.addColorStop(0.7, 'rgba(30,120,255,0.6)');
    core.addColorStop(1, 'rgba(0,60,200,0.1)');
    ctx.fillStyle = core;
    ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      ctx.globalAlpha = p.life * 0.7;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      const dx = cx - p.x;
      const dy = cy - p.y;
      const angle = Math.atan2(dy, dx);
      p.x += Math.cos(angle + 0.3) * 3;
      p.y += Math.sin(angle + 0.3) * 3;
      p.life -= 0.015;
      if (p.life <= 0 || (dx*dx+dy*dy) < (radius*0.5)**2) {
        const a = Math.random() * Math.PI * 2;
        const d = radius * 1.5 + Math.random() * 80;
        particles[i] = { x: cx + Math.cos(a)*d, y: cy + Math.sin(a)*d, life: 0.8, size: Math.random()*3+1, color: Math.random()>0.5?'#a0d8ff':'#fff' };
      }
    }
    ctx.globalAlpha = 1;
  }, []);

  const renderKaton = useCallback((ctx, w, h, hand, t, particles) => {
    ctx.clearRect(0, 0, w, h);
    const bx = w / 2, by = h / 2;
    const ballR = 40 + t * 1.5;
    const shimmer = ctx.createRadialGradient(bx, by, 0, bx, by, ballR * 3);
    shimmer.addColorStop(0, 'rgba(255,120,20,0.15)');
    shimmer.addColorStop(1, 'transparent');
    ctx.fillStyle = shimmer; ctx.fillRect(0, 0, w, h);
    const fire = ctx.createRadialGradient(bx - ballR*0.2, by - ballR*0.2, 2, bx, by, ballR);
    fire.addColorStop(0, 'rgba(255,255,180,1)');
    fire.addColorStop(0.3, 'rgba(255,160,20,0.95)');
    fire.addColorStop(0.7, 'rgba(220,50,0,0.7)');
    fire.addColorStop(1, 'rgba(100,0,0,0.1)');
    ctx.fillStyle = fire;
    ctx.shadowBlur = 40; ctx.shadowColor = '#f97316';
    ctx.beginPath(); ctx.arc(bx, by, ballR, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      p.x += p.vx; p.y += p.vy;
      p.vy -= 0.15; p.life -= 0.018; p.size *= 0.98;
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
    }
    ctx.globalAlpha = 1;
  }, []);

  const renderHeal = useCallback((ctx, w, h, hand, t, particles) => {
    ctx.clearRect(0, 0, w, h);
    const cx = hand[9].x * w, cy = hand[9].y * h;
    const radius = 70 + Math.sin(t * 0.1) * 10;
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    core.addColorStop(0, 'rgba(255,255,255,0.8)');
    core.addColorStop(0.4, 'rgba(16,185,129,0.6)');
    core.addColorStop(1, 'transparent');
    ctx.fillStyle = core; ctx.shadowBlur = 30; ctx.shadowColor = '#10B981';
    ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      ctx.globalAlpha = p.life; ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      p.y -= p.speed; p.life -= 0.01;
      if (p.life <= 0) {
        particles[i] = { x: cx + (Math.random()-0.5)*120, y: cy + (Math.random()-0.5)*120, speed: 1 + Math.random() * 2, life: 0.6 + Math.random() * 0.4, size: 2 + Math.random() * 4, color: Math.random() > 0.3 ? '#10B981' : '#fff' };
      }
    }
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  }, []);

  const renderClone = useCallback((ctx, w, h, t) => {
    ctx.clearRect(0, 0, w, h);
    const video = window.currentVideoElement;
    const segmenter = window.currentSegmenter;
    if (!video || video.readyState < 2) return;
    const vW = video.videoWidth, vH = video.videoHeight;
    updateSegmentation(video, segmenter, vW, vH);
    const progress = Math.min(t / 25, 1);
    const drawSource = isSegmentingRef.current ? userCanvasRef.current : video;
    const scale = 0.8;
    const dw = (w * 0.45) * scale, dh = h * scale;
    const squad = [{ x: w * 0.02, y: h * 0.12, alpha: 0.85 }, { x: w * 0.62, y: h * 0.12, alpha: 0.85 }];
    squad.forEach((member) => {
      ctx.globalAlpha = progress * member.alpha;
      ctx.save();
      ctx.translate(member.x + dw, member.y);
      ctx.scale(-1, 1);
      ctx.drawImage(drawSource, vW * 0.25, 0, vW * 0.5, vH, 0, 0, dw, dh);
      ctx.restore();
    });
    if (t < 25) {
      ctx.globalAlpha = (1 - t / 25);
      squad.forEach(member => {
        const sx = member.x + dw/2, sy = member.y + dh/2;
        for(let i=0; i<2; i++) {
          const size = dw * (1.2 + Math.random() * 0.5);
          if (smokeImg.complete) ctx.drawImage(smokeImg, sx + (Math.random()-0.5)*dw - size/2, sy + (Math.random()-0.5)*dh - size/2, size, size);
        }
      });
    }
    ctx.globalAlpha = 1;
  }, [updateSegmentation]);

  const renderSummon = useCallback((ctx, w, h, t, animalName) => {
    ctx.clearRect(0, 0, w, h);
    if (!animalName) return;
    const img = loadSummonImage(animalName);
    const progress = Math.min(t / 25, 1);
    const dw = w * 0.6, dh = h * 0.9, x = -w * 0.05, y = h * 0.05;
    if (t < 30) {
      ctx.globalAlpha = Math.max(0, 1 - t / 30);
      ctx.fillStyle = 'rgba(240,240,240,0.95)';
      for (let i = 0; i < 15; i++) {
        ctx.beginPath(); ctx.arc(x + dw / 2 + (Math.random() - 0.5) * dw * 0.8, y + dh / 2 + (Math.random() - 0.5) * dh * 0.8, 50 + Math.random() * 50, 0, Math.PI * 2); ctx.fill();
      }
    }
    if (img.complete && img.naturalWidth !== 0) {
      ctx.globalAlpha = progress * 0.7; ctx.drawImage(img, x, y, dw, dh);
    }
    ctx.globalAlpha = 1;
  }, []);

  const renderWater = useCallback((ctx, w, h, _frame, particles) => {
    const video = window.currentVideoElement;
    const segmenter = window.currentSegmenter;
    const cx = w / 2, cy = h / 2;
    ctx.clearRect(0, 0, w, h);
    if (video && segmenter) updateSegmentation(video, segmenter, video.videoWidth, video.videoHeight);
    ctx.save();
    ctx.globalAlpha = 0.75;
    ctx.translate(cx, cy + 50); ctx.drawImage(dragonImg, -300, -350, 600, 700);
    ctx.restore();
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      ctx.globalAlpha = p.life; ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      p.x += p.vx; p.y += p.vy; p.vy += 0.2; p.life -= 0.02;
      if (p.life <= 0) {
        particles[i] = { x: cx + (Math.random()-0.5)*w, y: cy + (Math.random()-0.5)*h, vx: (Math.random()-0.5)*15, vy: (Math.random()-0.5)*15 - 5, life: Math.random()*0.8+0.2, size: Math.random()*10+5, color: '#60a5fa' };
      }
    }
    if (video && isSegmentingRef.current) {
      ctx.save(); ctx.globalAlpha = 1; ctx.drawImage(userCanvasRef.current, 0, 0, w, h); ctx.restore();
    }
    ctx.globalAlpha = 1;
  }, [updateSegmentation]);

  const renderSusanoo = useCallback((ctx, w, h, frame) => {
    const video = window.currentVideoElement;
    const segmenter = window.currentSegmenter;
    if (video && segmenter) updateSegmentation(video, segmenter, video.videoWidth, video.videoHeight);
    const time = frame * 0.05, s = 1.1 + Math.sin(time) * 0.05, cx = w / 2, cy = h / 2;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.globalAlpha = 0.7 + Math.sin(time * 2) * 0.1;
    ctx.translate(cx, cy + 50); ctx.scale(s * 1.3, s * 1.3); ctx.drawImage(susanooImg, -300, -350, 600, 700);
    ctx.restore();
    if (video && isSegmentingRef.current) {
      ctx.save(); ctx.globalAlpha = 1; ctx.drawImage(userCanvasRef.current, 0, 0, w, h); ctx.restore();
    }
  }, [updateSegmentation]);

  const renderSharingan = useCallback((ctx, w, h, t, crows) => {
    ctx.clearRect(0, 0, w, h);
    const video = window.currentVideoElement;
    const segmenter = window.currentSegmenter;

    // Dark crimson background
    ctx.fillStyle = 'rgba(4,0,8,1)';
    ctx.fillRect(0, 0, w, h);

    // Composite user silhouette (red-tinted, like susanoo)
    if (video && segmenter) updateSegmentation(video, segmenter, video.videoWidth || w, video.videoHeight || h);
    if (video && isSegmentingRef.current && userCanvasRef.current) {
      ctx.save();
      ctx.globalAlpha = 0.75;
      ctx.filter = 'sepia(1) saturate(6) hue-rotate(320deg)';
      ctx.drawImage(userCanvasRef.current, 0, 0, w, h);
      ctx.filter = 'none';
      ctx.restore();
    } else if (video && video.readyState >= 2) {
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.filter = 'sepia(1) saturate(4) hue-rotate(320deg)';
      ctx.drawImage(video, 0, 0, w, h);
      ctx.filter = 'none';
      ctx.restore();
    }

    // Red radial vignette
    const vig = ctx.createRadialGradient(w/2, h/2, h*0.1, w/2, h/2, h*0.9);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(60,0,0,0.92)');
    ctx.fillStyle = vig; ctx.fillRect(0, 0, w, h);

    // Re-estimate face position every 45 frames (~0.75 s) using segmentation thumbnail
    faceEstimAgeRef.current++;
    if (faceEstimAgeRef.current > 45) {
      const newEstim = estimateFacePos(w, h);
      if (newEstim) {
        if (!faceEstimRef.current) {
          faceEstimRef.current = newEstim;
        } else {
          // Lerp for smooth tracking
          const f = faceEstimRef.current;
          f.cx          += (newEstim.cx          - f.cx)          * 0.4;
          f.cy          += (newEstim.cy          - f.cy)          * 0.4;
          f.eyeSpacing  += (newEstim.eyeSpacing  - f.eyeSpacing)  * 0.4;
        }
      }
      faceEstimAgeRef.current = 0;
    }
    const face = faceEstimRef.current;
    const fcx = face ? face.cx : w / 2;
    const fcy = face ? face.cy : h * 0.27;
    // Subtle chakra tendrils from face center
    ctx.save();
    ctx.globalAlpha = 0.12 + 0.06 * Math.sin(t * 0.06);
    ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + t * 0.008;
      const len = 120 + 60 * Math.sin(t * 0.05 + i * 0.9);
      ctx.beginPath();
      ctx.moveTo(fcx, fcy);
      ctx.lineTo(fcx + Math.cos(a) * len, fcy + Math.sin(a) * len);
      ctx.stroke();
    }
    ctx.restore();

    // === Sharingan Eyes ===
    const fadeIn = Math.min(1, Math.max(0, (t - 8) / 18));
    const eyeSpacing = face ? face.eyeSpacing : w * 0.125;
    const eyeR = Math.min(w, h) * 0.068;
    const rotation = t * 0.022;

    for (let side = -1; side <= 1; side += 2) {
      const ex = fcx + side * eyeSpacing;
      const ey = fcy;
      ctx.globalAlpha = fadeIn;

      // Outer pulsing halo
      const pulse = 1 + 0.18 * Math.sin(t * 0.1);
      const halo = ctx.createRadialGradient(ex, ey, 0, ex, ey, eyeR * 2.8 * pulse);
      halo.addColorStop(0, 'rgba(220,30,30,0.55)');
      halo.addColorStop(0.5, 'rgba(180,0,0,0.18)');
      halo.addColorStop(1, 'rgba(180,0,0,0)');
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(ex, ey, eyeR * 2.8 * pulse, 0, Math.PI*2); ctx.fill();

      // Eyelid shape (white ellipse background)
      ctx.fillStyle = 'rgba(8,0,0,0.95)';
      ctx.beginPath(); ctx.ellipse(ex, ey, eyeR * 1.55, eyeR * 1.0, 0, 0, Math.PI*2); ctx.fill();

      // Red iris
      const irisG = ctx.createRadialGradient(ex - eyeR*0.15, ey - eyeR*0.15, 0, ex, ey, eyeR);
      irisG.addColorStop(0, '#ff3300');
      irisG.addColorStop(0.55, '#cc0000');
      irisG.addColorStop(1, '#550000');
      ctx.fillStyle = irisG;
      ctx.beginPath(); ctx.arc(ex, ey, eyeR, 0, Math.PI*2); ctx.fill();

      // Three tomoe (rotating comma shapes)
      for (let i = 0; i < 3; i++) {
        const ta = rotation + (i / 3) * Math.PI * 2;
        const orbit = eyeR * 0.52;
        const tx_ = ex + Math.cos(ta) * orbit;
        const ty_ = ey + Math.sin(ta) * orbit;
        const tr = eyeR * 0.19;
        // Teardrop body
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(tx_, ty_, tr, 0, Math.PI*2); ctx.fill();
        // Comma tail sweeping toward center
        const tailA = ta + Math.PI * 0.55;
        const tailCx = ex + Math.cos(ta) * orbit * 0.62;
        const tailCy = ey + Math.sin(ta) * orbit * 0.62;
        ctx.beginPath();
        ctx.arc(tailCx, tailCy, eyeR * 0.14, tailA, tailA + Math.PI * 1.1);
        ctx.fill();
      }

      // Dark pupil with faint red shine
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(ex, ey, eyeR * 0.27, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(255,80,80,0.35)';
      ctx.beginPath(); ctx.arc(ex - eyeR*0.07, ey - eyeR*0.09, eyeR * 0.09, 0, Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // === Crows ===
    const crowFade = Math.min(1, Math.max(0, (t - 25) / 20));
    if (crowFade > 0) {
      ctx.globalAlpha = crowFade;
      crows.forEach(crow => {
        crow.angle += crow.speed;
        crow.wingPhase += 0.2;
        const cx_ = w/2 + Math.cos(crow.angle) * crow.orbitX;
        const cy_ = h * 0.38 + Math.sin(crow.angle) * crow.orbitY;
        const flightDir = crow.angle + (crow.speed > 0 ? Math.PI/2 : -Math.PI/2);
        const wing = Math.sin(crow.wingPhase) * 0.45;
        const sz = crow.size;
        ctx.save();
        ctx.translate(cx_, cy_);
        ctx.rotate(flightDir);
        ctx.fillStyle = '#060000';
        ctx.shadowBlur = 14; ctx.shadowColor = '#dc2626';
        // Body — elongated oval
        ctx.beginPath(); ctx.ellipse(0, 0, sz * 1.3, sz * 0.42, 0, 0, Math.PI*2); ctx.fill();
        // Head — small circle forward
        ctx.beginPath(); ctx.arc(sz * 1.0, -sz * 0.1, sz * 0.38, 0, Math.PI*2); ctx.fill();
        // Beak — sharp forward triangle
        ctx.beginPath();
        ctx.moveTo(sz * 1.35, -sz * 0.16); ctx.lineTo(sz * 1.85, 0); ctx.lineTo(sz * 1.35, sz * 0.12);
        ctx.closePath(); ctx.fill();
        // Left wing up
        ctx.save(); ctx.rotate(-wing * 0.9);
        ctx.beginPath();
        ctx.moveTo(-sz * 0.15, -sz * 0.1);
        ctx.bezierCurveTo(-sz * 0.5, -sz * 1.5, -sz * 1.8, -sz * 1.1, -sz * 2.6, -sz * 0.35);
        ctx.bezierCurveTo(-sz * 1.7, -sz * 0.05, -sz * 0.6, sz * 0.12, -sz * 0.15, -sz * 0.1);
        ctx.closePath(); ctx.fill();
        ctx.restore();
        // Right wing down
        ctx.save(); ctx.rotate(wing * 0.9);
        ctx.beginPath();
        ctx.moveTo(-sz * 0.15, sz * 0.1);
        ctx.bezierCurveTo(-sz * 0.5, sz * 1.5, -sz * 1.8, sz * 1.1, -sz * 2.6, sz * 0.35);
        ctx.bezierCurveTo(-sz * 1.7, sz * 0.05, -sz * 0.6, -sz * 0.12, -sz * 0.15, sz * 0.1);
        ctx.closePath(); ctx.fill();
        ctx.restore();
        // Tail — forked fan
        ctx.beginPath();
        ctx.moveTo(-sz * 0.8, -sz * 0.1);
        ctx.lineTo(-sz * 1.9, -sz * 0.5);
        ctx.lineTo(-sz * 2.0, sz * 0.0);
        ctx.lineTo(-sz * 1.9, sz * 0.5);
        ctx.lineTo(-sz * 0.8, sz * 0.1);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      });
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }
  }, [updateSegmentation, estimateFacePos]);

  const renderPush = useCallback((_ctx, w, h, tx, ty, frame) => {
    _ctx.clearRect(0, 0, w, h);
    const progress = (frame % 30) / 30, radius = progress * 800;
    _ctx.save();
    _ctx.lineWidth = 40 * (1 - progress);
    _ctx.strokeStyle = `rgba(255, 255, 255, ${0.8 * (1 - progress)})`;
    _ctx.beginPath(); _ctx.arc(tx, ty, radius, 0, Math.PI * 2); _ctx.stroke();
    _ctx.restore();
  }, []);

  const renderShadow = useCallback((ctx, w, h, _hand, t, clones) => {
    ctx.clearRect(0, 0, w, h);
    // const _cx = hand[9].x * w, _cy = hand[9].y * h;
    clones.forEach(c => {
      const progress = Math.min(t / c.spawnTime, 1);
      ctx.globalAlpha = progress * 0.55;
      ctx.fillStyle = `rgba(80,0,120,0.7)`; ctx.shadowBlur = 20 * progress; ctx.shadowColor = '#a855f7';
      ctx.save(); ctx.translate(c.x, c.y); ctx.scale(0.5 + progress * 0.5, 0.5 + progress * 0.5);
      ctx.beginPath(); ctx.ellipse(0, 10, 20, 40, 0, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(0, -40, 18, 0, Math.PI*2); ctx.fill(); ctx.restore();
      if (smokeImg.complete && progress < 0.8) {
        ctx.globalAlpha = (1 - (progress / 0.8)) * 0.6; ctx.drawImage(smokeImg, c.x - 100, c.y - 150, 200, 200);
      }
    });
    ctx.shadowBlur = 0;
  }, []);

  /* ── Hooks ─────────────────────────────────────── */
  useEffect(() => {
    const timer = setTimeout(() => setShowCutIn(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (jutsu.effectType === 'summon') {
      const t = setTimeout(() => setSummonedAnimal('gamapunta'), 0);
      return () => clearTimeout(t);
    }
  }, [jutsu]);

  const initParticles = useCallback((type, cx, cy) => {
    if (type === 'lightning') particlesRef.current = Array.from({ length: 30 }, () => spawnSpark(cx, cy, cx, cy - 80));
    else if (type === 'wind') particlesRef.current = Array.from({ length: 40 }, () => { const a = Math.random()*Math.PI*2, d = 60+Math.random()*80; return { x: cx+Math.cos(a)*d, y: cy+Math.sin(a)*d, life: 0.8, size: Math.random()*3+1, color: Math.random()>0.5?'#a0d8ff':'#fff' }; });
    else if (type === 'fire') particlesRef.current = Array.from({ length: 45 }, () => ({ x: cx+(Math.random()-0.5)*40, y: cy+(Math.random()-0.5)*40, vx: (Math.random()-0.5)*6, vy: -(Math.random()*5+2), life: Math.random()*0.7+0.2, size: Math.random()*6+2, color: ['rgba(255,220,50,1)','rgba(255,120,20,1)','rgba(220,40,0,1)'][Math.floor(Math.random()*3)] }));
    else if (type === 'water') particlesRef.current = Array.from({ length: 40 }, () => ({ x: cx, y: cy, vx: (Math.random()-0.5)*10, vy: (Math.random()-0.5)*10 - 5, life: Math.random()*0.8+0.2, size: Math.random()*8+4, color: '#3b82f6' }));
    else if (type === 'shadow') clonesRef.current = [-200, -120, 120, 200].map(offset => ({ x: cx+offset, y: cy, spawnTime: 30+Math.abs(offset)*0.3 }));
    else if (type === 'heal') particlesRef.current = Array.from({ length: 35 }, () => ({ x: cx+(Math.random()-0.5)*100, y: cy+(Math.random()-0.5)*100, speed: 1+Math.random()*2, life: Math.random(), size: 2+Math.random()*4, color: '#10B981' }));
    else if (type === 'sharingan') particlesRef.current = Array.from({ length: 14 }, (_, i) => ({
      angle: (i / 14) * Math.PI * 2,
      orbitX: 90 + (i % 3) * 80,
      orbitY: 45 + (i % 3) * 40,
      speed: (0.011 + (i % 4) * 0.004) * (i % 2 === 0 ? 1 : -1),
      wingPhase: Math.random() * Math.PI * 2,
      size: 24 + Math.random() * 18,
    }));
  }, []);

  useEffect(() => {
    let audioCtx = null;
    let timeout = null;
    
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      playSound(jutsu.effectType, audioCtx, effectsVolume);
    } catch (e) {
      console.warn("AudioContext error:", e);
    }
    
    timeout = setTimeout(onComplete, 6000);
    
    return () => { 
      clearTimeout(timeout); 
      if (audioCtx) {
        try { audioCtx.close(); } catch { /* best-effort close */ }
      }
      if (rafRef.current) cancelAnimationFrame(rafRef.current); 
    };
  }, [jutsu, onComplete, effectsVolume]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    tRef.current = 0; frameRef.current = 0;
    const initialHand = handLandmarks?.[0];
    const cx = initialHand ? initialHand[9].x * w : w / 2;
    const cy = initialHand ? initialHand[9].y * h : h / 2;
    initParticles(jutsu.effectType, cx, cy);

    const loop = () => {
      tRef.current++; frameRef.current++;
      const t = tRef.current;
      const liveHand = window.currentHandLandmarks?.[0];
      const usedHand = liveHand || initialHand || [{ x: 0.5, y: 0.5 }, ...Array(20).fill({ x: 0.5, y: 0.5 })];
      if (!usedHand[9]) { rafRef.current = requestAnimationFrame(loop); return; }
      const tx = usedHand[9].x * w, ty = usedHand[9].y * h;

      switch(jutsu.effectType) {
        case 'lightning': renderChidori(ctx, w, h, usedHand, t, particlesRef.current); break;
        case 'wind': renderRasengan(ctx, w, h, usedHand, t, particlesRef.current); break;
        case 'fire': renderKaton(ctx, w, h, usedHand, t, particlesRef.current); break;
        case 'shadow': renderShadow(ctx, w, h, usedHand, t, clonesRef.current); break;
        case 'clone': renderClone(ctx, w, h, t); break;
        case 'summon': renderSummon(ctx, w, h, t, summonedAnimal); break;
        case 'water': renderWater(ctx, w, h, frameRef.current, particlesRef.current); break;
        case 'susanoo': renderSusanoo(ctx, w, h, frameRef.current); break;
        case 'push': renderPush(ctx, w, h, tx, ty, frameRef.current); break;
        case 'heal': renderHeal(ctx, w, h, usedHand, t, particlesRef.current); break;
        case 'sharingan': renderSharingan(ctx, w, h, t, particlesRef.current); break;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [jutsu, initParticles, summonedAnimal, handLandmarks, renderChidori, renderRasengan, renderKaton, renderShadow, renderClone, renderSummon, renderWater, renderSusanoo, renderPush, renderHeal, renderSharingan]);

  if (!jutsu) return null;

  const bgMap = { lightning: 'rgba(0,5,20,0.85)', wind: 'rgba(0,5,20,0.85)', fire: 'rgba(10,0,0,0.88)', shadow: 'rgba(0,0,10,0.88)', clone: 'rgba(0,0,0,0.0)', sharingan: 'rgba(4,0,8,1)' };
  const noFlip = jutsu.effectType === 'clone' || jutsu.effectType === 'sharingan';
  const canvasStyle = noFlip ? { position: 'absolute', inset: 0, width: '100%', height: '100%' } : { position: 'absolute', inset: 0, width: '100%', height: '100%', transform: 'scaleX(-1)' };

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 8, pointerEvents: 'none', background: bgMap[jutsu.effectType] || 'rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: 'inherit' }}>
      <canvas ref={canvasRef} width={window.currentVideoElement?.videoWidth || 640} height={window.currentVideoElement?.videoHeight || 480} style={canvasStyle} />
      <div style={{ position: 'relative', zIndex: 60, textAlign: 'center', pointerEvents: 'none', animation: 'jutsuReveal 0.5s ease-out' }}>
        <div style={{ fontFamily: 'var(--font-title)', fontSize: '3.5rem', letterSpacing: '0.12em', color: jutsu.color, filter: `drop-shadow(0 0 30px ${jutsu.glowColor}) drop-shadow(0 0 60px ${jutsu.glowColor})`, textShadow: `0 0 40px ${jutsu.glowColor}`, animation: 'jutsuPulse 0.8s ease-in-out infinite alternate' }}>{jutsu.name}</div>
        <div style={{ fontSize: '5rem', color: jutsu.color, opacity: 0.6, fontFamily: 'serif', lineHeight: 1, filter: `drop-shadow(0 0 20px ${jutsu.glowColor})` }}>{jutsu.kanji}</div>
        <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9rem', marginTop: '0.75rem', fontStyle: 'italic' }}>{jutsu.subtitle} — {jutsu.character}</div>
      </div>
      {showCutIn && (
        <div className="cutin-overlay">
          <div className="cutin-bg" style={{ background: `linear-gradient(45deg, transparent, ${jutsu.glowColor.replace('0.6','0.8')})` }}></div>
          <img className="cutin-character" src={`/characters/${jutsu.imageId}.png`} alt="" onError={e => e.target.style.display='none'} />
          <div className="cutin-text" style={{ color: jutsu.color }}>{jutsu.name}</div>
        </div>
      )}
      <button onClick={onComplete} style={{ position: 'absolute', bottom: '10%', zIndex: 110, pointerEvents: 'auto', background: 'rgba(255,255,255,0.1)', border: `1px solid ${jutsu.color}`, color: jutsu.color, padding: '0.6rem 1.6rem', borderRadius: '2rem', cursor: 'pointer', fontSize: '0.9rem', backdropFilter: 'blur(8px)', boxShadow: `0 0 20px ${jutsu.glowColor}` }}>Tecnica Completata ✓</button>
    </div>
  );
};

export default JutsuEffect;

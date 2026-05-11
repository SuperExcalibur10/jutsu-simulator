import React, { useEffect, useRef, useCallback, useState } from 'react';

const smokeImg = new Image();
smokeImg.src = '/effects/smoke.png';

const dragonImg = new Image();
dragonImg.src = '/effects/drago acquatico.png';

const susanooImg = new Image();
susanooImg.src = '/effects/susanoo.png';

/* ── Audio ──────────────────────────────────────── */
const playSound = (type, audioCtx) => {
  try {
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
          osc.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
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
      src.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
      src.start();
      const osc = audioCtx.createOscillator(); osc.type = 'sine';
      osc.frequency.setValueAtTime(80, audioCtx.currentTime);
      osc.frequency.linearRampToValueAtTime(200, audioCtx.currentTime + 1.5);
      const g2 = audioCtx.createGain();
      g2.gain.setValueAtTime(0.15, audioCtx.currentTime);
      g2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 2);
      osc.connect(g2); g2.connect(audioCtx.destination);
      osc.start(); osc.stop(audioCtx.currentTime + 2);
    } else if (type === 'fire') {
      const osc = audioCtx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 60;
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.35, audioCtx.currentTime + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 3);
      const filter = audioCtx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 300;
      osc.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
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
    } else if (type === 'heal') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.5);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 2);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(); osc.stop(audioCtx.currentTime + 2);
      for(let i=0; i<3; i++) {
        setTimeout(() => {
          const osc2 = audioCtx.createOscillator();
          const g2 = audioCtx.createGain();
          osc2.frequency.setValueAtTime(1000 + Math.random()*500, audioCtx.currentTime);
          g2.gain.setValueAtTime(0.1, audioCtx.currentTime);
          g2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
          osc2.connect(g2); g2.connect(audioCtx.destination);
          osc2.start(); osc2.stop(audioCtx.currentTime + 0.3);
        }, 200 + i * 300);
      }
    }
  } catch (e) { /* ignore */ }
};

/* ── Helper Functions ──────────────────────────── */
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

const summonsImages = {};
const loadSummonImage = (name) => {
  if (summonsImages[name]) return summonsImages[name];
  const img = new Image();
  img.src = `/characters/${name}.png`;
  summonsImages[name] = img;
  return img;
};

/* ── Component ────────────────────────────────────── */
const JutsuEffect = ({ jutsu, handLandmarks, onComplete }) => {
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

  const [showCutIn, setShowCutIn] = useState(true);
  const [summonedAnimal, setSummonedAnimal] = useState(null);

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
      } catch (e) {
        console.error("Segmentation error:", e);
      }
    }
  }, []);

  /* ── Render Functions ──────────────────────────── */
  const renderChidori = (ctx, w, h, hand, t, particles) => {
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
  };

  const renderRasengan = (ctx, w, h, hand, t, particles) => {
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
  };

  const renderKaton = (ctx, w, h, hand, t, particles) => {
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
  };

  const renderHeal = (ctx, w, h, hand, t, particles) => {
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
  };

  const renderClone = (ctx, w, h, t) => {
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
  };

  const renderSummon = (ctx, w, h, t, animalName) => {
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
  };

  const renderWater = (ctx, w, h, frame, particles) => {
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
  };

  const renderSusanoo = (ctx, w, h, frame) => {
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
  };

  const renderPush = (ctx, cx, cy, tx, ty, frame) => {
    const progress = (frame % 30) / 30, radius = progress * 800;
    ctx.save();
    ctx.lineWidth = 40 * (1 - progress); ctx.strokeStyle = `rgba(255, 255, 255, ${0.8 * (1 - progress)})`;
    ctx.beginPath(); ctx.arc(tx, ty, radius, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  };

  const renderShadow = (ctx, w, h, hand, t, clones) => {
    ctx.clearRect(0, 0, w, h);
    const cx = hand[9].x * w, cy = hand[9].y * h;
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
  };

  /* ── Hooks ─────────────────────────────────────── */
  useEffect(() => {
    const timer = setTimeout(() => setShowCutIn(false), 1200);
    if (jutsu.effectType === 'summon') setSummonedAnimal('gamapunta');
    return () => clearTimeout(timer);
  }, [jutsu]);

  const initParticles = useCallback((type, cx, cy) => {
    if (type === 'lightning') particlesRef.current = Array.from({ length: 30 }, () => spawnSpark(cx, cy, cx, cy - 80));
    else if (type === 'wind') particlesRef.current = Array.from({ length: 40 }, () => { const a = Math.random()*Math.PI*2, d = 60+Math.random()*80; return { x: cx+Math.cos(a)*d, y: cy+Math.sin(a)*d, life: 0.8, size: Math.random()*3+1, color: Math.random()>0.5?'#a0d8ff':'#fff' }; });
    else if (type === 'fire') particlesRef.current = Array.from({ length: 45 }, () => ({ x: cx+(Math.random()-0.5)*40, y: cy+(Math.random()-0.5)*40, vx: (Math.random()-0.5)*6, vy: -(Math.random()*5+2), life: Math.random()*0.7+0.2, size: Math.random()*6+2, color: ['rgba(255,220,50,1)','rgba(255,120,20,1)','rgba(220,40,0,1)'][Math.floor(Math.random()*3)] }));
    else if (type === 'water') particlesRef.current = Array.from({ length: 40 }, () => ({ x: cx, y: cy, vx: (Math.random()-0.5)*10, vy: (Math.random()-0.5)*10 - 5, life: Math.random()*0.8+0.2, size: Math.random()*8+4, color: '#3b82f6' }));
    else if (type === 'shadow') clonesRef.current = [-200, -120, 120, 200].map(offset => ({ x: cx+offset, y: cy, spawnTime: 30+Math.abs(offset)*0.3 }));
    else if (type === 'heal') particlesRef.current = Array.from({ length: 35 }, () => ({ x: cx+(Math.random()-0.5)*100, y: cy+(Math.random()-0.5)*100, speed: 1+Math.random()*2, life: Math.random(), size: 2+Math.random()*4, color: '#10B981' }));
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
        case 'push': renderPush(ctx, w/2, h/2, tx, ty, frameRef.current); break;
        case 'heal': renderHeal(ctx, w, h, usedHand, t, particlesRef.current); break;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [jutsu, initParticles, summonedAnimal, handLandmarks]);

  if (!jutsu) return null;

  const bgMap = { lightning: 'rgba(0,5,20,0.85)', wind: 'rgba(0,5,20,0.85)', fire: 'rgba(10,0,0,0.88)', shadow: 'rgba(0,0,10,0.88)', clone: 'rgba(0,0,0,0.0)' };
  const canvasStyle = jutsu.effectType === 'clone' ? { position: 'absolute', inset: 0, width: '100%', height: '100%' } : { position: 'absolute', inset: 0, width: '100%', height: '100%', transform: 'scaleX(-1)' };

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

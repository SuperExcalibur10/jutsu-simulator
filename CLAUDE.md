# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # start Vite dev server (hot reload)
npm run build     # production build → dist/
npm run preview   # serve the production build locally
npm run lint      # ESLint check
```

There is no test suite.

## Environment setup

Copy `.env.example` to `.env` and fill in all `VITE_FIREBASE_*` keys plus `VITE_ADMIN_EMAIL`.  
Firebase credentials are required even in dev — the app calls Firestore and Auth on startup.

## Architecture

**Single-page React + Vite app** with no routing. `App.jsx` is a single large component that owns all state and drives a modal-style mode machine.

### App mode machine

`mode` state controls what the left sidebar renders:

```
jutsu-select → calibration → perform → effect (JutsuEffect overlay)
             ↑                                ↓
             └────────── (battle active) ─────┘
jutsu-select → battle → perform → effect → (next battle jutsu)
jutsu-select → recalibrate-menu → calibration → jutsu-select
jutsu-select → leaderboard
```

### Hand tracking pipeline

```
WebcamView (rAF loop)
  └─ useHandTracking  (MediaPipe HandLandmarker + ImageSegmenter, loaded from CDN)
       └─ detectHands() → results.landmarks[]
            └─ onResults callback → App.handleWebcamResults()
                 └─ sealClassifier.extractFeatures()   (scale-invariant 60/120-dim vector)
                 └─ sealClassifier.classifySeal()      (nearest-neighbour, threshold² 0.2025)
```

MediaPipe WASM and model files are fetched from remote CDN on first load — network access is required.

### Seal calibration

Users capture a hand-pose sample per seal; the feature vector is stored in `localStorage` (`jutsu_sim_v4_seals`). Classification is nearest-neighbour: squared Euclidean distance normalized by vector length, accepted below threshold 0.45. `SEAL_HOLD_FRAMES = 10` consecutive matching frames are required to confirm a seal.

### Jutsu effects (`JutsuEffect.jsx`)

Full-screen Canvas overlay rendered via `requestAnimationFrame`. Each `effectType` has its own render function (e.g. `renderChidori`, `renderRasengan`). Body segmentation (ImageSegmenter) is used for `clone`, `water`, and `susanoo` effects to composite the user's silhouette over the animation. Audio is synthesized via Web Audio API (no audio files for effects). The effect auto-completes after 6 000 ms and calls `onComplete`.

### Global window bridges

These globals are the cross-component state connectors — avoid replacing them with props without considering performance:

| Global | Set by | Read by |
|---|---|---|
| `window.currentHandLandmarks` | `WebcamView` render loop | `JutsuEffect` render loop |
| `window.currentVideoElement` | `WebcamView` camera setup | `JutsuEffect` (clone/water/susanoo segmentation) |
| `window.currentSegmenter` | `useHandTracking` | `JutsuEffect` (segmentation) |

### Performance-critical DOM updates

Inside `handleWebcamResults` (called every animation frame), the chakra-fill bar and seal-name label are updated via direct DOM manipulation (`document.getElementById`) to bypass React re-render overhead. Do not refactor these into state.

### Firebase / data layer

- **Auth**: Google Sign-In via popup. `onAuthStateChanged` in the startup `useEffect` syncs cloud XP to localStorage on login and resolves the `isAuthLoading` gate.
- **Firestore collection `players`**: documents keyed by `uid`, fields `name`, `xp`, `rank`, `photo`, `lastSeen`. XP is written on every jutsu completion (`syncXpToCloud`).
- **Leaderboard**: real-time `onSnapshot` query — top 20 players ordered by `xp` desc.
- **Offline fallback**: XP and calibrated seals are always persisted in `localStorage` (`jutsu_sim_v4_xp`, `jutsu_sim_v4_seals`).

### Static assets (under `public/`)

| Path | Content |
|---|---|
| `sounds/*.mp3` | Background music tracks |
| `seals/<name>.png` | Reference images for each seal (lowercase name) |
| `characters/<id>.png` | Character art used in jutsu cards and cut-ins |
| `villain/<id>.png` | Enemy images for battle mode |
| `effects/smoke.png`, `drago acquatico.png`, `susanoo.png` | Pre-loaded effect sprites |
| `assets/kakashi.png`, `naruto.png`, `sasuke.png`, `naruto_logo.png` | Decorative UI art |

### Key data files

- `src/utils/jutsuEngine.js` — defines all `JUTSUS` (id, sequence, effectType, XP unlock threshold, colours) and derives `SEALS_LIST`.
- `src/utils/progression.js` — `RANKS` array and `getCurrentRank`/`getNextRank` helpers.
- `src/utils/sealClassifier.js` — `extractFeatures` and `classifySeal` (pure functions, no React).

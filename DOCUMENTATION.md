# Shinobi Hand Seal Trainer (Jutsu Simulator) - Documentazione Tecnica

## 1. Panoramica del Progetto
Il **Jutsu Simulator** è una Web Application basata su React che permette agli utenti di simulare l'esecuzione di tecniche (Jutsu) dall'universo di Naruto tramite il riconoscimento in tempo reale dei sigilli delle mani.
L'applicazione sfrutta **MediaPipe** (di Google) per il tracking delle mani e la segmentazione dello sfondo, offrendo un'esperienza interattiva completa di calibrazione personalizzata, guida all'esecuzione e spettacolari effetti visivi su Canvas HTML5.

### Tecnologie Core
- **Frontend Framework:** React 19 (con Vite per il bundling)
- **Computer Vision:** `@mediapipe/tasks-vision` (HandLandmarker, ImageSegmenter)
- **Styling:** CSS3 Vanilla con design system "Glassmorphism" e temi scuri.
- **Audio/Visual:** HTML5 Canvas API (per effetti particellari, sprite e video overlay), Web Audio API.

---

## 2. Architettura e Struttura dei File
Il progetto è strutturato in modo modulare per separare la logica di riconoscimento, la UI e gli effetti visivi.

```text
src/
├── App.jsx                 # Componente Main: gestisce lo stato globale (selezione, calibrazione, esecuzione)
├── components/
│   ├── WebcamView.jsx      # Gestione della telecamera, setup MediaPipe e rendering del feed
│   └── JutsuEffect.jsx     # Motore di rendering su Canvas per gli effetti finali (Chidori, Rasengan, ecc.)
├── hooks/
│   └── useHandTracking.js  # Hook personalizzato per l'inizializzazione e gestione dei modelli MediaPipe
├── utils/
│   ├── jutsuEngine.js      # Definizione statica dei jutsu, dei sigilli richiesti e dei colori
│   └── sealClassifier.js   # Algoritmo matematico per l'estrazione di feature e classificazione vettoriale
├── index.css               # Stili globali (animazioni, variabili, glassmorphism)
└── main.jsx                # Entry point di React
```

---

## 3. Moduli e Componenti Principali

### 3.1. `App.jsx` (Core Controller)
Agisce come macchina a stati per l'intera applicazione.
**Stati principali:**
- `jutsu-select`: Menu di selezione della tecnica.
- `calibration`: Fase in cui l'utente registra la propria conformazione delle mani per i sigilli richiesti.
- `perform`: Modalità "esecuzione", in cui l'app verifica in sequenza i sigilli effettuati dall'utente (con un sistema di "hold" di 18 frame, circa 600ms, per confermare il sigillo).
- `effect`: Attivazione del componente visivo una volta completata la sequenza.

**Logica di storage:**
I sigilli calibrati vengono salvati nel `localStorage` (sotto la chiave `jutsu_sim_v4_seals`) come array di feature vettoriali, per evitare di dover ricalibrare ad ogni riavvio.

### 3.2. `hooks/useHandTracking.js`
Gestisce il ciclo di vita dei modelli di AI:
- Carica asincronamente `HandLandmarker` (per il tracking di 21 punti della mano) e `ImageSegmenter` (per scontornare l'utente dal background).
- Fornisce il metodo `detectHands(timeInMs)` per processare un frame video e restituire le coordinate in tempo reale.

### 3.3. `utils/sealClassifier.js`
Implementa la logica di comparazione dei sigilli:
- `extractFeatures`: Converte le coordinate 3D dei 21 landmark in un array di distanze relative al polso. Il vettore viene normalizzato rispetto alla distanza polso-dito medio per renderlo *scale-invariant* (indipendente dalla distanza della mano dalla telecamera).
- `classifySeal`: Calcola la Distanza Euclidea tra le feature correnti e quelle salvate durante la calibrazione. Se la distanza è inferiore a una determinata soglia (`threshold`), il sigillo viene riconosciuto.

### 3.4. `components/WebcamView.jsx`
- Gestisce il selettore hardware della webcam (utile su mobile o con setup a più schermi).
- Usa un `requestAnimationFrame` loop per processare costantemente i frame video, chiamando `detectHands` e disegnando un feedback visivo opzionale (landmark blu) su un canvas overlay.
- Passa i risultati del tracking al parent tramite la callback `onResults`.

### 3.5. `components/JutsuEffect.jsx`
È il cuore degli effetti speciali. Riceve il jutsu attivo ed esegue un loop `requestAnimationFrame` separato:
- **Audio:** Sfrutta le `AudioContext` per generare dinamicamente suoni (crackle elettrici per Chidori, whoosh di vento per Rasengan, rumore bianco per le copie).
- **Canvas Rendering (Effetti Elementali):** Ogni tecnica ha un render dedicato (es. `renderChidori`, `renderRasengan`, `renderKaton`). Usa sistemi particellari, gradienti radiali e composizione per creare animazioni fluide a 60fps.
- **Effetto Clone (Bunshin):** Usa `ImageSegmenter` per creare una maschera trasparente attorno all'utente in tempo reale, ritagliare il feed video e sdoppiare l'immagine ai lati dello schermo specchiandola.

---

## 4. Flusso Dati e User Experience (UX)

1. **Avvio:** L'utente accede, i modelli WASM di MediaPipe vengono scaricati in background.
2. **Selezione:** L'utente sceglie un Jutsu (es. "Chidori").
3. **Calibrazione (se necessaria):** Se l'app rileva che i sigilli per quel Jutsu non sono presenti nel `localStorage`, entra in modalità calibrazione. Mostra le immagini di riferimento (dalla cartella `/public/seals/`), avvia un timer e salva il vettore geometrico della mano.
4. **Esecuzione (Perform):** A schermo appare la sequenza dei sigilli. Ad ogni frame, `WebcamView` invia i landmark ad `App.jsx`, che li converte in feature e li classifica con `classifySeal`. Se c'è un match e viene mantenuto per X frame, si passa al sigillo successivo.
5. **Attivazione:** Al completamento della sequenza, `App.jsx` smonta la UI, nasconde i landmark e monta `JutsuEffect.jsx`, innescando le animazioni su Canvas e il suono spaziale.

---

## 5. Dettagli Implementativi e Ottimizzazioni

- **Performance Video:** Il loop in `WebcamView` è limitato dal tempo del video (`videoRef.current.currentTime !== lastVideoTime`), evitando di chiamare il modello AI inutilmente se non ci sono nuovi frame.
- **Web Audio Generativo:** Invece di caricare file MP3/WAV pesanti, i suoni di fulmini e vento sono sintetizzati proceduralmente usando oscillatori, noise buffer e filtri biquad (BiquadFilter), riducendo a zero i tempi di caricamento delle risorse audio.
- **Scale Invariance:** Grazie al calcolo matematico in `extractFeatures`, il sistema di riconoscimento riconosce i sigilli sia che l'utente stia molto vicino alla cam, sia che si trovi distante.
- **Chakra Gauge:** Il feedback visivo della tenuta del sigillo (Chakra Gauge) aggiorna il DOM direttamente bypassando il ciclo di re-render di React per garantire 30fps fluidi e nessun calo di performance dell'AI.

## 6. Sicurezza e Privacy (Registrazione Video)

Il sistema offre una funzione di **Registrazione Video** integrata per permettere agli utenti di condividere le loro performance.
A garanzia della privacy:
- La registrazione utilizza l'API `MediaRecorder` nativa del browser per catturare il flusso locale della webcam.
- **Tutto il processing è esclusivamente lato client.** Nessun frame video, flusso audio o file viene mai inviato a server esterni.
- Alla fine della registrazione, il file video (`.webm`) viene compilato nella memoria locale del browser e scaricato automaticamente sul dispositivo dell'utente tramite un Object URL locale che viene immediatamente revocato per sicurezza.

## 7. Prossimi Passi (Potenziali Sviluppi Futuri)
- Supporto a riconoscimento multiposizione o combinazioni rapide senza "hold time".

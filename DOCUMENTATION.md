# Shinobi Hand Seal Trainer - Documentazione Tecnica

## 1. Architettura del Sistema
Il simulatore è progettato come una Single Page Application (SPA) reattiva che integra pipeline di intelligenza artificiale per il computer vision con un motore di rendering grafico ad alte prestazioni.

### Componenti Principali
- **App Core (`App.jsx`)**: Orchestratore dello stato globale. Gestisce la logica di progressione (XP), il sistema di combattimento (Battle Mode) e la macchina a stati del simulatore.
- **Vision Engine (`useHandTracking.js`)**: Pipeline asincrona che inizializza e gestisce i modelli MediaPipe:
    - `HandLandmarker`: Fornisce 21 coordinate 3D per mano.
    - `ImageSegmenter`: Crea maschere di confidenza per isolare l'utente dal background (usato nei cloni e nel Susanoo).
- **Classification Engine (`sealClassifier.js`)**: Algoritmo geometrico proprietario per il riconoscimento dei sigilli.
- **VFX Engine (`JutsuEffect.jsx`)**: Motore di rendering su Canvas HTML5 che gestisce particelle, audio sintetico e post-processing.

---

## 2. Riconoscimento dei Sigilli (Gesture Classification)
L'app non utilizza modelli di deep learning pre-addestrati per ogni sigillo, ma un approccio **Geometric Feature Extraction**:

1. **Estrazione**: Vengono calcolate le distanze euclidee tra il polso e ogni landmark delle dita.
2. **Normalizzazione**: Il vettore risultante è normalizzato rispetto alla dimensione della mano (distanza polso-base medio) per garantire che il riconoscimento sia **Scale-Invariant** (funziona a qualsiasi distanza dalla webcam).
3. **Calibrazione**: Durante la calibrazione, l'utente "registra" un'istantanea di questo vettore nel `localStorage`.
4. **Classificazione**: In tempo reale, il sistema confronta il vettore corrente con quelli salvati usando la **Distanza Euclidea**. Se la distanza è inferiore a una soglia dinamica, il sigillo viene confermato.

---

## 3. Game Logic & Progression

### Battle Mode
Il sistema di combattimento (`battle` state) implementa un loop di gioco attivo:
- **Timer Reattivo**: L'utente ha circa 12 secondi per completare la tecnica richiesta dal sistema.
- **Danni e HP**: Se il timer scade, l'utente subisce danni. Se la tecnica viene completata, il nemico subisce danni o l'utente viene curato (nel caso di tecniche mediche).
- **Scaling dei Nemici**: I nemici cambiano dinamicamente (Orochimaru → Madara → Kaguya) in base al livello di XP del giocatore.

### Sistema di XP
L'esperienza guadagnata è calcolata dinamicamente:
`XP = (Base_Jutsu + Bonus_Sequenza) * Moltiplicatore_Velocità`
- Premia la velocità di esecuzione e la complessità della tecnica.
- I gradi Ninja (Genin, Chunin, ecc.) sono calcolati in tempo reale sulla base dei punti accumulati.

---

## 4. Motore Grafico e Sonoro (VFX)

### Rendering su Canvas
Ogni Jutsu utilizza tecniche di disegno avanzate:
- **Sistemi Particellari**: Usati per Chidori (scintille), Katon (braci) e Palmo Mistico (chakra fluttuante).
- **Procedural Audio**: I suoni non sono file MP3, ma vengono generati tramite la `Web Audio API` (oscillatori `sawtooth` per i fulmini, `noise buffer` per il vento). Questo elimina la latenza audio e riduce il peso del caricamento.
- **Real-time Segmentation**: Per tecniche come il *Susanoo* o il *Drago Acquatico*, l'utente viene isolato dallo sfondo in tempo reale e ridisegnato sopra l'effetto visivo, creando un senso di profondità 3D.

---

## 5. Struttura dei Dati (`jutsuEngine.js`)
Le tecniche sono configurate tramite un oggetto JSON che definisce:
- `sequence`: Array di sigilli richiesti (es. `['Serpente', 'Ariete', 'Cane']`).
- `effectType`: Stringa che mappa al renderer specifico (`lightning`, `fire`, `heal`, ecc.).
- `minXp`: Soglia di sblocco per la progressione.

---

## 6. Privacy e Sicurezza
Tutte le operazioni di analisi video avvengono **localmente nel browser**. Nessun dato biometrico o flusso video viene mai trasmesso a server esterni. La funzione di registrazione utilizza lo storage locale per compilare il file video finale prima del download.

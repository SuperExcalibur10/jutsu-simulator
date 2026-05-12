# Shinobi Hand Seal Trainer - Documentazione Tecnica

## 1. Architettura del Sistema
Il simulatore è una Single Page Application (SPA) in React 19 altamente reattiva che fonde pipeline di computer vision (IA), database cloud-based e un motore grafico Canvas ad alte prestazioni.

### Componenti Principali
- **App Core (`App.jsx`)**: Orchestratore globale. Gestisce il routing degli stati (`mode`), l'integrazione con Firebase Auth e il loop primario della Battle Mode. Grazie alle recenti ottimizzazioni, questo componente delega l'aggiornamento DOM ad alta frequenza ai singoli widget per evitare re-render grafici.
- **Player & Database (`firebase.js` & `Leaderboard.jsx`)**: Moduli per la sincronizzazione cloud. Firestore gestisce un repository centralizzato dei giocatori, aggiornando la classifica globale in tempo reale.
- **Vision Engine (`useHandTracking.js` & `WebcamView.jsx`)**: Pipeline asincrona basata su MediaPipe:
    - `HandLandmarker`: Traccia le mani a ~60 FPS fornendo 21 coordinate 3D per mano.
    - `ImageSegmenter`: Crea maschere di confidenza per separare l'utente dallo sfondo (es. per il Susanoo).
- **Classification Engine (`sealClassifier.js`)**: Algoritmo geometrico ultra-veloce per la validazione dei sigilli.
- **VFX Engine (`JutsuEffect.jsx`)**: Motore di rendering dedicato.

---

## 2. Riconoscimento dei Sigilli (Gesture Classification)
L'app evita i pesanti modelli di deep learning end-to-end, prediligendo un approccio **Geometric Feature Extraction** progettato per girare nel main thread del browser senza frame drop:

1. **Estrazione**: Vengono mappate le coordinate del polso rispetto ai polpastrelli per generare vettori multi-dimensionali.
2. **Normalizzazione**: Il vettore è diviso per la dimensione del palmo (distanza polso-base del medio). Ciò rende il modello **Scale-Invariant** (puoi allontanarti o avvicinarti alla webcam).
3. **Calibrazione**: I vettori di riferimento vengono "registrati" dall'utente nel `localStorage`.
4. **Classificazione Ottimizzata**: In esecuzione, il sistema confronta i vettori in tempo reale calcolando la **Distanza Euclidea al Quadrato**. Rinunciando al calcolo della Radice Quadrata (`Math.sqrt`), il costo computazionale del matching per ogni frame video è stato abbattuto di oltre il 60%.

---

## 3. Gestione Dati e Cloud (Firebase)

### Auth & Sync Flow
1. L'utente accede tramite provider Google (`signInWithPopup`).
2. Se è il suo primo accesso, l'XP accumulato come "ospite" (salvato in `localStorage`) viene migrato nel suo nuovo documento su Cloud Firestore.
3. Se l'utente ha già un account, l'applicazione assume il Cloud come _Single Source of Truth_, sovrascrivendo la cache locale e prevenendo bleeding (contaminazione) di punteggi tra account diversi sullo stesso computer.

### Sicurezza (Firestore Rules)
Per proteggere la classifica da exploit lato client, le regole di Firestore raccomandate per la produzione sono:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /players/{userId} {
      allow read: if true; // Chiunque può vedere la classifica
      // Solo l'utente proprietario può modificare i propri XP o il proprio Nome
      allow write: if request.auth != null && request.auth.uid == userId; 
    }
  }
}
```
Lato front-end, gli input stringa (es. il Nickname personalizzato) vengono sanificati (`/[^a-zA-Z0-9_ -]/g`) prima della transazione di update.

---

## 4. Game Logic & Progression

### Battle Mode
Il sistema di combattimento (`battle` state) implementa un loop basato sui riflessi e sulla progressione:
- **Selezione Avversario**: L'utente può scegliere tra 12 nemici leggendari (da Zabuza a Kaguya) tramite un menu dedicato. L'accesso ai nemici più forti è vincolato alla soglia di XP posseduti (`minXp`).
- **Scaling dei Premi**: Ogni vittoria garantisce un `xpReward` proporzionale alla forza del nemico (es. Zabuza: 100 XP, Kaguya: 1000 XP).
- **HP del Giocatore**: La salute massima scala con il grado Ninja (Academy: 100 HP → Kage: 300 HP).
- **Timer & Danni**: L'utente ha 12 secondi per completare la sequenza. Se il tempo scade, il nemico colpisce con una tecnica speciale lore-accurate e la tecnica richiesta ruota casualmente per mantenere dinamico lo scontro.

---

## 5. Sistemi Ausiliari

### Music Player
Un widget dedicato in `WebcamView` gestisce una playlist di 9 brani iconici. Supporta:
- Riproduzione casuale automatica.
- Controlli utente per Pausa/Play e Skip.
- Sincronizzazione volume globale.

### Leaderboard & Privacy Admin
Per garantire la privacy degli amministratori, il sistema identifica l'email definita in `VITE_ADMIN_EMAIL`. Gli account admin vengono salvati con un flag `isHidden: true` e vengono automaticamente filtrati dalla classifica globale.

---

## 6. Motore Grafico e Sonoro (VFX)

- **Manipolazione Diretta del DOM**: Durante la performance ad alta frequenza, i progressi a schermo vengono aggiornati aggirando la riconciliazione di React (`document.getElementById().innerText` e `.style.width`), riducendo a 0 i re-render del componente padre.
- **Sistemi Particellari Canvas**: Usati per Katon, Chidori e Palmo Mistico.
- **Procedural Audio (Web Audio API)**: Suoni sintetizzati tramite oscillatori matematici (`sawtooth`, rumore bianco, filtri passa-banda) eseguiti in tempo reale, per colmare la latenza del caricamento di file MP3 tradizionali.
- **Real-time Segmentation**: Gli shader isolano dinamicamente la silhouette del giocatore dal background per sovrapporlo alle aure (Susanoo).

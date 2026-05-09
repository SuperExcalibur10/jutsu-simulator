# 忍術 Shinobi Hand Seal Trainer (Jutsu Simulator)

A premium web-based simulator that uses real-time computer vision to recognize Naruto-style hand seals and trigger spectacular jutsu effects.

![Naruto Logo](/public/assets/naruto_logo.png)

## 🌟 Features

- **Real-Time Hand Tracking**: Uses Google's MediaPipe for high-precision hand landmark detection.
- **Custom Calibration**: Calibrate the system to your own hands for maximum accuracy.
- **Iconic Techniques**: Includes Katon (Fireball), Chidori, Rasengan, and Kage Bunshin no Jutsu.
- **Premium Visuals**: Dynamic HTML5 Canvas effects, character cut-ins (Jiraiya, Naruto, Sasuke), and background music.
- **Session Recording**: Capture your performances including all visual effects and sound.
- **Privacy First**: All processing is done locally on your device. No video data ever leaves your browser.

## 🛠️ Technology Stack

- **Frontend**: React 19 + Vite
- **Computer Vision**: MediaPipe HandLandmarker & ImageSegmenter
- **Audio/Visual**: Canvas API, Web Audio API, Web MediaRecorder
- **Styling**: Vanilla CSS (Glassmorphism design)

## 🚀 Getting Started

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/jutsu-simulator.git
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser**:
   Navigate to `http://localhost:5173`.

## 📜 Documentation

For a detailed technical overview of the architecture, classification algorithms, and rendering engines, please refer to the [DOCUMENTATION.md](./DOCUMENTATION.md).

## 🥷 How to Use

1. Select a Jutsu from the sidebar.
2. If it's your first time, follow the calibration steps to "record" your hand seals.
3. Perform the sequence of seals as shown on screen.
4. Hold each seal until the Chakra Gauge is full.
5. Unleash the technique!

---
*Created with passion for the Naruto universe. Dattebayo!*


# 忍術 Shinobi Hand Seal Trainer (Jutsu Simulator)

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.0-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![MediaPipe](https://img.shields.io/badge/MediaPipe-Vision-007FFF?logo=google&logoColor=white)](https://developers.google.com/mediapipe)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

A high-performance web application that uses **real-time computer vision** to recognize Naruto-style hand seals and trigger spectacular elemental techniques. Experience the life of a shinobi with advanced tracking, a dynamic battle system, and premium visual effects.

![App Screenshot](/public/assets/naruto_logo.png)

## 🌟 Key Features

- **🎯 Real-Time Hand Tracking**: Powered by Google's MediaPipe for high-precision detection of 21 hand landmarks.
- **⚔️ Ninja Battle Mode**: Face legendary enemies like Pain, Madara, and Kaguya in a fast-paced reaction-based combat system.
- **📈 Progression & Ranks**: Earn XP for successful jutsu and rise through the ranks from Academy Student to Kage.
- **🌸 Medical Ninjutsu**: Master the *Shōsen Jutsu* (Medical Palm) to heal wounds during combat.
- **✨ Premium Visuals**: dynamic HTML5 Canvas effects, cinematic character cut-ins, and procedurally generated audio.
- **🎥 Session Recording**: Capture and download your jutsu performances with the integrated screen recorder.
- **🔒 Privacy First**: All AI processing is done locally in your browser. No video data ever leaves your device.

## 🥷 Available Techniques

| Jutsu | Character | Difficulty | Effect |
| :--- | :--- | :--- | :--- |
| **Shōsen Jutsu** | Sakura | 🟢 Easy | Healing (+30 HP) |
| **Bunshin no Jutsu** | Naruto | 🟢 Easy | Clone visual |
| **Katon: Gōkakyū** | Sasuke | 🟡 Medium | Fire Explosion |
| **Rasengan** | Naruto | 🟡 Medium | Wind Sphere |
| **Chidori** | Kakashi | 🟠 Hard | Lightning Strike |
| **Suiton: Suiryūdan** | Kisame | 🔴 Elite | Water Dragon |
| **Susanoo** | Itachi | 🟣 Mythic | Spectral Armor |
| **Shinra Tensei** | Pain | ⚪ Godly | Repulsion Pulse |

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- A working webcam

### Installation
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
4. **Access the App**:
   Open [http://localhost:5173](http://localhost:5173) (or the port shown in your terminal).

## 🛠️ Technology Stack

- **Framework**: React 19 + Vite
- **Computer Vision**: `@mediapipe/tasks-vision` (HandLandmarker & ImageSegmenter)
- **Audio**: Web Audio API (Generative synthesis)
- **Rendering**: HTML5 Canvas API (Particle systems & Video segmentation)
- **Styling**: Vanilla CSS (Advanced Glassmorphism & Animations)

## 📜 Technical Documentation

For a deep dive into the vector-based gesture classification, AI segmentation pipeline, and rendering engine, check out the [DOCUMENTATION.md](./DOCUMENTATION.md).

---
*Created with passion for the Naruto universe. Dattebayo!*

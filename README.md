# 忍術 Shinobi Hand Seal Trainer (Jutsu Simulator)

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.0-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![MediaPipe](https://img.shields.io/badge/MediaPipe-Vision-007FFF?logo=google&logoColor=white)](https://developers.google.com/mediapipe)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore%20%26%20Auth-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

A high-performance web application that uses **real-time computer vision** to recognize Naruto-style hand seals and trigger spectacular elemental techniques. Experience the life of a shinobi with advanced tracking, a dynamic battle system, global leaderboards, and premium visual effects.

![App Screenshot](/public/assets/naruto_logo.png)

## 🌟 Key Features

- **🎯 Real-Time Hand Tracking**: Powered by Google's MediaPipe for high-precision detection of 21 hand landmarks per hand, fully supporting complex two-handed jutsu.
- **⚔️ Strategic Ninja Battles**: Face a roster of 12 legendary villains. Choose your opponent via a dedicated selection menu or opt for random encounters. Difficulty and rewards scale based on the opponent's strength.
- **🎵 Dynamic Soundtrack**: Integrated music player with pause/skip controls and a library of 9 iconic Naruto tracks.
- **☁️ Cloud Sync & Global Leaderboard**: Sign in securely with Google via **Firebase Authentication**. Your XP and Rank are synchronized across devices via **Cloud Firestore**.
- **📈 Progression & Ranks**: Earn calibrated XP rewards and rise through ranks from Academy Student to Kage, with your Max HP increasing as you grow stronger.
- **✨ Premium Visuals & Audio**: Dynamic HTML5 Canvas effects, cinematic character cut-ins, procedural audio synthesis (Web Audio API), and real-time AI background segmentation (Susanoo).
- **🎥 Session Recording**: Capture and download your jutsu performances with the integrated browser screen recorder.
- **🔒 Privacy First**: All AI vision processing is done locally in your browser. No video data ever leaves your device. Only your nickname and XP are saved to the cloud.

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
- A Firebase Project (for Auth and Firestore)

### Installation
1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/jutsu-simulator.git
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Environment Setup**:
   Create a `.env` file in the root directory and add your Firebase configuration:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```
4. **Run the development server**:
   ```bash
   npm run dev
   ```
5. **Access the App**:
   Open [http://localhost:5173](http://localhost:5173).

## 🛠️ Technology Stack

- **Framework**: React 19 + Vite
- **Backend/DB**: Firebase Authentication & Cloud Firestore
- **Computer Vision**: `@mediapipe/tasks-vision` (HandLandmarker & ImageSegmenter)
- **Audio**: Web Audio API (Generative synthesis)
- **Rendering**: HTML5 Canvas API (Particle systems & Video segmentation)
- **Styling**: Vanilla CSS (Advanced Glassmorphism & Micro-animations)

## 📜 Technical Documentation

For a deep dive into the math behind the geometric gesture classification, the Firebase security rules, and the component architecture, check out the [DOCUMENTATION.md](./DOCUMENTATION.md).

---
*Created with passion for the Naruto universe. Dattebayo!*

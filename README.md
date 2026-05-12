# 忍術 Shinobi Hand Seal Trainer (Jutsu Simulator)

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.0-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![MediaPipe](https://img.shields.io/badge/MediaPipe-Vision-007FFF?logo=google&logoColor=white)](https://developers.google.com/mediapipe)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore%20%26%20Auth-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

A high-performance web application that uses **real-time computer vision** to recognize Naruto-style hand seals and trigger spectacular elemental techniques. Experience the life of a shinobi with advanced tracking, a strategic boss-rush system, global leaderboards, and an immersive soundtrack.

![App Screenshot](/public/assets/naruto_logo.png)

## 🌟 Key Features

- **🎯 Real-Time Hand Tracking**: Powered by Google's MediaPipe for high-precision detection of 21 hand landmarks per hand, fully supporting complex two-handed jutsu.
- **👹 Legendary Boss Rush**: Face 12 iconic villains. Access the **Enemy Selection Menu** to choose your target or gamble with a random encounter.
- **📈 Progressive Scaling**: Your ninja rank dictates your Max HP, while enemies scale in lethality and rewards as you climb the leaderboard.
- **🎵 Cinematic OST**: Integrated music player with pause/skip controls and a library of 9 iconic Naruto tracks.
- **☁️ Cloud Sync**: Secure Google login via **Firebase Authentication** with real-time XP and rank synchronization via **Cloud Firestore**.
- **🎥 Session Recording**: Capture and download your jutsu performances with the integrated browser screen recorder.
- **🔒 Privacy First**: All AI vision processing is done locally in your browser. No video data ever leaves your device.

## 🥷 Available Techniques

| Jutsu | Character | Damage | Unlock (XP) | Effect |
| :--- | :--- | :--- | :--- | :--- |
| **Shōsen Jutsu** | Sakura | 0 | 0 | Healing (+30 HP) |
| **Bunshin no Jutsu** | Naruto | 20 | 0 | Multi-Clone Visual |
| **Katon: Gōkakyū** | Sasuke | 35 | 0 | Fire Explosion |
| **Rasengan** | Naruto | 40 | 0 | Wind Sphere |
| **Chidori** | Kakashi | 45 | 600 | Lightning Strike |
| **Kage Bunshin** | Naruto | 50 | 1,200 | Shadow Clones |
| **Kuchiyose** | Jiraiya | 65 | 2,500 | Summon Gamabunta |
| **Suiton: Suiryūdan** | Kisame | 80 | 4,500 | Water Dragon |
| **Mangekyō Sharingan** | Itachi | 100 | 6,000 | Tsukuyomi Illusion |
| **Susanoo** | Itachi | 125 | 8,000 | Spectral Armor |
| **Shinra Tensei** | Pain | 150 | 12,000 | Repulsion Pulse |
| **Indra no Ya** | Sasuke | 200 | 16,000 | Indra's Arrow |

## 👹 Legendary Villains

Choose your opponent from the strategic selection menu. Each boss has unique HP and specific XP rewards.

| Villain | HP | Req. XP | Reward |
| :--- | :--- | :--- | :--- |
| **Zabuza** | 80 | 0 | 100 XP |
| **Deidara** | 120 | 400 | 150 XP |
| **Orochimaru** | 140 | 1,000 | 200 XP |
| **Kabuto** | 160 | 1,800 | 250 XP |
| **Danzō** | 180 | 2,800 | 300 XP |
| **Itachi** | 200 | 4,000 | 400 XP |
| **Sasuke** | 220 | 5,500 | 500 XP |
| **Pain** | 250 | 7,500 | 600 XP |
| **Obito** | 280 | 10,000 | 700 XP |
| **Madara** | 320 | 13,000 | 800 XP |
| **Zetsu Nero** | 360 | 16,000 | 900 XP |
| **Kaguya** | 400 | 19,000 | 1,000 XP |

## 📉 Ninja Ranks & HP

Your survival depends on your rank. Earn XP to unlock higher health pools.

- **Accademia**: 100 HP (Start)
- **Genin**: 120 HP (400 XP)
- **Chunin**: 150 HP (1,000 XP)
- **Jonin**: 200 HP (3,000 XP)
- **Kage**: 300 HP (7,000 XP)

## 🎵 Soundtrack (OST)

Enjoy 9 iconic tracks with full player controls:
- *Blue Bird*, *Distance*, *Haruka Kanata*, *Hero's Come Back*, *Itachi's Theme*, *Naruto Italian Opening*, *Rhapsody of Youth*, *Sign*, *Silhouette*.

## 🚀 Getting Started

1. **Install dependencies**: `npm install`
2. **Setup environment**: Create `.env` with Firebase keys (see `.env.example`).
3. **Run Dev**: `npm run dev`
4. **Calibrate**: Follow the in-app guide to record your hand seals.

---
*Created with passion for the Naruto universe. Dattebayo!*

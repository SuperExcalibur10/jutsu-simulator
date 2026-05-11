import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

const LEGENDARY_NINJAS = [
  { name: 'Hashirama Senju', xp: 15000, rank: 'Hokage', avatar: '🍃' },
  { name: 'Madara Uchiha', xp: 14500, rank: 'Leggenda', avatar: '🔥' },
  { name: 'Minato Namikaze', xp: 12000, rank: 'Lampo Giallo', avatar: '⚡' },
];

const Leaderboard = ({ currentPlayer, onBack }) => {
  const [realPlayers, setRealPlayers] = useState([]);

  useEffect(() => {
    // Listen to top 20 players from Firestore
    const q = query(collection(db, "players"), orderBy("xp", "desc"), limit(20));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const players = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRealPlayers(players);
    });

    return () => unsubscribe();
  }, []);

  // Combine legendary ninjas with real players
  const allPlayers = [...LEGENDARY_NINJAS];
  
  realPlayers.forEach(rp => {
    const existingIndex = allPlayers.findIndex(p => p.name === rp.name);
    if (existingIndex === -1) {
      allPlayers.push({
        name: rp.name,
        xp: rp.xp,
        rank: rp.rank,
        avatar: rp.photo || '🥷',
        isCurrent: rp.id === currentPlayer?.uid
      });
    }
  });

  // Sort by XP
  const sortedPlayers = allPlayers.sort((a, b) => b.xp - a.xp);

  return (
    <div className="leaderboard-overlay absolute-fill flex-center" style={{ zIndex: 100, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }}>
      <div className="glass-panel" style={{ width: '90%', maxWidth: '500px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'jutsuReveal 0.4s ease-out' }}>
        
        {/* Header */}
        <div style={{ padding: '2rem', textAlign: 'center', borderBottom: '1px solid var(--panel-border)', background: 'linear-gradient(to bottom, rgba(249,115,22,0.1), transparent)' }}>
          <div className="title-main" style={{ fontSize: '2.5rem' }}>CLASSIFICA MONDIALE</div>
          <div className="title-kanji">I Più Grandi Shinobi del Mondo</div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }} className="sidebar">
          {sortedPlayers.map((player, index) => (
            <div 
              key={player.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem',
                borderRadius: '1rem',
                marginBottom: '0.75rem',
                background: player.isCurrent ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${player.isCurrent ? 'var(--naruto-orange)' : 'rgba(255,255,255,0.07)'}`,
                boxShadow: player.isCurrent ? '0 0 20px var(--naruto-orange-glow)' : 'none',
                transition: 'all 0.3s'
              }}
            >
              <div style={{ 
                width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(0,0,0,0.4)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem',
                border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0, overflow: 'hidden'
              }}>
                {player.avatar.startsWith('http') ? <img src={player.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : player.avatar}
              </div>
              
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 700, color: player.isCurrent ? 'var(--naruto-orange)' : '#fff', fontSize: '1.1rem' }}>
                    {index + 1}. {player.name}
                  </div>
                  <div style={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--naruto-orange)' }}>
                    {player.xp.toLocaleString()} XP
                  </div>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '0.2rem' }}>
                  Grado: {player.rank}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--panel-border)', textAlign: 'center' }}>
          <button className="ninja-btn primary" style={{ width: '100%', padding: '1rem' }} onClick={onBack}>
            TORNA AL VILLAGGIO
          </button>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;

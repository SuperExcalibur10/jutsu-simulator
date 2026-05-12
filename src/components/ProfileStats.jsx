import { JUTSUS } from '../utils/jutsuEngine';
import { ACHIEVEMENTS } from '../utils/achievements';
import { getMasteryLevel } from '../utils/progression';

const MasteryDots = ({ level }) => (
  <div style={{ display: 'flex', gap: '3px' }}>
    {[1,2,3,4,5].map(i => (
      <div key={i} style={{
        width: '8px', height: '8px', borderRadius: '50%',
        background: i <= level.level ? level.color : 'rgba(255,255,255,0.1)',
        boxShadow: i <= level.level ? `0 0 4px ${level.color}` : 'none',
      }} />
    ))}
  </div>
);

const ProfileStats = ({ stats, mastery, achievements, currentPlayer, onBack }) => {
  const jutsuCounts = stats.jutsuCounts || {};
  const mostUsedEntry = Object.entries(jutsuCounts).sort(([,a],[,b]) => b - a)[0];
  const mostUsedJutsu = mostUsedEntry ? JUTSUS[mostUsedEntry[0]] : null;
  const mostUsedCount = mostUsedEntry ? mostUsedEntry[1] : 0;
  const winRate = stats.wins + stats.losses > 0
    ? Math.round((stats.wins / (stats.wins + stats.losses)) * 100)
    : 0;

  return (
    <div className="recal-overlay" style={{ zIndex: 200 }}>
      <div className="glass-panel" style={{
        maxWidth: '680px', width: '100%', maxHeight: '88vh',
        display: 'flex', flexDirection: 'column', gap: 0,
        overflowY: 'auto', borderRadius: '1.5rem',
      }}>
        {/* Header */}
        <div style={{ padding: '1.5rem 2rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-title)', fontSize: '1.8rem', color: 'var(--naruto-orange)' }}>
                Profilo Shinobi
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                {currentPlayer?.name || 'Ninja Anonimo'}
              </div>
            </div>
            <button className="ninja-btn" onClick={onBack} style={{ padding: '0.5rem 1rem' }}>
              ← Indietro
            </button>
          </div>
        </div>

        <div style={{ padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Stats overview */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
            {[
              { label: 'Jutsu Eseguiti', value: stats.totalJutsus || 0, color: 'var(--naruto-orange)' },
              { label: 'Vittorie',        value: stats.wins || 0,        color: '#22c55e' },
              { label: 'Sconfitte',       value: stats.losses || 0,      color: '#ef4444' },
              { label: 'Win Rate',        value: `${winRate}%`,          color: '#38bdf8' },
            ].map(s => (
              <div key={s.label} style={{
                background: 'rgba(255,255,255,0.04)', borderRadius: '0.75rem',
                border: '1px solid rgba(255,255,255,0.08)', padding: '0.85rem',
                textAlign: 'center',
              }}>
                <div style={{ fontFamily: 'var(--font-title)', fontSize: '1.6rem', color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.2rem' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Most used + fastest */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.08)', padding: '0.85rem' }}>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>Jutsu Preferito</div>
              {mostUsedJutsu ? (
                <>
                  <div style={{ fontFamily: 'var(--font-title)', fontSize: '1rem', color: mostUsedJutsu.color }}>{mostUsedJutsu.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>eseguito {mostUsedCount}×</div>
                </>
              ) : <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>—</div>}
            </div>
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.08)', padding: '0.85rem' }}>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>Esecuzione Più Veloce</div>
              {stats.fastestJutsu ? (
                <>
                  <div style={{ fontFamily: 'var(--font-title)', fontSize: '1rem', color: '#fbbf24' }}>{stats.fastestJutsu.seconds.toFixed(1)}s</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{JUTSUS[stats.fastestJutsu.jutsuId]?.name || stats.fastestJutsu.jutsuId}</div>
                </>
              ) : <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>—</div>}
            </div>
          </div>

          {/* Mastery table */}
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.75rem' }}>
              Maestria Jutsu
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {Object.values(JUTSUS).map(jutsu => {
                const count = mastery[jutsu.id] || 0;
                const ml = getMasteryLevel(count);
                return (
                  <div key={jutsu.id} style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.5rem 0.75rem', borderRadius: '0.5rem',
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <div style={{ flex: 1, fontFamily: 'var(--font-title)', fontSize: '0.9rem', color: jutsu.color }}>{jutsu.name}</div>
                    <div style={{ fontSize: '0.7rem', color: ml.color, minWidth: '60px', textAlign: 'right' }}>{ml.label}</div>
                    <MasteryDots level={ml} />
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', minWidth: '28px', textAlign: 'right' }}>{count}×</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Achievements */}
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.75rem' }}>
              Obiettivi — {achievements.length}/{ACHIEVEMENTS.length}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
              {ACHIEVEMENTS.map(ach => {
                const unlocked = achievements.includes(ach.id);
                return (
                  <div key={ach.id} style={{
                    display: 'flex', alignItems: 'center', gap: '0.6rem',
                    padding: '0.6rem 0.75rem', borderRadius: '0.6rem',
                    background: unlocked ? 'rgba(249,115,22,0.08)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${unlocked ? 'rgba(249,115,22,0.3)' : 'rgba(255,255,255,0.06)'}`,
                    opacity: unlocked ? 1 : 0.45,
                  }}>
                    <span style={{ fontSize: '1.2rem' }}>{ach.icon}</span>
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: unlocked ? '#fff' : 'var(--text-muted)' }}>{ach.name}</div>
                      <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{ach.desc}</div>
                    </div>
                    {unlocked && <div style={{ marginLeft: 'auto', color: '#22c55e', fontSize: '0.9rem' }}>✓</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileStats;

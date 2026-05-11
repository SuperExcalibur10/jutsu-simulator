import { useRef, useEffect, useState } from 'react';
import { useHandTracking } from '../hooks/useHandTracking';

const WebcamView = ({ onResults, currentSong }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const requestRef = useRef(null);
  
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  const { isLoaded, error, detectHands } = useHandTracking(videoRef);

  const toggleRecording = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        // Stop all tracks of the captured stream
        if (mediaRecorderRef.current.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
      }
      setIsRecording(false);
    } else {
      try {
        // Use getDisplayMedia to capture everything (webcam + effects + UI)
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { displaySurface: 'browser' },
          audio: true // Optional: captures jutsu sounds
        });

        recordedChunksRef.current = [];
        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'video/webm' });
        
        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };

        mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          a.download = `jutsu-record-${new Date().getTime()}.webm`;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
          }, 100);
          
          // Ensure tracks are stopped if recorder was stopped programmatically
          stream.getTracks().forEach(track => track.stop());
          setIsRecording(false);
        };

        // Handle case where user clicks "Stop sharing" in the browser UI
        stream.getVideoTracks()[0].onended = () => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
          }
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
      } catch (e) {
        console.error("Error starting Screen Capture:", e);
        alert("Per registrare gli effetti è necessario autorizzare la cattura della scheda/schermo.");
      }
    }
  };

  // Ottieni la lista delle telecamere disponibili
  useEffect(() => {
    const getDevices = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { frameRate: { ideal: 120, max: 120 } } 
        });
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = allDevices.filter(d => d.kind === 'videoinput');
        
        setDevices(videoDevices);
        
        if (videoDevices.length > 0) {
          setSelectedDeviceId(videoDevices[0].deviceId);
        }

        stream.getTracks().forEach(track => track.stop());
      } catch (err) {
        console.error("Errore nell'ottenere i dispositivi:", err);
      }
    };
    getDevices();
  }, []);

  // Avvia la telecamera specifica selezionata
  useEffect(() => {
    if (!selectedDeviceId) return;

    let stream = null;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            deviceId: { exact: selectedDeviceId },
            frameRate: { ideal: 120, max: 120 }
          }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          window.currentVideoElement = videoRef.current; // expose for clone effect
        }
      } catch (err) {
        console.error("Error accessing webcam:", err);
      }
    };
    
    startCamera();
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      window.currentVideoElement = null;
    };
  }, [selectedDeviceId]);

  // Loop di tracking (MediaPipe)
  useEffect(() => {
    if (!isLoaded || !videoRef.current) return;

    let lastVideoTime = -1;
    
    const renderLoop = () => {
      // Ottimizzazione: eseguiamo il tracciamento solo se il frame video è cambiato
      if (videoRef.current && videoRef.current.currentTime !== lastVideoTime) {
        lastVideoTime = videoRef.current.currentTime;
        
        const results = detectHands(performance.now());
        
        if (canvasRef.current) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d', { 
            alpha: true, 
            desynchronized: true // Suggerimento al browser per ridurre la latenza
          });
          
          if (canvas.width !== videoRef.current.videoWidth) {
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
          }
          
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          if (results && results.landmarks && results.landmarks.length > 0) {
            ctx.fillStyle = '#3b82f6';
            
            // Disegniamo i punti in un unico batch
            ctx.beginPath();
            for (const landmarks of results.landmarks) {
              for (const point of landmarks) {
                const x = point.x * canvas.width;
                const y = point.y * canvas.height;
                ctx.moveTo(x + 3, y);
                ctx.arc(x, y, 3, 0, 2 * Math.PI);
              }
            }
            ctx.fill();
            
            if (onResults) onResults(results);
          } else {
            if (onResults) onResults(null);
          }
        }
      }
      requestRef.current = requestAnimationFrame(renderLoop);
    };
    
    // Avviamo il loop
    requestRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isLoaded, detectHands, onResults]);

  if (error) {
    return <div className="text-red-500">Error loading MediaPipe: {error.message}</div>;
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      
      {/* Selector Videocamera */}
      {devices.length > 1 && (
        <div style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.5)', zIndex: 20, position: 'absolute', top: '10px', right: '10px', borderRadius: '0.5rem' }}>
          <select 
            style={{ background: '#333', color: 'white', padding: '0.5rem', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}
            value={selectedDeviceId} 
            onChange={(e) => setSelectedDeviceId(e.target.value)}
          >
            {devices.map((device, i) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Telecamera ${i + 1}`}
              </option>
            ))}
          </select>
        </div>
      )}

      <div style={{ position: 'relative', flex: 1, overflow: 'hidden', borderRadius: '1.5rem', border: '1px solid var(--panel-border)' }}>
        {isRecording && (
          <div className="rec-indicator">
            <div className="rec-dot"></div>
            <span className="rec-text">REC</span>
          </div>
        )}

        <div className="rec-btn-container">
          <button className={`rec-btn ${isRecording ? 'recording' : ''}`} onClick={toggleRecording}>
            {isRecording ? '⏹ Ferma Registrazione' : '🔴 Registra Jutsu'}
          </button>

          {/* Music Player Widget (Now stacked under record button) */}
          {currentSong && (
            <div className="music-player-widget">
              <div className="music-icon">
                <div className="music-bar" />
                <div className="music-bar" />
                <div className="music-bar" />
              </div>
              <div className="music-text">
                NOW PLAYING <span className="music-title">{currentSong.title}</span>
              </div>
            </div>
          )}
        </div>

        {!isLoaded && (
          <div className="absolute-fill flex-center glass-panel" style={{ zIndex: 10 }}>
            <h2 className="title-glow" style={{ animation: 'pulse-glow 1.5s infinite' }}>Caricamento Chakra...</h2>
          </div>
        )}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)', // Specchia l'immagine
          }}
        />
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)', // Specchia l'immagine
            zIndex: 5,
          }}
        />
      </div>
    </div>
  );
};

export default WebcamView;

import React, { useRef, useEffect, useState } from 'react';
import { useHandTracking } from '../hooks/useHandTracking';

const WebcamView = ({ onResults }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const requestRef = useRef(null);
  
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');

  const { isLoaded, error, detectHands } = useHandTracking(videoRef);

  // Ottieni la lista delle telecamere disponibili
  useEffect(() => {
    const getDevices = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
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
          video: { deviceId: { exact: selectedDeviceId } }
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
    
    const renderLoop = (time) => {
      // Ottimizzazione: eseguiamo il tracciamento solo se il frame video è cambiato
      if (videoRef.current && videoRef.current.currentTime !== lastVideoTime) {
        lastVideoTime = videoRef.current.currentTime;
        
        const results = detectHands(performance.now());
        
        if (canvasRef.current) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d', { alpha: true }); // Ottimizzazione context
          
          if (canvas.width !== videoRef.current.videoWidth) {
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
          }
          
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          if (results && results.landmarks && results.landmarks.length > 0) {
            ctx.fillStyle = '#3b82f6';
            // Ottimizzazione: disegniamo solo i punti principali se necessario, 
            // ma per ora manteniamo tutti con un loop più veloce
            for (const landmarks of results.landmarks) {
              for (const point of landmarks) {
                ctx.beginPath();
                ctx.arc(point.x * canvas.width, point.y * canvas.height, 3, 0, 2 * Math.PI);
                ctx.fill();
              }
            }
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

import { useEffect, useRef, useState, useCallback } from 'react';
import './App.css';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [pulsePhase, setPulsePhase] = useState(0);
  const [scanlineOffset, setScanlineOffset] = useState(0);
  const [glitchActive, setGlitchActive] = useState(false);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; size: number; opacity: number; speed: number; angle: number }>>([]);
  const particleIdRef = useRef(0);
  const animFrameRef = useRef<number>(0);
  const [huePhase, setHuePhase] = useState(0);

  // Initialize audio context on first interaction
  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    return audioCtxRef.current;
  }, []);

  // Play a sci-fi beep sound
  const playBeep = useCallback((freq: number, duration: number, type: OscillatorType = 'square') => {
    const ctx = initAudio();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }, [initAudio]);

  // Play hover sound
  const playHoverSound = useCallback(() => {
    playBeep(880, 0.08, 'sine');
  }, [playBeep]);

  // Play click/download sound
  const playClickSound = useCallback(() => {
    const ctx = initAudio();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  }, [initAudio]);

  // Play download complete sound
  const playCompleteSound = useCallback(() => {
    const ctx = initAudio();
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);
      gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.1);
      osc.stop(ctx.currentTime + i * 0.1 + 0.2);
    });
  }, [initAudio]);

  // Spawn particles
  const spawnParticles = useCallback((count: number, centerX: number, centerY: number) => {
    const newParticles: Array<{ id: number; x: number; y: number; size: number; opacity: number; speed: number; angle: number }> = [];
    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: particleIdRef.current++,
        x: centerX,
        y: centerY,
        size: Math.random() * 4 + 1,
        opacity: 1,
        speed: Math.random() * 3 + 1,
        angle: Math.random() * Math.PI * 2,
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
  }, []);

  // Handle download
  const handleDownload = useCallback(() => {
    playClickSound();
    setIsPressed(true);
    setGlitchActive(true);
    setTimeout(() => setGlitchActive(false), 300);
    setTimeout(() => setIsPressed(false), 200);

    // Create a temporary link to download from public/download/
    const link = document.createElement('a');
    link.href = '/download/Cloudc4.exe';
    link.download = 'Cloudc4.exe';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    playCompleteSound();
  }, [playClickSound, playCompleteSound]);

  // Canvas background animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;
    const gridSize = 40;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      time += 0.016;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw grid
      ctx.strokeStyle = 'rgba(57, 255, 20, 0.08)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw animated nodes at intersections
      for (let x = 0; x < canvas.width; x += gridSize) {
        for (let y = 0; y < canvas.height; y += gridSize) {
          const dist = Math.sqrt(
            Math.pow(x - canvas.width / 2, 2) + Math.pow(y - canvas.height / 2, 2)
          );
          const wave = Math.sin(dist * 0.01 - time * 3) * 0.5 + 0.5;
          const size = wave * 3;
          if (size > 0.5) {
            ctx.fillStyle = `rgba(57, 255, 20, ${wave * 0.4})`;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Draw hexagon rings
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      for (let ring = 1; ring <= 5; ring++) {
        const radius = ring * 60 + Math.sin(time * 2 + ring) * 10;
        const alpha = 0.15 - ring * 0.02;
        ctx.strokeStyle = `rgba(57, 255, 20, ${alpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i <= 6; i++) {
          const angle = (i / 6) * Math.PI * 2 + time * 0.3 * (ring % 2 === 0 ? 1 : -1);
          const px = centerX + Math.cos(angle) * radius;
          const py = centerY + Math.sin(angle) * radius;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }

      // Draw data streams
      for (let i = 0; i < 8; i++) {
        const streamX = (canvas.width / 8) * i + Math.sin(time + i) * 50;
        const streamY = ((time * 100 + i * 200) % (canvas.height + 200)) - 100;
        const length = 80 + Math.sin(time * 2 + i) * 40;
        const gradient = ctx.createLinearGradient(streamX, streamY, streamX, streamY + length);
        gradient.addColorStop(0, 'rgba(57, 255, 20, 0)');
        gradient.addColorStop(0.5, 'rgba(57, 255, 20, 0.3)');
        gradient.addColorStop(1, 'rgba(57, 255, 20, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(streamX - 1, streamY, 2, length);
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Pulse animation
  useEffect(() => {
    const interval = setInterval(() => {
      setPulsePhase(p => (p + 1) % 360);
    }, 16);
    return () => clearInterval(interval);
  }, []);

  // Scanline animation
  useEffect(() => {
    const interval = setInterval(() => {
      setScanlineOffset(p => (p + 2) % window.innerHeight);
    }, 16);
    return () => clearInterval(interval);
  }, []);

  // Hue shift animation for C4
  useEffect(() => {
    const interval = setInterval(() => {
      setHuePhase(p => (p + 0.3) % 360);
    }, 16);
    return () => clearInterval(interval);
  }, []);

  // Particle animation
  useEffect(() => {
    const interval = setInterval(() => {
      setParticles(prev =>
        prev
          .map(p => ({
            ...p,
            x: p.x + Math.cos(p.angle) * p.speed,
            y: p.y + Math.sin(p.angle) * p.speed,
            opacity: p.opacity - 0.02,
            speed: p.speed * 0.98,
          }))
          .filter(p => p.opacity > 0)
      );
    }, 16);
    return () => clearInterval(interval);
  }, []);

  const pulseScale = 1 + Math.sin(pulsePhase * 0.05) * 0.05;
  const glowIntensity = 0.5 + Math.sin(pulsePhase * 0.05) * 0.3;

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      {/* Canvas background */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Scanlines overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(to bottom, transparent 50%, rgba(0, 0, 0, 0.3) 50%)`,
          backgroundSize: '100% 4px',
          opacity: 0.3,
        }}
      />

      {/* Moving scanline */}
      <div
        className="absolute left-0 right-0 h-1 pointer-events-none"
        style={{
          top: scanlineOffset,
          background: 'linear-gradient(to right, transparent, rgba(57, 255, 20, 0.4), transparent)',
          boxShadow: '0 0 20px rgba(57, 255, 20, 0.3)',
        }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, transparent 50%, rgba(0, 0, 0, 0.8) 100%)',
        }}
      />

      {/* Glitch overlay */}
      {glitchActive && (
        <div className="absolute inset-0 pointer-events-none animate-glitch" style={{ background: 'rgba(57, 255, 20, 0.1)' }} />
      )}

      {/* Particles */}
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            backgroundColor: `rgba(57, 255, 20, ${p.opacity})`,
            boxShadow: `0 0 ${p.size * 2}px rgba(57, 255, 20, ${p.opacity * 0.5})`,
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
        {/* Rotating rings */}
        <div className="absolute w-96 h-96 animate-spin-slow">
          <div className="absolute inset-0 border-2 border-dashed border-green-400/20 rounded-full" />
        </div>
        <div className="absolute w-80 h-80 animate-spin-reverse">
          <div className="absolute inset-0 border border-green-400/15 rounded-full" />
        </div>
        <div className="absolute w-64 h-64 animate-pulse-ring">
          <div className="absolute inset-0 border-2 border-green-400/10 rounded-full" />
        </div>

        {/* Title */}
        <h1
          className="text-6xl md:text-8xl font-black tracking-widest mb-12 select-none"
          style={{
            fontFamily: "'Courier New', monospace",
            letterSpacing: '0.3em',
          }}
        >
          <span
            style={{
              color: '#39ff14',
              textShadow: `
                0 0 10px rgba(57, 255, 20, ${glowIntensity}),
                0 0 40px rgba(57, 255, 20, ${glowIntensity * 0.5}),
                0 0 80px rgba(57, 255, 20, ${glowIntensity * 0.3})
              `,
            }}
          >
            CLOUD
          </span>
          <span
            style={{
              color: `hsl(${huePhase}, 100%, 50%)`,
              textShadow: `
                0 0 10px hsla(${huePhase}, 100%, 50%, ${glowIntensity}),
                0 0 40px hsla(${huePhase}, 100%, 50%, ${glowIntensity * 0.5}),
                0 0 80px hsla(${huePhase}, 100%, 50%, ${glowIntensity * 0.3})
              `,
              transition: 'color 0.1s linear',
            }}
          >
            C4
          </span>
        </h1>

        {/* Download Button */}
        <button
          onClick={handleDownload}
          onMouseEnter={() => {
            setIsHovering(true);
            playHoverSound();
            spawnParticles(20, window.innerWidth / 2, window.innerHeight / 2 + 40);
          }}
          onMouseLeave={() => setIsHovering(false)}
          className="relative px-16 py-6 text-2xl font-bold tracking-widest uppercase transition-all duration-150 select-none"
          style={{
            backgroundColor: isPressed ? '#39ff14' : 'transparent',
            color: isPressed ? '#000' : '#39ff14',
            border: '3px solid #39ff14',
            borderRadius: '4px',
            transform: `scale(${isPressed ? 0.95 : pulseScale})`,
            boxShadow: isHovering
              ? `0 0 20px rgba(57, 255, 20, 0.6), 0 0 60px rgba(57, 255, 20, 0.3), inset 0 0 20px rgba(57, 255, 20, 0.1)`
              : `0 0 10px rgba(57, 255, 20, 0.3)`,
            textShadow: isHovering ? '0 0 10px rgba(57, 255, 20, 0.8)' : 'none',
            fontFamily: "'Courier New', monospace",
            cursor: 'pointer',
          }}
        >
          {/* Corner decorations */}
          <span className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-green-400 -mt-1 -ml-1" />
          <span className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-green-400 -mt-1 -mr-1" />
          <span className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-green-400 -mb-1 -ml-1" />
          <span className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-green-400 -mb-1 -mr-1" />

          {/* Inner scan line */}
          {isHovering && (
            <span className="absolute inset-0 overflow-hidden rounded-sm">
              <span
                className="absolute left-0 right-0 h-px bg-green-400/50"
                style={{
                  animation: 'scanline-vertical 1.5s linear infinite',
                }}
              />
            </span>
          )}

          Download
        </button>

        {/* Status text */}
        <p
          className="mt-8 text-sm tracking-[0.5em] uppercase animate-blink"
          style={{
            color: 'rgba(57, 255, 20, 0.6)',
            fontFamily: "'Courier New', monospace",
          }}
        >
          System Ready
        </p>
      </div>

      {/* Bottom decorative line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-400/30 to-transparent" />

      {/* Side decorative elements */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-2">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="w-1 h-8 rounded-full animate-pulse"
            style={{
              backgroundColor: 'rgba(57, 255, 20, 0.3)',
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="w-1 h-8 rounded-full animate-pulse"
            style={{
              backgroundColor: 'rgba(57, 255, 20, 0.3)',
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default App;

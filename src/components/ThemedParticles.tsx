import React, { useEffect, useRef, useMemo, memo } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
}

// Cores de partículas por tema
const getThemeParticleColors = (themeId: string): string[] => {
  switch (themeId) {
    case 'fire':
      return ['#f97316', '#ef4444', '#fbbf24', '#f59e0b'];
    case 'ocean':
      return ['#06b6d4', '#3b82f6', '#0ea5e9', '#14b8a6'];
    case 'forest':
      return ['#22c55e', '#10b981', '#84cc16', '#16a34a'];
    case 'lightning':
      return ['#facc15', '#f59e0b', '#fde047', '#eab308'];
    case 'galaxy':
      return ['#a855f7', '#8b5cf6', '#d946ef', '#c084fc'];
    case 'iron':
      return ['#94a3b8', '#64748b', '#475569', '#a1a1aa'];
    case 'blood':
      return ['#dc2626', '#b91c1c', '#ef4444', '#f87171'];
    case 'neon':
      return ['#ec4899', '#22d3ee', '#c026d3', '#f472b6'];
    case 'gold':
      return ['#eab308', '#f59e0b', '#fbbf24', '#d97706'];
    case 'amoled':
      return ['#6b7280', '#4b5563', '#374151', '#9ca3af'];
    default:
      return ['#f97316', '#ef4444', '#fbbf24', '#f59e0b'];
  }
};

interface ThemedParticlesProps {
  particleCount?: number;
  className?: string;
}

const ThemedParticles: React.FC<ThemedParticlesProps> = memo(({ 
  particleCount = 20, // Reduced default count for performance
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const particlesRef = useRef<Particle[]>([]);
  const lastFrameTimeRef = useRef<number>(0);
  const { themeConfig } = useTheme();
  
  const colors = useMemo(() => getThemeParticleColors(themeConfig.id), [themeConfig.id]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Use device pixel ratio for sharp rendering but cap at 2 for performance
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    
    // Debounced resize handler
    let resizeTimeout: number;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(resizeCanvas, 100);
    };
    window.addEventListener('resize', handleResize);

    // Inicializar partículas
    const initParticles = () => {
      particlesRef.current = [];
      const rect = canvas.getBoundingClientRect();
      for (let i = 0; i < particleCount; i++) {
        particlesRef.current.push({
          x: Math.random() * rect.width,
          y: Math.random() * rect.height,
          vx: (Math.random() - 0.5) * 0.3, // Slower movement
          vy: (Math.random() - 0.5) * 0.3,
          size: Math.random() * 2 + 1,
          opacity: Math.random() * 0.4 + 0.15,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
    };

    initParticles();

    // Atualizar cores quando o tema mudar
    particlesRef.current.forEach(p => {
      p.color = colors[Math.floor(Math.random() * colors.length)];
    });

    // Target 30fps for performance (33ms per frame)
    const targetFPS = 30;
    const frameInterval = 1000 / targetFPS;

    const animate = (timestamp: number) => {
      // Throttle to target FPS
      const elapsed = timestamp - lastFrameTimeRef.current;
      if (elapsed < frameInterval) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }
      lastFrameTimeRef.current = timestamp - (elapsed % frameInterval);

      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      // Disable shadow for performance - use simple circles
      ctx.shadowBlur = 0;

      particlesRef.current.forEach((particle) => {
        // Atualizar posição
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Wrap around edges
        if (particle.x < 0) particle.x = rect.width;
        if (particle.x > rect.width) particle.x = 0;
        if (particle.y < 0) particle.y = rect.height;
        if (particle.y > rect.height) particle.y = 0;

        // Desenhar partícula simples (sem glow para performance)
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = particle.opacity;
        ctx.fill();
      });

      // Desenhar conexões - otimizado com grid spatial hash
      ctx.globalAlpha = 0.08;
      ctx.lineWidth = 0.5;
      const connectionDistance = 80; // Reduced distance
      
      for (let i = 0; i < particlesRef.current.length; i++) {
        const p1 = particlesRef.current[i];
        for (let j = i + 1; j < particlesRef.current.length; j++) {
          const p2 = particlesRef.current[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          
          // Quick distance check before sqrt
          if (Math.abs(dx) < connectionDistance && Math.abs(dy) < connectionDistance) {
            const distSq = dx * dx + dy * dy;
            if (distSq < connectionDistance * connectionDistance) {
              ctx.beginPath();
              ctx.strokeStyle = p1.color;
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.stroke();
            }
          }
        }
      }
      ctx.globalAlpha = 1;

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [particleCount, colors]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{ width: '100%', height: '100%' }}
    />
  );
});

ThemedParticles.displayName = 'ThemedParticles';

export default ThemedParticles;

import React, { useEffect, useRef, useMemo } from 'react';
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

const ThemedParticles: React.FC<ThemedParticlesProps> = ({ 
  particleCount = 30,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const particlesRef = useRef<Particle[]>([]);
  const { themeConfig } = useTheme();
  
  const colors = useMemo(() => getThemeParticleColors(themeConfig.id), [themeConfig.id]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Inicializar partículas
    const initParticles = () => {
      particlesRef.current = [];
      for (let i = 0; i < particleCount; i++) {
        particlesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          size: Math.random() * 3 + 1,
          opacity: Math.random() * 0.5 + 0.2,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
    };

    initParticles();

    // Atualizar cores quando o tema mudar
    particlesRef.current.forEach(p => {
      p.color = colors[Math.floor(Math.random() * colors.length)];
    });

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((particle) => {
        // Atualizar posição
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Wrap around edges
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;

        // Desenhar partícula com glow
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = particle.opacity;
        ctx.shadowColor = particle.color;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      });

      // Desenhar conexões entre partículas próximas
      ctx.globalAlpha = 0.1;
      for (let i = 0; i < particlesRef.current.length; i++) {
        for (let j = i + 1; j < particlesRef.current.length; j++) {
          const dx = particlesRef.current[i].x - particlesRef.current[j].x;
          const dy = particlesRef.current[i].y - particlesRef.current[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 100) {
            ctx.beginPath();
            ctx.strokeStyle = particlesRef.current[i].color;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particlesRef.current[i].x, particlesRef.current[i].y);
            ctx.lineTo(particlesRef.current[j].x, particlesRef.current[j].y);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
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
};

export default ThemedParticles;

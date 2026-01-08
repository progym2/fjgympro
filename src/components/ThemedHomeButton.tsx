import React, { memo, useMemo, useCallback, useState, useRef } from 'react';
import { LucideIcon, Dumbbell, User, Shield, Heart, Flame, Waves, TreePine, Zap, Sparkles, Trophy, Target, Activity, Crown, Hexagon, Circle, Square, Star, Octagon } from 'lucide-react';
import { useTheme, SportTheme } from '@/contexts/ThemeContext';
import { useAudio } from '@/contexts/AudioContext';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface ThemedHomeButtonProps {
  onClick: () => void;
  icon: LucideIcon;
  label: string;
  color?: 'primary' | 'secondary' | 'accent';
  disabled?: boolean;
}

interface RippleType {
  id: number;
  x: number;
  y: number;
}

// ==================== FIRE THEME - Hexagonal Flame Style ====================
const FireButton: React.FC<ThemedHomeButtonProps & { colors: any; isHovered: boolean; isPressed: boolean; ripples: RippleType[]; hoverEffectsEnabled: boolean }> = memo(({
  icon: Icon, colors, isHovered, ripples, hoverEffectsEnabled
}) => (
  <motion.div 
    className={cn(
      'relative flex items-center justify-center overflow-hidden',
      'w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20'
    )}
    style={{
      clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
      background: `linear-gradient(135deg, #ff6b35, #dc2626)`,
      boxShadow: isHovered 
        ? `0 0 40px 10px rgba(255,107,53,0.6)` 
        : `0 0 20px 5px rgba(255,107,53,0.3)`,
    }}
  >
    {/* Fire pattern */}
    <div className="absolute inset-0 opacity-30">
      <motion.div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-16"
        animate={{ scaleY: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 0.5, repeat: Infinity }}
        style={{
          background: 'radial-gradient(ellipse at bottom, #fbbf24, transparent)',
          borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%'
        }}
      />
    </div>
    
    {/* Inner hexagon */}
    <div 
      className="absolute inset-2 bg-black/20"
      style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
    />
    
    {/* Flame icon decorations */}
    <motion.div
      className="absolute top-1 left-1/2 -translate-x-1/2"
      animate={{ y: [0, -2, 0], opacity: [0.4, 0.8, 0.4] }}
      transition={{ duration: 1, repeat: Infinity }}
    >
      <Flame className="w-3 h-3 text-yellow-400" />
    </motion.div>
    
    <AnimatePresence>
      {ripples.map(ripple => (
        <motion.span
          key={ripple.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: ripple.x, top: ripple.y,
            backgroundColor: 'rgba(255,200,100,0.5)',
            transform: 'translate(-50%, -50%)',
          }}
          initial={{ width: 0, height: 0, opacity: 0.7 }}
          animate={{ width: 100, height: 100, opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        />
      ))}
    </AnimatePresence>
    
    <motion.div
      animate={isHovered && hoverEffectsEnabled ? { scale: 1.2, rotate: [0, -5, 5, 0] } : { scale: 1 }}
      className="relative z-10"
    >
      <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-white drop-shadow-lg" strokeWidth={2.5} />
    </motion.div>
  </motion.div>
));

FireButton.displayName = 'FireButton';

// ==================== OCEAN THEME - Wave Circular Style ====================
const OceanButton: React.FC<ThemedHomeButtonProps & { colors: any; isHovered: boolean; isPressed: boolean; ripples: RippleType[]; hoverEffectsEnabled: boolean }> = memo(({
  icon: Icon, colors, isHovered, ripples, hoverEffectsEnabled
}) => (
  <motion.div 
    className={cn(
      'relative flex items-center justify-center overflow-hidden rounded-full',
      'w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20',
      'border-4 border-cyan-400/50'
    )}
    style={{
      background: `linear-gradient(180deg, #0891b2, #0e7490, #164e63)`,
      boxShadow: isHovered 
        ? `0 0 30px 8px rgba(34,211,238,0.5), inset 0 -10px 20px rgba(0,0,0,0.3)` 
        : `0 0 15px 3px rgba(34,211,238,0.3), inset 0 -8px 15px rgba(0,0,0,0.2)`,
    }}
  >
    {/* Wave animation */}
    <motion.div
      className="absolute bottom-0 left-0 right-0 h-1/2 opacity-40"
      animate={{ y: [0, -5, 0] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      style={{
        background: 'linear-gradient(to top, rgba(34,211,238,0.6), transparent)',
        borderRadius: '50% 50% 0 0'
      }}
    />
    
    {/* Bubble decorations */}
    {[...Array(3)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute w-2 h-2 bg-white/30 rounded-full"
        style={{ left: `${20 + i * 25}%`, bottom: '20%' }}
        animate={{ y: [0, -20, 0], opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
      />
    ))}
    
    <AnimatePresence>
      {ripples.map(ripple => (
        <motion.span
          key={ripple.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: ripple.x, top: ripple.y,
            backgroundColor: 'rgba(34,211,238,0.5)',
            transform: 'translate(-50%, -50%)',
          }}
          initial={{ width: 0, height: 0, opacity: 0.7 }}
          animate={{ width: 100, height: 100, opacity: 0 }}
          transition={{ duration: 0.5 }}
        />
      ))}
    </AnimatePresence>
    
    <motion.div
      animate={isHovered && hoverEffectsEnabled ? { scale: 1.15, y: -3 } : { scale: 1, y: 0 }}
      className="relative z-10"
    >
      <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-white drop-shadow-lg" strokeWidth={2} />
    </motion.div>
  </motion.div>
));

OceanButton.displayName = 'OceanButton';

// ==================== FOREST THEME - Organic Leaf Shape ====================
const ForestButton: React.FC<ThemedHomeButtonProps & { colors: any; isHovered: boolean; isPressed: boolean; ripples: RippleType[]; hoverEffectsEnabled: boolean }> = memo(({
  icon: Icon, colors, isHovered, ripples, hoverEffectsEnabled
}) => (
  <motion.div 
    className={cn(
      'relative flex items-center justify-center overflow-hidden',
      'w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20'
    )}
    style={{
      clipPath: 'polygon(50% 0%, 90% 20%, 100% 60%, 75% 100%, 25% 100%, 0% 60%, 10% 20%)',
      background: `linear-gradient(160deg, #34d399, #10b981, #047857)`,
      boxShadow: isHovered 
        ? `0 0 35px 10px rgba(52,211,153,0.5)` 
        : `0 0 18px 4px rgba(52,211,153,0.3)`,
    }}
  >
    {/* Leaf vein pattern */}
    <div className="absolute inset-0 opacity-20">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-3/4 bg-white/40" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-1/2 h-0.5 bg-white/30 rotate-12" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-1/2 h-0.5 bg-white/30 -rotate-12" />
    </div>
    
    {/* Tree decoration */}
    <motion.div
      className="absolute bottom-1 left-1/2 -translate-x-1/2"
      animate={{ scale: [1, 1.1, 1] }}
      transition={{ duration: 2, repeat: Infinity }}
    >
      <TreePine className="w-3 h-3 text-emerald-200/50" />
    </motion.div>
    
    <AnimatePresence>
      {ripples.map(ripple => (
        <motion.span
          key={ripple.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: ripple.x, top: ripple.y,
            backgroundColor: 'rgba(163,230,53,0.5)',
            transform: 'translate(-50%, -50%)',
          }}
          initial={{ width: 0, height: 0, opacity: 0.7 }}
          animate={{ width: 100, height: 100, opacity: 0 }}
          transition={{ duration: 0.5 }}
        />
      ))}
    </AnimatePresence>
    
    <motion.div
      animate={isHovered && hoverEffectsEnabled ? { scale: 1.2, rotate: 5 } : { scale: 1, rotate: 0 }}
      className="relative z-10"
    >
      <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-white drop-shadow-lg" strokeWidth={2.2} />
    </motion.div>
  </motion.div>
));

ForestButton.displayName = 'ForestButton';

// ==================== LIGHTNING THEME - Electric Bolt Shape ====================
const LightningButton: React.FC<ThemedHomeButtonProps & { colors: any; isHovered: boolean; isPressed: boolean; ripples: RippleType[]; hoverEffectsEnabled: boolean }> = memo(({
  icon: Icon, colors, isHovered, ripples, hoverEffectsEnabled
}) => (
  <motion.div 
    className={cn(
      'relative flex items-center justify-center overflow-hidden',
      'w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20'
    )}
    style={{
      clipPath: 'polygon(50% 0%, 100% 38%, 80% 40%, 100% 100%, 40% 60%, 60% 58%, 0% 38%)',
      background: `linear-gradient(135deg, #fbbf24, #f59e0b, #d97706)`,
      boxShadow: isHovered 
        ? `0 0 40px 12px rgba(251,191,36,0.6)` 
        : `0 0 20px 5px rgba(251,191,36,0.3)`,
    }}
    animate={{ 
      filter: isHovered ? 'brightness(1.3)' : 'brightness(1)'
    }}
  >
    {/* Electric sparks */}
    {isHovered && hoverEffectsEnabled && [...Array(4)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute w-1 h-4 bg-white"
        style={{ 
          left: `${20 + i * 20}%`, 
          top: `${30 + (i % 2) * 20}%`,
          rotate: `${-30 + i * 20}deg`
        }}
        animate={{ opacity: [0, 1, 0], scaleY: [0.5, 1, 0.5] }}
        transition={{ duration: 0.2, repeat: Infinity, delay: i * 0.1 }}
      />
    ))}
    
    <motion.div
      className="absolute top-0 right-2"
      animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
      transition={{ duration: 0.3, repeat: Infinity }}
    >
      <Zap className="w-3 h-3 text-white" fill="white" />
    </motion.div>
    
    <AnimatePresence>
      {ripples.map(ripple => (
        <motion.span
          key={ripple.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: ripple.x, top: ripple.y,
            backgroundColor: 'rgba(255,255,255,0.6)',
            transform: 'translate(-50%, -50%)',
          }}
          initial={{ width: 0, height: 0, opacity: 0.8 }}
          animate={{ width: 80, height: 80, opacity: 0 }}
          transition={{ duration: 0.3 }}
        />
      ))}
    </AnimatePresence>
    
    <motion.div
      animate={isHovered && hoverEffectsEnabled ? { scale: 1.25, filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.8))' } : { scale: 1 }}
      className="relative z-10"
    >
      <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-white" strokeWidth={2.5} />
    </motion.div>
  </motion.div>
));

LightningButton.displayName = 'LightningButton';

// ==================== GALAXY THEME - Cosmic Star Shape ====================
const GalaxyButton: React.FC<ThemedHomeButtonProps & { colors: any; isHovered: boolean; isPressed: boolean; ripples: RippleType[]; hoverEffectsEnabled: boolean }> = memo(({
  icon: Icon, colors, isHovered, ripples, hoverEffectsEnabled
}) => (
  <motion.div 
    className={cn(
      'relative flex items-center justify-center overflow-hidden',
      'w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 rounded-xl'
    )}
    style={{
      background: `radial-gradient(ellipse at 30% 30%, #7c3aed, #5b21b6, #1e1b4b)`,
      boxShadow: isHovered 
        ? `0 0 40px 10px rgba(192,132,252,0.5), inset 0 0 20px rgba(192,132,252,0.3)` 
        : `0 0 20px 5px rgba(192,132,252,0.3)`,
    }}
    animate={{ rotate: isHovered ? 5 : 0 }}
  >
    {/* Orbiting stars */}
    <motion.div
      className="absolute inset-0"
      animate={{ rotate: 360 }}
      transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
    >
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1.5 h-1.5 bg-white rounded-full"
          style={{
            left: `${50 + 35 * Math.cos((i * 60 * Math.PI) / 180)}%`,
            top: `${50 + 35 * Math.sin((i * 60 * Math.PI) / 180)}%`,
            transform: 'translate(-50%, -50%)'
          }}
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
        />
      ))}
    </motion.div>
    
    {/* Center glow */}
    <motion.div
      className="absolute inset-4 rounded-full bg-purple-400/20"
      animate={{ scale: [0.8, 1.1, 0.8], opacity: [0.3, 0.6, 0.3] }}
      transition={{ duration: 2, repeat: Infinity }}
    />
    
    <motion.div
      className="absolute -top-1 -right-1"
      animate={{ rotate: 360, scale: [0.8, 1, 0.8] }}
      transition={{ duration: 3, repeat: Infinity }}
    >
      <Sparkles className="w-4 h-4 text-purple-300" />
    </motion.div>
    
    <AnimatePresence>
      {ripples.map(ripple => (
        <motion.span
          key={ripple.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: ripple.x, top: ripple.y,
            backgroundColor: 'rgba(192,132,252,0.5)',
            transform: 'translate(-50%, -50%)',
          }}
          initial={{ width: 0, height: 0, opacity: 0.7 }}
          animate={{ width: 100, height: 100, opacity: 0 }}
          transition={{ duration: 0.5 }}
        />
      ))}
    </AnimatePresence>
    
    <motion.div
      animate={isHovered && hoverEffectsEnabled ? { scale: 1.2 } : { scale: 1 }}
      className="relative z-10"
    >
      <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-white drop-shadow-lg" strokeWidth={2} />
    </motion.div>
  </motion.div>
));

GalaxyButton.displayName = 'GalaxyButton';

// ==================== IRON THEME - Industrial Gear Shape ====================
const IronButton: React.FC<ThemedHomeButtonProps & { colors: any; isHovered: boolean; isPressed: boolean; ripples: RippleType[]; hoverEffectsEnabled: boolean }> = memo(({
  icon: Icon, colors, isHovered, ripples, hoverEffectsEnabled
}) => (
  <motion.div 
    className={cn(
      'relative flex items-center justify-center overflow-hidden',
      'w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20'
    )}
    style={{
      clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
      background: `linear-gradient(145deg, #64748b, #475569, #334155)`,
      boxShadow: isHovered 
        ? `0 8px 25px rgba(0,0,0,0.5), inset 2px 2px 4px rgba(255,255,255,0.2)` 
        : `0 5px 15px rgba(0,0,0,0.4), inset 1px 1px 2px rgba(255,255,255,0.15)`,
    }}
    animate={{ rotate: isHovered ? 45 : 0 }}
    transition={{ duration: 0.3 }}
  >
    {/* Metallic shine */}
    <div 
      className="absolute inset-0 opacity-30"
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 50%, rgba(0,0,0,0.2) 100%)'
      }}
    />
    
    {/* Bolts */}
    {[0, 90, 180, 270].map((angle, i) => (
      <div
        key={i}
        className="absolute w-2 h-2 bg-slate-700 rounded-full border border-slate-500"
        style={{
          left: `${50 + 35 * Math.cos((angle * Math.PI) / 180)}%`,
          top: `${50 + 35 * Math.sin((angle * Math.PI) / 180)}%`,
          transform: 'translate(-50%, -50%)'
        }}
      />
    ))}
    
    {/* Inner circle */}
    <div className="absolute inset-3 rounded-full bg-slate-600/50 border border-slate-500/30" />
    
    <motion.div
      className="absolute bottom-1"
      animate={isHovered ? { opacity: [0.3, 0.7, 0.3] } : { opacity: 0.3 }}
      transition={{ duration: 0.5, repeat: Infinity }}
    >
      <Dumbbell className="w-4 h-2 text-slate-300" />
    </motion.div>
    
    <AnimatePresence>
      {ripples.map(ripple => (
        <motion.span
          key={ripple.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: ripple.x, top: ripple.y,
            backgroundColor: 'rgba(148,163,184,0.4)',
            transform: 'translate(-50%, -50%)',
          }}
          initial={{ width: 0, height: 0, opacity: 0.6 }}
          animate={{ width: 100, height: 100, opacity: 0 }}
          transition={{ duration: 0.5 }}
        />
      ))}
    </AnimatePresence>
    
    <motion.div
      animate={isHovered && hoverEffectsEnabled ? { scale: 1.15, rotate: -45 } : { scale: 1, rotate: 0 }}
      className="relative z-10"
      transition={{ duration: 0.3 }}
    >
      <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-white drop-shadow-md" strokeWidth={2.2} />
    </motion.div>
  </motion.div>
));

IronButton.displayName = 'IronButton';

// ==================== BLOOD THEME - Heart Pulse Shape ====================
const BloodButton: React.FC<ThemedHomeButtonProps & { colors: any; isHovered: boolean; isPressed: boolean; ripples: RippleType[]; hoverEffectsEnabled: boolean }> = memo(({
  icon: Icon, colors, isHovered, ripples, hoverEffectsEnabled
}) => (
  <motion.div 
    className={cn(
      'relative flex items-center justify-center overflow-hidden',
      'w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 rounded-2xl',
      'border-2 border-red-500/50'
    )}
    style={{
      background: `linear-gradient(145deg, #dc2626, #b91c1c, #7f1d1d)`,
      boxShadow: isHovered 
        ? `0 0 35px 10px rgba(239,68,68,0.5)` 
        : `0 0 18px 4px rgba(239,68,68,0.3)`,
    }}
    animate={{ scale: isHovered ? [1, 1.05, 1] : 1 }}
    transition={{ duration: 0.8, repeat: isHovered ? Infinity : 0 }}
  >
    {/* Pulse lines */}
    <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 100 100">
      <motion.path
        d="M0 50 L20 50 L25 30 L30 70 L35 40 L40 60 L45 50 L100 50"
        stroke="white"
        strokeWidth="2"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
    </svg>
    
    {/* Heart decoration */}
    <motion.div
      className="absolute top-1 right-1"
      animate={{ scale: [1, 1.3, 1] }}
      transition={{ duration: 0.8, repeat: Infinity }}
    >
      <Heart className="w-3 h-3 text-red-300" fill="currentColor" />
    </motion.div>
    
    <AnimatePresence>
      {ripples.map(ripple => (
        <motion.span
          key={ripple.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: ripple.x, top: ripple.y,
            backgroundColor: 'rgba(254,202,202,0.5)',
            transform: 'translate(-50%, -50%)',
          }}
          initial={{ width: 0, height: 0, opacity: 0.7 }}
          animate={{ width: 100, height: 100, opacity: 0 }}
          transition={{ duration: 0.5 }}
        />
      ))}
    </AnimatePresence>
    
    <motion.div
      animate={isHovered && hoverEffectsEnabled ? { scale: [1, 1.2, 1.1] } : { scale: 1 }}
      transition={{ duration: 0.3 }}
      className="relative z-10"
    >
      <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-white drop-shadow-lg" strokeWidth={2.2} />
    </motion.div>
  </motion.div>
));

BloodButton.displayName = 'BloodButton';

// ==================== NEON THEME - Cyberpunk Diamond Shape ====================
const NeonButton: React.FC<ThemedHomeButtonProps & { colors: any; isHovered: boolean; isPressed: boolean; ripples: RippleType[]; hoverEffectsEnabled: boolean }> = memo(({
  icon: Icon, colors, isHovered, ripples, hoverEffectsEnabled
}) => (
  <motion.div 
    className={cn(
      'relative flex items-center justify-center overflow-hidden',
      'w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20'
    )}
    style={{
      clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
      background: `linear-gradient(135deg, #ec4899, #d946ef, #8b5cf6)`,
      boxShadow: isHovered 
        ? `0 0 50px 15px rgba(236,72,153,0.6), 0 0 100px 30px rgba(139,92,246,0.3)` 
        : `0 0 25px 8px rgba(236,72,153,0.4)`,
    }}
    animate={{ 
      filter: isHovered ? 'hue-rotate(30deg)' : 'hue-rotate(0deg)'
    }}
    transition={{ duration: 0.5 }}
  >
    {/* Neon glow lines */}
    <div className="absolute inset-1" style={{
      clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
      border: '2px solid rgba(255,255,255,0.5)'
    }} />
    
    {/* Scan line effect */}
    <motion.div
      className="absolute inset-0 bg-gradient-to-b from-transparent via-white/20 to-transparent"
      animate={{ y: ['-100%', '100%'] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
    />
    
    {/* Corner glows */}
    {isHovered && (
      <>
        <motion.div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full"
          animate={{ opacity: [0.5, 1, 0.5], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full"
          animate={{ opacity: [0.5, 1, 0.5], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 0.5, repeat: Infinity, delay: 0.25 }}
        />
      </>
    )}
    
    <AnimatePresence>
      {ripples.map(ripple => (
        <motion.span
          key={ripple.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: ripple.x, top: ripple.y,
            backgroundColor: 'rgba(255,255,255,0.6)',
            transform: 'translate(-50%, -50%)',
          }}
          initial={{ width: 0, height: 0, opacity: 0.8 }}
          animate={{ width: 80, height: 80, opacity: 0 }}
          transition={{ duration: 0.4 }}
        />
      ))}
    </AnimatePresence>
    
    <motion.div
      animate={isHovered && hoverEffectsEnabled ? { scale: 1.2, filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.8))' } : { scale: 1 }}
      className="relative z-10"
    >
      <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-white" strokeWidth={2.5} />
    </motion.div>
  </motion.div>
));

NeonButton.displayName = 'NeonButton';

// ==================== GOLD THEME - Trophy Shield Shape ====================
const GoldButton: React.FC<ThemedHomeButtonProps & { colors: any; isHovered: boolean; isPressed: boolean; ripples: RippleType[]; hoverEffectsEnabled: boolean }> = memo(({
  icon: Icon, colors, isHovered, ripples, hoverEffectsEnabled
}) => (
  <motion.div 
    className={cn(
      'relative flex items-center justify-center overflow-hidden',
      'w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20'
    )}
    style={{
      clipPath: 'polygon(15% 0%, 85% 0%, 100% 15%, 100% 70%, 50% 100%, 0% 70%, 0% 15%)',
      background: `linear-gradient(160deg, #fcd34d, #f59e0b, #b45309)`,
      boxShadow: isHovered 
        ? `0 0 40px 12px rgba(234,179,8,0.5)` 
        : `0 0 20px 6px rgba(234,179,8,0.3)`,
    }}
  >
    {/* Metallic shine */}
    <motion.div
      className="absolute inset-0 opacity-40"
      style={{
        background: 'linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.6) 50%, transparent 70%)'
      }}
      animate={{ x: ['-100%', '100%'] }}
      transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
    />
    
    {/* Crown decoration */}
    <motion.div
      className="absolute top-0 left-1/2 -translate-x-1/2"
      animate={{ y: [0, -2, 0], scale: [1, 1.1, 1] }}
      transition={{ duration: 1.5, repeat: Infinity }}
    >
      <Crown className="w-4 h-3 text-yellow-200" />
    </motion.div>
    
    {/* Inner border */}
    <div 
      className="absolute inset-2"
      style={{
        clipPath: 'polygon(15% 0%, 85% 0%, 100% 15%, 100% 70%, 50% 100%, 0% 70%, 0% 15%)',
        border: '1px solid rgba(255,255,255,0.3)'
      }}
    />
    
    <AnimatePresence>
      {ripples.map(ripple => (
        <motion.span
          key={ripple.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: ripple.x, top: ripple.y,
            backgroundColor: 'rgba(253,224,71,0.5)',
            transform: 'translate(-50%, -50%)',
          }}
          initial={{ width: 0, height: 0, opacity: 0.7 }}
          animate={{ width: 100, height: 100, opacity: 0 }}
          transition={{ duration: 0.5 }}
        />
      ))}
    </AnimatePresence>
    
    <motion.div
      animate={isHovered && hoverEffectsEnabled ? { scale: 1.15, y: 2 } : { scale: 1, y: 0 }}
      className="relative z-10"
    >
      <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-white drop-shadow-lg" strokeWidth={2.2} />
    </motion.div>
  </motion.div>
));

GoldButton.displayName = 'GoldButton';

// ==================== AMOLED THEME - Minimal Arc Shape ====================
const AmoledButton: React.FC<ThemedHomeButtonProps & { colors: any; isHovered: boolean; isPressed: boolean; ripples: RippleType[]; hoverEffectsEnabled: boolean }> = memo(({
  icon: Icon, colors, isHovered, ripples, hoverEffectsEnabled
}) => (
  <motion.div 
    className={cn(
      'relative flex items-center justify-center overflow-hidden',
      'w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 rounded-full',
      'border border-zinc-700/50'
    )}
    style={{
      background: `radial-gradient(circle at 30% 30%, #27272a, #18181b, #000000)`,
      boxShadow: isHovered 
        ? `0 0 30px 5px rgba(113,113,122,0.3), inset 0 0 20px rgba(113,113,122,0.1)` 
        : `0 0 15px 2px rgba(113,113,122,0.15)`,
    }}
  >
    {/* Subtle arc */}
    <svg className="absolute inset-0 w-full h-full">
      <motion.circle
        cx="50%"
        cy="50%"
        r="45%"
        fill="none"
        stroke="rgba(113,113,122,0.3)"
        strokeWidth="1"
        strokeDasharray="10 5"
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        style={{ transformOrigin: 'center' }}
      />
    </svg>
    
    {/* Progress arc */}
    <svg className="absolute inset-0 w-full h-full -rotate-90">
      <motion.circle
        cx="50%"
        cy="50%"
        r="40%"
        fill="none"
        stroke="rgba(161,161,170,0.5)"
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: isHovered ? 1 : 0.7 }}
        transition={{ duration: 0.5 }}
        style={{ 
          strokeDasharray: '251.2',
          strokeDashoffset: '0'
        }}
      />
    </svg>
    
    {/* Center dot */}
    <motion.div
      className="absolute w-1 h-1 bg-zinc-500 rounded-full"
      style={{ bottom: '15%', left: '50%', transform: 'translateX(-50%)' }}
      animate={{ opacity: [0.3, 0.8, 0.3] }}
      transition={{ duration: 2, repeat: Infinity }}
    />
    
    <AnimatePresence>
      {ripples.map(ripple => (
        <motion.span
          key={ripple.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: ripple.x, top: ripple.y,
            backgroundColor: 'rgba(161,161,170,0.3)',
            transform: 'translate(-50%, -50%)',
          }}
          initial={{ width: 0, height: 0, opacity: 0.5 }}
          animate={{ width: 100, height: 100, opacity: 0 }}
          transition={{ duration: 0.6 }}
        />
      ))}
    </AnimatePresence>
    
    <motion.div
      animate={isHovered && hoverEffectsEnabled ? { scale: 1.1 } : { scale: 1 }}
      className="relative z-10"
    >
      <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-zinc-300" strokeWidth={1.8} />
    </motion.div>
  </motion.div>
));

AmoledButton.displayName = 'AmoledButton';

// ==================== MAIN COMPONENT ====================
const ThemedHomeButton: React.FC<ThemedHomeButtonProps> = memo(({
  onClick,
  icon: Icon,
  label,
  color = 'primary',
  disabled = false,
}) => {
  const { currentTheme, hoverEffectsEnabled } = useTheme();
  const { playHoverSound, playClickSound } = useAudio();
  const [ripples, setRipples] = useState<RippleType[]>([]);
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const rippleIdRef = useRef(0);

  const createRipple = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const newRipple: RippleType = { id: rippleIdRef.current++, x, y };
    setRipples(prev => [...prev, newRipple]);
    
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== newRipple.id));
    }, 500);
  }, []);

  const handleClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled) {
      createRipple(event);
      playClickSound();
      onClick();
    }
  }, [disabled, createRipple, playClickSound, onClick]);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    if (hoverEffectsEnabled && !disabled) {
      playHoverSound();
    }
  }, [hoverEffectsEnabled, disabled, playHoverSound]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  const colors = useMemo(() => {
    // Colors based on theme and button color
    const themeAccent: Record<SportTheme, string> = {
      fire: '#ff6b35',
      ocean: '#22d3ee',
      forest: '#34d399',
      lightning: '#fbbf24',
      galaxy: '#c084fc',
      iron: '#94a3b8',
      blood: '#ef4444',
      neon: '#ec4899',
      gold: '#eab308',
      amoled: '#71717a'
    };
    return { accent: themeAccent[currentTheme] || '#ff6b35' };
  }, [currentTheme]);

  const buttonProps = {
    icon: Icon,
    colors,
    isHovered,
    isPressed,
    ripples,
    hoverEffectsEnabled,
    onClick,
    label,
    color,
    disabled
  };

  // Select button component based on theme
  const ButtonComponent = useMemo(() => {
    switch (currentTheme) {
      case 'fire': return FireButton;
      case 'ocean': return OceanButton;
      case 'forest': return ForestButton;
      case 'lightning': return LightningButton;
      case 'galaxy': return GalaxyButton;
      case 'iron': return IronButton;
      case 'blood': return BloodButton;
      case 'neon': return NeonButton;
      case 'gold': return GoldButton;
      case 'amoled': return AmoledButton;
      default: return FireButton;
    }
  }, [currentTheme]);

  return (
    <motion.button
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      disabled={disabled}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={hoverEffectsEnabled ? { scale: 1.02 } : undefined}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'relative group flex flex-col items-center',
        disabled && 'opacity-50 cursor-not-allowed pointer-events-none'
      )}
    >
      <ButtonComponent {...buttonProps} />

      {/* Label */}
      <motion.div 
        className="mt-2 flex flex-col items-center"
        animate={isHovered && hoverEffectsEnabled ? { y: -1 } : { y: 0 }}
      >
        <span className="font-bebas text-xs sm:text-sm tracking-widest uppercase text-center leading-tight text-foreground/90">
          {label}
        </span>
        
        <motion.div
          className="h-0.5 rounded-full mt-1"
          style={{ backgroundColor: colors.accent }}
          initial={{ width: 0, opacity: 0 }}
          animate={{ 
            width: isHovered ? '100%' : '30%', 
            opacity: isHovered ? 0.8 : 0.4 
          }}
          transition={{ duration: 0.2 }}
        />
      </motion.div>
    </motion.button>
  );
});

ThemedHomeButton.displayName = 'ThemedHomeButton';

export default ThemedHomeButton;

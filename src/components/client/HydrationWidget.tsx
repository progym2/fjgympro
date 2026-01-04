import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Droplets, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAudio } from '@/contexts/AudioContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import DraggableFloatingButton from '@/components/shared/DraggableFloatingButton';

interface HydrationRecord {
  id: string;
  amount_ml: number;
  recorded_at: string;
}

interface HydrationWidgetProps {
  onClose?: () => void;
  isExpanded?: boolean;
  isVisible?: boolean;
  onVisibilityChange?: (visible: boolean) => void;
}

// Som de água sendo despejada
const playWaterSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create noise buffer for water sound
    const bufferSize = audioContext.sampleRate * 0.4; // 400ms
    const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    
    const noise = audioContext.createBufferSource();
    noise.buffer = noiseBuffer;
    
    // Bandpass filter for water-like sound
    const bandpass = audioContext.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(800, audioContext.currentTime);
    bandpass.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.3);
    bandpass.Q.value = 0.5;
    
    // Low pass for softer sound
    const lowpass = audioContext.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 2000;
    
    // Gain envelope
    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.15, audioContext.currentTime + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.35);
    
    // Add a "glug" oscillator
    const glug = audioContext.createOscillator();
    glug.type = 'sine';
    glug.frequency.setValueAtTime(300, audioContext.currentTime);
    glug.frequency.exponentialRampToValueAtTime(150, audioContext.currentTime + 0.15);
    
    const glugGain = audioContext.createGain();
    glugGain.gain.setValueAtTime(0.15, audioContext.currentTime);
    glugGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
    
    // Connect
    noise.connect(bandpass);
    bandpass.connect(lowpass);
    lowpass.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    glug.connect(glugGain);
    glugGain.connect(audioContext.destination);
    
    // Play
    noise.start(audioContext.currentTime);
    noise.stop(audioContext.currentTime + 0.4);
    glug.start(audioContext.currentTime);
    glug.stop(audioContext.currentTime + 0.2);
  } catch (e) {
    console.log('Water sound not available');
  }
};

const HydrationWidget: React.FC<HydrationWidgetProps> = ({ 
  onClose, 
  isExpanded = false,
  isVisible = true,
  onVisibilityChange 
}) => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { isSfxEnabled } = useAudio();
  const [records, setRecords] = useState<HydrationRecord[]>([]);
  const [dailyGoal, setDailyGoal] = useState(2000);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(isExpanded);
  const [pouringAnimation, setPouringAnimation] = useState(false);

  const handleClose = useCallback(() => {
    if (onVisibilityChange) {
      onVisibilityChange(false);
    }
    if (onClose) {
      onClose();
    }
  }, [onClose, onVisibilityChange]);

  if (!isVisible) return null;

  useEffect(() => {
    if (profile) {
      fetchData();
    }
  }, [profile]);

  const fetchData = async () => {
    try {
      const today = new Date();
      
      // Fetch today's records
      const { data: recordsData } = await supabase
        .from('hydration_records')
        .select('*')
        .eq('profile_id', profile?.profile_id)
        .gte('recorded_at', startOfDay(today).toISOString())
        .lte('recorded_at', endOfDay(today).toISOString());

      setRecords(recordsData || []);

      // Fetch settings
      const { data: settingsData } = await supabase
        .from('hydration_settings')
        .select('daily_goal_ml')
        .eq('profile_id', profile?.profile_id)
        .maybeSingle();

      if (settingsData?.daily_goal_ml) {
        setDailyGoal(settingsData.daily_goal_ml);
      }
    } catch (error) {
      console.error('Error fetching hydration data:', error);
    }
  };

  const addWater = async (amount: number) => {
    if (!profile?.profile_id || amount <= 0 || saving) return;

    setSaving(true);
    setPouringAnimation(true);
    
    // Tocar som de água
    if (isSfxEnabled) {
      playWaterSound();
    }
    
    try {
      const { error } = await supabase
        .from('hydration_records')
        .insert({
          profile_id: profile.profile_id,
          amount_ml: amount
        });

      if (error) throw error;

      toast.success(`💧 +${amount}ml`);
      
      // Aguarda animação terminar antes de atualizar dados
      setTimeout(() => {
        setPouringAnimation(false);
        fetchData();
      }, 600);
    } catch (error) {
      console.error('Error adding water:', error);
      toast.error('Erro ao registrar');
      setPouringAnimation(false);
    } finally {
      setSaving(false);
    }
  };

  const totalToday = records.reduce((sum, r) => sum + r.amount_ml, 0);
  const progressPercentage = Math.min((totalToday / dailyGoal) * 100, 100);
  const remaining = Math.max(dailyGoal - totalToday, 0);

  // Water wave animation
  const WaveAnimation = () => (
    <svg className="absolute bottom-0 left-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <linearGradient id="waveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="hsl(190, 90%, 60%)" stopOpacity="0.8" />
          <stop offset="100%" stopColor="hsl(210, 85%, 50%)" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <motion.path
        fill="url(#waveGradient)"
        animate={{
          d: [
            `M0 ${100 - progressPercentage} Q25 ${100 - progressPercentage - 3} 50 ${100 - progressPercentage} T100 ${100 - progressPercentage} L100 100 L0 100 Z`,
            `M0 ${100 - progressPercentage} Q25 ${100 - progressPercentage + 3} 50 ${100 - progressPercentage} T100 ${100 - progressPercentage} L100 100 L0 100 Z`,
            `M0 ${100 - progressPercentage} Q25 ${100 - progressPercentage - 3} 50 ${100 - progressPercentage} T100 ${100 - progressPercentage} L100 100 L0 100 Z`,
          ]
        }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
    </svg>
  );

  // Collapsed mini widget - positioned at bottom discreetly with drag support
  if (!expanded) {
    return (
      <DraggableFloatingButton
        storageKey="hydration-widget"
        defaultPosition={{ x: 0, y: 0 }}
        onClose={handleClose}
        showCloseButton={true}
      >
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setExpanded(true)}
          className="h-10 px-3 rounded-full bg-gradient-to-r from-cyan-500/80 to-blue-600/80 shadow-lg shadow-cyan-500/20 flex items-center gap-2 backdrop-blur-sm border border-cyan-400/30"
        >
          <div className="relative flex items-center gap-2">
            <Droplets className="w-4 h-4 text-white" />
            <span className="text-xs text-white font-medium">{totalToday}ml</span>
            <div className="w-px h-4 bg-white/30" />
            <span className="text-[10px] text-white/80">{Math.round(progressPercentage)}%</span>
          </div>
          
          {/* Subtle pulse when low */}
          {progressPercentage < 30 && (
            <motion.div
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 rounded-full bg-cyan-400/20"
            />
          )}
        </motion.button>
      </DraggableFloatingButton>
    );
  }

  // Expanded widget - positioned at bottom with drag support
  return (
    <DraggableFloatingButton
      storageKey="hydration-widget-expanded"
      defaultPosition={{ x: 0, y: 0 }}
      onClose={handleClose}
      showCloseButton={true}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        className="w-56 bg-card/95 backdrop-blur-xl rounded-xl border border-cyan-500/30 shadow-xl shadow-cyan-500/10 overflow-hidden"
      >
        {/* Header - Compact */}
        <div className="relative p-3 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-b border-cyan-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-medium text-cyan-400">Hidratação</span>
            </div>
            <button
              onClick={() => setExpanded(false)}
              className="p-1 rounded hover:bg-background/50 transition-colors"
            >
              <X size={14} className="text-muted-foreground" />
            </button>
          </div>
        </div>

      {/* Compact Content */}
      <div className="p-3 space-y-3">
        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-foreground font-medium">{totalToday}ml</span>
            <span className="text-muted-foreground">/ {dailyGoal}ml</span>
          </div>
          <div className="h-2 bg-background/50 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
            />
          </div>
          {remaining > 0 && (
            <p className="text-[10px] text-muted-foreground">Faltam {remaining}ml</p>
          )}
        </div>

        {/* Cup Animation + Quick Add Buttons */}
        <div className="flex items-center gap-3">
          {/* Animated Cup */}
          <div className="relative w-10 h-14 flex-shrink-0">
            {/* Cup outline */}
            <svg viewBox="0 0 40 56" className="w-full h-full">
              {/* Cup body */}
              <path
                d="M5 8 L8 52 C8 54 10 56 12 56 L28 56 C30 56 32 54 32 52 L35 8 Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-cyan-500/50"
              />
              {/* Cup rim */}
              <ellipse cx="20" cy="8" rx="16" ry="4" fill="none" stroke="currentColor" strokeWidth="2" className="text-cyan-500/50" />
              
              {/* Water fill - animated */}
              <defs>
                <clipPath id="cupClip">
                  <path d="M6 10 L9 51 C9 53 11 55 13 55 L27 55 C29 55 31 53 31 51 L34 10 Z" />
                </clipPath>
                <linearGradient id="waterFill" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="hsl(190, 90%, 55%)" />
                  <stop offset="100%" stopColor="hsl(210, 85%, 45%)" />
                </linearGradient>
              </defs>
              
              {/* Water level */}
              <motion.rect
                x="6"
                width="28"
                fill="url(#waterFill)"
                clipPath="url(#cupClip)"
                initial={{ y: 10, height: 45 }}
                animate={pouringAnimation 
                  ? { y: 55, height: 0 }
                  : { y: 10 + (45 * (1 - progressPercentage / 100)), height: 45 * (progressPercentage / 100) }
                }
                transition={pouringAnimation 
                  ? { duration: 0.5, ease: "easeIn" }
                  : { duration: 0.3 }
                }
              />
              
              {/* Pouring drops animation */}
              <AnimatePresence>
                {pouringAnimation && (
                  <>
                    <motion.circle
                      cx="20"
                      cy="58"
                      r="2"
                      fill="hsl(190, 90%, 55%)"
                      initial={{ opacity: 1, y: 0 }}
                      animate={{ opacity: 0, y: 15 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                    />
                    <motion.circle
                      cx="16"
                      cy="58"
                      r="1.5"
                      fill="hsl(190, 90%, 55%)"
                      initial={{ opacity: 1, y: 0 }}
                      animate={{ opacity: 0, y: 12 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25, delay: 0.2 }}
                    />
                    <motion.circle
                      cx="24"
                      cy="58"
                      r="1.5"
                      fill="hsl(190, 90%, 55%)"
                      initial={{ opacity: 1, y: 0 }}
                      animate={{ opacity: 0, y: 12 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25, delay: 0.25 }}
                    />
                  </>
                )}
              </AnimatePresence>
            </svg>
          </div>

          {/* Quick Add Buttons - Compact */}
          <div className="grid grid-cols-2 gap-1.5 flex-1">
            {[150, 200, 250, 300].map((amount) => (
              <motion.button
                key={amount}
                whileTap={{ scale: 0.95 }}
                onClick={() => addWater(amount)}
                disabled={saving || pouringAnimation}
                className="py-1.5 px-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 transition-colors disabled:opacity-50"
              >
                <span className="text-[10px] text-cyan-400 font-medium">+{amount}</span>
              </motion.button>
            ))}
          </div>
        </div>

          {/* Link to full tracker */}
          <button
            onClick={() => {
              setExpanded(false);
              navigate('/client/hydration');
            }}
            className="w-full text-[10px] text-cyan-400/70 hover:text-cyan-400 transition-colors"
          >
            Ver detalhes →
          </button>
        </div>
      </motion.div>
    </DraggableFloatingButton>
  );
};

export default HydrationWidget;

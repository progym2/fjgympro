import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Droplets, Timer, Bell, Play, Pause, RotateCcw, Target, 
  TrendingUp, Settings, Check, Clock, RefreshCw, Calendar, BarChart3,
  BellRing, Smartphone, Trophy, Heart
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, startOfDay, endOfDay, subDays, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from 'recharts';
import HydrationAchievements from './HydrationAchievements';
import HealthIntegrations from './HealthIntegrations';
import ClientPageHeader from './ClientPageHeader';
import { useHydrationNotifications } from '@/hooks/useHydrationNotifications';
import { useEscapeBack } from '@/hooks/useEscapeBack';

interface WeeklyData {
  day: string;
  dayShort: string;
  amount: number;
  goal: number;
  percentage: number;
  isToday: boolean;
}

interface HydrationRecord {
  id: string;
  amount_ml: number;
  recorded_at: string;
}

interface HydrationSettings {
  daily_goal_ml: number;
  reminder_enabled: boolean;
  reminder_interval_minutes: number;
  start_hour: number;
  end_hour: number;
}

interface ProfileData {
  weight_kg: number | null;
  height_cm: number | null;
  fitness_goal: string | null;
}

interface TimeSlot {
  hour: number;
  targetMl: number;
  consumedMl: number;
  isCompleted: boolean;
  isPast: boolean;
  isCurrent: boolean;
}

// Interactive Water Glass Component - shows fill level and empties when clicked
const InteractiveGlass: React.FC<{
  slot: TimeSlot;
  onClick: () => void;
  disabled?: boolean;
}> = ({ slot, onClick, disabled }) => {
  const [isDraining, setIsDraining] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [hasDrained, setHasDrained] = useState(false);
  
  // Reset hasDrained when slot data changes (e.g., after fetch)
  useEffect(() => {
    if (slot.consumedMl > 0 || slot.isCompleted) {
      setHasDrained(true);
    }
  }, [slot.consumedMl, slot.isCompleted]);
  
  const handleClick = () => {
    if (slot.isCompleted || disabled || hasDrained) return;
    
    setIsDraining(true);
    setShowSplash(true);
    
    // Trigger the actual water add after animation starts
    setTimeout(() => {
      onClick();
      setHasDrained(true);
    }, 400);
    
    // Reset animation states
    setTimeout(() => {
      setIsDraining(false);
    }, 800);
    
    setTimeout(() => {
      setShowSplash(false);
    }, 1200);
  };
  
  // Glass is full of water when user hasn't drunk yet for this slot
  const isFull = slot.consumedMl === 0 && !isDraining && !hasDrained;
  // Glass is empty after drinking
  const isEmptyGlass = hasDrained || slot.consumedMl > 0 || slot.isCompleted;
  const waterLevel = isDraining ? 100 : (slot.isCompleted ? 100 : 0);
  
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleClick}
      disabled={disabled || slot.isCompleted}
      className={`relative flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
        slot.isCompleted 
          ? 'opacity-60 cursor-default' 
          : slot.isCurrent 
            ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-background' 
            : ''
      } ${!slot.isPast && !slot.isCurrent ? 'opacity-40' : ''}`}
    >
      {/* Glass Container */}
      <div className="relative w-14 h-20 rounded-b-xl border-2 border-cyan-500/60 bg-background/30 overflow-hidden">
        {/* Water fill - drains when clicked */}
        <motion.div
          initial={false}
          animate={{ 
            height: isDraining ? '0%' : (isFull ? '100%' : '0%'),
            y: isDraining ? 80 : 0
          }}
          transition={{ 
            duration: isDraining ? 0.6 : 0.3, 
            ease: isDraining ? [0.4, 0, 0.2, 1] : "easeOut" 
          }}
          className="absolute inset-x-0 top-0 bg-gradient-to-b from-cyan-400/80 to-blue-500/80 rounded-b-lg"
          style={{ originY: 0 }}
        />
        
        {/* Water waves animation when full */}
        {isFull && !slot.isCompleted && !isDraining && (
          <motion.div
            animate={{ y: [0, -2, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="absolute inset-x-0 top-0 h-full"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-400/70 to-blue-500/80" />
            <svg className="absolute top-0 left-0 w-full" viewBox="0 0 56 8" preserveAspectRatio="none">
              <motion.path
                animate={{ d: [
                  "M0 4 Q14 0 28 4 Q42 8 56 4 L56 8 L0 8 Z",
                  "M0 4 Q14 8 28 4 Q42 0 56 4 L56 8 L0 8 Z"
                ]}}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                fill="rgba(255,255,255,0.2)"
              />
            </svg>
          </motion.div>
        )}
        
        {/* Draining water stream */}
        <AnimatePresence>
          {isDraining && (
            <motion.div
              initial={{ height: 0, opacity: 1 }}
              animate={{ height: 40, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-3 bg-gradient-to-b from-cyan-400 to-transparent rounded-full"
            />
          )}
        </AnimatePresence>
        
        {/* Splash effect */}
        <AnimatePresence>
          {showSplash && (
            <>
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ 
                    x: 0, 
                    y: 80, 
                    scale: 0,
                    opacity: 1 
                  }}
                  animate={{ 
                    x: (i - 2.5) * 12,
                    y: 90 + Math.random() * 20,
                    scale: 1,
                    opacity: 0
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.05 }}
                  className="absolute left-1/2 w-2 h-2 rounded-full bg-cyan-400"
                />
              ))}
            </>
          )}
        </AnimatePresence>
        
        {/* Bubbles animation when full */}
        {isFull && !slot.isCompleted && !isDraining && (
          <>
            <motion.div
              animate={{ y: [-5, -20], opacity: [1, 0] }}
              transition={{ repeat: Infinity, duration: 1.5, delay: 0 }}
              className="absolute bottom-4 left-3 w-2 h-2 rounded-full bg-white/40"
            />
            <motion.div
              animate={{ y: [-5, -18], opacity: [1, 0] }}
              transition={{ repeat: Infinity, duration: 1.2, delay: 0.3 }}
              className="absolute bottom-6 right-4 w-1.5 h-1.5 rounded-full bg-white/40"
            />
            <motion.div
              animate={{ y: [-5, -15], opacity: [1, 0] }}
              transition={{ repeat: Infinity, duration: 1.8, delay: 0.6 }}
              className="absolute bottom-8 left-5 w-1 h-1 rounded-full bg-white/40"
            />
          </>
        )}
        
        {/* Completed checkmark */}
        {slot.isCompleted && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute inset-0 flex items-center justify-center bg-green-500/30"
          >
            <Check className="w-8 h-8 text-green-400" />
          </motion.div>
        )}
      </div>
      
      {/* Hour label */}
      <span className={`text-xs font-bold ${
        slot.isCurrent ? 'text-cyan-400' : slot.isPast ? 'text-foreground' : 'text-muted-foreground'
      }`}>
        {slot.hour}h
      </span>
      
      {/* Amount label */}
      <span className="text-[10px] text-muted-foreground">
        {slot.targetMl}ml
      </span>
    </motion.button>
  );
};

// Interactive Quick Add Droplet - drains on click, can be refilled
const InteractiveDroplet: React.FC<{
  amount: number;
  onDrink: () => void;
  disabled?: boolean;
}> = ({ amount, onDrink, disabled }) => {
  const [isFull, setIsFull] = useState(true);
  const [isDraining, setIsDraining] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  
  const handleClick = () => {
    if (disabled) return;
    
    if (isFull) {
      // Drain the droplet
      setIsDraining(true);
      setShowSplash(true);
      
      setTimeout(() => {
        onDrink();
        setIsFull(false);
        setIsDraining(false);
      }, 400);
      
      setTimeout(() => {
        setShowSplash(false);
      }, 800);
    } else {
      // Refill the droplet
      setIsFull(true);
    }
  };
  
  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={handleClick}
      disabled={disabled}
      className={`relative flex flex-col items-center gap-1 p-3 rounded-full border-2 transition-all disabled:opacity-50 shadow-lg ${
        isFull 
          ? 'bg-gradient-to-br from-cyan-400/30 to-blue-500/40 border-cyan-400/60 hover:border-cyan-300 shadow-cyan-500/20' 
          : 'bg-gradient-to-br from-gray-400/20 to-gray-500/30 border-gray-400/40 hover:border-cyan-400/60 shadow-gray-500/10'
      }`}
    >
      <motion.div
        animate={isFull && !isDraining ? { y: [0, -2, 0] } : {}}
        transition={{ repeat: Infinity, duration: 2 }}
        className="relative"
      >
        <svg viewBox="0 0 24 32" className="w-8 h-10">
          <defs>
            <linearGradient id={`dropGradFull${amount}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="hsl(190, 90%, 70%)" />
              <stop offset="100%" stopColor="hsl(210, 85%, 55%)" />
            </linearGradient>
            <linearGradient id={`dropGradEmpty${amount}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="hsl(220, 10%, 50%)" />
              <stop offset="100%" stopColor="hsl(220, 10%, 35%)" />
            </linearGradient>
          </defs>
          
          {/* Droplet shape */}
          <motion.path 
            d="M12 2 Q6 12 4 18 Q2 24 6 28 Q10 32 12 32 Q14 32 18 28 Q22 24 20 18 Q18 12 12 2 Z" 
            fill={isFull ? `url(#dropGradFull${amount})` : `url(#dropGradEmpty${amount})`}
            stroke={isFull ? "hsl(195, 80%, 60%)" : "hsl(220, 10%, 40%)"}
            strokeWidth="1"
            animate={{
              scale: isDraining ? [1, 0.9, 0.5] : 1,
              opacity: isDraining ? [1, 0.8, 0.6] : 1
            }}
            transition={{ duration: 0.4 }}
          />
          
          {/* Highlight when full */}
          {isFull && !isDraining && (
            <ellipse cx="8" cy="18" rx="2" ry="3" fill="rgba(255,255,255,0.4)" />
          )}
          
          {/* Bubbles when full */}
          {isFull && !isDraining && (
            <>
              <motion.circle
                cx="10"
                cy="22"
                r="1"
                fill="rgba(255,255,255,0.5)"
                animate={{ cy: [22, 16], opacity: [1, 0] }}
                transition={{ repeat: Infinity, duration: 1.5, delay: 0 }}
              />
              <motion.circle
                cx="14"
                cy="24"
                r="0.8"
                fill="rgba(255,255,255,0.4)"
                animate={{ cy: [24, 18], opacity: [1, 0] }}
                transition={{ repeat: Infinity, duration: 1.8, delay: 0.5 }}
              />
            </>
          )}
        </svg>
        
        {/* Draining stream */}
        <AnimatePresence>
          {isDraining && (
            <motion.div
              initial={{ height: 0, opacity: 1 }}
              animate={{ height: 30, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-2 bg-gradient-to-b from-cyan-400 to-transparent rounded-full"
            />
          )}
        </AnimatePresence>
        
        {/* Splash particles */}
        <AnimatePresence>
          {showSplash && (
            <>
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ x: 0, y: 30, scale: 0, opacity: 1 }}
                  animate={{ 
                    x: (i - 2) * 10,
                    y: 40 + Math.random() * 15,
                    scale: 1,
                    opacity: 0
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.03 }}
                  className="absolute left-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400"
                />
              ))}
            </>
          )}
        </AnimatePresence>
        
        {/* Refill indicator when empty */}
        {!isFull && !isDraining && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <RefreshCw className="w-4 h-4 text-cyan-400" />
          </motion.div>
        )}
      </motion.div>
      
      <span className={`text-sm font-bold ${isFull ? 'text-cyan-200' : 'text-gray-400'}`}>
        {amount}ml
      </span>
      
      {/* Status text */}
      <span className="text-[10px] text-muted-foreground">
        {isFull ? 'Toque para beber' : 'Toque para encher'}
      </span>
    </motion.button>
  );
};

// Custom Timer Preset Button
const TimerPreset: React.FC<{
  minutes: number;
  label: string;
  isSelected: boolean;
  onClick: () => void;
}> = ({ minutes, label, isSelected, onClick }) => (
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className={`px-4 py-2 rounded-lg border-2 transition-all ${
      isSelected 
        ? 'border-cyan-400 bg-cyan-500/30 text-cyan-300' 
        : 'border-border/50 bg-background/30 text-muted-foreground hover:border-cyan-500/50'
    }`}
  >
    <span className="text-lg font-bold">{minutes}</span>
    <span className="text-xs ml-1">{label}</span>
  </motion.button>
);

const HydrationTracker: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [records, setRecords] = useState<HydrationRecord[]>([]);
  const [weeklyRecords, setWeeklyRecords] = useState<HydrationRecord[]>([]);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [settings, setSettings] = useState<HydrationSettings>({
    daily_goal_ml: 2000,
    reminder_enabled: true,
    reminder_interval_minutes: 60,
    start_hour: 6,
    end_hour: 22
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [customTimerMinutes, setCustomTimerMinutes] = useState(60);
  const [activeTab, setActiveTab] = useState('today');
  const [pushEnabled, setPushEnabled] = useState(false);

  // ESC volta para /client
  useEscapeBack({ to: '/client', disableWhen: [showSettings] });
  
  // Native notifications hook
  const {
    isNative,
    hasPermission: nativePermission,
    pendingNotifications,
    requestPermission: requestNativePermission,
    scheduleHydrationReminders,
    cancelAllReminders,
    sendImmediateReminder
  } = useHydrationNotifications();
  
  // Timer state
  const [timerActive, setTimerActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showTimerAlert, setShowTimerAlert] = useState(false);

  const timerPresets = [
    { minutes: 15, label: 'min' },
    { minutes: 30, label: 'min' },
    { minutes: 45, label: 'min' },
    { minutes: 60, label: 'min' },
    { minutes: 90, label: 'min' },
    { minutes: 120, label: 'min' }
  ];

  useEffect(() => {
    if (profile) {
      fetchData();
    }
  }, [profile]);

  // Timer effect with native + browser notification support
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (timerActive && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setShowTimerAlert(true);
            setTimerActive(false);
            
            // Play sound
            try {
              const audio = new Audio('/audio/notification.mp3');
              audio.play().catch(() => {});
            } catch (e) {}
            
            // Send native notification if available, otherwise browser notification
            if (isNative && nativePermission) {
              sendImmediateReminder('O timer acabou! Hora de beber água. 💧');
            } else if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('💧 Hora de beber água!', {
                body: 'Mantenha-se hidratado para melhor desempenho.',
                icon: '/pwa-192x192.png'
              });
            }
            
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => clearInterval(interval);
  }, [timerActive, timeRemaining, isNative, nativePermission, sendImmediateReminder]);

  // Check notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setPushEnabled(Notification.permission === 'granted');
    }
  }, []);

  // Schedule native notifications when settings change
  useEffect(() => {
    if (isNative && settings.reminder_enabled && nativePermission) {
      scheduleHydrationReminders({
        enabled: settings.reminder_enabled,
        intervalMinutes: settings.reminder_interval_minutes,
        startHour: settings.start_hour,
        endHour: settings.end_hour,
        dailyGoalMl: settings.daily_goal_ml
      });
    }
  }, [isNative, nativePermission, settings.reminder_enabled, settings.reminder_interval_minutes, 
      settings.start_hour, settings.end_hour, settings.daily_goal_ml, scheduleHydrationReminders]);

  const fetchData = async () => {
    try {
      const today = new Date();
      const weekAgo = subDays(today, 6);
      
      const { data: profileResult } = await supabase
        .from('profiles')
        .select('weight_kg, height_cm, fitness_goal')
        .eq('id', profile?.profile_id)
        .maybeSingle();
      
      if (profileResult) {
        setProfileData(profileResult as ProfileData);
      }
      
      // Fetch today's records
      const { data: recordsData, error: recordsError } = await supabase
        .from('hydration_records')
        .select('*')
        .eq('profile_id', profile?.profile_id)
        .gte('recorded_at', startOfDay(today).toISOString())
        .lte('recorded_at', endOfDay(today).toISOString())
        .order('recorded_at', { ascending: false });

      if (recordsError) throw recordsError;
      setRecords(recordsData || []);

      // Fetch weekly records for history
      const { data: weeklyData, error: weeklyError } = await supabase
        .from('hydration_records')
        .select('*')
        .eq('profile_id', profile?.profile_id)
        .gte('recorded_at', startOfDay(weekAgo).toISOString())
        .lte('recorded_at', endOfDay(today).toISOString())
        .order('recorded_at', { ascending: false });

      if (!weeklyError) {
        setWeeklyRecords(weeklyData || []);
      }

      const { data: settingsData, error: settingsError } = await supabase
        .from('hydration_settings')
        .select('*')
        .eq('profile_id', profile?.profile_id)
        .maybeSingle();

      if (!settingsError && settingsData) {
        setSettings(settingsData);
        setCustomTimerMinutes(settingsData.reminder_interval_minutes);
        if (settingsData.reminder_enabled && !timerActive && timeRemaining === 0) {
          setTimeRemaining(settingsData.reminder_interval_minutes * 60);
        }
      } else if (profileResult?.weight_kg) {
        const recommendedGoal = calculateWaterGoal(profileResult.weight_kg as number, profileResult.fitness_goal as string);
        setSettings(prev => ({ ...prev, daily_goal_ml: recommendedGoal }));
      }
    } catch (error) {
      console.error('Error fetching hydration data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate weekly chart data
  const weeklyChartData = useMemo((): WeeklyData[] => {
    const today = new Date();
    const days = eachDayOfInterval({
      start: subDays(today, 6),
      end: today
    });

    return days.map(day => {
      const dayRecords = weeklyRecords.filter(r => {
        const recordDate = new Date(r.recorded_at);
        return format(recordDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
      });
      
      const amount = dayRecords.reduce((sum, r) => sum + r.amount_ml, 0);
      const percentage = Math.min((amount / settings.daily_goal_ml) * 100, 100);
      
      return {
        day: format(day, 'EEEE', { locale: ptBR }),
        dayShort: format(day, 'EEE', { locale: ptBR }),
        amount,
        goal: settings.daily_goal_ml,
        percentage,
        isToday: format(day, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
      };
    });
  }, [weeklyRecords, settings.daily_goal_ml]);

  // Weekly stats
  const weeklyStats = useMemo(() => {
    const totalWeek = weeklyChartData.reduce((sum, d) => sum + d.amount, 0);
    const avgDaily = Math.round(totalWeek / 7);
    const daysCompleted = weeklyChartData.filter(d => d.percentage >= 100).length;
    const bestDay = weeklyChartData.reduce((best, d) => d.amount > best.amount ? d : best, weeklyChartData[0]);
    
    return { totalWeek, avgDaily, daysCompleted, bestDay };
  }, [weeklyChartData]);

  // Request push notification permission
  const requestPushPermission = async () => {
    try {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          setPushEnabled(true);
          toast.success('Notificações ativadas! Você receberá lembretes de hidratação.');
        } else {
          toast.error('Permissão de notificação negada');
        }
      } else {
        toast.error('Seu navegador não suporta notificações push');
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Erro ao solicitar permissão de notificação');
    }
  };

  // Send browser notification
  const sendBrowserNotification = useCallback(() => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('💧 Hora de beber água!', {
        body: 'Mantenha-se hidratado para melhor desempenho.',
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png'
      });
    }
  }, []);

  const calculateWaterGoal = (weightKg: number, fitnessGoal: string | null): number => {
    let baseWater = Math.round(weightKg * 35);
    
    switch (fitnessGoal) {
      case 'muscle_gain':
      case 'hypertrophy':
        baseWater = Math.round(baseWater * 1.2);
        break;
      case 'weight_loss':
        baseWater = Math.round(baseWater * 1.1);
        break;
      case 'conditioning':
        baseWater = Math.round(baseWater * 1.15);
        break;
    }
    
    return Math.round(baseWater / 100) * 100;
  };

  // Calculate time slots for the day
  const timeSlots = useMemo((): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const hoursActive = settings.end_hour - settings.start_hour;
    const waterPerHour = Math.round(settings.daily_goal_ml / hoursActive);
    const currentHour = new Date().getHours();
    
    for (let hour = settings.start_hour; hour < settings.end_hour; hour++) {
      // Calculate consumption for this hour
      const hourStart = new Date();
      hourStart.setHours(hour, 0, 0, 0);
      const hourEnd = new Date();
      hourEnd.setHours(hour + 1, 0, 0, 0);
      
      const consumedInHour = records
        .filter(r => {
          const recordTime = new Date(r.recorded_at);
          return recordTime >= hourStart && recordTime < hourEnd;
        })
        .reduce((sum, r) => sum + r.amount_ml, 0);
      
      slots.push({
        hour,
        targetMl: waterPerHour,
        consumedMl: consumedInHour,
        isCompleted: consumedInHour >= waterPerHour,
        isPast: hour < currentHour,
        isCurrent: hour === currentHour
      });
    }
    
    return slots;
  }, [records, settings]);

  const startTimer = () => {
    if (timeRemaining === 0) {
      setTimeRemaining(customTimerMinutes * 60);
    }
    setTimerActive(true);
    setShowTimerAlert(false);
    toast.success('Timer de hidratação iniciado!');
  };

  const pauseTimer = () => {
    setTimerActive(false);
  };

  const resetTimer = () => {
    setTimerActive(false);
    setTimeRemaining(customTimerMinutes * 60);
    setShowTimerAlert(false);
  };

  const setTimerPreset = (minutes: number) => {
    setCustomTimerMinutes(minutes);
    setTimeRemaining(minutes * 60);
    setTimerActive(false);
  };

  const addWater = async (amount: number) => {
    if (!profile?.profile_id || amount <= 0) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('hydration_records')
        .insert({
          profile_id: profile.profile_id,
          amount_ml: amount
        });

      if (error) throw error;

      toast.success(`💧 +${amount}ml registrado!`);
      setShowTimerAlert(false);
      
      if (settings.reminder_enabled) {
        setTimeRemaining(customTimerMinutes * 60);
        setTimerActive(true);
      }
      
      fetchData();
    } catch (error) {
      console.error('Error adding water:', error);
      toast.error('Erro ao registrar');
    } finally {
      setSaving(false);
    }
  };

  const addWaterForSlot = async (slot: TimeSlot) => {
    if (slot.isCompleted) return;
    const amountNeeded = slot.targetMl - slot.consumedMl;
    await addWater(Math.min(amountNeeded, slot.targetMl));
  };

  const saveSettings = async () => {
    if (!profile?.profile_id) return;

    try {
      const updatedSettings = {
        ...settings,
        reminder_interval_minutes: customTimerMinutes
      };
      
      const { error } = await supabase
        .from('hydration_settings')
        .upsert({
          profile_id: profile.profile_id,
          ...updatedSettings
        });

      if (error) throw error;

      setSettings(updatedSettings);
      toast.success('Configurações salvas!');
      setShowSettings(false);
      
      if (settings.reminder_enabled) {
        setTimeRemaining(customTimerMinutes * 60);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Erro ao salvar configurações');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const totalToday = records.reduce((sum, r) => sum + r.amount_ml, 0);
  const progressPercentage = Math.min((totalToday / settings.daily_goal_ml) * 100, 100);
  const remaining = Math.max(settings.daily_goal_ml - totalToday, 0);
  const timerProgress = timeRemaining > 0 ? (timeRemaining / (customTimerMinutes * 60)) * 100 : 0;
  const completedSlots = timeSlots.filter(s => s.isCompleted).length;

  const currentHour = new Date().getHours();
  const hoursActive = settings.end_hour - settings.start_hour;
  const waterPerHour = Math.round(settings.daily_goal_ml / hoursActive);
  const hoursElapsed = Math.max(0, Math.min(currentHour - settings.start_hour, hoursActive));
  const expectedIntake = waterPerHour * hoursElapsed;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col overflow-hidden"
    >
      <ClientPageHeader 
        title="HIDRATAÇÃO" 
        icon={<Droplets className="w-5 h-5" />} 
        iconColor="text-cyan-500" 
      />

      <div className="flex-1 overflow-auto space-y-6">

      {/* Tabs for Today/Weekly/Achievements/Health */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-background/50 border border-cyan-500/30">
          <TabsTrigger value="today" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 text-xs px-2">
            <Clock size={14} className="mr-1" />
            Hoje
          </TabsTrigger>
          <TabsTrigger value="week" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 text-xs px-2">
            <BarChart3 size={14} className="mr-1" />
            Semana
          </TabsTrigger>
          <TabsTrigger value="achievements" className="data-[state=active]:bg-yellow-500/20 data-[state=active]:text-yellow-400 text-xs px-2">
            <Trophy size={14} className="mr-1" />
            Conquistas
          </TabsTrigger>
          <TabsTrigger value="health" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400 text-xs px-2">
            <Heart size={14} className="mr-1" />
            Saúde
          </TabsTrigger>
        </TabsList>

        {/* Achievements Tab */}
        <TabsContent value="achievements" className="space-y-4 mt-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-yellow-500/30"
          >
            <h3 className="font-bebas text-lg mb-4 flex items-center gap-2 text-yellow-500">
              <Trophy className="w-5 h-5" />
              CONQUISTAS DE HIDRATAÇÃO
            </h3>
            <HydrationAchievements dailyGoal={settings.daily_goal_ml} />
          </motion.div>
        </TabsContent>

        {/* Health Integrations Tab */}
        <TabsContent value="health" className="space-y-4 mt-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-red-500/30"
          >
            <h3 className="font-bebas text-lg mb-4 flex items-center gap-2 text-red-400">
              <Heart className="w-5 h-5" />
              INTEGRAÇÕES DE SAÚDE
            </h3>
            <HealthIntegrations />
          </motion.div>
        </TabsContent>

        {/* Weekly History Tab */}
        <TabsContent value="week" className="space-y-4 mt-4">
          {/* Weekly Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-4 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30"
            >
              <p className="text-xs text-muted-foreground mb-1">Total Semanal</p>
              <p className="text-2xl font-bold text-cyan-400">{(weeklyStats.totalWeek / 1000).toFixed(1)}L</p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="p-4 rounded-xl bg-gradient-to-br from-teal-500/20 to-emerald-500/20 border border-teal-500/30"
            >
              <p className="text-xs text-muted-foreground mb-1">Média Diária</p>
              <p className="text-2xl font-bold text-teal-400">{weeklyStats.avgDaily}ml</p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-4 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30"
            >
              <p className="text-xs text-muted-foreground mb-1">Dias Completos</p>
              <p className="text-2xl font-bold text-green-400">{weeklyStats.daysCompleted}/7</p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="p-4 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30"
            >
              <p className="text-xs text-muted-foreground mb-1">Melhor Dia</p>
              <p className="text-lg font-bold text-yellow-400 capitalize">{weeklyStats.bestDay?.dayShort}</p>
              <p className="text-xs text-muted-foreground">{weeklyStats.bestDay?.amount}ml</p>
            </motion.div>
          </div>

          {/* Weekly Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-4 rounded-xl bg-card/80 backdrop-blur-md border border-cyan-500/30"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bebas text-lg text-cyan-500 flex items-center gap-2">
                <Calendar size={18} />
                HISTÓRICO SEMANAL
              </h3>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-cyan-500" />
                <span className="text-muted-foreground">Consumido</span>
                <div className="w-3 h-3 rounded-full bg-cyan-500/30 border border-dashed border-cyan-500" />
                <span className="text-muted-foreground">Meta</span>
              </div>
            </div>
            
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyChartData} barCategoryGap="20%">
                  <XAxis 
                    dataKey="dayShort" 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    tickFormatter={(value) => `${value / 1000}L`}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload as WeeklyData;
                        return (
                          <div className="bg-background/95 backdrop-blur-md border border-cyan-500/30 rounded-lg p-3 shadow-xl">
                            <p className="font-medium capitalize">{data.day}</p>
                            <p className="text-cyan-400 font-bold">{data.amount}ml</p>
                            <p className="text-xs text-muted-foreground">Meta: {data.goal}ml</p>
                            <p className="text-xs text-muted-foreground">{data.percentage.toFixed(0)}% concluído</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="amount" 
                    radius={[8, 8, 0, 0]}
                    maxBarSize={50}
                  >
                    {weeklyChartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`}
                        fill={entry.isToday 
                          ? 'hsl(190, 90%, 55%)' 
                          : entry.percentage >= 100 
                            ? 'hsl(150, 70%, 50%)' 
                            : 'hsl(200, 70%, 50%)'
                        }
                        fillOpacity={entry.isToday ? 1 : 0.7}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Goal line indicator */}
            <div className="flex justify-center mt-2">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/30">
                <Target size={14} className="text-cyan-400" />
                <span className="text-xs text-cyan-400">Meta: {settings.daily_goal_ml}ml/dia</span>
              </div>
            </div>
          </motion.div>

          {/* Weekly Summary Text */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="p-4 rounded-xl bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 border border-cyan-500/20 text-center"
          >
            {weeklyStats.daysCompleted >= 5 ? (
              <p className="text-green-400">🏆 Excelente! Você completou a meta em {weeklyStats.daysCompleted} dias esta semana!</p>
            ) : weeklyStats.daysCompleted >= 3 ? (
              <p className="text-yellow-400">💪 Bom trabalho! Continue assim para atingir sua meta mais vezes!</p>
            ) : (
              <p className="text-cyan-400">💧 Mantenha-se hidratado! Tente beber {settings.daily_goal_ml}ml por dia.</p>
            )}
          </motion.div>
        </TabsContent>

        <TabsContent value="today" className="space-y-6 mt-4">

      {/* Timer Alert */}
      <AnimatePresence>
        {showTimerAlert && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-gradient-to-br from-cyan-500/30 to-blue-500/30 backdrop-blur-md rounded-xl p-6 border-2 border-cyan-500 text-center"
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
            >
              <Bell className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
            </motion.div>
            <h3 className="text-2xl font-bebas text-cyan-400 mb-2">HORA DE BEBER ÁGUA!</h3>
            <p className="text-muted-foreground mb-4">Mantenha-se hidratado para melhor desempenho</p>
            <div className="flex gap-3 justify-center flex-wrap">
              {[150, 200, 300].map((amount) => (
                <InteractiveDroplet
                  key={amount}
                  amount={amount}
                  onDrink={() => addWater(amount)}
                  disabled={saving}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress Card */}
      <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 backdrop-blur-md rounded-xl p-6 border border-cyan-500/30">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-muted-foreground">Consumo Hoje</p>
            <p className="text-5xl font-bold text-cyan-400">{totalToday}<span className="text-2xl">ml</span></p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Meta: {settings.daily_goal_ml}ml</p>
            <p className="text-lg font-medium text-foreground">
              Faltam: <span className="text-cyan-400">{remaining}ml</span>
            </p>
          </div>
        </div>
        
        <div className="relative h-6 bg-background/50 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold text-white drop-shadow-md">
              {progressPercentage.toFixed(0)}%
            </span>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <span>Copos completados: {completedSlots}/{timeSlots.length}</span>
          <span className={totalToday >= expectedIntake ? 'text-green-400' : 'text-yellow-400'}>
            {totalToday >= expectedIntake ? '✓ No ritmo!' : '⚠ Atrasado'}
          </span>
        </div>

        {progressPercentage >= 100 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="mt-4 p-3 bg-green-500/20 rounded-lg text-center"
          >
            <p className="text-green-500 font-medium">🎉 Meta diária alcançada! Parabéns!</p>
          </motion.div>
        )}
      </div>

      {/* Interactive Hourly Glasses - Main Feature */}
      <div className="bg-card/80 backdrop-blur-md rounded-xl p-6 border border-cyan-500/30">
        <h3 className="font-bebas text-lg mb-2 flex items-center gap-2 text-cyan-500">
          <Clock className="w-5 h-5" />
          DISTRIBUIÇÃO POR HORÁRIO
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Toque no copo para marcar que você bebeu. Copos cheios indicam água a beber.
        </p>
        
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-3 min-w-max justify-center">
            {timeSlots.map((slot, idx) => (
              <InteractiveGlass
                key={idx}
                slot={slot}
                onClick={() => addWaterForSlot(slot)}
                disabled={saving}
              />
            ))}
          </div>
        </div>
        
        <div className="flex items-center justify-center gap-6 mt-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gradient-to-b from-cyan-400/70 to-blue-500/70" />
            <span className="text-muted-foreground">Água a beber</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500/30 flex items-center justify-center">
              <Check className="w-3 h-3 text-green-400" />
            </div>
            <span className="text-muted-foreground">Concluído</span>
          </div>
        </div>
      </div>

      {/* Quick Add Water */}
      <div className="bg-card/80 backdrop-blur-md rounded-xl p-6 border border-border/50">
        <h3 className="font-bebas text-lg mb-4 flex items-center gap-2 text-cyan-500">
          <Droplets className="w-5 h-5" />
          ADICIONAR RÁPIDO
        </h3>
        
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 justify-items-center">
          {[100, 150, 200, 250, 300, 500].map((amount) => (
            <InteractiveDroplet
              key={amount}
              amount={amount}
              onDrink={() => addWater(amount)}
              disabled={saving}
            />
          ))}
        </div>
      </div>

      {/* Custom Timer */}
      <div className="bg-card/80 backdrop-blur-md rounded-xl p-6 border border-cyan-500/30">
        <h3 className="font-bebas text-lg mb-4 flex items-center gap-2 text-cyan-500">
          <Timer className="w-5 h-5" />
          TIMER PERSONALIZADO
        </h3>
        
        <div className="flex flex-col items-center gap-6">
          {/* Timer Presets */}
          <div className="flex flex-wrap justify-center gap-2">
            {timerPresets.map((preset) => (
              <TimerPreset
                key={preset.minutes}
                minutes={preset.minutes}
                label={preset.label}
                isSelected={customTimerMinutes === preset.minutes}
                onClick={() => setTimerPreset(preset.minutes)}
              />
            ))}
          </div>
          
          {/* Custom slider */}
          <div className="w-full max-w-md space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Personalizar</span>
              <span className="text-cyan-400 font-bold">{customTimerMinutes} min</span>
            </div>
            <Slider
              value={[customTimerMinutes]}
              onValueChange={(v) => {
                setCustomTimerMinutes(v[0]);
                if (!timerActive) {
                  setTimeRemaining(v[0] * 60);
                }
              }}
              min={5}
              max={180}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>5 min</span>
              <span>3 horas</span>
            </div>
          </div>

          {/* Circular Timer */}
          <div className="relative w-44 h-44">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="88"
                cy="88"
                r="78"
                fill="none"
                stroke="currentColor"
                strokeWidth="10"
                className="text-background/50"
              />
              <motion.circle
                cx="88"
                cy="88"
                r="78"
                fill="none"
                stroke="currentColor"
                strokeWidth="10"
                strokeDasharray={490}
                strokeDashoffset={490 - (490 * timerProgress) / 100}
                className="text-cyan-500"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bebas text-foreground">{formatTime(timeRemaining)}</span>
              <span className="text-xs text-muted-foreground">
                {timerActive ? '⏱ Ativo' : timeRemaining > 0 ? '⏸ Pausado' : '⏹ Parado'}
              </span>
            </div>
          </div>

          {/* Timer Controls */}
          <div className="flex gap-3">
            {!timerActive ? (
              <Button onClick={startTimer} className="bg-cyan-500 hover:bg-cyan-600">
                <Play size={18} className="mr-2" /> Iniciar
              </Button>
            ) : (
              <Button onClick={pauseTimer} variant="outline" className="border-cyan-500/50">
                <Pause size={18} className="mr-2" /> Pausar
              </Button>
            )}
            <Button onClick={resetTimer} variant="outline">
              <RotateCcw size={18} className="mr-2" /> Reiniciar
            </Button>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      <div className="bg-card/80 backdrop-blur-md rounded-xl p-6 border border-border/50 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bebas text-lg flex items-center gap-2">
            <Settings className="w-5 h-5" />
            CONFIGURAÇÕES
          </h3>
          <Switch
            checked={showSettings}
            onCheckedChange={setShowSettings}
          />
        </div>

        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Meta Diária (ml)</Label>
                  <Input
                    type="number"
                    value={settings.daily_goal_ml}
                    onChange={(e) => setSettings({ ...settings, daily_goal_ml: parseInt(e.target.value) || 2000 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Horário de Início</Label>
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    value={settings.start_hour}
                    onChange={(e) => setSettings({ ...settings, start_hour: parseInt(e.target.value) || 6 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Horário de Término</Label>
                  <Input
                    type="number"
                    min={0}
                    max={24}
                    value={settings.end_hour}
                    onChange={(e) => setSettings({ ...settings, end_hour: parseInt(e.target.value) || 22 })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                <div>
                  <Label>Lembretes Automáticos</Label>
                  <p className="text-xs text-muted-foreground">Ativar timer de hidratação</p>
                </div>
                <Switch
                  checked={settings.reminder_enabled}
                  onCheckedChange={(v) => setSettings({ ...settings, reminder_enabled: v })}
                />
              </div>

              {/* Native Push Notifications (Capacitor) */}
              {isNative && (
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg border border-green-500/30">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/30">
                      <Smartphone className="w-4 h-4 text-green-400" />
                    </div>
                    <div>
                      <Label className="text-green-400">Notificações Nativas</Label>
                      <p className="text-xs text-muted-foreground">
                        {nativePermission 
                          ? `${pendingNotifications} lembretes agendados` 
                          : 'Receba alertas mesmo com app fechado'}
                      </p>
                    </div>
                  </div>
                  {nativePermission ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-green-400 flex items-center gap-1">
                        <Check size={14} />
                        Ativo
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-green-400 hover:bg-green-500/20 h-7 px-2"
                        onClick={() => scheduleHydrationReminders({
                          enabled: settings.reminder_enabled,
                          intervalMinutes: settings.reminder_interval_minutes,
                          startHour: settings.start_hour,
                          endHour: settings.end_hour,
                          dailyGoalMl: settings.daily_goal_ml
                        })}
                      >
                        <RefreshCw size={12} className="mr-1" />
                        Reagendar
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-green-500/50 text-green-400 hover:bg-green-500/20"
                      onClick={requestNativePermission}
                    >
                      <Bell size={14} className="mr-1" />
                      Ativar
                    </Button>
                  )}
                </div>
              )}

              {/* Browser Push Notifications (fallback for web) */}
              <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/20">
                    <BellRing className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <Label>Notificações do Navegador</Label>
                    <p className="text-xs text-muted-foreground">
                      {pushEnabled 
                        ? 'Ativadas' 
                        : isNative 
                          ? 'Use notificações nativas acima' 
                          : 'Receba alertas no navegador'}
                    </p>
                  </div>
                </div>
                {pushEnabled ? (
                  <div className="flex items-center gap-1 text-green-400 text-xs">
                    <Check size={14} />
                    Ativado
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-purple-500/50 text-purple-400 hover:bg-purple-500/20"
                    onClick={requestPushPermission}
                    disabled={isNative}
                  >
                    <Smartphone size={14} className="mr-1" />
                    Ativar
                  </Button>
                )}
              </div>

              {/* Recommended Goal */}
              {profileData?.weight_kg && (
                <div className="p-3 bg-teal-500/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-teal-400" />
                    <span className="text-sm font-medium text-teal-400">Meta Recomendada</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Para seu peso ({profileData.weight_kg}kg): {' '}
                    <span className="text-teal-400 font-bold">
                      {calculateWaterGoal(Number(profileData.weight_kg), profileData.fitness_goal)}ml/dia
                    </span>
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 border-teal-500/50 text-teal-400"
                    onClick={() => setSettings({
                      ...settings,
                      daily_goal_ml: calculateWaterGoal(Number(profileData.weight_kg), profileData.fitness_goal)
                    })}
                  >
                    Usar meta recomendada
                  </Button>
                </div>
              )}

              <Button onClick={saveSettings} className="w-full">
                Salvar Configurações
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Today's Records */}
      <div className="bg-card/80 backdrop-blur-md rounded-xl p-6 border border-border/50">
        <h3 className="font-bebas text-lg mb-4">REGISTROS DE HOJE</h3>
        {records.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">Nenhum registro hoje. Toque em um copo para começar!</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {records.map((record) => (
              <div key={record.id} className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Droplets className="w-4 h-4 text-cyan-500" />
                  <span className="font-medium">{record.amount_ml}ml</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(record.recorded_at), 'HH:mm', { locale: ptBR })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      </TabsContent>
      </Tabs>
      </div>
    </motion.div>
  );
};

export default HydrationTracker;

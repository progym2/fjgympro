import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Star, Droplets, Flame, Zap, Target, Award, 
  Crown, Medal, Sparkles, Calendar, TrendingUp, Heart
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { subDays, startOfDay, endOfDay, eachDayOfInterval, format } from 'date-fns';

interface HydrationAchievement {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  unlocked: boolean;
  progress: number;
  maxProgress: number;
  tier: 'bronze' | 'silver' | 'gold' | 'diamond';
  category: 'daily' | 'streak' | 'volume' | 'consistency';
  unlockedAt?: Date;
}

interface HydrationRecord {
  id: string;
  amount_ml: number;
  recorded_at: string;
}

interface HydrationAchievementsProps {
  dailyGoal: number;
}

const tierColors = {
  bronze: 'from-amber-700 to-orange-600',
  silver: 'from-slate-400 to-gray-300',
  gold: 'from-yellow-500 to-amber-400',
  diamond: 'from-cyan-400 to-blue-400'
};

const tierBorderColors = {
  bronze: 'border-amber-600/50',
  silver: 'border-slate-400/50',
  gold: 'border-yellow-500/50',
  diamond: 'border-cyan-400/50'
};

const tierGlowColors = {
  bronze: 'shadow-amber-500/20',
  silver: 'shadow-slate-400/20',
  gold: 'shadow-yellow-500/30',
  diamond: 'shadow-cyan-400/40'
};

const AchievementCard: React.FC<{ 
  achievement: HydrationAchievement;
  index: number;
}> = ({ achievement, index }) => {
  const [showUnlockAnimation, setShowUnlockAnimation] = useState(false);
  
  const progressPercent = Math.min((achievement.progress / achievement.maxProgress) * 100, 100);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        delay: index * 0.08,
        type: "spring",
        stiffness: 200,
        damping: 20
      }}
    >
      <Card className={`relative overflow-hidden transition-all duration-300 ${
        achievement.unlocked 
          ? `bg-gradient-to-br ${tierColors[achievement.tier]} ${tierBorderColors[achievement.tier]} shadow-lg ${tierGlowColors[achievement.tier]}` 
          : 'bg-card/60 border-border/30 opacity-70'
      }`}>
        {/* Sparkle effect for unlocked achievements */}
        {achievement.unlocked && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.3, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="absolute top-1 right-1 w-2 h-2 bg-white rounded-full blur-[1px]" />
            <div className="absolute bottom-3 left-2 w-1.5 h-1.5 bg-white/80 rounded-full blur-[1px]" />
            <div className="absolute top-1/2 right-3 w-1 h-1 bg-white/60 rounded-full" />
          </motion.div>
        )}
        
        <CardContent className="p-4 relative z-10">
          <div className="flex items-start gap-3">
            {/* Icon with glow */}
            <motion.div
              className={`p-2.5 rounded-xl ${
                achievement.unlocked 
                  ? 'bg-white/20 text-white' 
                  : 'bg-muted/50 text-muted-foreground'
              }`}
              animate={achievement.unlocked ? {
                boxShadow: [
                  '0 0 0px rgba(255,255,255,0)',
                  '0 0 15px rgba(255,255,255,0.3)',
                  '0 0 0px rgba(255,255,255,0)'
                ]
              } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {achievement.icon}
            </motion.div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className={`font-bebas text-base tracking-wide truncate ${
                  achievement.unlocked ? 'text-white' : 'text-muted-foreground'
                }`}>
                  {achievement.title}
                </h3>
                
                {/* Tier badge */}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  achievement.unlocked 
                    ? 'bg-white/20 text-white/90' 
                    : 'bg-muted/50 text-muted-foreground'
                }`}>
                  {achievement.tier.toUpperCase()}
                </span>
              </div>
              
              <p className={`text-xs mb-2 line-clamp-2 ${
                achievement.unlocked ? 'text-white/80' : 'text-muted-foreground'
              }`}>
                {achievement.description}
              </p>
              
              {/* Progress bar */}
              <div className="space-y-1">
                <div className={`h-1.5 rounded-full overflow-hidden ${
                  achievement.unlocked ? 'bg-white/30' : 'bg-muted/50'
                }`}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.8, delay: index * 0.08 + 0.3 }}
                    className={`h-full rounded-full ${
                      achievement.unlocked 
                        ? 'bg-white' 
                        : 'bg-cyan-500/70'
                    }`}
                  />
                </div>
                
                <div className="flex justify-between items-center">
                  <span className={`text-[10px] ${
                    achievement.unlocked ? 'text-white/70' : 'text-muted-foreground'
                  }`}>
                    {achievement.progress}/{achievement.maxProgress}
                  </span>
                  
                  {achievement.unlocked && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-[10px] text-white/90 flex items-center gap-1"
                    >
                      <Sparkles size={10} />
                      Desbloqueado
                    </motion.span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const HydrationAchievements: React.FC<HydrationAchievementsProps> = ({ dailyGoal }) => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<HydrationRecord[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    if (profile) {
      fetchAllRecords();
    }
  }, [profile]);

  const fetchAllRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('hydration_records')
        .select('*')
        .eq('profile_id', profile?.profile_id)
        .order('recorded_at', { ascending: true });

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error('Error fetching hydration records:', error);
    } finally {
      setLoading(false);
    }
  };

  const achievements = useMemo((): HydrationAchievement[] => {
    if (records.length === 0) {
      return getDefaultAchievements();
    }

    const today = new Date();
    const recordsByDate = new Map<string, number>();
    
    // Group records by date
    records.forEach(r => {
      const dateKey = format(new Date(r.recorded_at), 'yyyy-MM-dd');
      recordsByDate.set(dateKey, (recordsByDate.get(dateKey) || 0) + r.amount_ml);
    });

    // Calculate stats
    const totalLiters = records.reduce((sum, r) => sum + r.amount_ml, 0) / 1000;
    const daysWithRecords = recordsByDate.size;
    const daysGoalMet = Array.from(recordsByDate.values()).filter(ml => ml >= dailyGoal).length;
    
    // Calculate current streak
    let currentStreak = 0;
    let checkDate = today;
    while (true) {
      const dateKey = format(checkDate, 'yyyy-MM-dd');
      const dayAmount = recordsByDate.get(dateKey) || 0;
      if (dayAmount >= dailyGoal) {
        currentStreak++;
        checkDate = subDays(checkDate, 1);
      } else if (format(checkDate, 'yyyy-MM-dd') !== format(today, 'yyyy-MM-dd')) {
        break;
      } else {
        checkDate = subDays(checkDate, 1);
      }
      if (currentStreak > 365) break; // Safety limit
    }
    
    // Calculate max streak
    let maxStreak = 0;
    let tempStreak = 0;
    const sortedDates = Array.from(recordsByDate.entries())
      .filter(([_, ml]) => ml >= dailyGoal)
      .map(([date, _]) => new Date(date))
      .sort((a, b) => a.getTime() - b.getTime());
    
    for (let i = 0; i < sortedDates.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const diff = (sortedDates[i].getTime() - sortedDates[i-1].getTime()) / (1000 * 60 * 60 * 24);
        if (diff === 1) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      }
      maxStreak = Math.max(maxStreak, tempStreak);
    }

    // Count records today
    const todayKey = format(today, 'yyyy-MM-dd');
    const todayAmount = recordsByDate.get(todayKey) || 0;
    
    // Weekly stats
    const weekAgo = subDays(today, 6);
    const weekDays = eachDayOfInterval({ start: weekAgo, end: today });
    const weekDaysGoalMet = weekDays.filter(day => {
      const key = format(day, 'yyyy-MM-dd');
      return (recordsByDate.get(key) || 0) >= dailyGoal;
    }).length;

    return [
      // Daily achievements
      {
        id: 'first_sip',
        icon: <Droplets className="w-6 h-6" />,
        title: 'Primeiro Gole',
        description: 'Registre sua primeira hidratação',
        unlocked: records.length >= 1,
        progress: Math.min(records.length, 1),
        maxProgress: 1,
        tier: 'bronze',
        category: 'daily'
      },
      {
        id: 'daily_goal',
        icon: <Target className="w-6 h-6" />,
        title: 'Meta Diária',
        description: 'Atinja sua meta diária de hidratação',
        unlocked: todayAmount >= dailyGoal,
        progress: Math.min(todayAmount, dailyGoal),
        maxProgress: dailyGoal,
        tier: 'bronze',
        category: 'daily'
      },
      {
        id: 'super_hydrated',
        icon: <Zap className="w-6 h-6" />,
        title: 'Super Hidratado',
        description: 'Atinja 150% da meta diária',
        unlocked: todayAmount >= dailyGoal * 1.5,
        progress: Math.min(todayAmount, Math.floor(dailyGoal * 1.5)),
        maxProgress: Math.floor(dailyGoal * 1.5),
        tier: 'silver',
        category: 'daily'
      },
      
      // Streak achievements
      {
        id: 'streak_3',
        icon: <Flame className="w-6 h-6" />,
        title: 'Sequência de Fogo',
        description: '3 dias consecutivos atingindo a meta',
        unlocked: currentStreak >= 3 || maxStreak >= 3,
        progress: Math.min(Math.max(currentStreak, maxStreak), 3),
        maxProgress: 3,
        tier: 'bronze',
        category: 'streak'
      },
      {
        id: 'streak_7',
        icon: <Flame className="w-6 h-6" />,
        title: 'Semana Perfeita',
        description: '7 dias consecutivos atingindo a meta',
        unlocked: currentStreak >= 7 || maxStreak >= 7,
        progress: Math.min(Math.max(currentStreak, maxStreak), 7),
        maxProgress: 7,
        tier: 'silver',
        category: 'streak'
      },
      {
        id: 'streak_14',
        icon: <Crown className="w-6 h-6" />,
        title: 'Duas Semanas',
        description: '14 dias consecutivos atingindo a meta',
        unlocked: currentStreak >= 14 || maxStreak >= 14,
        progress: Math.min(Math.max(currentStreak, maxStreak), 14),
        maxProgress: 14,
        tier: 'gold',
        category: 'streak'
      },
      {
        id: 'streak_30',
        icon: <Trophy className="w-6 h-6" />,
        title: 'Mês Invicto',
        description: '30 dias consecutivos atingindo a meta',
        unlocked: currentStreak >= 30 || maxStreak >= 30,
        progress: Math.min(Math.max(currentStreak, maxStreak), 30),
        maxProgress: 30,
        tier: 'diamond',
        category: 'streak'
      },
      
      // Volume achievements
      {
        id: 'volume_10',
        icon: <Droplets className="w-6 h-6" />,
        title: '10 Litros',
        description: 'Beba 10 litros de água no total',
        unlocked: totalLiters >= 10,
        progress: Math.min(Math.floor(totalLiters), 10),
        maxProgress: 10,
        tier: 'bronze',
        category: 'volume'
      },
      {
        id: 'volume_50',
        icon: <Droplets className="w-6 h-6" />,
        title: '50 Litros',
        description: 'Beba 50 litros de água no total',
        unlocked: totalLiters >= 50,
        progress: Math.min(Math.floor(totalLiters), 50),
        maxProgress: 50,
        tier: 'silver',
        category: 'volume'
      },
      {
        id: 'volume_100',
        icon: <Medal className="w-6 h-6" />,
        title: 'Centurião',
        description: 'Beba 100 litros de água no total',
        unlocked: totalLiters >= 100,
        progress: Math.min(Math.floor(totalLiters), 100),
        maxProgress: 100,
        tier: 'gold',
        category: 'volume'
      },
      {
        id: 'volume_500',
        icon: <Star className="w-6 h-6" />,
        title: 'Oceano',
        description: 'Beba 500 litros de água no total',
        unlocked: totalLiters >= 500,
        progress: Math.min(Math.floor(totalLiters), 500),
        maxProgress: 500,
        tier: 'diamond',
        category: 'volume'
      },
      
      // Consistency achievements
      {
        id: 'days_7',
        icon: <Calendar className="w-6 h-6" />,
        title: 'Primeira Semana',
        description: 'Atinja a meta 7 vezes',
        unlocked: daysGoalMet >= 7,
        progress: Math.min(daysGoalMet, 7),
        maxProgress: 7,
        tier: 'bronze',
        category: 'consistency'
      },
      {
        id: 'days_30',
        icon: <Calendar className="w-6 h-6" />,
        title: 'Mês Produtivo',
        description: 'Atinja a meta 30 vezes',
        unlocked: daysGoalMet >= 30,
        progress: Math.min(daysGoalMet, 30),
        maxProgress: 30,
        tier: 'silver',
        category: 'consistency'
      },
      {
        id: 'days_100',
        icon: <TrendingUp className="w-6 h-6" />,
        title: 'Triplo Dígito',
        description: 'Atinja a meta 100 vezes',
        unlocked: daysGoalMet >= 100,
        progress: Math.min(daysGoalMet, 100),
        maxProgress: 100,
        tier: 'gold',
        category: 'consistency'
      },
      {
        id: 'days_365',
        icon: <Heart className="w-6 h-6" />,
        title: 'Hábito de Vida',
        description: 'Atinja a meta 365 vezes',
        unlocked: daysGoalMet >= 365,
        progress: Math.min(daysGoalMet, 365),
        maxProgress: 365,
        tier: 'diamond',
        category: 'consistency'
      },
      {
        id: 'week_perfect',
        icon: <Award className="w-6 h-6" />,
        title: 'Semana Perfeita',
        description: 'Atinja a meta todos os dias desta semana',
        unlocked: weekDaysGoalMet === 7,
        progress: weekDaysGoalMet,
        maxProgress: 7,
        tier: 'gold',
        category: 'consistency'
      }
    ];
  }, [records, dailyGoal]);

  const getDefaultAchievements = (): HydrationAchievement[] => {
    return [
      {
        id: 'first_sip',
        icon: <Droplets className="w-6 h-6" />,
        title: 'Primeiro Gole',
        description: 'Registre sua primeira hidratação',
        unlocked: false,
        progress: 0,
        maxProgress: 1,
        tier: 'bronze',
        category: 'daily'
      }
    ];
  };

  const filteredAchievements = useMemo(() => {
    if (selectedCategory === 'all') return achievements;
    return achievements.filter(a => a.category === selectedCategory);
  }, [achievements, selectedCategory]);

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalPoints = achievements.reduce((sum, a) => {
    if (!a.unlocked) return sum;
    switch (a.tier) {
      case 'bronze': return sum + 10;
      case 'silver': return sum + 25;
      case 'gold': return sum + 50;
      case 'diamond': return sum + 100;
      default: return sum;
    }
  }, 0);

  const categories = [
    { id: 'all', label: 'Todas', icon: <Trophy size={14} /> },
    { id: 'daily', label: 'Diárias', icon: <Target size={14} /> },
    { id: 'streak', label: 'Sequências', icon: <Flame size={14} /> },
    { id: 'volume', label: 'Volume', icon: <Droplets size={14} /> },
    { id: 'consistency', label: 'Consistência', icon: <Calendar size={14} /> }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        >
          <Trophy className="w-8 h-8 text-cyan-500" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 gap-3"
      >
        <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
          >
            <Trophy className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
          </motion.div>
          <p className="text-2xl font-bold text-cyan-400">{unlockedCount}/{achievements.length}</p>
          <p className="text-xs text-muted-foreground">Conquistas</p>
        </div>
        
        <div className="p-4 rounded-xl bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.3 }}
          >
            <Star className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
          </motion.div>
          <p className="text-2xl font-bold text-yellow-400">{totalPoints}</p>
          <p className="text-xs text-muted-foreground">Pontos</p>
        </div>
      </motion.div>

      {/* Category Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map((cat) => (
          <motion.button
            key={cat.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelectedCategory(cat.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              selectedCategory === cat.id
                ? 'bg-cyan-500/30 text-cyan-400 border border-cyan-500/50'
                : 'bg-card/50 text-muted-foreground border border-border/50 hover:border-cyan-500/30'
            }`}
          >
            {cat.icon}
            {cat.label}
          </motion.button>
        ))}
      </div>

      {/* Achievements Grid */}
      <div className="grid sm:grid-cols-2 gap-3">
        <AnimatePresence mode="popLayout">
          {filteredAchievements.map((achievement, index) => (
            <AchievementCard 
              key={achievement.id} 
              achievement={achievement} 
              index={index}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Tier Legend */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex justify-center gap-4 pt-4 text-xs text-muted-foreground"
      >
        <span className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-gradient-to-br from-amber-700 to-orange-600" />
          Bronze (10pts)
        </span>
        <span className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-gradient-to-br from-slate-400 to-gray-300" />
          Prata (25pts)
        </span>
        <span className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-gradient-to-br from-yellow-500 to-amber-400" />
          Ouro (50pts)
        </span>
        <span className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-gradient-to-br from-cyan-400 to-blue-400" />
          Diamante (100pts)
        </span>
      </motion.div>
    </div>
  );
};

export default HydrationAchievements;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Award, Trophy, Star, Flame, Droplets, Scale, Dumbbell, Target, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { subDays } from 'date-fns';
import ClientPageHeader from './ClientPageHeader';

interface Achievement {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  unlocked: boolean;
  progress?: number;
  maxProgress?: number;
}

const Achievements: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    if (profile) {
      fetchAchievements();
    }
  }, [profile]);

  const fetchAchievements = async () => {
    try {
      const today = new Date();
      const weekAgo = subDays(today, 7);
      const monthAgo = subDays(today, 30);

      // Fetch all relevant data
      const [workoutsRes, weightsRes, hydrationRes] = await Promise.all([
        supabase
          .from('workout_logs')
          .select('*')
          .eq('profile_id', profile?.profile_id)
          .not('completed_at', 'is', null),
        supabase
          .from('weight_records')
          .select('*')
          .eq('profile_id', profile?.profile_id),
        supabase
          .from('hydration_records')
          .select('*')
          .eq('profile_id', profile?.profile_id)
      ]);

      const workouts = workoutsRes.data || [];
      const weights = weightsRes.data || [];
      const hydration = hydrationRes.data || [];

      // Calculate stats
      const totalWorkouts = workouts.length;
      const weekWorkouts = workouts.filter(w => new Date(w.workout_date) >= weekAgo).length;
      const monthWorkouts = workouts.filter(w => new Date(w.workout_date) >= monthAgo).length;
      const totalWeightRecords = weights.length;
      const totalHydrationRecords = hydration.length;

      // Define achievements
      const achievementsList: Achievement[] = [
        {
          id: 'first_workout',
          icon: <Dumbbell className="w-8 h-8" />,
          title: 'Primeiro Passo',
          description: 'Complete seu primeiro treino',
          unlocked: totalWorkouts >= 1,
          progress: Math.min(totalWorkouts, 1),
          maxProgress: 1
        },
        {
          id: 'workout_10',
          icon: <Target className="w-8 h-8" />,
          title: 'Consistência',
          description: 'Complete 10 treinos',
          unlocked: totalWorkouts >= 10,
          progress: Math.min(totalWorkouts, 10),
          maxProgress: 10
        },
        {
          id: 'workout_50',
          icon: <Trophy className="w-8 h-8" />,
          title: 'Dedicação',
          description: 'Complete 50 treinos',
          unlocked: totalWorkouts >= 50,
          progress: Math.min(totalWorkouts, 50),
          maxProgress: 50
        },
        {
          id: 'workout_100',
          icon: <Star className="w-8 h-8" />,
          title: 'Lendário',
          description: 'Complete 100 treinos',
          unlocked: totalWorkouts >= 100,
          progress: Math.min(totalWorkouts, 100),
          maxProgress: 100
        },
        {
          id: 'week_5',
          icon: <Flame className="w-8 h-8" />,
          title: 'Semana de Fogo',
          description: 'Complete 5 treinos em uma semana',
          unlocked: weekWorkouts >= 5,
          progress: Math.min(weekWorkouts, 5),
          maxProgress: 5
        },
        {
          id: 'month_20',
          icon: <Zap className="w-8 h-8" />,
          title: 'Mês Intenso',
          description: 'Complete 20 treinos em um mês',
          unlocked: monthWorkouts >= 20,
          progress: Math.min(monthWorkouts, 20),
          maxProgress: 20
        },
        {
          id: 'weight_track',
          icon: <Scale className="w-8 h-8" />,
          title: 'Controlador de Peso',
          description: 'Registre seu peso 10 vezes',
          unlocked: totalWeightRecords >= 10,
          progress: Math.min(totalWeightRecords, 10),
          maxProgress: 10
        },
        {
          id: 'hydration_master',
          icon: <Droplets className="w-8 h-8" />,
          title: 'Hidratação Mestre',
          description: 'Registre hidratação 30 vezes',
          unlocked: totalHydrationRecords >= 30,
          progress: Math.min(totalHydrationRecords, 30),
          maxProgress: 30
        }
      ];

      setAchievements(achievementsList);
    } catch (error) {
      console.error('Error fetching achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col overflow-hidden"
    >
      <ClientPageHeader 
        title="METAS ALCANÇADAS" 
        icon={<Award className="w-5 h-5" />} 
        iconColor="text-amber-500" 
      />

      <div className="flex-1 overflow-auto space-y-6">
      <div className="bg-gradient-to-br from-amber-500/20 to-yellow-500/20 backdrop-blur-md rounded-xl p-6 border border-amber-500/30 text-center">
        <Trophy className="w-16 h-16 text-amber-500 mx-auto mb-4" />
        <p className="text-4xl font-bold text-amber-500">{unlockedCount}/{achievements.length}</p>
        <p className="text-muted-foreground">Conquistas Desbloqueadas</p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {achievements.map((achievement, index) => (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className={`bg-card/80 backdrop-blur-md border-border/50 overflow-hidden ${
                achievement.unlocked ? 'border-amber-500/50' : 'opacity-60'
              }`}>
                <CardContent className="p-4 text-center">
                  <div className={`mb-3 ${
                    achievement.unlocked ? 'text-amber-500' : 'text-muted-foreground'
                  }`}>
                    {achievement.icon}
                  </div>
                  
                  <h3 className={`font-bebas text-lg tracking-wider ${
                    achievement.unlocked ? 'text-amber-500' : 'text-muted-foreground'
                  }`}>
                    {achievement.title}
                  </h3>
                  
                  <p className="text-xs text-muted-foreground mt-1">
                    {achievement.description}
                  </p>

                  {achievement.maxProgress && (
                    <div className="mt-3">
                      <div className="w-full h-2 bg-background/50 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            achievement.unlocked ? 'bg-amber-500' : 'bg-muted-foreground'
                          }`}
                          style={{ 
                            width: `${(achievement.progress || 0) / achievement.maxProgress * 100}%` 
                          }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {achievement.progress}/{achievement.maxProgress}
                      </p>
                    </div>
                  )}

                  {achievement.unlocked && (
                    <div className="mt-3">
                      <span className="text-xs bg-amber-500/20 text-amber-500 px-2 py-1 rounded-full">
                        ✓ Desbloqueado
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
        )}
      </div>
    </motion.div>
  );
};

export default Achievements;

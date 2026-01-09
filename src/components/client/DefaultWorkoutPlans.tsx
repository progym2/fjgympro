import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Dumbbell, Plus, ChevronRight, Clock, Target, 
  Flame, Heart, Users, Sparkles, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Planos de treino padrão para iniciantes
const DEFAULT_PLANS = [
  {
    name: 'Treino Iniciante - Segunda (Peito e Tríceps)',
    description: 'Treino focado em peito e tríceps para iniciantes',
    weekday: 1,
    exercises: [
      { name: 'Supino Reto com Halteres', muscle_group: 'Peito', sets: 3, reps: 12, rest: 60 },
      { name: 'Supino Inclinado com Halteres', muscle_group: 'Peito', sets: 3, reps: 12, rest: 60 },
      { name: 'Crucifixo', muscle_group: 'Peito', sets: 3, reps: 12, rest: 60 },
      { name: 'Tríceps Pulley', muscle_group: 'Tríceps', sets: 3, reps: 15, rest: 45 },
      { name: 'Tríceps Testa', muscle_group: 'Tríceps', sets: 3, reps: 12, rest: 45 },
      { name: 'Mergulho no Banco', muscle_group: 'Tríceps', sets: 3, reps: 12, rest: 45 },
    ]
  },
  {
    name: 'Treino Iniciante - Terça (Costas e Bíceps)',
    description: 'Treino focado em costas e bíceps para iniciantes',
    weekday: 2,
    exercises: [
      { name: 'Puxada Frontal', muscle_group: 'Costas', sets: 3, reps: 12, rest: 60 },
      { name: 'Remada Curvada', muscle_group: 'Costas', sets: 3, reps: 12, rest: 60 },
      { name: 'Remada Unilateral', muscle_group: 'Costas', sets: 3, reps: 12, rest: 60 },
      { name: 'Rosca Direta', muscle_group: 'Bíceps', sets: 3, reps: 12, rest: 45 },
      { name: 'Rosca Alternada', muscle_group: 'Bíceps', sets: 3, reps: 12, rest: 45 },
      { name: 'Rosca Martelo', muscle_group: 'Bíceps', sets: 3, reps: 12, rest: 45 },
    ]
  },
  {
    name: 'Treino Iniciante - Quarta (Pernas + Glúteos)',
    description: 'Treino completo de pernas e glúteos - ideal para homens e mulheres',
    weekday: 3,
    exercises: [
      { name: 'Agachamento Livre', muscle_group: 'Pernas', sets: 4, reps: 12, rest: 90 },
      { name: 'Leg Press 45°', muscle_group: 'Pernas', sets: 4, reps: 15, rest: 90 },
      { name: 'Cadeira Extensora', muscle_group: 'Pernas', sets: 3, reps: 15, rest: 60 },
      { name: 'Mesa Flexora', muscle_group: 'Pernas', sets: 3, reps: 15, rest: 60 },
      { name: 'Elevação Pélvica', muscle_group: 'Glúteos', sets: 4, reps: 15, rest: 60 },
      { name: 'Abdução de Quadril', muscle_group: 'Glúteos', sets: 3, reps: 15, rest: 45 },
    ]
  },
  {
    name: 'Treino Iniciante - Quinta (Ombros e Abdômen)',
    description: 'Treino focado em ombros e core para iniciantes',
    weekday: 4,
    exercises: [
      { name: 'Desenvolvimento com Halteres', muscle_group: 'Ombros', sets: 3, reps: 12, rest: 60 },
      { name: 'Elevação Lateral', muscle_group: 'Ombros', sets: 3, reps: 15, rest: 45 },
      { name: 'Elevação Frontal', muscle_group: 'Ombros', sets: 3, reps: 12, rest: 45 },
      { name: 'Encolhimento de Ombros', muscle_group: 'Ombros', sets: 3, reps: 15, rest: 45 },
      { name: 'Abdominal Crunch', muscle_group: 'Abdômen', sets: 3, reps: 20, rest: 30 },
      { name: 'Prancha', muscle_group: 'Abdômen', sets: 3, reps: 30, rest: 30 },
    ]
  },
  {
    name: 'Treino Iniciante - Sexta (Cardio + Full Body)',
    description: 'Treino de cardio e exercícios funcionais para finalizar a semana',
    weekday: 5,
    exercises: [
      { name: 'Esteira - Caminhada/Corrida', muscle_group: 'Cardio', sets: 1, reps: 20, rest: 60 },
      { name: 'Burpee', muscle_group: 'Cardio', sets: 3, reps: 10, rest: 60 },
      { name: 'Agachamento com Salto', muscle_group: 'Cardio', sets: 3, reps: 15, rest: 45 },
      { name: 'Polichinelo', muscle_group: 'Cardio', sets: 3, reps: 30, rest: 30 },
      { name: 'Mountain Climber', muscle_group: 'Cardio', sets: 3, reps: 20, rest: 30 },
      { name: 'Abdominal Bicicleta', muscle_group: 'Abdômen', sets: 3, reps: 20, rest: 30 },
    ]
  },
];

interface DefaultWorkoutPlansProps {
  onPlanCreated?: () => void;
}

const DefaultWorkoutPlans: React.FC<DefaultWorkoutPlansProps> = ({ onPlanCreated }) => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState<number | null>(null);
  const [createdPlans, setCreatedPlans] = useState<number[]>([]);

  const createPlan = async (planIndex: number) => {
    if (!profile?.profile_id) {
      toast.error('Faça login para criar planos');
      return;
    }

    setLoading(planIndex);
    const plan = DEFAULT_PLANS[planIndex];

    try {
      // First, ensure exercises exist in the database
      const exerciseIds: Record<string, string> = {};
      
      for (const exercise of plan.exercises) {
        // Check if exercise exists
        const { data: existingExercise } = await supabase
          .from('exercises')
          .select('id')
          .eq('name', exercise.name)
          .maybeSingle();

        if (existingExercise) {
          exerciseIds[exercise.name] = existingExercise.id;
        } else {
          // Create the exercise
          const { data: newExercise, error } = await supabase
            .from('exercises')
            .insert({
              name: exercise.name,
              muscle_group: exercise.muscle_group,
              description: `Exercício de ${exercise.muscle_group}`,
              is_system: false,
              created_by: profile.profile_id
            })
            .select('id')
            .single();

          if (error) throw error;
          if (newExercise) {
            exerciseIds[exercise.name] = newExercise.id;
          }
        }
      }

      // Create the workout plan
      const { data: workoutPlan, error: planError } = await supabase
        .from('workout_plans')
        .insert({
          name: plan.name,
          description: plan.description,
          created_by: profile.profile_id,
          is_active: true,
          is_instructor_plan: false,
          weekdays: [plan.weekday]
        })
        .select('id')
        .single();

      if (planError) throw planError;

      // Add exercises to the plan
      const planExercises = plan.exercises.map((exercise, index) => ({
        workout_plan_id: workoutPlan.id,
        exercise_id: exerciseIds[exercise.name],
        sets: exercise.sets,
        reps: exercise.reps,
        rest_seconds: exercise.rest,
        order_index: index,
        day_of_week: plan.weekday
      }));

      const { error: exercisesError } = await supabase
        .from('workout_plan_exercises')
        .insert(planExercises);

      if (exercisesError) throw exercisesError;

      setCreatedPlans(prev => [...prev, planIndex]);
      toast.success(`✅ ${plan.name} criado com sucesso!`);
      onPlanCreated?.();

    } catch (error) {
      console.error('Error creating plan:', error);
      toast.error('Erro ao criar plano de treino');
    } finally {
      setLoading(null);
    }
  };

  const createAllPlans = async () => {
    for (let i = 0; i < DEFAULT_PLANS.length; i++) {
      if (!createdPlans.includes(i)) {
        await createPlan(i);
      }
    }
  };

  const getDayColor = (weekday: number) => {
    const colors: Record<number, string> = {
      1: 'bg-red-500/20 text-red-400 border-red-500/30',
      2: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      3: 'bg-green-500/20 text-green-400 border-green-500/30',
      4: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      5: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    };
    return colors[weekday] || 'bg-muted text-muted-foreground';
  };

  const getDayName = (weekday: number) => {
    const days: Record<number, string> = {
      1: 'Segunda',
      2: 'Terça',
      3: 'Quarta',
      4: 'Quinta',
      5: 'Sexta',
    };
    return days[weekday] || '';
  };

  const getMuscleIcon = (description: string) => {
    if (description.includes('Cardio')) return <Heart className="w-4 h-4" />;
    if (description.includes('Pernas') || description.includes('Glúteos')) return <Users className="w-4 h-4" />;
    return <Dumbbell className="w-4 h-4" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bebas text-lg text-foreground">PLANOS PARA INICIANTES</h3>
            <p className="text-xs text-muted-foreground">Treinos prontos para começar agora</p>
          </div>
        </div>
        {createdPlans.length < DEFAULT_PLANS.length && (
          <Button 
            size="sm" 
            onClick={createAllPlans}
            disabled={loading !== null}
            className="text-xs"
          >
            <Plus size={14} className="mr-1" />
            Adicionar Todos
          </Button>
        )}
      </div>

      {/* Plans Grid */}
      <div className="grid gap-3">
        {DEFAULT_PLANS.map((plan, index) => (
          <Card 
            key={index}
            className={`bg-card/80 backdrop-blur-sm border-border/50 transition-all ${
              createdPlans.includes(index) ? 'opacity-60' : ''
            }`}
          >
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                {/* Day Badge */}
                <div className={`flex flex-col items-center justify-center p-2 rounded-lg border ${getDayColor(plan.weekday)}`}>
                  {getMuscleIcon(plan.description)}
                  <span className="text-[10px] font-bold mt-0.5">{getDayName(plan.weekday)}</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm text-foreground truncate">{plan.name.replace('Treino Iniciante - ', '').replace(/\(.*\)/, '').trim()}</h4>
                  <p className="text-xs text-muted-foreground truncate">{plan.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-[10px] h-4">
                      <Dumbbell size={10} className="mr-1" />
                      {plan.exercises.length} exercícios
                    </Badge>
                    <Badge variant="outline" className="text-[10px] h-4">
                      <Clock size={10} className="mr-1" />
                      ~45min
                    </Badge>
                  </div>
                </div>

                {/* Action */}
                {createdPlans.includes(index) ? (
                  <div className="flex items-center gap-1 text-green-500">
                    <Check size={16} />
                    <span className="text-xs">Adicionado</span>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => createPlan(index)}
                    disabled={loading !== null}
                    className="h-8"
                  >
                    {loading === index ? (
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Plus size={14} className="mr-1" />
                        Usar
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* Exercise Preview */}
              <div className="mt-2 pt-2 border-t border-border/30">
                <div className="flex flex-wrap gap-1">
                  {plan.exercises.slice(0, 4).map((ex, i) => (
                    <Badge 
                      key={i} 
                      variant="secondary" 
                      className="text-[9px] h-4 bg-muted/50"
                    >
                      {ex.name.length > 15 ? ex.name.substring(0, 15) + '...' : ex.name}
                    </Badge>
                  ))}
                  {plan.exercises.length > 4 && (
                    <Badge variant="secondary" className="text-[9px] h-4 bg-muted/50">
                      +{plan.exercises.length - 4}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {createdPlans.length === DEFAULT_PLANS.length && (
        <div className="text-center py-4">
          <p className="text-sm text-green-500 font-medium">
            ✅ Todos os planos foram adicionados!
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Acesse "Meus Treinos" para ver seus planos
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default DefaultWorkoutPlans;

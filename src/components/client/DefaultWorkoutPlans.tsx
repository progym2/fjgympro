import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dumbbell, Plus, Clock, Heart, Users, Sparkles, Check,
  ChevronDown, ChevronUp, Zap, Target, Flame
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

// Planos de treino padrão para iniciantes
const DEFAULT_PLANS = [
  {
    name: 'Treino Iniciante - Segunda (Peito e Tríceps)',
    shortName: 'Peito & Tríceps',
    description: 'Treino focado em peito e tríceps para iniciantes',
    weekday: 1,
    color: 'rose',
    icon: Dumbbell,
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
    shortName: 'Costas & Bíceps',
    description: 'Treino focado em costas e bíceps para iniciantes',
    weekday: 2,
    color: 'blue',
    icon: Target,
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
    shortName: 'Pernas & Glúteos',
    description: 'Treino completo de pernas e glúteos - ideal para homens e mulheres',
    weekday: 3,
    color: 'green',
    icon: Users,
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
    shortName: 'Ombros & Core',
    description: 'Treino focado em ombros e core para iniciantes',
    weekday: 4,
    color: 'amber',
    icon: Zap,
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
    shortName: 'Cardio & Full Body',
    description: 'Treino de cardio e exercícios funcionais para finalizar a semana',
    weekday: 5,
    color: 'purple',
    icon: Flame,
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

const colorStyles: Record<string, { bg: string; border: string; text: string; gradient: string }> = {
  rose: { bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-500', gradient: 'from-rose-500/20 to-rose-500/5' },
  blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-500', gradient: 'from-blue-500/20 to-blue-500/5' },
  green: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-500', gradient: 'from-green-500/20 to-green-500/5' },
  amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-500', gradient: 'from-amber-500/20 to-amber-500/5' },
  purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-500', gradient: 'from-purple-500/20 to-purple-500/5' },
};

interface DefaultWorkoutPlansProps {
  onPlanCreated?: () => void;
}

const DefaultWorkoutPlans: React.FC<DefaultWorkoutPlansProps> = ({ onPlanCreated }) => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState<number | null>(null);
  const [createdPlans, setCreatedPlans] = useState<number[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedPlan, setExpandedPlan] = useState<number | null>(null);

  const getDayName = (weekday: number) => {
    const days: Record<number, string> = { 1: 'SEG', 2: 'TER', 3: 'QUA', 4: 'QUI', 5: 'SEX' };
    return days[weekday] || '';
  };

  const createPlan = async (planIndex: number) => {
    if (!profile?.profile_id) {
      toast.error('Faça login para criar planos');
      return;
    }

    setLoading(planIndex);
    const plan = DEFAULT_PLANS[planIndex];

    try {
      const exerciseIds: Record<string, string> = {};
      
      for (const exercise of plan.exercises) {
        const { data: existingExercise } = await supabase
          .from('exercises')
          .select('id')
          .eq('name', exercise.name)
          .maybeSingle();

        if (existingExercise) {
          exerciseIds[exercise.name] = existingExercise.id;
        } else {
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
          if (newExercise) exerciseIds[exercise.name] = newExercise.id;
        }
      }

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
      toast.success(`✅ ${plan.shortName} adicionado!`);
      onPlanCreated?.();

    } catch (error) {
      console.error('Error creating plan:', error);
      toast.error('Erro ao criar plano');
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

  const completedCount = createdPlans.length;
  const totalCount = DEFAULT_PLANS.length;

  return (
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-card via-card to-primary/5">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/20 transition-colors p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  {completedCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-white">{completedCount}</span>
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-bebas text-xl tracking-wide text-foreground">PLANOS PARA INICIANTES</h3>
                  <p className="text-xs text-muted-foreground">
                    {completedCount === totalCount 
                      ? '✅ Todos adicionados!' 
                      : `${totalCount - completedCount} treinos prontos para usar`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {completedCount < totalCount && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                    {totalCount - completedCount} disponíveis
                  </Badge>
                )}
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                </motion.div>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 px-4 pb-4">
            <AnimatePresence>
              {completedCount < totalCount && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4"
                >
                  <Button 
                    onClick={createAllPlans}
                    disabled={loading !== null}
                    className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Todos os Planos ({totalCount - completedCount})
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-3">
              {DEFAULT_PLANS.map((plan, index) => {
                const isCreated = createdPlans.includes(index);
                const isLoading = loading === index;
                const style = colorStyles[plan.color];
                const Icon = plan.icon;
                const isOpen = expandedPlan === index;

                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card 
                      className={`overflow-hidden transition-all duration-200 ${
                        isCreated 
                          ? 'opacity-60 bg-muted/20' 
                          : `bg-gradient-to-r ${style.gradient} ${style.border} hover:shadow-lg`
                      }`}
                    >
                      <div 
                        className="p-3 cursor-pointer"
                        onClick={() => !isCreated && setExpandedPlan(isOpen ? null : index)}
                      >
                        <div className="flex items-center gap-3">
                          {/* Day & Icon */}
                          <div className={`flex flex-col items-center justify-center min-w-[50px] py-2 px-3 rounded-lg ${style.bg} ${style.border} border`}>
                            <Icon className={`w-4 h-4 ${style.text}`} />
                            <span className={`text-[10px] font-bold mt-0.5 ${style.text}`}>{getDayName(plan.weekday)}</span>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-sm text-foreground">{plan.shortName}</h4>
                              {isCreated && (
                                <Badge className="bg-green-500/20 text-green-500 border-green-500/30 text-[10px]">
                                  <Check className="w-3 h-3 mr-1" />
                                  Adicionado
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Dumbbell className="w-3 h-3" />
                                {plan.exercises.length} exercícios
                              </span>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                ~45min
                              </span>
                            </div>
                          </div>

                          {/* Action */}
                          {!isCreated && (
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); createPlan(index); }}
                                disabled={isLoading}
                                className={`h-8 ${style.bg} ${style.text} hover:opacity-80 border ${style.border}`}
                                variant="outline"
                              >
                                {isLoading ? (
                                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <>
                                    <Plus className="w-3 h-3 mr-1" />
                                    Usar
                                  </>
                                )}
                              </Button>
                              <motion.div
                                animate={{ rotate: isOpen ? 180 : 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                              </motion.div>
                            </div>
                          )}
                        </div>

                        {/* Expanded exercises */}
                        <AnimatePresence>
                          {isOpen && !isCreated && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-3 pt-3 border-t border-border/30"
                            >
                              <div className="grid grid-cols-2 gap-2">
                                {plan.exercises.map((ex, i) => (
                                  <div 
                                    key={i} 
                                    className="flex items-center gap-2 p-2 rounded-lg bg-background/50 text-xs"
                                  >
                                    <div className={`w-1.5 h-1.5 rounded-full ${style.text.replace('text', 'bg')}`} />
                                    <span className="truncate text-foreground">{ex.name}</span>
                                    <span className="text-foreground/70 ml-auto font-medium">{ex.sets}x{ex.reps}</span>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            {completedCount === totalCount && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-center"
              >
                <Check className="w-8 h-8 mx-auto mb-2 text-green-500" />
                <p className="font-medium text-green-500">Todos os planos adicionados!</p>
                <p className="text-xs text-muted-foreground mt-1">Acesse "Meus Treinos" para começar</p>
              </motion.div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default DefaultWorkoutPlans;

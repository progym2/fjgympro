import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dumbbell, Plus, Clock, Heart, Users, Sparkles, Check,
  ChevronDown, ChevronUp, Zap, Target, Flame, Play, Star, Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import ExerciseVideoModal from './ExerciseVideoModal';

type DifficultyLevel = 'iniciante' | 'intermediario' | 'avancado';

interface PlanExercise {
  name: string;
  muscle_group: string;
  sets: number;
  reps: number;
  rest: number;
}

interface WorkoutPlanTemplate {
  id: string;
  name: string;
  shortName: string;
  description: string;
  weekday: number;
  color: string;
  icon: React.ElementType;
  level: DifficultyLevel;
  exercises: PlanExercise[];
}

// Planos de treino por nível
const ALL_PLANS: WorkoutPlanTemplate[] = [
  // ========== INICIANTE ==========
  {
    id: 'ini-1',
    name: 'Treino Iniciante - Segunda (Peito e Tríceps)',
    shortName: 'Peito & Tríceps',
    description: 'Treino focado em peito e tríceps para iniciantes',
    weekday: 1,
    color: 'rose',
    icon: Dumbbell,
    level: 'iniciante',
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
    id: 'ini-2',
    name: 'Treino Iniciante - Terça (Costas e Bíceps)',
    shortName: 'Costas & Bíceps',
    description: 'Treino focado em costas e bíceps para iniciantes',
    weekday: 2,
    color: 'blue',
    icon: Target,
    level: 'iniciante',
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
    id: 'ini-3',
    name: 'Treino Iniciante - Quarta (Pernas + Glúteos)',
    shortName: 'Pernas & Glúteos',
    description: 'Treino completo de pernas e glúteos',
    weekday: 3,
    color: 'green',
    icon: Users,
    level: 'iniciante',
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
    id: 'ini-4',
    name: 'Treino Iniciante - Quinta (Ombros e Abdômen)',
    shortName: 'Ombros & Core',
    description: 'Treino focado em ombros e core',
    weekday: 4,
    color: 'amber',
    icon: Zap,
    level: 'iniciante',
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
    id: 'ini-5',
    name: 'Treino Iniciante - Sexta (Cardio + Full Body)',
    shortName: 'Cardio & Full Body',
    description: 'Treino de cardio e exercícios funcionais',
    weekday: 5,
    color: 'purple',
    icon: Flame,
    level: 'iniciante',
    exercises: [
      { name: 'Esteira - Caminhada/Corrida', muscle_group: 'Cardio', sets: 1, reps: 20, rest: 60 },
      { name: 'Burpee', muscle_group: 'Cardio', sets: 3, reps: 10, rest: 60 },
      { name: 'Agachamento com Salto', muscle_group: 'Cardio', sets: 3, reps: 15, rest: 45 },
      { name: 'Polichinelo', muscle_group: 'Cardio', sets: 3, reps: 30, rest: 30 },
      { name: 'Mountain Climber', muscle_group: 'Cardio', sets: 3, reps: 20, rest: 30 },
      { name: 'Abdominal Bicicleta', muscle_group: 'Abdômen', sets: 3, reps: 20, rest: 30 },
    ]
  },

  // ========== INTERMEDIÁRIO ==========
  {
    id: 'int-1',
    name: 'Treino Intermediário - Push (Peito, Ombro, Tríceps)',
    shortName: 'Push Day',
    description: 'Treino de empurrar com volume moderado',
    weekday: 1,
    color: 'rose',
    icon: Dumbbell,
    level: 'intermediario',
    exercises: [
      { name: 'Supino Reto com Barra', muscle_group: 'Peito', sets: 4, reps: 10, rest: 90 },
      { name: 'Supino Inclinado com Halteres', muscle_group: 'Peito', sets: 4, reps: 10, rest: 75 },
      { name: 'Crossover', muscle_group: 'Peito', sets: 3, reps: 12, rest: 60 },
      { name: 'Desenvolvimento Militar', muscle_group: 'Ombros', sets: 4, reps: 10, rest: 75 },
      { name: 'Elevação Lateral', muscle_group: 'Ombros', sets: 4, reps: 12, rest: 45 },
      { name: 'Tríceps Corda', muscle_group: 'Tríceps', sets: 3, reps: 12, rest: 45 },
      { name: 'Tríceps Francês', muscle_group: 'Tríceps', sets: 3, reps: 12, rest: 45 },
    ]
  },
  {
    id: 'int-2',
    name: 'Treino Intermediário - Pull (Costas, Bíceps)',
    shortName: 'Pull Day',
    description: 'Treino de puxar com foco em força',
    weekday: 2,
    color: 'blue',
    icon: Target,
    level: 'intermediario',
    exercises: [
      { name: 'Barra Fixa', muscle_group: 'Costas', sets: 4, reps: 8, rest: 90 },
      { name: 'Remada Curvada com Barra', muscle_group: 'Costas', sets: 4, reps: 10, rest: 75 },
      { name: 'Puxada Frontal', muscle_group: 'Costas', sets: 3, reps: 12, rest: 60 },
      { name: 'Remada Cavalinho', muscle_group: 'Costas', sets: 3, reps: 12, rest: 60 },
      { name: 'Rosca Scott', muscle_group: 'Bíceps', sets: 3, reps: 10, rest: 45 },
      { name: 'Rosca Concentrada', muscle_group: 'Bíceps', sets: 3, reps: 12, rest: 45 },
      { name: 'Rosca Inversa', muscle_group: 'Bíceps', sets: 3, reps: 12, rest: 45 },
    ]
  },
  {
    id: 'int-3',
    name: 'Treino Intermediário - Legs (Pernas Completo)',
    shortName: 'Leg Day',
    description: 'Treino intenso de pernas com progressão',
    weekday: 3,
    color: 'green',
    icon: Users,
    level: 'intermediario',
    exercises: [
      { name: 'Agachamento com Barra', muscle_group: 'Pernas', sets: 5, reps: 8, rest: 120 },
      { name: 'Leg Press 45°', muscle_group: 'Pernas', sets: 4, reps: 12, rest: 90 },
      { name: 'Agachamento Búlgaro', muscle_group: 'Pernas', sets: 3, reps: 10, rest: 60 },
      { name: 'Cadeira Extensora', muscle_group: 'Pernas', sets: 4, reps: 12, rest: 60 },
      { name: 'Mesa Flexora', muscle_group: 'Pernas', sets: 4, reps: 12, rest: 60 },
      { name: 'Stiff', muscle_group: 'Pernas', sets: 3, reps: 12, rest: 60 },
      { name: 'Panturrilha em Pé', muscle_group: 'Pernas', sets: 4, reps: 15, rest: 45 },
    ]
  },
  {
    id: 'int-4',
    name: 'Treino Intermediário - Upper (Superior Completo)',
    shortName: 'Upper Body',
    description: 'Treino completo de membros superiores',
    weekday: 4,
    color: 'amber',
    icon: Zap,
    level: 'intermediario',
    exercises: [
      { name: 'Supino Inclinado com Barra', muscle_group: 'Peito', sets: 4, reps: 10, rest: 75 },
      { name: 'Remada Sentada', muscle_group: 'Costas', sets: 4, reps: 10, rest: 75 },
      { name: 'Desenvolvimento Arnold', muscle_group: 'Ombros', sets: 3, reps: 12, rest: 60 },
      { name: 'Crucifixo Inclinado', muscle_group: 'Peito', sets: 3, reps: 12, rest: 45 },
      { name: 'Puxada Supinada', muscle_group: 'Costas', sets: 3, reps: 12, rest: 45 },
      { name: 'Rosca Direta com Barra', muscle_group: 'Bíceps', sets: 3, reps: 10, rest: 45 },
      { name: 'Tríceps Testa com Barra', muscle_group: 'Tríceps', sets: 3, reps: 10, rest: 45 },
    ]
  },
  {
    id: 'int-5',
    name: 'Treino Intermediário - Core & Cardio HIIT',
    shortName: 'HIIT & Core',
    description: 'Treino intervalado de alta intensidade',
    weekday: 5,
    color: 'purple',
    icon: Flame,
    level: 'intermediario',
    exercises: [
      { name: 'Sprint na Esteira', muscle_group: 'Cardio', sets: 8, reps: 30, rest: 30 },
      { name: 'Burpee com Flexão', muscle_group: 'Cardio', sets: 4, reps: 12, rest: 45 },
      { name: 'Box Jump', muscle_group: 'Cardio', sets: 4, reps: 10, rest: 45 },
      { name: 'Kettlebell Swing', muscle_group: 'Cardio', sets: 4, reps: 15, rest: 45 },
      { name: 'Prancha com Elevação', muscle_group: 'Abdômen', sets: 3, reps: 12, rest: 30 },
      { name: 'Abdominal Infra', muscle_group: 'Abdômen', sets: 3, reps: 15, rest: 30 },
      { name: 'Russian Twist', muscle_group: 'Abdômen', sets: 3, reps: 20, rest: 30 },
    ]
  },

  // ========== AVANÇADO ==========
  {
    id: 'adv-1',
    name: 'Treino Avançado - Peito & Tríceps (Alto Volume)',
    shortName: 'Chest & Tri Pro',
    description: 'Treino de alto volume para hipertrofia máxima',
    weekday: 1,
    color: 'rose',
    icon: Dumbbell,
    level: 'avancado',
    exercises: [
      { name: 'Supino Reto com Barra', muscle_group: 'Peito', sets: 5, reps: 6, rest: 120 },
      { name: 'Supino Inclinado com Halteres', muscle_group: 'Peito', sets: 4, reps: 8, rest: 90 },
      { name: 'Supino Declinado', muscle_group: 'Peito', sets: 4, reps: 10, rest: 75 },
      { name: 'Crossover Alto', muscle_group: 'Peito', sets: 4, reps: 12, rest: 45 },
      { name: 'Mergulho em Paralelas', muscle_group: 'Tríceps', sets: 4, reps: 10, rest: 60 },
      { name: 'Tríceps Testa com Barra EZ', muscle_group: 'Tríceps', sets: 4, reps: 10, rest: 45 },
      { name: 'Tríceps Corda Drop Set', muscle_group: 'Tríceps', sets: 3, reps: 15, rest: 30 },
    ]
  },
  {
    id: 'adv-2',
    name: 'Treino Avançado - Costas & Bíceps (Força)',
    shortName: 'Back & Bi Pro',
    description: 'Treino focado em força e densidade muscular',
    weekday: 2,
    color: 'blue',
    icon: Target,
    level: 'avancado',
    exercises: [
      { name: 'Levantamento Terra', muscle_group: 'Costas', sets: 5, reps: 5, rest: 180 },
      { name: 'Barra Fixa com Peso', muscle_group: 'Costas', sets: 4, reps: 8, rest: 90 },
      { name: 'Remada Curvada Pronada', muscle_group: 'Costas', sets: 4, reps: 8, rest: 75 },
      { name: 'Remada Unilateral Pesada', muscle_group: 'Costas', sets: 4, reps: 10, rest: 60 },
      { name: 'Pullover com Halter', muscle_group: 'Costas', sets: 3, reps: 12, rest: 45 },
      { name: 'Rosca Direta com Barra Reta', muscle_group: 'Bíceps', sets: 4, reps: 8, rest: 60 },
      { name: 'Rosca Inclinada', muscle_group: 'Bíceps', sets: 3, reps: 10, rest: 45 },
      { name: 'Rosca 21', muscle_group: 'Bíceps', sets: 2, reps: 21, rest: 45 },
    ]
  },
  {
    id: 'adv-3',
    name: 'Treino Avançado - Pernas (Força & Hipertrofia)',
    shortName: 'Legs Pro',
    description: 'Treino pesado de pernas para atletas',
    weekday: 3,
    color: 'green',
    icon: Users,
    level: 'avancado',
    exercises: [
      { name: 'Agachamento com Barra', muscle_group: 'Pernas', sets: 5, reps: 5, rest: 180 },
      { name: 'Agachamento Frontal', muscle_group: 'Pernas', sets: 4, reps: 8, rest: 120 },
      { name: 'Leg Press 45° Pesado', muscle_group: 'Pernas', sets: 4, reps: 10, rest: 90 },
      { name: 'Hack Squat', muscle_group: 'Pernas', sets: 4, reps: 10, rest: 75 },
      { name: 'Stiff com Barra', muscle_group: 'Pernas', sets: 4, reps: 10, rest: 75 },
      { name: 'Cadeira Extensora Drop Set', muscle_group: 'Pernas', sets: 3, reps: 12, rest: 45 },
      { name: 'Mesa Flexora', muscle_group: 'Pernas', sets: 4, reps: 12, rest: 45 },
      { name: 'Panturrilha Sentado', muscle_group: 'Pernas', sets: 5, reps: 15, rest: 30 },
    ]
  },
  {
    id: 'adv-4',
    name: 'Treino Avançado - Ombros & Trapézio',
    shortName: 'Shoulders Pro',
    description: 'Treino para ombros 3D e trapézio',
    weekday: 4,
    color: 'amber',
    icon: Zap,
    level: 'avancado',
    exercises: [
      { name: 'Desenvolvimento com Barra', muscle_group: 'Ombros', sets: 5, reps: 6, rest: 120 },
      { name: 'Desenvolvimento Arnold', muscle_group: 'Ombros', sets: 4, reps: 10, rest: 75 },
      { name: 'Elevação Lateral com Cabo', muscle_group: 'Ombros', sets: 4, reps: 12, rest: 45 },
      { name: 'Elevação Frontal com Barra', muscle_group: 'Ombros', sets: 3, reps: 12, rest: 45 },
      { name: 'Crucifixo Inverso', muscle_group: 'Ombros', sets: 4, reps: 12, rest: 45 },
      { name: 'Encolhimento com Barra', muscle_group: 'Ombros', sets: 4, reps: 12, rest: 60 },
      { name: 'Face Pull', muscle_group: 'Ombros', sets: 3, reps: 15, rest: 45 },
    ]
  },
  {
    id: 'adv-5',
    name: 'Treino Avançado - Full Body Power',
    shortName: 'Power Day',
    description: 'Treino de potência e força explosiva',
    weekday: 5,
    color: 'purple',
    icon: Flame,
    level: 'avancado',
    exercises: [
      { name: 'Clean and Press', muscle_group: 'Cardio', sets: 5, reps: 5, rest: 120 },
      { name: 'Snatch com Halter', muscle_group: 'Cardio', sets: 4, reps: 6, rest: 90 },
      { name: 'Thruster', muscle_group: 'Cardio', sets: 4, reps: 8, rest: 75 },
      { name: 'Box Jump Alto', muscle_group: 'Cardio', sets: 4, reps: 8, rest: 60 },
      { name: 'Battle Ropes', muscle_group: 'Cardio', sets: 4, reps: 30, rest: 45 },
      { name: 'Farmer Walk', muscle_group: 'Cardio', sets: 3, reps: 40, rest: 60 },
      { name: 'Abdominal Roda', muscle_group: 'Abdômen', sets: 3, reps: 12, rest: 45 },
      { name: 'Dragon Flag', muscle_group: 'Abdômen', sets: 3, reps: 8, rest: 45 },
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

const levelConfig: Record<DifficultyLevel, { label: string; color: string; emoji: string }> = {
  iniciante: { label: 'Iniciante', color: 'bg-green-500/20 text-green-500 border-green-500/30', emoji: '🌱' },
  intermediario: { label: 'Intermediário', color: 'bg-amber-500/20 text-amber-500 border-amber-500/30', emoji: '💪' },
  avancado: { label: 'Avançado', color: 'bg-red-500/20 text-red-500 border-red-500/30', emoji: '🔥' },
};

interface DefaultWorkoutPlansProps {
  onPlanCreated?: () => void;
}

const DefaultWorkoutPlans: React.FC<DefaultWorkoutPlansProps> = ({ onPlanCreated }) => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [createdPlans, setCreatedPlans] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('workout_plan_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<DifficultyLevel | 'favoritos'>('iniciante');
  const [videoModal, setVideoModal] = useState<{
    isOpen: boolean;
    exerciseName: string;
    muscleGroup: string;
    sets: number;
    reps: number;
    rest: number;
  } | null>(null);

  // Save favorites to localStorage
  useEffect(() => {
    localStorage.setItem('workout_plan_favorites', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (planId: string) => {
    setFavorites(prev => 
      prev.includes(planId) 
        ? prev.filter(id => id !== planId)
        : [...prev, planId]
    );
    toast.success(favorites.includes(planId) ? 'Removido dos favoritos' : 'Adicionado aos favoritos ⭐');
  };

  const filteredPlans = useMemo(() => {
    if (selectedLevel === 'favoritos') {
      return ALL_PLANS.filter(p => favorites.includes(p.id));
    }
    return ALL_PLANS.filter(p => p.level === selectedLevel);
  }, [selectedLevel, favorites]);

  const openVideoModal = (ex: PlanExercise) => {
    setVideoModal({
      isOpen: true,
      exerciseName: ex.name,
      muscleGroup: ex.muscle_group,
      sets: ex.sets,
      reps: ex.reps,
      rest: ex.rest
    });
  };

  const getDayName = (weekday: number) => {
    const days: Record<number, string> = { 1: 'SEG', 2: 'TER', 3: 'QUA', 4: 'QUI', 5: 'SEX' };
    return days[weekday] || '';
  };

  const createPlan = async (plan: WorkoutPlanTemplate) => {
    if (!profile?.profile_id) {
      toast.error('Faça login para criar planos');
      return;
    }

    setLoading(plan.id);

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

      setCreatedPlans(prev => [...prev, plan.id]);
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
    for (const plan of filteredPlans) {
      if (!createdPlans.includes(plan.id)) {
        await createPlan(plan);
      }
    }
  };

  const availablePlans = filteredPlans.filter(p => !createdPlans.includes(p.id));

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
                  {favorites.length > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                      <Star size={10} className="text-white fill-white" />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-bebas text-xl tracking-wide text-foreground">PLANOS DE TREINO</h3>
                  <p className="text-xs text-muted-foreground">
                    {ALL_PLANS.length} modelos disponíveis • {favorites.length} favoritos
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
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
            {/* Level Tabs */}
            <Tabs value={selectedLevel} onValueChange={(v) => setSelectedLevel(v as DifficultyLevel | 'favoritos')} className="mb-4">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="iniciante" className="text-xs gap-1">
                  🌱 Iniciante
                </TabsTrigger>
                <TabsTrigger value="intermediario" className="text-xs gap-1">
                  💪 Intermed.
                </TabsTrigger>
                <TabsTrigger value="avancado" className="text-xs gap-1">
                  🔥 Avançado
                </TabsTrigger>
                <TabsTrigger value="favoritos" className="text-xs gap-1">
                  <Star size={12} className={favorites.length > 0 ? 'fill-amber-500 text-amber-500' : ''} />
                  Favoritos
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Add All Button */}
            <AnimatePresence>
              {availablePlans.length > 0 && selectedLevel !== 'favoritos' && (
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
                    Adicionar Todos ({availablePlans.length})
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Empty state for favorites */}
            {selectedLevel === 'favoritos' && favorites.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Star className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhum plano favoritado ainda</p>
                <p className="text-xs">Clique na ⭐ em um plano para favoritar</p>
              </div>
            )}

            {/* Plans List */}
            <div className="space-y-3">
              {filteredPlans.map((plan) => {
                const isCreated = createdPlans.includes(plan.id);
                const isLoading = loading === plan.id;
                const isFavorite = favorites.includes(plan.id);
                const style = colorStyles[plan.color];
                const Icon = plan.icon;
                const isOpen = expandedPlan === plan.id;
                const levelInfo = levelConfig[plan.level];

                return (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    layout
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
                        onClick={() => setExpandedPlan(isOpen ? null : plan.id)}
                      >
                        <div className="flex items-center gap-3">
                          {/* Day & Icon */}
                          <div className={`flex flex-col items-center justify-center min-w-[50px] py-2 px-3 rounded-lg ${style.bg} ${style.border} border`}>
                            <Icon className={`w-4 h-4 ${style.text}`} />
                            <span className={`text-[10px] font-bold mt-0.5 ${style.text}`}>{getDayName(plan.weekday)}</span>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-semibold text-sm text-foreground">{plan.shortName}</h4>
                              <Badge className={`text-[9px] ${levelInfo.color}`}>
                                {levelInfo.emoji} {levelInfo.label}
                              </Badge>
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
                                ~{plan.level === 'avancado' ? '75' : plan.level === 'intermediario' ? '60' : '45'}min
                              </span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={(e) => { e.stopPropagation(); toggleFavorite(plan.id); }}
                              className="h-8 w-8"
                            >
                              <Star 
                                size={16} 
                                className={isFavorite ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground'} 
                              />
                            </Button>
                            {!isCreated && (
                              <Button
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); createPlan(plan); }}
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
                            )}
                            <motion.div
                              animate={{ rotate: isOpen ? 180 : 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            </motion.div>
                          </div>
                        </div>

                        {/* Expanded exercises */}
                        <AnimatePresence>
                          {isOpen && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-3 pt-3 border-t border-border/30"
                            >
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {plan.exercises.map((ex, i) => (
                                  <button 
                                    key={i} 
                                    onClick={(e) => { e.stopPropagation(); openVideoModal(ex); }}
                                    className="flex items-center gap-2 p-2 rounded-lg bg-background/50 hover:bg-primary/10 text-xs transition-colors group text-left w-full"
                                  >
                                    <Play size={12} className="text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium truncate">{ex.name}</p>
                                      <p className="text-muted-foreground text-[10px]">
                                        {ex.sets}x{ex.reps} • {ex.rest}s descanso
                                      </p>
                                    </div>
                                    <Badge variant="outline" className="text-[9px] shrink-0">
                                      {ex.muscle_group}
                                    </Badge>
                                  </button>
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
          </CardContent>
        </CollapsibleContent>
      </Collapsible>

      {/* Video Modal */}
      {videoModal && (
        <ExerciseVideoModal
          isOpen={videoModal.isOpen}
          onClose={() => setVideoModal(null)}
          exerciseName={videoModal.exerciseName}
          muscleGroup={videoModal.muscleGroup}
          sets={videoModal.sets}
          reps={videoModal.reps}
          restSeconds={videoModal.rest}
        />
      )}
    </Card>
  );
};

export default DefaultWorkoutPlans;

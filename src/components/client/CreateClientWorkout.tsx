import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dumbbell, ArrowLeft, Plus, Trash2, Save, Loader2, 
  Video, ChevronRight, X, Play, Check, Edit2, Sparkles, FileText
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import UnsavedChangesDialog from '@/components/UnsavedChangesDialog';
import YouTubePlayer from '@/components/shared/YouTubePlayer';

interface Exercise {
  id: string;
  name: string;
  muscle_group: string | null;
  video_url: string | null;
  description: string | null;
  equipment: string | null;
  difficulty: string | null;
}

interface SelectedExercise {
  exercise_id: string;
  exercise: Exercise;
  sets: number;
  reps: number;
  weight_kg: number | null;
  rest_seconds: number;
  day_of_week: number | null;
  notes: string;
}

const daysOfWeek = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
];

// Muscle groups with visual representation
const muscleGroups = [
  { id: 'Peito', icon: '🏋️', color: 'from-red-500 to-red-600', bgColor: 'bg-red-500/20', textColor: 'text-red-400', borderColor: 'border-red-500/50' },
  { id: 'Costas', icon: '💪', color: 'from-blue-500 to-blue-600', bgColor: 'bg-blue-500/20', textColor: 'text-blue-400', borderColor: 'border-blue-500/50' },
  { id: 'Ombros', icon: '🏆', color: 'from-orange-500 to-orange-600', bgColor: 'bg-orange-500/20', textColor: 'text-orange-400', borderColor: 'border-orange-500/50' },
  { id: 'Bíceps', icon: '💪', color: 'from-purple-500 to-purple-600', bgColor: 'bg-purple-500/20', textColor: 'text-purple-400', borderColor: 'border-purple-500/50' },
  { id: 'Tríceps', icon: '🦾', color: 'from-pink-500 to-pink-600', bgColor: 'bg-pink-500/20', textColor: 'text-pink-400', borderColor: 'border-pink-500/50' },
  { id: 'Pernas', icon: '🦵', color: 'from-green-500 to-green-600', bgColor: 'bg-green-500/20', textColor: 'text-green-400', borderColor: 'border-green-500/50' },
  { id: 'Abdômen', icon: '🔥', color: 'from-yellow-500 to-yellow-600', bgColor: 'bg-yellow-500/20', textColor: 'text-yellow-400', borderColor: 'border-yellow-500/50' },
  { id: 'Glúteos', icon: '🍑', color: 'from-rose-500 to-rose-600', bgColor: 'bg-rose-500/20', textColor: 'text-rose-400', borderColor: 'border-rose-500/50' },
  { id: 'Cardio', icon: '🏃', color: 'from-cyan-500 to-cyan-600', bgColor: 'bg-cyan-500/20', textColor: 'text-cyan-400', borderColor: 'border-cyan-500/50' },
];

// Workout templates
interface WorkoutTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  days: {
    dayOfWeek: number;
    label: string;
    muscleGroups: string[];
  }[];
}

const workoutTemplates: WorkoutTemplate[] = [
  {
    id: 'abc',
    name: 'Treino ABC',
    description: '3 dias por semana - Ideal para iniciantes',
    icon: '🅰️',
    days: [
      { dayOfWeek: 1, label: 'A - Segunda', muscleGroups: ['Peito', 'Tríceps'] },
      { dayOfWeek: 3, label: 'B - Quarta', muscleGroups: ['Costas', 'Bíceps'] },
      { dayOfWeek: 5, label: 'C - Sexta', muscleGroups: ['Pernas', 'Ombros'] },
    ]
  },
  {
    id: 'abcd',
    name: 'Treino ABCD',
    description: '4 dias por semana - Intermediário',
    icon: '🔷',
    days: [
      { dayOfWeek: 1, label: 'A - Segunda', muscleGroups: ['Peito'] },
      { dayOfWeek: 2, label: 'B - Terça', muscleGroups: ['Costas'] },
      { dayOfWeek: 4, label: 'C - Quinta', muscleGroups: ['Ombros', 'Tríceps'] },
      { dayOfWeek: 5, label: 'D - Sexta', muscleGroups: ['Pernas', 'Bíceps'] },
    ]
  },
  {
    id: 'abcde',
    name: 'Treino ABCDE',
    description: '5 dias por semana - Avançado',
    icon: '🔥',
    days: [
      { dayOfWeek: 1, label: 'A - Segunda', muscleGroups: ['Peito'] },
      { dayOfWeek: 2, label: 'B - Terça', muscleGroups: ['Costas'] },
      { dayOfWeek: 3, label: 'C - Quarta', muscleGroups: ['Ombros'] },
      { dayOfWeek: 4, label: 'D - Quinta', muscleGroups: ['Bíceps', 'Tríceps'] },
      { dayOfWeek: 5, label: 'E - Sexta', muscleGroups: ['Pernas', 'Glúteos'] },
    ]
  },
  {
    id: 'upper_lower',
    name: 'Upper/Lower',
    description: '4 dias alternando superior e inferior',
    icon: '⬆️',
    days: [
      { dayOfWeek: 1, label: 'Upper - Segunda', muscleGroups: ['Peito', 'Costas', 'Ombros'] },
      { dayOfWeek: 2, label: 'Lower - Terça', muscleGroups: ['Pernas', 'Glúteos'] },
      { dayOfWeek: 4, label: 'Upper - Quinta', muscleGroups: ['Bíceps', 'Tríceps', 'Ombros'] },
      { dayOfWeek: 5, label: 'Lower - Sexta', muscleGroups: ['Pernas', 'Glúteos', 'Abdômen'] },
    ]
  },
  {
    id: 'fullbody',
    name: 'Full Body',
    description: '3 dias de treino completo',
    icon: '💪',
    days: [
      { dayOfWeek: 1, label: 'Full - Segunda', muscleGroups: ['Peito', 'Costas', 'Pernas'] },
      { dayOfWeek: 3, label: 'Full - Quarta', muscleGroups: ['Ombros', 'Bíceps', 'Tríceps'] },
      { dayOfWeek: 5, label: 'Full - Sexta', muscleGroups: ['Pernas', 'Abdômen', 'Glúteos'] },
    ]
  }
];

interface CreateClientWorkoutProps {
  onBack: () => void;
  onSuccess: () => void;
}

const CreateClientWorkout: React.FC<CreateClientWorkoutProps> = ({ onBack, onSuccess }) => {
  const { profile } = useAuth();
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [groupExercises, setGroupExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingGroup, setLoadingGroup] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string | null>(null);
  const [videoDialog, setVideoDialog] = useState<{ url: string; title: string } | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  
  const [planName, setPlanName] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<SelectedExercise[]>([]);

  // Track unsaved changes
  const hasChanges = planName.trim() !== '' || planDescription.trim() !== '' || selectedExercises.length > 0;
  
  const { 
    showExitDialog, 
    confirmExit, 
    handleConfirmExit, 
    handleCancelExit 
  } = useUnsavedChanges({ hasChanges });

  useEffect(() => {
    fetchAllExercises();
  }, []);

  useEffect(() => {
    if (selectedMuscleGroup) {
      fetchExercisesByGroup(selectedMuscleGroup);
    }
  }, [selectedMuscleGroup]);

  const fetchAllExercises = async () => {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('is_system', true)
        .order('muscle_group')
        .order('name');

      if (error) throw error;
      setAllExercises(data || []);
    } catch (error) {
      console.error('Error fetching exercises:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExercisesByGroup = async (group: string) => {
    setLoadingGroup(true);
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('is_system', true)
        .eq('muscle_group', group)
        .order('name');

      if (error) throw error;
      setGroupExercises(data || []);
    } catch (error) {
      console.error('Error fetching exercises:', error);
    } finally {
      setLoadingGroup(false);
    }
  };

  const getMuscleGroupData = (groupId: string) => {
    return muscleGroups.find(g => g.id === groupId);
  };

  const isExerciseSelected = (exerciseId: string) => {
    return selectedExercises.some(ex => ex.exercise_id === exerciseId);
  };

  const toggleExercise = (exercise: Exercise, autoClose: boolean = true) => {
    if (isExerciseSelected(exercise.id)) {
      setSelectedExercises(selectedExercises.filter(ex => ex.exercise_id !== exercise.id));
      toast.info(`${exercise.name} removido`, { duration: 1500 });
    } else {
      const newExercise: SelectedExercise = {
        exercise_id: exercise.id,
        exercise,
        sets: 3,
        reps: 12,
        weight_kg: null,
        rest_seconds: 60,
        day_of_week: null,
        notes: ''
      };
      setSelectedExercises([...selectedExercises, newExercise]);
      toast.success(`${exercise.name} adicionado!`, { duration: 1500 });
    }
    
    // Auto-collapse panel after selecting/deselecting exercise (only if autoClose is true)
    if (autoClose) {
      setTimeout(() => {
        setSelectedMuscleGroup(null);
      }, 300);
    }
  };

  const selectAllFromGroup = () => {
    if (!selectedMuscleGroup || groupExercises.length === 0) return;
    
    // Check which exercises from this group are not yet selected
    const unselectedExercises = groupExercises.filter(ex => !isExerciseSelected(ex.id));
    
    if (unselectedExercises.length === 0) {
      toast.info('Todos os exercícios deste grupo já estão selecionados');
      return;
    }
    
    const newExercises: SelectedExercise[] = unselectedExercises.map(exercise => ({
      exercise_id: exercise.id,
      exercise,
      sets: 3,
      reps: 12,
      weight_kg: null,
      rest_seconds: 60,
      day_of_week: null,
      notes: ''
    }));
    
    setSelectedExercises([...selectedExercises, ...newExercises]);
    toast.success(`${unselectedExercises.length} exercícios de ${selectedMuscleGroup} adicionados!`);
    
    // Close the panel
    setTimeout(() => {
      setSelectedMuscleGroup(null);
    }, 300);
  };

  const deselectAllFromGroup = () => {
    if (!selectedMuscleGroup) return;
    
    const remaining = selectedExercises.filter(ex => ex.exercise.muscle_group !== selectedMuscleGroup);
    const removedCount = selectedExercises.length - remaining.length;
    
    if (removedCount === 0) {
      toast.info('Nenhum exercício deste grupo selecionado');
      return;
    }
    
    setSelectedExercises(remaining);
    toast.info(`${removedCount} exercícios de ${selectedMuscleGroup} removidos`);
  };

  const areAllGroupExercisesSelected = () => {
    if (!selectedMuscleGroup || groupExercises.length === 0) return false;
    return groupExercises.every(ex => isExerciseSelected(ex.id));
  };

  const applyTemplate = async (template: WorkoutTemplate) => {
    setLoadingTemplate(true);
    try {
      // Clear existing exercises
      setSelectedExercises([]);
      
      // Fetch exercises for all muscle groups in the template
      const allMuscleGroups = template.days.flatMap(d => d.muscleGroups);
      const uniqueMuscleGroups = [...new Set(allMuscleGroups)];
      
      const { data: exercisesData, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('is_system', true)
        .in('muscle_group', uniqueMuscleGroups)
        .order('name');
      
      if (error) throw error;
      
      const newExercises: SelectedExercise[] = [];
      
      // For each day in the template, add 2-3 exercises per muscle group
      template.days.forEach(day => {
        day.muscleGroups.forEach(muscleGroup => {
          const groupExs = (exercisesData || []).filter(ex => ex.muscle_group === muscleGroup);
          // Take first 2-3 exercises from each group
          const exercisesToAdd = groupExs.slice(0, 3);
          
          exercisesToAdd.forEach(exercise => {
            // Check if exercise already added for another day
            const alreadyAdded = newExercises.some(e => e.exercise_id === exercise.id);
            if (!alreadyAdded) {
              newExercises.push({
                exercise_id: exercise.id,
                exercise: exercise as Exercise,
                sets: 3,
                reps: 12,
                weight_kg: null,
                rest_seconds: 60,
                day_of_week: day.dayOfWeek,
                notes: ''
              });
            }
          });
        });
      });
      
      setSelectedExercises(newExercises);
      setPlanName(template.name);
      setPlanDescription(template.description);
      setShowTemplates(false);
      
      toast.success(`Template "${template.name}" aplicado! Configure as séries e repetições.`);
    } catch (error) {
      console.error('Error applying template:', error);
      toast.error('Erro ao aplicar template');
    } finally {
      setLoadingTemplate(false);
    }
  };

  const removeExercise = (index: number) => {
    setSelectedExercises(selectedExercises.filter((_, i) => i !== index));
  };

  const clearSelection = () => {
    setSelectedExercises([]);
    setPlanName('');
    setPlanDescription('');
    toast.info('Seleção limpa. Você pode começar do zero!');
  };

  const updateExercise = (index: number, field: keyof SelectedExercise, value: any) => {
    const updated = [...selectedExercises];
    updated[index] = { ...updated[index], [field]: value };
    setSelectedExercises(updated);
  };

  const handleSave = async () => {
    if (!profile?.profile_id) {
      toast.error('Erro: Perfil não encontrado. Faça login novamente.');
      return;
    }
    
    if (!planName.trim()) {
      toast.error('Digite um nome para o plano');
      return;
    }

    if (selectedExercises.length === 0) {
      toast.error('Adicione pelo menos um exercício');
      return;
    }

    setSaving(true);
    try {
      // First, create the workout plan
      const { data: planData, error: planError } = await supabase
        .from('workout_plans')
        .insert({
          created_by: profile.profile_id,
          assigned_to: profile.profile_id, // Also assign to self so it appears in my workouts
          name: planName.trim(),
          description: planDescription.trim() || null,
          is_instructor_plan: false,
          is_active: true
        })
        .select()
        .single();

      if (planError) {
        console.error('Error creating plan:', planError);
        throw planError;
      }

      if (!planData) {
        throw new Error('Nenhum dado retornado ao criar plano');
      }

      // Then, create the workout exercises
      const exercisesToInsert = selectedExercises.map((ex, index) => ({
        workout_plan_id: planData.id,
        exercise_id: ex.exercise_id,
        sets: ex.sets,
        reps: ex.reps,
        weight_kg: ex.weight_kg,
        rest_seconds: ex.rest_seconds,
        day_of_week: ex.day_of_week,
        notes: ex.notes || null,
        order_index: index
      }));

      const { error: exercisesError } = await supabase
        .from('workout_plan_exercises')
        .insert(exercisesToInsert);

      if (exercisesError) {
        console.error('Error creating exercises:', exercisesError);
        // Try to clean up the plan if exercises failed
        await supabase.from('workout_plans').delete().eq('id', planData.id);
        throw exercisesError;
      }

      toast.success('Plano de treino criado com sucesso!');
      onSuccess();
    } catch (error: any) {
      console.error('Error creating workout plan:', error);
      toast.error(error.message || 'Erro ao criar plano de treino');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    confirmExit(onBack);
  };

  const getExerciseCountByGroup = (groupId: string) => {
    return selectedExercises.filter(ex => ex.exercise.muscle_group === groupId).length;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Dumbbell className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bebas text-primary tracking-wider">CRIAR MEU TREINO</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft size={16} className="mr-1" /> Voltar
        </Button>
      </div>

      {/* Templates Section */}
      <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 backdrop-blur-md rounded-xl p-4 border border-primary/30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="font-bebas text-sm text-primary">TEMPLATES PRONTOS</h3>
          </div>
          <div className="flex items-center gap-2">
            {selectedExercises.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearSelection}
                className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 size={12} className="mr-1" />
                Limpar Tudo
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowTemplates(!showTemplates)}
              className="h-7 text-xs"
            >
              <FileText size={12} className="mr-1" />
              {showTemplates ? 'Ocultar' : 'Ver Templates'}
            </Button>
          </div>
        </div>
        
        <AnimatePresence>
          {showTemplates && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-3"
            >
              {workoutTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => applyTemplate(template)}
                  disabled={loadingTemplate}
                  className="p-3 rounded-lg bg-card/80 border border-border/50 hover:border-primary/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{template.icon}</span>
                    <span className="font-bebas text-sm text-primary">{template.name}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mb-2">{template.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {template.days.map((day, idx) => (
                      <Badge key={idx} variant="outline" className="text-[9px] h-4">
                        {day.label.split(' - ')[0]}
                      </Badge>
                    ))}
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        
        {loadingTemplate && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
            <span className="text-sm text-muted-foreground">Aplicando template...</span>
          </div>
        )}

        {/* Selected exercises summary */}
        {selectedExercises.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/30">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                <Check size={12} className="inline mr-1 text-green-500" />
                {selectedExercises.length} exercício(s) selecionado(s)
              </span>
              <span className="text-primary font-medium">
                {[...new Set(selectedExercises.map(e => e.day_of_week).filter(d => d !== null))].length || 0} dia(s) configurado(s)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Plan Info - Compact */}
      <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-primary/30 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Nome do Plano *</Label>
            <Input
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              placeholder="Ex: Treino de Peito e Tríceps"
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Descrição (opcional)</Label>
            <Input
              value={planDescription}
              onChange={(e) => setPlanDescription(e.target.value)}
              placeholder="Descrição..."
              className="h-9"
            />
          </div>
        </div>
      </div>

      {/* Muscle Group Selection - Interactive Grid */}
      <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50">
        <h3 className="font-bebas text-sm text-primary mb-3 flex items-center gap-2">
          <span>1️⃣</span> TOQUE NO GRUPO MUSCULAR
        </h3>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {muscleGroups.map((group) => {
            const count = getExerciseCountByGroup(group.id);
            const isActive = selectedMuscleGroup === group.id;
            
            return (
              <button
                key={group.id}
                onClick={() => setSelectedMuscleGroup(isActive ? null : group.id)}
                className={`relative p-2 sm:p-3 rounded-xl border-2 transition-colors duration-100 ${
                  isActive 
                    ? `${group.borderColor} ${group.bgColor} shadow-lg` 
                    : 'border-border/30 bg-background/50 hover:border-primary/30'
                }`}
              >
                <span className={`text-xl sm:text-2xl block ${isActive ? 'scale-110' : ''} transition-transform duration-100`}>
                  {group.icon}
                </span>
                <span className={`text-[10px] sm:text-xs font-bebas ${isActive ? group.textColor : 'text-muted-foreground'}`}>
                  {group.id}
                </span>
                
                {/* Count badge */}
                {count > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Exercise List for Selected Group */}
      <AnimatePresence mode="wait">
        {selectedMuscleGroup && (
          <motion.div
            key={selectedMuscleGroup}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className={`rounded-xl border-2 ${getMuscleGroupData(selectedMuscleGroup)?.borderColor} ${getMuscleGroupData(selectedMuscleGroup)?.bgColor} overflow-hidden`}
          >
            <div className="p-3 border-b border-border/30 bg-background/50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{getMuscleGroupData(selectedMuscleGroup)?.icon}</span>
                  <div>
                    <h3 className={`font-bebas text-sm ${getMuscleGroupData(selectedMuscleGroup)?.textColor}`}>
                      2️⃣ SELECIONE OS EXERCÍCIOS
                    </h3>
                    <p className="text-[10px] text-muted-foreground">
                      {loadingGroup ? 'Carregando...' : `${groupExercises.length} disponíveis`}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedMuscleGroup(null)} className="h-7 w-7">
                  <X size={14} />
                </Button>
              </div>
              
              {/* Select All / Deselect All buttons */}
              {!loadingGroup && groupExercises.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={areAllGroupExercisesSelected() ? "outline" : "default"}
                    onClick={selectAllFromGroup}
                    disabled={areAllGroupExercisesSelected()}
                    className="flex-1 h-7 text-xs"
                  >
                    <Check size={12} className="mr-1" />
                    Selecionar Todos ({groupExercises.length})
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={deselectAllFromGroup}
                    disabled={getExerciseCountByGroup(selectedMuscleGroup) === 0}
                    className="h-7 text-xs"
                  >
                    <X size={12} className="mr-1" />
                    Desmarcar
                  </Button>
                </div>
              )}
            </div>

            <ScrollArea className="h-48 sm:h-56">
              <div className="p-2 space-y-1">
                {loadingGroup ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : groupExercises.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground text-sm">Nenhum exercício encontrado</p>
                ) : (
                  groupExercises.map((exercise) => {
                    const isSelected = isExerciseSelected(exercise.id);
                    return (
                      <motion.button
                        key={exercise.id}
                        onClick={() => toggleExercise(exercise, false)}
                        className={`w-full p-2 rounded-lg flex items-center justify-between gap-2 transition-all ${
                          isSelected 
                            ? 'bg-primary/20 border border-primary/50' 
                            : 'bg-background/80 border border-transparent hover:border-primary/30'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <motion.div
                            initial={false}
                            animate={{ scale: isSelected ? 1 : 0.8, opacity: isSelected ? 1 : 0.3 }}
                            className={`w-5 h-5 rounded-full flex items-center justify-center ${
                              isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                            }`}
                          >
                            <Check size={12} />
                          </motion.div>
                          <div className="text-left min-w-0">
                            <p className="text-xs font-medium truncate">{exercise.name}</p>
                            {exercise.equipment && (
                              <p className="text-[10px] text-muted-foreground truncate">{exercise.equipment}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {exercise.video_url && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                setVideoDialog({ url: exercise.video_url!, title: exercise.name });
                              }}
                            >
                              <Play size={10} className="text-primary" />
                            </Button>
                          )}
                        </div>
                      </motion.button>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected Exercises - Editable */}
      {selectedExercises.length > 0 && (
        <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50 space-y-3">
          <h3 className="font-bebas text-sm text-primary flex items-center gap-2">
            <span>3️⃣</span> CONFIGURE SÉRIES, REPS E PESO ({selectedExercises.length})
          </h3>
          
          <ScrollArea className="max-h-80">
            <div className="space-y-2 pr-2">
              {selectedExercises.map((ex, index) => {
                const groupData = getMuscleGroupData(ex.exercise.muscle_group || '');
                return (
                  <Card key={index} className={`${groupData?.bgColor} border ${groupData?.borderColor}`}>
                    <CardHeader className="py-2 px-3">
                      <CardTitle className="text-xs flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base">{groupData?.icon}</span>
                          <span className="truncate">{ex.exercise.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:bg-destructive/20"
                          onClick={() => removeExercise(index)}
                        >
                          <Trash2 size={12} />
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-3 pt-0">
                      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">Séries</Label>
                          <Input
                            type="number"
                            value={ex.sets}
                            onChange={(e) => updateExercise(index, 'sets', parseInt(e.target.value) || 3)}
                            className="h-8 text-center text-sm font-bold"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">Reps</Label>
                          <Input
                            type="number"
                            value={ex.reps}
                            onChange={(e) => updateExercise(index, 'reps', parseInt(e.target.value) || 12)}
                            className="h-8 text-center text-sm font-bold"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">Peso (kg)</Label>
                          <Input
                            type="number"
                            value={ex.weight_kg || ''}
                            onChange={(e) => updateExercise(index, 'weight_kg', e.target.value ? parseFloat(e.target.value) : null)}
                            className="h-8 text-center text-sm"
                            placeholder="-"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">Desc. (s)</Label>
                          <Input
                            type="number"
                            value={ex.rest_seconds}
                            onChange={(e) => updateExercise(index, 'rest_seconds', parseInt(e.target.value) || 60)}
                            className="h-8 text-center text-sm"
                          />
                        </div>
                        <div className="space-y-1 hidden sm:block">
                          <Label className="text-[10px] text-muted-foreground">Dia</Label>
                          <Select
                            value={ex.day_of_week?.toString() || 'all'}
                            onValueChange={(v) => updateExercise(index, 'day_of_week', v === 'all' ? null : parseInt(v))}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="-" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos</SelectItem>
                              {daysOfWeek.map((day) => (
                                <SelectItem key={day.value} value={day.value.toString()}>
                                  {day.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={saving || !planName.trim() || selectedExercises.length === 0}
        className="w-full"
        size="lg"
      >
        {saving ? (
          <>
            <Loader2 size={18} className="mr-2 animate-spin" />
            Salvando...
          </>
        ) : (
          <>
            <Save size={18} className="mr-2" />
            Salvar Plano ({selectedExercises.length} exercício{selectedExercises.length !== 1 ? 's' : ''})
          </>
        )}
      </Button>

      {/* Video Dialog */}
      <Dialog open={!!videoDialog} onOpenChange={() => setVideoDialog(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-bebas text-primary flex items-center gap-2">
              <Video size={20} />
              {videoDialog?.title}
            </DialogTitle>
          </DialogHeader>
          {videoDialog?.url && (
            <YouTubePlayer url={videoDialog.url} title={videoDialog.title} showThumbnail={false} />
          )}
        </DialogContent>
      </Dialog>

      {/* Unsaved Changes Dialog */}
      <UnsavedChangesDialog
        open={showExitDialog}
        onOpenChange={handleCancelExit}
        onConfirmExit={handleConfirmExit}
        onSave={planName.trim() && selectedExercises.length > 0 ? handleSave : undefined}
      />
    </motion.div>
  );
};

export default CreateClientWorkout;

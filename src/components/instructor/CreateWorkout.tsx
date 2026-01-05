import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Dumbbell, Plus, Trash2, Save, Loader2, 
  Users, Clock, Video, X, Check, Play, ChevronRight, Calendar, CalendarDays
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useInstructorContext } from '@/hooks/useInstructorContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAudio } from '@/contexts/AudioContext';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import InstructorPageHeader from './InstructorPageHeader';
import { validateInstructorClientLink, validateStudentInList } from '@/lib/instructorValidation';

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

interface Student {
  id: string;
  username: string;
  full_name: string | null;
}

const DAYS_OF_WEEK = [
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

const CreateWorkout: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile } = useAuth();
  const { effectiveInstructorId, needsInstructorSelection, isMaster, selectedInstructor } = useInstructorContext();
  const { playClickSound } = useAudio();
  const { sendNewWorkoutNotification, permission: notificationPermission } = usePushNotifications();

  const [planName, setPlanName] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<string>(searchParams.get('student') || '');
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Scheduling options
  const [scheduleType, setScheduleType] = useState<'weekdays' | 'date'>('weekdays');
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([1, 3, 5]); // Mon, Wed, Fri by default
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const [scheduledTime, setScheduledTime] = useState<string>('06:00');

  // Interactive exercise selection
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string | null>(null);
  const [groupExercises, setGroupExercises] = useState<Exercise[]>([]);
  const [loadingGroup, setLoadingGroup] = useState(false);
  const [selectedExercises, setSelectedExercises] = useState<SelectedExercise[]>([]);
  const [videoDialog, setVideoDialog] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    if (effectiveInstructorId) {
      fetchData();
    }
  }, [effectiveInstructorId]);

  useEffect(() => {
    if (selectedMuscleGroup) {
      fetchExercisesByGroup(selectedMuscleGroup);
    }
  }, [selectedMuscleGroup]);

  const fetchData = async () => {
    if (!effectiveInstructorId) return;

    setLoading(true);
    try {
      // Fetch only students with ACCEPTED link status
      const { data: studentsData } = await supabase
        .from('instructor_clients')
        .select(`
          profiles!instructor_clients_client_id_fkey (
            id,
            username,
            full_name
          )
        `)
        .eq('instructor_id', effectiveInstructorId)
        .eq('is_active', true)
        .eq('link_status', 'accepted');

      if (studentsData) {
        setStudents(studentsData.map((item: any) => item.profiles));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
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

  const toggleExercise = (exercise: Exercise) => {
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
        day_of_week: 1,
        notes: ''
      };
      setSelectedExercises([...selectedExercises, newExercise]);
      toast.success(`${exercise.name} adicionado!`, { duration: 1500 });
      
      // Auto-collapse panel after adding
      setTimeout(() => {
        setSelectedMuscleGroup(null);
      }, 300);
    }
    playClickSound();
  };

  const removeExercise = (index: number) => {
    playClickSound();
    setSelectedExercises(selectedExercises.filter((_, i) => i !== index));
  };

  const updateExercise = (index: number, field: keyof SelectedExercise, value: any) => {
    const updated = [...selectedExercises];
    updated[index] = { ...updated[index], [field]: value };
    setSelectedExercises(updated);
  };

  const getExerciseCountByGroup = (groupId: string) => {
    return selectedExercises.filter(ex => ex.exercise.muscle_group === groupId).length;
  };

  const handleSave = async () => {
    if (!planName.trim()) {
      toast.error('Digite um nome para o plano.');
      return;
    }

    if (!selectedStudent) {
      toast.error('Selecione um aluno.');
      return;
    }

    if (selectedExercises.length === 0) {
      toast.error('Adicione pelo menos um exercício.');
      return;
    }

    // Client-side validation: check if student is in the allowed list
    if (!validateStudentInList(selectedStudent, students)) {
      toast.error('Aluno selecionado não está na sua lista de alunos vinculados.');
      return;
    }

    setSaving(true);
    try {
      // Server-side validation: verify instructor-client link is valid and accepted
      const validation = await validateInstructorClientLink(effectiveInstructorId!, selectedStudent);
      if (!validation.valid) {
        toast.error(validation.error || 'Você não tem permissão para criar treinos para este aluno.');
        setSaving(false);
        return;
      }

      // Prepare scheduling data
      const weekdaysArray = scheduleType === 'weekdays' ? selectedWeekdays : null;
      const dateValue = scheduleType === 'date' && scheduledDate ? format(scheduledDate, 'yyyy-MM-dd') : null;
      const timeValue = scheduledTime || null;

      // Create workout plan with scheduling
      const { data: planData, error: planError } = await supabase
        .from('workout_plans')
        .insert({
          name: planName,
          description: planDescription,
          created_by: effectiveInstructorId!,
          assigned_to: selectedStudent,
          is_instructor_plan: true,
          is_active: true,
          weekdays: weekdaysArray,
          scheduled_date: dateValue,
          scheduled_time: timeValue,
        })
        .select()
        .single();

      if (planError) throw planError;

      // Create workout plan exercises
      const exercisesToInsert = selectedExercises.map((ex, index) => ({
        workout_plan_id: planData.id,
        exercise_id: ex.exercise_id,
        sets: ex.sets,
        reps: ex.reps,
        rest_seconds: ex.rest_seconds,
        weight_kg: ex.weight_kg,
        notes: ex.notes || null,
        day_of_week: ex.day_of_week,
        order_index: index,
      }));

      const { error: exercisesError } = await supabase
        .from('workout_plan_exercises')
        .insert(exercisesToInsert);

      if (exercisesError) throw exercisesError;

      // Notify the student about the new workout plan
      const studentData = students.find(s => s.id === selectedStudent);
      const instructorName = isMaster && selectedInstructor 
        ? (selectedInstructor.full_name || selectedInstructor.username)
        : (profile?.full_name || profile?.username);
        
      await supabase.from('notifications').insert({
        profile_id: selectedStudent,
        title: 'Novo Plano de Treino',
        message: `Seu instrutor ${instructorName} criou um novo plano de treino para você: "${planName}". Confira agora!`,
        type: 'workout_plan'
      });

      // Send push notification to student (if they have permission)
      if (notificationPermission === 'granted') {
        sendNewWorkoutNotification(planName, instructorName || 'Instrutor');
      }

      toast.success('Plano de treino criado com sucesso!');
      playClickSound();
      navigate('/instructor/workout-plans');
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Erro ao salvar plano de treino.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col h-full min-h-0"
    >
      <InstructorPageHeader 
        title="CRIAR FICHA DE TREINO"
        icon={<Dumbbell className="w-6 h-6" />}
        iconColor="text-green-500"
      />
      
      <div className="flex-1 overflow-y-auto overscroll-contain space-y-4 momentum-scroll pb-4">

      {/* Form */}
      <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-border/50 space-y-4">
        {/* Plan Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Nome do Plano *</Label>
            <Input
              placeholder="Ex: Treino A - Peito e Tríceps"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              className="bg-background/50 border-border/50"
            />
          </div>
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Aluno *</Label>
            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
              <SelectTrigger className="bg-background/50 border-border/50">
                <SelectValue placeholder="Selecione um aluno" />
              </SelectTrigger>
              <SelectContent>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.full_name || student.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="text-sm text-muted-foreground mb-2 block">Descrição</Label>
          <Textarea
            placeholder="Observações gerais sobre o treino..."
            value={planDescription}
            onChange={(e) => setPlanDescription(e.target.value)}
            className="bg-background/50 border-border/50"
            rows={2}
          />
        </div>

        {/* Scheduling Options */}
        <div className="bg-background/30 rounded-xl p-4 border border-blue-500/30 space-y-4">
          <h3 className="font-bebas text-sm text-blue-500 flex items-center gap-2">
            <CalendarDays size={16} />
            AGENDAMENTO DO TREINO
          </h3>

          {/* Schedule Type Toggle */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={scheduleType === 'weekdays' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setScheduleType('weekdays')}
              className={scheduleType === 'weekdays' ? 'bg-blue-500 hover:bg-blue-600' : ''}
            >
              <Calendar size={14} className="mr-1" />
              Dias da Semana
            </Button>
            <Button
              type="button"
              variant={scheduleType === 'date' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setScheduleType('date')}
              className={scheduleType === 'date' ? 'bg-blue-500 hover:bg-blue-600' : ''}
            >
              <CalendarDays size={14} className="mr-1" />
              Data Específica
            </Button>
          </div>

          {/* Weekdays Selection */}
          {scheduleType === 'weekdays' && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Dias disponíveis (Seg-Sáb):</Label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.filter(d => d.value >= 1 && d.value <= 6).map((day) => (
                  <label
                    key={day.value}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors",
                      selectedWeekdays.includes(day.value)
                        ? "bg-blue-500/20 border-blue-500/50 text-blue-400"
                        : "bg-background/50 border-border/50 hover:border-blue-500/30"
                    )}
                  >
                    <Checkbox
                      checked={selectedWeekdays.includes(day.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedWeekdays([...selectedWeekdays, day.value].sort());
                        } else {
                          setSelectedWeekdays(selectedWeekdays.filter(d => d !== day.value));
                        }
                      }}
                    />
                    <span className="text-sm font-medium">{day.label}</span>
                  </label>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">
                O aluno só poderá executar nos dias selecionados, sempre no dia atual.
              </p>
            </div>
          )}

          {/* Specific Date Selection */}
          {scheduleType === 'date' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Data do treino:</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal bg-background/50",
                        !scheduledDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {scheduledDate ? format(scheduledDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={scheduledDate}
                      onSelect={setScheduledDate}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Horário sugerido:</Label>
                <Input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="bg-background/50 border-border/50"
                />
              </div>
              <p className="col-span-2 text-[10px] text-muted-foreground">
                O aluno só poderá executar este treino na data selecionada.
              </p>
            </div>
          )}
        </div>

        {/* Interactive Muscle Group Selection */}
        <div className="bg-background/30 rounded-xl p-4 border border-green-500/30">
          <h3 className="font-bebas text-sm text-green-500 mb-3 flex items-center gap-2">
            <span>1️⃣</span> TOQUE NO GRUPO MUSCULAR
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {muscleGroups.map((group) => {
              const count = getExerciseCountByGroup(group.id);
              const isActive = selectedMuscleGroup === group.id;
              
              return (
                <button
                  key={group.id}
                  onClick={() => {
                    playClickSound();
                    setSelectedMuscleGroup(isActive ? null : group.id);
                  }}
                  className={`relative p-2 sm:p-3 rounded-xl border-2 transition-colors duration-100 ${
                    isActive 
                      ? `${group.borderColor} ${group.bgColor} shadow-lg` 
                      : 'border-border/30 bg-background/50 hover:border-green-500/30'
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
                    <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-green-500 text-white text-[10px] flex items-center justify-center font-bold">
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
              <div className="p-3 border-b border-border/30 bg-background/50 flex items-center justify-between">
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

              <ScrollArea className="h-48 sm:h-56">
                <div className="p-2 space-y-1">
                  {loadingGroup ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-green-500" />
                    </div>
                  ) : groupExercises.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground text-sm">Nenhum exercício encontrado</p>
                  ) : (
                    groupExercises.map((exercise) => {
                      const isSelected = isExerciseSelected(exercise.id);
                      return (
                        <button
                          key={exercise.id}
                          onClick={() => toggleExercise(exercise)}
                          className={`w-full p-2 rounded-lg flex items-center justify-between gap-2 transition-all ${
                            isSelected 
                              ? 'bg-green-500/20 border border-green-500/50' 
                              : 'bg-background/80 border border-transparent hover:border-green-500/30'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                                isSelected ? 'bg-green-500 text-white' : 'bg-muted opacity-30'
                              }`}
                            >
                              <Check size={12} />
                            </div>
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
                                <Play size={10} className="text-green-500" />
                              </Button>
                            )}
                          </div>
                        </button>
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
          <div className="bg-background/30 rounded-xl p-4 border border-green-500/30 space-y-3">
            <h3 className="font-bebas text-sm text-green-500 flex items-center gap-2">
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
                            className="h-6 w-6 text-destructive hover:bg-destructive/10"
                            onClick={() => removeExercise(index)}
                          >
                            <Trash2 size={12} />
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="py-2 px-3">
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[10px]">Séries</Label>
                            <Input
                              type="number"
                              min="1"
                              value={ex.sets}
                              onChange={(e) => updateExercise(index, 'sets', parseInt(e.target.value) || 3)}
                              className="h-7 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px]">Reps</Label>
                            <Input
                              type="number"
                              min="1"
                              value={ex.reps}
                              onChange={(e) => updateExercise(index, 'reps', parseInt(e.target.value) || 12)}
                              className="h-7 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px]">Peso (kg)</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.5"
                              value={ex.weight_kg || ''}
                              onChange={(e) => updateExercise(index, 'weight_kg', e.target.value ? parseFloat(e.target.value) : null)}
                              className="h-7 text-xs"
                              placeholder="-"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px]">Desc (s)</Label>
                            <Input
                              type="number"
                              min="0"
                              value={ex.rest_seconds}
                              onChange={(e) => updateExercise(index, 'rest_seconds', parseInt(e.target.value) || 60)}
                              className="h-7 text-xs"
                            />
                          </div>
                          <div className="space-y-1 col-span-2">
                            <Label className="text-[10px]">Dia</Label>
                            <Select
                              value={ex.day_of_week?.toString() || '1'}
                              onValueChange={(v) => updateExercise(index, 'day_of_week', parseInt(v))}
                            >
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {DAYS_OF_WEEK.map(d => (
                                  <SelectItem key={d.value} value={d.value.toString()}>
                                    {d.label}
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

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => { playClickSound(); navigate('/instructor'); }}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !planName.trim() || !selectedStudent || selectedExercises.length === 0}
            className="flex-1 bg-green-500 hover:bg-green-600"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar Plano
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Video Dialog */}
      <Dialog open={!!videoDialog} onOpenChange={() => setVideoDialog(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-bebas text-green-500 flex items-center gap-2">
              <Video size={20} />
              {videoDialog?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            {videoDialog?.url && (
              videoDialog.url.includes('youtube') || videoDialog.url.includes('youtu.be') ? (
                <iframe
                  src={videoDialog.url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                  className="w-full h-full"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              ) : (
                <video src={videoDialog.url} controls className="w-full h-full" />
              )
            )}
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </motion.div>
  );
};

export default CreateWorkout;

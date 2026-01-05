import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ClipboardList, Plus, Loader2, Calendar, 
  User, ChevronRight, Dumbbell, Edit, Trash2, Eye
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useInstructorContext } from '@/hooks/useInstructorContext';
import { useAudio } from '@/contexts/AudioContext';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import InstructorPageHeader from './InstructorPageHeader';
import { useEscapeBack } from '@/hooks/useEscapeBack';

interface WorkoutPlan {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  assigned_to: string | null;
  student_name?: string;
  exercise_count?: number;
}

interface Student {
  id: string;
  username: string;
  full_name: string | null;
}

const WorkoutPlans: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { effectiveInstructorId, needsInstructorSelection } = useInstructorContext();
  const { playClickSound } = useAudio();

  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<string>(searchParams.get('student') || 'all');
  const [selectedPlan, setSelectedPlan] = useState<WorkoutPlan | null>(null);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [planExercises, setPlanExercises] = useState<Record<string, any[]>>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ESC volta para /instructor
  useEscapeBack({ to: '/instructor', disableWhen: [deleteDialogOpen, selectedPlan !== null] });

  useEffect(() => {
    if (effectiveInstructorId) {
      fetchData();
    }
  }, [effectiveInstructorId]);

  useEffect(() => {
    if (effectiveInstructorId) {
      fetchPlans();
    }
  }, [selectedStudent, effectiveInstructorId]);

  const fetchData = async () => {
    if (!effectiveInstructorId) return;

    try {
      const { data } = await supabase
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

      if (data) {
        setStudents(data.map((item: any) => item.profiles));
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchPlans = async () => {
    if (!effectiveInstructorId) return;

    setLoading(true);
    try {
      let query = supabase
        .from('workout_plans')
        .select(`
          *,
          profiles!workout_plans_assigned_to_fkey (
            id,
            username,
            full_name
          )
        `)
        .eq('created_by', effectiveInstructorId)
        .eq('is_instructor_plan', true)
        .order('created_at', { ascending: false });

      if (selectedStudent !== 'all') {
        query = query.eq('assigned_to', selectedStudent);
      }

      const { data, error } = await query;

      if (error) throw error;

      const plansWithDetails = (data || []).map((plan: any) => ({
        ...plan,
        student_name: plan.profiles?.full_name || plan.profiles?.username || 'Sem aluno',
      }));

      setPlans(plansWithDetails);
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlanExercises = async (planId: string) => {
    if (planExercises[planId]) return;

    try {
      const { data, error } = await supabase
        .from('workout_plan_exercises')
        .select(`
          *,
          exercises (
            id,
            name,
            muscle_group
          )
        `)
        .eq('workout_plan_id', planId)
        .order('day_of_week')
        .order('order_index');

      if (error) throw error;
      setPlanExercises(prev => ({ ...prev, [planId]: data || [] }));
    } catch (error) {
      console.error('Error fetching exercises:', error);
    }
  };

  const handleExpandPlan = async (planId: string) => {
    playClickSound();
    if (expandedPlan === planId) {
      setExpandedPlan(null);
    } else {
      setExpandedPlan(planId);
      await fetchPlanExercises(planId);
    }
  };

  const handleDeletePlan = async () => {
    if (!selectedPlan) return;

    setDeleting(true);
    try {
      // Delete exercises first
      await supabase
        .from('workout_plan_exercises')
        .delete()
        .eq('workout_plan_id', selectedPlan.id);

      // Delete plan
      const { error } = await supabase
        .from('workout_plans')
        .delete()
        .eq('id', selectedPlan.id);

      if (error) throw error;

      toast.success('Plano excluído com sucesso!');
      setPlans(plans.filter(p => p.id !== selectedPlan.id));
      setDeleteDialogOpen(false);
      setSelectedPlan(null);
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Erro ao excluir plano.');
    } finally {
      setDeleting(false);
    }
  };

  const getDayName = (day: number) => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return days[day] || '-';
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
      className="flex flex-col h-full"
    >
      <InstructorPageHeader 
        title={`PLANOS DE TREINO (${plans.length})`}
        icon={<ClipboardList className="w-6 h-6" />}
        iconColor="text-green-500"
      />
      
      <div className="flex-1 overflow-auto space-y-4">
        {/* Filters */}
        <div className="flex justify-end gap-2">
          <Select value={selectedStudent} onValueChange={setSelectedStudent}>
            <SelectTrigger className="w-40 sm:w-48 bg-card border-border">
              <SelectValue placeholder="Filtrar aluno" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all">Todos os alunos</SelectItem>
              {students.map((student) => (
                <SelectItem key={student.id} value={student.id}>
                  {student.full_name || student.username}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => { playClickSound(); navigate('/instructor/create-workout'); }}
            className="bg-green-500 hover:bg-green-600"
          >
            <Plus className="w-4 h-4 mr-1" />
            Novo
          </Button>
        </div>

      {/* Plans List */}
      {plans.length === 0 ? (
        <div className="bg-card/80 backdrop-blur-md rounded-xl p-8 border border-border/50 text-center">
          <ClipboardList className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground mb-4">
            {selectedStudent !== 'all' 
              ? 'Nenhum plano encontrado para este aluno.'
              : 'Você ainda não criou nenhum plano de treino.'}
          </p>
          <Button
            onClick={() => { playClickSound(); navigate('/instructor/create-workout'); }}
            className="bg-green-500 hover:bg-green-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Criar Primeiro Plano
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-card/80 backdrop-blur-md rounded-xl border border-border/50 hover:border-green-500/30 transition-all overflow-hidden"
            >
              {/* Plan Header */}
              <div
                className="p-4 cursor-pointer"
                onClick={() => handleExpandPlan(plan.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                    <Dumbbell className="w-6 h-6 text-purple-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground truncate">{plan.name}</h3>
                      {plan.is_active ? (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-500">
                          Ativo
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground">
                          Inativo
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {plan.student_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(plan.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                  <ChevronRight
                    className={`w-5 h-5 text-muted-foreground transition-transform ${
                      expandedPlan === plan.id ? 'rotate-90' : ''
                    }`}
                  />
                </div>
              </div>

              {/* Expanded Content */}
              {expandedPlan === plan.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="border-t border-border/50"
                >
                  {plan.description && (
                    <div className="px-4 py-3 bg-background/30 text-sm text-muted-foreground">
                      {plan.description}
                    </div>
                  )}

                  {/* Exercises */}
                  <div className="p-4">
                    {!planExercises[plan.id] ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : planExercises[plan.id].length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhum exercício adicionado.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-foreground mb-3">Exercícios:</h4>
                        {planExercises[plan.id].map((ex, i) => (
                          <div
                            key={ex.id}
                            className="flex items-center gap-3 p-2 bg-background/50 rounded-lg text-sm"
                          >
                            <span className="w-8 h-8 rounded-lg bg-green-500/20 text-green-500 flex items-center justify-center font-medium text-xs">
                              {getDayName(ex.day_of_week)}
                            </span>
                            <span className="flex-1 truncate">
                              {ex.exercises?.name || 'Exercício'}
                            </span>
                            <span className="text-muted-foreground">
                              {ex.sets}x{ex.reps}
                            </span>
                            {ex.weight_kg && (
                              <span className="text-muted-foreground">
                                {ex.weight_kg}kg
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="px-4 pb-4 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        playClickSound();
                        setSelectedPlan(plan);
                        setDeleteDialogOpen(true);
                      }}
                      className="text-destructive border-destructive/50 hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Excluir
                    </Button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Plano de Treino</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o plano "{selectedPlan?.name}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => playClickSound()}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePlan}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Excluindo...
                </>
              ) : (
                'Excluir'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </motion.div>
  );
};

export default WorkoutPlans;

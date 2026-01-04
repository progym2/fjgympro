import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Utensils, Plus, Loader2, Calendar, 
  User, ChevronRight, Trash2, Edit, Save, X, Flame
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAudio } from '@/contexts/AudioContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { validateInstructorClientLink, validateStudentInList } from '@/lib/instructorValidation';

interface MealPlan {
  id: string;
  name: string;
  description: string | null;
  total_calories: number | null;
  protein_grams: number | null;
  carbs_grams: number | null;
  fat_grams: number | null;
  is_active: boolean;
  created_at: string;
  assigned_to: string | null;
  student_name?: string;
}

interface Student {
  id: string;
  username: string;
  full_name: string | null;
}

const MealPlans: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { playClickSound } = useAudio();

  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<string>('all');
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  
  // Create/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    assigned_to: '',
    total_calories: '',
    protein_grams: '',
    carbs_grams: '',
    fat_grams: '',
  });

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<MealPlan | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      fetchData();
    }
  }, [profile?.id]);

  useEffect(() => {
    if (profile?.id) {
      fetchPlans();
    }
  }, [selectedStudent, profile?.id]);

  const fetchData = async () => {
    if (!profile?.id) return;

    try {
      // Fetch only students with ACCEPTED link status
      const { data } = await supabase
        .from('instructor_clients')
        .select(`
          profiles!instructor_clients_client_id_fkey (
            id,
            username,
            full_name
          )
        `)
        .eq('instructor_id', profile.id)
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
    if (!profile?.id) return;

    setLoading(true);
    try {
      let query = supabase
        .from('meal_plans')
        .select(`
          *,
          profiles!meal_plans_assigned_to_fkey (
            id,
            username,
            full_name
          )
        `)
        .eq('created_by', profile.id)
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

  const handleOpenCreate = () => {
    playClickSound();
    setFormData({
      name: '',
      description: '',
      assigned_to: '',
      total_calories: '',
      protein_grams: '',
      carbs_grams: '',
      fat_grams: '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Digite um nome para o plano.');
      return;
    }

    if (!formData.assigned_to) {
      toast.error('Selecione um aluno.');
      return;
    }

    // Client-side validation: check if student is in the allowed list
    if (!validateStudentInList(formData.assigned_to, students)) {
      toast.error('Aluno selecionado não está na sua lista de alunos vinculados.');
      return;
    }

    setSaving(true);
    try {
      // Server-side validation: verify instructor-client link is valid and accepted
      const validation = await validateInstructorClientLink(profile!.id, formData.assigned_to);
      if (!validation.valid) {
        toast.error(validation.error || 'Você não tem permissão para criar planos para este aluno.');
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from('meal_plans')
        .insert({
          name: formData.name,
          description: formData.description || null,
          created_by: profile!.id,
          assigned_to: formData.assigned_to,
          is_instructor_plan: true,
          is_active: true,
          total_calories: formData.total_calories ? parseInt(formData.total_calories) : null,
          protein_grams: formData.protein_grams ? parseInt(formData.protein_grams) : null,
          carbs_grams: formData.carbs_grams ? parseInt(formData.carbs_grams) : null,
          fat_grams: formData.fat_grams ? parseInt(formData.fat_grams) : null,
        });

      if (error) throw error;

      toast.success('Plano alimentar criado com sucesso!');
      setDialogOpen(false);
      fetchPlans();
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Erro ao salvar plano alimentar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPlan) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('meal_plans')
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
        title={`PLANOS ALIMENTARES (${plans.length})`}
        icon={<Utensils className="w-6 h-6" />}
        iconColor="text-orange-500"
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
            onClick={handleOpenCreate}
            className="bg-orange-500 hover:bg-orange-600"
          >
            <Plus className="w-4 h-4 mr-1" />
            Novo
          </Button>
        </div>

      {/* Plans List */}
      {plans.length === 0 ? (
        <div className="bg-card/80 backdrop-blur-md rounded-xl p-8 border border-border/50 text-center">
          <Utensils className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground mb-4">
            {selectedStudent !== 'all' 
              ? 'Nenhum plano encontrado para este aluno.'
              : 'Você ainda não criou nenhum plano alimentar.'}
          </p>
          <Button
            onClick={handleOpenCreate}
            className="bg-orange-500 hover:bg-orange-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Criar Primeiro Plano
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-card/80 backdrop-blur-md rounded-xl border border-border/50 hover:border-orange-500/30 transition-all overflow-hidden"
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 border border-orange-500/30 flex items-center justify-center flex-shrink-0">
                      <Utensils className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{plan.name}</h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {plan.student_name}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      playClickSound();
                      setSelectedPlan(plan);
                      setDeleteDialogOpen(true);
                    }}
                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {plan.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {plan.description}
                  </p>
                )}

                {/* Macros */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {plan.total_calories && (
                    <div className="flex items-center gap-2 p-2 bg-background/50 rounded-lg">
                      <Flame className="w-4 h-4 text-orange-500" />
                      <span>{plan.total_calories} kcal</span>
                    </div>
                  )}
                  {plan.protein_grams && (
                    <div className="flex items-center gap-2 p-2 bg-background/50 rounded-lg">
                      <span className="w-4 h-4 text-center text-xs font-bold text-blue-500">P</span>
                      <span>{plan.protein_grams}g</span>
                    </div>
                  )}
                  {plan.carbs_grams && (
                    <div className="flex items-center gap-2 p-2 bg-background/50 rounded-lg">
                      <span className="w-4 h-4 text-center text-xs font-bold text-green-500">C</span>
                      <span>{plan.carbs_grams}g</span>
                    </div>
                  )}
                  {plan.fat_grams && (
                    <div className="flex items-center gap-2 p-2 bg-background/50 rounded-lg">
                      <span className="w-4 h-4 text-center text-xs font-bold text-yellow-500">G</span>
                      <span>{plan.fat_grams}g</span>
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(plan.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-500">
              <Utensils className="w-5 h-5" />
              Novo Plano Alimentar
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Nome do Plano *</label>
              <Input
                placeholder="Ex: Dieta Cutting"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-background/50 border-border"
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Aluno *</label>
              <Select 
                value={formData.assigned_to} 
                onValueChange={(val) => setFormData({ ...formData, assigned_to: val })}
              >
                <SelectTrigger className="bg-background/50 border-border">
                  <SelectValue placeholder="Selecione um aluno" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.full_name || student.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Descrição</label>
              <Textarea
                placeholder="Detalhes do plano alimentar..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-background/50 border-border"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Calorias (kcal)</label>
                <Input
                  type="number"
                  placeholder="2000"
                  value={formData.total_calories}
                  onChange={(e) => setFormData({ ...formData, total_calories: e.target.value })}
                  className="bg-background/50 border-border"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Proteína (g)</label>
                <Input
                  type="number"
                  placeholder="150"
                  value={formData.protein_grams}
                  onChange={(e) => setFormData({ ...formData, protein_grams: e.target.value })}
                  className="bg-background/50 border-border"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Carboidratos (g)</label>
                <Input
                  type="number"
                  placeholder="200"
                  value={formData.carbs_grams}
                  onChange={(e) => setFormData({ ...formData, carbs_grams: e.target.value })}
                  className="bg-background/50 border-border"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Gorduras (g)</label>
                <Input
                  type="number"
                  placeholder="60"
                  value={formData.fat_grams}
                  onChange={(e) => setFormData({ ...formData, fat_grams: e.target.value })}
                  className="bg-background/50 border-border"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => { playClickSound(); setDialogOpen(false); }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-orange-500 hover:bg-orange-600"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Plano Alimentar</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o plano "{selectedPlan?.name}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => playClickSound()}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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

export default MealPlans;

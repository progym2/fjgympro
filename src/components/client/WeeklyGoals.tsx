import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, Dumbbell, Droplets, Scale, Flame, Trophy,
  Plus, Check, TrendingUp, Bell, Sparkles, Star, ArrowLeft, Edit2, Trash2
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useEscapeBack } from '@/hooks/useEscapeBack';
import ClientPageHeader from './ClientPageHeader';

interface WeeklyGoal {
  id: string;
  profile_id: string;
  week_start: string;
  goal_type: string;
  target_value: number;
  current_value: number;
  is_completed: boolean;
  completed_at: string | null;
}

interface MotivationalNotification {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const goalTypes = [
  { value: 'workouts', label: 'Treinos', icon: Dumbbell, color: 'text-rose-500', bgColor: 'bg-rose-500/20', unit: 'treinos' },
  { value: 'hydration', label: 'Hidratação', icon: Droplets, color: 'text-blue-500', bgColor: 'bg-blue-500/20', unit: 'ml' },
  { value: 'weight', label: 'Peso', icon: Scale, color: 'text-green-500', bgColor: 'bg-green-500/20', unit: 'kg' },
  { value: 'calories', label: 'Calorias', icon: Flame, color: 'text-orange-500', bgColor: 'bg-orange-500/20', unit: 'kcal' },
  { value: 'exercises', label: 'Exercícios', icon: Target, color: 'text-purple-500', bgColor: 'bg-purple-500/20', unit: 'exercícios' },
];

const getWeekStart = (): string => {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
};

export const WeeklyGoals: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  
  const [goals, setGoals] = useState<WeeklyGoal[]>([]);
  const [notifications, setNotifications] = useState<MotivationalNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showNotificationsDialog, setShowNotificationsDialog] = useState(false);
  const [editingGoal, setEditingGoal] = useState<WeeklyGoal | null>(null);
  const [newGoal, setNewGoal] = useState({ goal_type: 'workouts', target_value: '' });

  const handleBack = useCallback(() => navigate('/client'), [navigate]);
  useEscapeBack({ to: '/client', disableWhen: [showCreateDialog, showNotificationsDialog, !!editingGoal] });

  const profileId = profile?.profile_id;

  const fetchGoals = useCallback(async () => {
    if (!profileId) return;
    try {
      const { data } = await supabase.from('weekly_goals').select('*')
        .eq('profile_id', profileId).eq('week_start', getWeekStart());
      setGoals(data || []);
    } catch (error) { console.error('Error fetching goals:', error); }
  }, [profileId]);

  const fetchNotifications = useCallback(async () => {
    if (!profileId) return;
    try {
      const { data } = await supabase.from('motivational_notifications').select('*')
        .eq('profile_id', profileId).order('created_at', { ascending: false }).limit(20);
      setNotifications(data || []);
    } catch (error) { console.error('Error fetching notifications:', error); }
  }, [profileId]);

  useEffect(() => {
    if (profileId) {
      setLoading(true);
      Promise.all([fetchGoals(), fetchNotifications()]).finally(() => setLoading(false));
    }
  }, [profileId, fetchGoals, fetchNotifications]);

  const handleCreateGoal = async () => {
    if (!profileId || !newGoal.target_value) { toast.error('Preencha todos os campos'); return; }
    try {
      const { error } = await supabase.from('weekly_goals').insert({
        profile_id: profileId, week_start: getWeekStart(),
        goal_type: newGoal.goal_type, target_value: parseFloat(newGoal.target_value), current_value: 0
      });
      if (error?.code === '23505') { toast.error('Meta deste tipo já existe'); return; }
      if (error) throw error;
      toast.success('Meta criada!');
      setShowCreateDialog(false);
      setNewGoal({ goal_type: 'workouts', target_value: '' });
      fetchGoals();
    } catch (error) { toast.error('Erro ao criar meta'); }
  };

  const handleDeleteGoal = async (goalId: string) => {
    try {
      await supabase.from('weekly_goals').delete().eq('id', goalId);
      toast.success('Meta removida');
      fetchGoals();
    } catch (error) { toast.error('Erro ao remover'); }
  };

  const getProgressPercentage = (goal: WeeklyGoal): number => 
    goal.target_value === 0 ? 0 : Math.min((goal.current_value / goal.target_value) * 100, 100);

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const completedGoals = goals.filter(g => g.is_completed).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/50 -mx-4 px-4 py-3 mb-4">
        <Button variant="ghost" onClick={handleBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" /><span className="font-medium">Voltar</span>
        </Button>
      </div>

      <ClientPageHeader title="METAS SEMANAIS" icon={<Target className="w-6 h-6" />} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30">
          <CardContent className="p-4 text-center">
            <Target className="w-8 h-8 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{goals.length}</p>
            <p className="text-xs text-muted-foreground">Metas Ativas</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/20 to-green-500/5 border-green-500/30">
          <CardContent className="p-4 text-center">
            <Trophy className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">{completedGoals}</p>
            <p className="text-xs text-muted-foreground">Concluídas</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/20 to-amber-500/5 border-amber-500/30">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-8 h-8 mx-auto mb-2 text-amber-500" />
            <p className="text-2xl font-bold">{goals.length > 0 ? Math.round(goals.reduce((sum, g) => sum + getProgressPercentage(g), 0) / goals.length) : 0}%</p>
            <p className="text-xs text-muted-foreground">Progresso Médio</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/20 to-blue-500/5 border-blue-500/30 cursor-pointer" onClick={() => setShowNotificationsDialog(true)}>
          <CardContent className="p-4 text-center relative">
            <Bell className="w-8 h-8 mx-auto mb-2 text-blue-500" />
            {unreadCount > 0 && <Badge className="absolute top-2 right-2 bg-red-500 text-white">{unreadCount}</Badge>}
            <p className="text-2xl font-bold">{notifications.length}</p>
            <p className="text-xs text-muted-foreground">Notificações</p>
          </CardContent>
        </Card>
      </div>

      <Button onClick={() => setShowCreateDialog(true)} className="w-full bg-gradient-to-r from-primary to-primary/80">
        <Plus className="w-4 h-4 mr-2" />Nova Meta
      </Button>

      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {goals.length === 0 ? (
            <Card className="border-dashed"><CardContent className="p-8 text-center">
              <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-semibold mb-2">Nenhuma meta definida</h3>
              <p className="text-sm text-muted-foreground">Defina metas semanais para acompanhar seu progresso</p>
            </CardContent></Card>
          ) : goals.map((goal, index) => {
            const goalType = goalTypes.find(g => g.value === goal.goal_type);
            const Icon = goalType?.icon || Target;
            const progress = getProgressPercentage(goal);
            return (
              <motion.div key={goal.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -100 }} transition={{ delay: index * 0.1 }} layout>
                <Card className={`relative overflow-hidden ${goal.is_completed ? 'border-green-500/50 bg-green-500/5' : ''}`}>
                  {goal.is_completed && <Badge className="absolute top-2 right-2 bg-green-500 text-white"><Check className="w-3 h-3 mr-1" />Concluída!</Badge>}
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl ${goalType?.bgColor}`}><Icon className={`w-6 h-6 ${goalType?.color}`} /></div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">{goalType?.label}</h3>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="w-8 h-8" onClick={() => { setEditingGoal(goal); setNewGoal({ goal_type: goal.goal_type, target_value: goal.target_value.toString() }); }}><Edit2 className="w-4 h-4" /></Button>
                            <Button size="icon" variant="ghost" className="w-8 h-8 text-destructive" onClick={() => handleDeleteGoal(goal.id)}><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{goal.current_value.toLocaleString()} / {goal.target_value.toLocaleString()} {goalType?.unit}</span>
                            <span className={`font-medium ${progress >= 100 ? 'text-green-500' : goalType?.color}`}>{Math.round(progress)}%</span>
                          </div>
                          <Progress value={progress} className={`h-3 ${goal.is_completed ? '[&>div]:bg-green-500' : ''}`} />
                          {progress >= 50 && progress < 100 && <p className="text-xs text-amber-500 flex items-center gap-1"><Sparkles className="w-3 h-3" />Você está quase lá!</p>}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <Dialog open={showCreateDialog || !!editingGoal} onOpenChange={(open) => { if (!open) { setShowCreateDialog(false); setEditingGoal(null); setNewGoal({ goal_type: 'workouts', target_value: '' }); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Target className="w-5 h-5 text-primary" />{editingGoal ? 'Editar Meta' : 'Nova Meta'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            {!editingGoal && <div className="space-y-2"><Label>Tipo</Label>
              <Select value={newGoal.goal_type} onValueChange={(v) => setNewGoal(p => ({ ...p, goal_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{goalTypes.map(t => <SelectItem key={t.value} value={t.value} disabled={goals.some(g => g.goal_type === t.value)}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>}
            <div className="space-y-2"><Label>Meta ({goalTypes.find(t => t.value === newGoal.goal_type)?.unit})</Label>
              <Input type="number" value={newGoal.target_value} onChange={(e) => setNewGoal(p => ({ ...p, target_value: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreateDialog(false); setEditingGoal(null); }}>Cancelar</Button>
            <Button onClick={handleCreateGoal}>{editingGoal ? 'Salvar' : 'Criar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showNotificationsDialog} onOpenChange={setShowNotificationsDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle><Bell className="w-5 h-5 inline mr-2" />Notificações</DialogTitle></DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto space-y-3">
            {notifications.length === 0 ? <div className="text-center py-8 text-muted-foreground"><Star className="w-12 h-12 mx-auto mb-4 opacity-50" /><p>Nenhuma notificação</p></div>
              : notifications.map(n => (
                <div key={n.id} className={`p-4 rounded-lg border ${n.is_read ? 'bg-muted/30' : 'bg-primary/5 border-primary/30'}`}>
                  <h4 className="font-medium text-sm">{n.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{n.message}</p>
                </div>
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

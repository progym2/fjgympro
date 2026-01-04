import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Utensils, Plus, Trash2, Edit, Sparkles, List } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import InteractiveMealBuilder from './InteractiveMealBuilder';
import ClientPageHeader from './ClientPageHeader';

interface MealPlan {
  id: string;
  name: string;
  description: string | null;
  total_calories: number | null;
  protein_grams: number | null;
  carbs_grams: number | null;
  fat_grams: number | null;
  is_instructor_plan: boolean;
  is_active: boolean;
  created_at: string;
}

const NutritionPlan: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MealPlan | null>(null);
  const [activeTab, setActiveTab] = useState('builder');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    total_calories: '',
    protein_grams: '',
    carbs_grams: '',
    fat_grams: ''
  });

  useEffect(() => {
    if (profile) {
      fetchPlans();
    }
  }, [profile]);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('meal_plans')
        .select('*')
        .or(`created_by.eq.${profile?.profile_id},assigned_to.eq.${profile?.profile_id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error fetching meal plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.profile_id || !formData.name) return;

    setSaving(true);
    try {
      if (editingPlan) {
        const { error } = await supabase
          .from('meal_plans')
          .update({
            name: formData.name,
            description: formData.description || null,
            total_calories: formData.total_calories ? parseInt(formData.total_calories) : null,
            protein_grams: formData.protein_grams ? parseInt(formData.protein_grams) : null,
            carbs_grams: formData.carbs_grams ? parseInt(formData.carbs_grams) : null,
            fat_grams: formData.fat_grams ? parseInt(formData.fat_grams) : null
          })
          .eq('id', editingPlan.id);

        if (error) throw error;
        toast.success('Plano atualizado!');
      } else {
        const { error } = await supabase
          .from('meal_plans')
          .insert({
            created_by: profile.profile_id,
            name: formData.name,
            description: formData.description || null,
            total_calories: formData.total_calories ? parseInt(formData.total_calories) : null,
            protein_grams: formData.protein_grams ? parseInt(formData.protein_grams) : null,
            carbs_grams: formData.carbs_grams ? parseInt(formData.carbs_grams) : null,
            fat_grams: formData.fat_grams ? parseInt(formData.fat_grams) : null,
            is_instructor_plan: false
          });

        if (error) throw error;
        toast.success('Plano criado!');
      }

      resetForm();
      fetchPlans();
    } catch (error) {
      console.error('Error saving meal plan:', error);
      toast.error('Erro ao salvar plano');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (plan: MealPlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description || '',
      total_calories: plan.total_calories?.toString() || '',
      protein_grams: plan.protein_grams?.toString() || '',
      carbs_grams: plan.carbs_grams?.toString() || '',
      fat_grams: plan.fat_grams?.toString() || ''
    });
    setShowForm(true);
    setActiveTab('plans');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este plano?')) return;

    try {
      const { error } = await supabase
        .from('meal_plans')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Plano excluído!');
      fetchPlans();
    } catch (error) {
      console.error('Error deleting meal plan:', error);
      toast.error('Erro ao excluir plano');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', total_calories: '', protein_grams: '', carbs_grams: '', fat_grams: '' });
    setEditingPlan(null);
    setShowForm(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col overflow-hidden"
    >
      <ClientPageHeader 
        title="PLANO ALIMENTAR" 
        icon={<Utensils className="w-5 h-5" />} 
        iconColor="text-orange-500" 
      />

      <div className="flex-1 overflow-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="builder" className="flex items-center gap-2">
              <Sparkles size={16} />
              Montar Cardápio
            </TabsTrigger>
            <TabsTrigger value="plans" className="flex items-center gap-2">
              <List size={16} />
              Meus Planos ({plans.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="builder">
            <InteractiveMealBuilder />
          </TabsContent>

          <TabsContent value="plans" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => { resetForm(); setShowForm(!showForm); }}>
              <Plus size={18} className="mr-2" /> Novo Plano Manual
            </Button>
          </div>

          {/* Form */}
          {showForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              onSubmit={handleSubmit}
              className="bg-card/80 backdrop-blur-md rounded-xl p-6 border border-orange-500/30 space-y-4"
            >
              <h3 className="font-bebas text-lg text-orange-500">
                {editingPlan ? 'EDITAR PLANO' : 'NOVO PLANO'}
              </h3>
              
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome do Plano *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Dieta Low Carb"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Calorias Diárias</Label>
                  <Input
                    type="number"
                    value={formData.total_calories}
                    onChange={(e) => setFormData({ ...formData, total_calories: e.target.value })}
                    placeholder="2000"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Proteínas (g)</Label>
                  <Input
                    type="number"
                    value={formData.protein_grams}
                    onChange={(e) => setFormData({ ...formData, protein_grams: e.target.value })}
                    placeholder="150"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Carboidratos (g)</Label>
                  <Input
                    type="number"
                    value={formData.carbs_grams}
                    onChange={(e) => setFormData({ ...formData, carbs_grams: e.target.value })}
                    placeholder="200"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Gorduras (g)</Label>
                  <Input
                    type="number"
                    value={formData.fat_grams}
                    onChange={(e) => setFormData({ ...formData, fat_grams: e.target.value })}
                    placeholder="70"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detalhes do plano alimentar..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={saving} className="flex-1">
                  {saving ? 'Salvando...' : editingPlan ? 'Atualizar' : 'Criar Plano'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              </div>
            </motion.form>
          )}

          {/* Plans List */}
          {loading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : plans.length === 0 ? (
            <div className="bg-card/80 backdrop-blur-md rounded-xl p-8 border border-border/50 text-center">
              <Utensils className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum plano alimentar encontrado</p>
              <p className="text-sm text-muted-foreground mt-2">Use o montador de cardápio ou crie um plano manual</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {plans.map((plan) => (
                <Card key={plan.id} className="bg-card/80 backdrop-blur-md border-border/50">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg font-bebas tracking-wider flex items-center gap-2">
                          {plan.name}
                          {plan.is_instructor_plan && (
                            <span className="text-xs bg-green-500/20 text-green-500 px-2 py-0.5 rounded">
                              INSTRUTOR
                            </span>
                          )}
                        </CardTitle>
                        {plan.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{plan.description}</p>
                        )}
                      </div>
                      {!plan.is_instructor_plan && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(plan)}>
                            <Edit size={16} />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(plan.id)}>
                            <Trash2 size={16} className="text-destructive" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="p-2 bg-background/50 rounded">
                        <p className="text-lg font-bold text-orange-500">{plan.total_calories || '-'}</p>
                        <p className="text-xs text-muted-foreground">kcal</p>
                      </div>
                      <div className="p-2 bg-background/50 rounded">
                        <p className="text-lg font-bold text-red-500">{plan.protein_grams || '-'}</p>
                        <p className="text-xs text-muted-foreground">proteína</p>
                      </div>
                      <div className="p-2 bg-background/50 rounded">
                        <p className="text-lg font-bold text-blue-500">{plan.carbs_grams || '-'}</p>
                        <p className="text-xs text-muted-foreground">carbs</p>
                      </div>
                      <div className="p-2 bg-background/50 rounded">
                        <p className="text-lg font-bold text-yellow-500">{plan.fat_grams || '-'}</p>
                        <p className="text-xs text-muted-foreground">gordura</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        </Tabs>
      </div>
    </motion.div>
  );
};

export default NutritionPlan;

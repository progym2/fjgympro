import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Utensils, Plus, Trash2, Calculator, Save, Loader2, 
  Apple, Beef, Wheat, Droplets, Coffee, Moon, Sun, 
  Flame, Target, ChevronRight, Check, Sparkles, History,
  Copy, Clock
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

interface FoodItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  portion: string;
  category: string;
}

interface MealSlot {
  id: string;
  name: string;
  icon: React.ReactNode;
  time: string;
  foods: FoodItem[];
}

interface ProfileData {
  weight_kg: number | null;
  height_cm: number | null;
  birth_date: string | null;
  gender: string | null;
  fitness_goal: string | null;
}

interface SavedPlan {
  id: string;
  name: string;
  description: string | null;
  total_calories: number | null;
  protein_grams: number | null;
  carbs_grams: number | null;
  fat_grams: number | null;
  created_at: string;
}

const FOOD_DATABASE: FoodItem[] = [
  // Proteínas
  { id: 'chicken', name: 'Frango Grelhado', calories: 165, protein: 31, carbs: 0, fat: 3.6, portion: '100g', category: 'proteina' },
  { id: 'eggs', name: 'Ovos (2 unidades)', calories: 155, protein: 13, carbs: 1.1, fat: 11, portion: '2 ovos', category: 'proteina' },
  { id: 'beef', name: 'Carne Bovina Magra', calories: 250, protein: 26, carbs: 0, fat: 15, portion: '100g', category: 'proteina' },
  { id: 'fish', name: 'Peixe Grelhado', calories: 130, protein: 28, carbs: 0, fat: 1.5, portion: '100g', category: 'proteina' },
  { id: 'tuna', name: 'Atum em Água', calories: 116, protein: 26, carbs: 0, fat: 0.8, portion: '100g', category: 'proteina' },
  { id: 'whey', name: 'Whey Protein', calories: 120, protein: 24, carbs: 3, fat: 1, portion: '1 scoop', category: 'proteina' },
  
  // Carboidratos
  { id: 'rice', name: 'Arroz Branco', calories: 130, protein: 2.7, carbs: 28, fat: 0.3, portion: '100g', category: 'carboidrato' },
  { id: 'sweet_potato', name: 'Batata Doce', calories: 86, protein: 1.6, carbs: 20, fat: 0.1, portion: '100g', category: 'carboidrato' },
  { id: 'oats', name: 'Aveia', calories: 389, protein: 17, carbs: 66, fat: 7, portion: '100g', category: 'carboidrato' },
  { id: 'bread', name: 'Pão Integral (2 fatias)', calories: 140, protein: 6, carbs: 24, fat: 2, portion: '2 fatias', category: 'carboidrato' },
  { id: 'pasta', name: 'Macarrão Integral', calories: 124, protein: 5, carbs: 25, fat: 0.5, portion: '100g', category: 'carboidrato' },
  { id: 'banana', name: 'Banana', calories: 89, protein: 1.1, carbs: 23, fat: 0.3, portion: '1 unidade', category: 'carboidrato' },
  
  // Gorduras
  { id: 'avocado', name: 'Abacate', calories: 160, protein: 2, carbs: 9, fat: 15, portion: '100g', category: 'gordura' },
  { id: 'olive_oil', name: 'Azeite de Oliva', calories: 119, protein: 0, carbs: 0, fat: 13.5, portion: '1 colher', category: 'gordura' },
  { id: 'nuts', name: 'Castanhas Mistas', calories: 607, protein: 20, carbs: 21, fat: 54, portion: '100g', category: 'gordura' },
  { id: 'peanut_butter', name: 'Pasta de Amendoim', calories: 94, protein: 4, carbs: 3, fat: 8, portion: '1 colher', category: 'gordura' },
  
  // Vegetais
  { id: 'broccoli', name: 'Brócolis', calories: 34, protein: 2.8, carbs: 7, fat: 0.4, portion: '100g', category: 'vegetal' },
  { id: 'salad', name: 'Salada Verde', calories: 20, protein: 1.5, carbs: 3, fat: 0.2, portion: '100g', category: 'vegetal' },
  { id: 'tomato', name: 'Tomate', calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, portion: '100g', category: 'vegetal' },
  { id: 'spinach', name: 'Espinafre', calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, portion: '100g', category: 'vegetal' },
];

const INITIAL_MEALS: MealSlot[] = [
  { id: 'breakfast', name: 'Café da Manhã', icon: <Coffee className="w-5 h-5" />, time: '07:00', foods: [] },
  { id: 'morning_snack', name: 'Lanche da Manhã', icon: <Apple className="w-5 h-5" />, time: '10:00', foods: [] },
  { id: 'lunch', name: 'Almoço', icon: <Sun className="w-5 h-5" />, time: '12:30', foods: [] },
  { id: 'afternoon_snack', name: 'Lanche da Tarde', icon: <Apple className="w-5 h-5" />, time: '15:30', foods: [] },
  { id: 'dinner', name: 'Jantar', icon: <Moon className="w-5 h-5" />, time: '19:00', foods: [] },
  { id: 'supper', name: 'Ceia', icon: <Moon className="w-5 h-5" />, time: '21:00', foods: [] },
];

const InteractiveMealBuilder: React.FC = () => {
  const { profile } = useAuth();
  const [meals, setMeals] = useState<MealSlot[]>(INITIAL_MEALS);
  const [selectedMeal, setSelectedMeal] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [dailyGoals, setDailyGoals] = useState({
    calories: 2000,
    protein: 150,
    carbs: 200,
    fat: 70
  });
  const [saving, setSaving] = useState(false);
  const [planName, setPlanName] = useState('');
  const [showGoalCalculator, setShowGoalCalculator] = useState(false);
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [addedFoodId, setAddedFoodId] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.profile_id) {
      fetchProfileData();
      fetchSavedPlans();
    }
  }, [profile?.profile_id]);

  const fetchProfileData = async () => {
    if (!profile?.profile_id) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('weight_kg, height_cm, birth_date, gender, fitness_goal')
        .eq('id', profile.profile_id)
        .maybeSingle();
      
      if (error) throw error;
      if (data) {
        setProfileData(data as ProfileData);
        calculateGoalsFromData(data as ProfileData);
      }
    } catch (error) {
      console.error('Error fetching profile data:', error);
    }
  };

  const fetchSavedPlans = async () => {
    if (!profile?.profile_id) return;
    setLoadingPlans(true);
    
    try {
      const { data, error } = await supabase
        .from('meal_plans')
        .select('id, name, description, total_calories, protein_grams, carbs_grams, fat_grams, created_at')
        .eq('created_by', profile.profile_id)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      setSavedPlans(data || []);
    } catch (error) {
      console.error('Error fetching saved plans:', error);
    } finally {
      setLoadingPlans(false);
    }
  };

  const calculateGoalsFromData = (data: ProfileData) => {
    if (!data?.weight_kg || !data?.height_cm) return;
    
    const weight = Number(data.weight_kg) || 70;
    const height = Number(data.height_cm) || 170;
    const age = data.birth_date 
      ? Math.floor((new Date().getTime() - new Date(data.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : 30;
    const isMale = data.gender === 'masculino';
    
    // Harris-Benedict BMR
    let bmr = isMale 
      ? 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age)
      : 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
    
    // Activity multiplier (assuming moderate activity)
    const tdee = bmr * 1.55;
    
    // Adjust based on fitness goal
    let targetCalories = tdee;
    let proteinMultiplier = 1.8; // g per kg
    
    switch (data.fitness_goal) {
      case 'muscle_gain':
      case 'hypertrophy':
        targetCalories = tdee + 300;
        proteinMultiplier = 2.0;
        break;
      case 'weight_loss':
        targetCalories = tdee - 400;
        proteinMultiplier = 2.2;
        break;
      case 'conditioning':
        targetCalories = tdee;
        proteinMultiplier = 1.6;
        break;
    }

    const protein = Math.round(weight * proteinMultiplier);
    const fat = Math.round(targetCalories * 0.25 / 9);
    const carbs = Math.round((targetCalories - (protein * 4) - (fat * 9)) / 4);
    
    setDailyGoals({
      calories: Math.round(targetCalories),
      protein,
      carbs: Math.max(carbs, 100),
      fat
    });
  };

  const getTotals = () => {
    return meals.reduce((acc, meal) => {
      meal.foods.forEach(food => {
        acc.calories += food.calories;
        acc.protein += food.protein;
        acc.carbs += food.carbs;
        acc.fat += food.fat;
      });
      return acc;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
  };

  const addFoodToMeal = (food: FoodItem) => {
    if (!selectedMeal) return;
    const newFoodId = `${food.id}-${Date.now()}`;
    setMeals(meals.map(meal => 
      meal.id === selectedMeal 
        ? { ...meal, foods: [...meal.foods, { ...food, id: newFoodId }] }
        : meal
    ));
    
    // Visual feedback animation
    setAddedFoodId(newFoodId);
    setTimeout(() => setAddedFoodId(null), 600);
    
    toast.success(`${food.name} adicionado!`, { duration: 1500 });
  };

  const removeFoodFromMeal = (mealId: string, foodIndex: number) => {
    setMeals(meals.map(meal =>
      meal.id === mealId
        ? { ...meal, foods: meal.foods.filter((_, i) => i !== foodIndex) }
        : meal
    ));
  };

  const duplicatePlan = async (plan: SavedPlan) => {
    const newName = `${plan.name} (cópia)`;
    setPlanName(newName);
    
    // Parse the description to restore meals if possible
    if (plan.description) {
      toast.success(`Plano "${plan.name}" duplicado! Edite e salve como novo.`);
    }
    
    // Set the goals based on the plan
    if (plan.total_calories) {
      setDailyGoals({
        calories: plan.total_calories,
        protein: plan.protein_grams || 150,
        carbs: plan.carbs_grams || 200,
        fat: plan.fat_grams || 70
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleSave = async () => {
    if (!profile?.profile_id || !planName.trim()) {
      toast.error('Digite um nome para o cardápio');
      return;
    }

    const totals = getTotals();
    setSaving(true);

    try {
      const description = meals.map(meal => 
        `${meal.name} (${meal.time}): ${meal.foods.map(f => f.name).join(', ') || 'Vazio'}`
      ).join('\n');

      const { error } = await supabase.from('meal_plans').insert({
        created_by: profile.profile_id,
        name: planName,
        description,
        total_calories: totals.calories,
        protein_grams: totals.protein,
        carbs_grams: totals.carbs,
        fat_grams: totals.fat,
        is_instructor_plan: false,
        is_active: true
      });

      if (error) throw error;
      toast.success('Cardápio salvo com sucesso!');
      setPlanName('');
      setMeals(INITIAL_MEALS);
      fetchSavedPlans(); // Refresh the history
    } catch (error) {
      console.error('Error saving meal plan:', error);
      toast.error('Erro ao salvar cardápio');
    } finally {
      setSaving(false);
    }
  };

  const totals = getTotals();
  const filteredFoods = selectedCategory === 'todos' 
    ? FOOD_DATABASE 
    : FOOD_DATABASE.filter(f => f.category === selectedCategory);

  const getProgressColor = (current: number, goal: number) => {
    const ratio = current / goal;
    if (ratio < 0.8) return 'bg-yellow-500';
    if (ratio <= 1.1) return 'bg-green-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Header with Goals */}
      <div className="bg-gradient-to-br from-orange-500/20 to-yellow-500/20 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-orange-500/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-orange-500" />
            <h3 className="font-bebas text-lg text-orange-500">METAS DIÁRIAS PERSONALIZADAS</h3>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowGoalCalculator(!showGoalCalculator)}
            className="text-orange-500"
          >
            <Calculator className="w-4 h-4 mr-1" />
            Ajustar
          </Button>
        </div>

        <AnimatePresence>
          {showGoalCalculator && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 p-4 bg-background/50 rounded-lg space-y-3"
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs">Calorias</Label>
                  <Input
                    type="number"
                    value={dailyGoals.calories}
                    onChange={(e) => setDailyGoals({...dailyGoals, calories: parseInt(e.target.value) || 0})}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">Proteína (g)</Label>
                  <Input
                    type="number"
                    value={dailyGoals.protein}
                    onChange={(e) => setDailyGoals({...dailyGoals, protein: parseInt(e.target.value) || 0})}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">Carbos (g)</Label>
                  <Input
                    type="number"
                    value={dailyGoals.carbs}
                    onChange={(e) => setDailyGoals({...dailyGoals, carbs: parseInt(e.target.value) || 0})}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">Gordura (g)</Label>
                  <Input
                    type="number"
                    value={dailyGoals.fat}
                    onChange={(e) => setDailyGoals({...dailyGoals, fat: parseInt(e.target.value) || 0})}
                    className="h-8"
                  />
                </div>
              </div>
              <Button size="sm" onClick={() => profileData && calculateGoalsFromData(profileData)} variant="outline" className="w-full">
                <Target className="w-4 h-4 mr-1" />
                Recalcular com Base no Perfil
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress Bars */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="flex items-center gap-1"><Flame className="w-3 h-3" /> kcal</span>
              <span>{totals.calories}/{dailyGoals.calories}</span>
            </div>
            <Progress 
              value={Math.min((totals.calories / dailyGoals.calories) * 100, 100)} 
              className="h-2"
              indicatorClassName={getProgressColor(totals.calories, dailyGoals.calories)}
            />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="flex items-center gap-1"><Beef className="w-3 h-3" /> Prot</span>
              <span>{totals.protein}g/{dailyGoals.protein}g</span>
            </div>
            <Progress 
              value={Math.min((totals.protein / dailyGoals.protein) * 100, 100)} 
              className="h-2"
              indicatorClassName={getProgressColor(totals.protein, dailyGoals.protein)}
            />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="flex items-center gap-1"><Wheat className="w-3 h-3" /> Carb</span>
              <span>{totals.carbs}g/{dailyGoals.carbs}g</span>
            </div>
            <Progress 
              value={Math.min((totals.carbs / dailyGoals.carbs) * 100, 100)} 
              className="h-2"
              indicatorClassName={getProgressColor(totals.carbs, dailyGoals.carbs)}
            />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="flex items-center gap-1"><Droplets className="w-3 h-3" /> Gord</span>
              <span>{totals.fat}g/{dailyGoals.fat}g</span>
            </div>
            <Progress 
              value={Math.min((totals.fat / dailyGoals.fat) * 100, 100)} 
              className="h-2"
              indicatorClassName={getProgressColor(totals.fat, dailyGoals.fat)}
            />
          </div>
        </div>
      </div>

      {/* Meal Slots */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence mode="wait">
          {meals.map((meal, mealIndex) => (
            <motion.div
              key={meal.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: mealIndex * 0.05, duration: 0.2 }}
            >
              <Card 
                className={`bg-card/80 backdrop-blur-md border cursor-pointer transition-all duration-200 ${
                  selectedMeal === meal.id 
                    ? 'border-orange-500 ring-2 ring-orange-500/20 scale-[1.02]' 
                    : 'border-border/50 hover:border-orange-500/50 hover:scale-[1.01]'
                }`}
                onClick={() => setSelectedMeal(selectedMeal === meal.id ? null : meal.id)}
              >
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <motion.span 
                      className="flex items-center gap-2"
                      animate={selectedMeal === meal.id ? { x: [0, 3, 0] } : {}}
                      transition={{ duration: 0.3 }}
                    >
                      <span className="text-orange-500">{meal.icon}</span>
                      <span className="text-sm font-medium text-foreground">{meal.name}</span>
                    </motion.span>
                    <Badge variant="outline" className="text-xs bg-background/80 text-muted-foreground border-border">{meal.time}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3 pt-0">
                  {meal.foods.length === 0 ? (
                    <motion.p 
                      className="text-xs text-muted-foreground text-center py-2"
                      animate={selectedMeal === meal.id ? { opacity: [0.5, 1] } : {}}
                    >
                      Clique para adicionar alimentos
                    </motion.p>
                  ) : (
                    <div className="space-y-1">
                      <AnimatePresence>
                        {meal.foods.map((food, idx) => (
                          <motion.div 
                            key={`${food.id}-${idx}`} 
                            initial={{ opacity: 0, x: -10, scale: 0.95 }}
                            animate={{ 
                              opacity: 1, 
                              x: 0, 
                              scale: 1,
                              backgroundColor: addedFoodId === food.id ? 'hsl(var(--primary) / 0.2)' : 'transparent'
                            }}
                            exit={{ opacity: 0, x: 10, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="flex items-center justify-between text-xs bg-background/50 rounded px-2 py-1"
                          >
                            <span className="truncate flex-1">{food.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">{food.calories}kcal</span>
                              <motion.button 
                                onClick={(e) => { e.stopPropagation(); removeFoodFromMeal(meal.id, idx); }}
                                className="text-destructive hover:text-destructive/80"
                                whileHover={{ scale: 1.2 }}
                                whileTap={{ scale: 0.9 }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </motion.button>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      <motion.div 
                        className="text-xs text-orange-500 font-medium pt-1 border-t border-border/50"
                        key={meal.foods.reduce((acc, f) => acc + f.calories, 0)}
                        initial={{ scale: 1 }}
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 0.3 }}
                      >
                        Total: {meal.foods.reduce((acc, f) => acc + f.calories, 0)} kcal
                      </motion.div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Food Selection Panel */}
      <AnimatePresence>
        {selectedMeal && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-orange-500/30"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bebas text-lg">ADICIONAR ALIMENTOS</h3>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-40 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="proteina">Proteínas</SelectItem>
                  <SelectItem value="carboidrato">Carboidratos</SelectItem>
                  <SelectItem value="gordura">Gorduras</SelectItem>
                  <SelectItem value="vegetal">Vegetais</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
              {filteredFoods.map((food, index) => (
                <motion.button
                  key={food.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.02, duration: 0.15 }}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => addFoodToMeal(food)}
                  className="p-3 bg-background/50 rounded-lg border border-border/50 hover:border-orange-500 hover:bg-orange-500/10 text-left transition-colors duration-150"
                >
                  <p className="text-sm font-medium truncate">{food.name}</p>
                  <p className="text-xs text-muted-foreground">{food.portion}</p>
                  <div className="flex gap-2 mt-1 text-xs">
                    <span className="text-orange-500">{food.calories}kcal</span>
                    <span className="text-red-400">P{food.protein}g</span>
                  </div>
                  <motion.div
                    className="mt-1 flex items-center gap-1 text-xs text-green-500 opacity-0"
                    whileHover={{ opacity: 1 }}
                  >
                    <Plus className="w-3 h-3" />
                    Adicionar
                  </motion.div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save Section */}
      <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Label className="text-sm text-muted-foreground">Nome do Cardápio</Label>
            <Input
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              placeholder="Ex: Cardápio para Hipertrofia"
              className="bg-background/50"
            />
          </div>
          <div className="flex gap-2 sm:self-end">
            {/* History Sheet */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0">
                  <History className="w-4 h-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[340px] sm:w-[400px]">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2 font-bebas text-lg">
                    <History className="w-5 h-5 text-orange-500" />
                    HISTÓRICO DE CARDÁPIOS
                  </SheetTitle>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-100px)] mt-4 pr-4">
                  {loadingPlans ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                    </div>
                  ) : savedPlans.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Utensils className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Nenhum cardápio salvo</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {savedPlans.map((plan, index) => (
                        <motion.div
                          key={plan.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="bg-background/50 rounded-lg p-3 border border-border/50 hover:border-orange-500/50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm truncate">{plan.name}</h4>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                <Clock className="w-3 h-3" />
                                {formatDate(plan.created_at)}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => duplicatePlan(plan)}
                              className="shrink-0 h-8 w-8 p-0"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-4 gap-1 mt-2 text-xs">
                            <div className="bg-background/80 rounded px-2 py-1 text-center">
                              <span className="text-orange-500 font-medium">{plan.total_calories || '-'}</span>
                              <p className="text-muted-foreground text-[10px]">kcal</p>
                            </div>
                            <div className="bg-background/80 rounded px-2 py-1 text-center">
                              <span className="text-red-400 font-medium">{plan.protein_grams || '-'}</span>
                              <p className="text-muted-foreground text-[10px]">prot</p>
                            </div>
                            <div className="bg-background/80 rounded px-2 py-1 text-center">
                              <span className="text-blue-400 font-medium">{plan.carbs_grams || '-'}</span>
                              <p className="text-muted-foreground text-[10px]">carb</p>
                            </div>
                            <div className="bg-background/80 rounded px-2 py-1 text-center">
                              <span className="text-yellow-400 font-medium">{plan.fat_grams || '-'}</span>
                              <p className="text-muted-foreground text-[10px]">gord</p>
                            </div>
                          </div>
                          
                          {plan.description && (
                            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{plan.description}</p>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </SheetContent>
            </Sheet>
            
            <Button 
              onClick={handleSave} 
              disabled={saving || !planName.trim() || totals.calories === 0}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InteractiveMealBuilder;

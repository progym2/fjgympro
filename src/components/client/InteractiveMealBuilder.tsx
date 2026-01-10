import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Utensils, Plus, Trash2, Calculator, Save, Loader2, 
  Apple, Beef, Wheat, Droplets, Coffee, Moon, Sun, 
  Flame, Target, ChevronRight, Check, Sparkles
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

  useEffect(() => {
    if (profile?.profile_id) {
      fetchProfileData();
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
    setMeals(meals.map(meal => 
      meal.id === selectedMeal 
        ? { ...meal, foods: [...meal.foods, { ...food, id: `${food.id}-${Date.now()}` }] }
        : meal
    ));
    toast.success(`${food.name} adicionado!`);
  };

  const removeFoodFromMeal = (mealId: string, foodIndex: number) => {
    setMeals(meals.map(meal =>
      meal.id === mealId
        ? { ...meal, foods: meal.foods.filter((_, i) => i !== foodIndex) }
        : meal
    ));
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
        {meals.map((meal) => (
          <Card 
            key={meal.id} 
            className={`bg-card/80 backdrop-blur-md border cursor-pointer transition-all ${
              selectedMeal === meal.id 
                ? 'border-orange-500 ring-2 ring-orange-500/20' 
                : 'border-border/50 hover:border-orange-500/50'
            }`}
            onClick={() => setSelectedMeal(selectedMeal === meal.id ? null : meal.id)}
          >
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2 font-semibold text-foreground">
                  <span className="text-orange-500">{meal.icon}</span>
                  <span className="text-base tracking-wide">{meal.name}</span>
                </span>
                <Badge variant="outline" className="text-xs bg-background/80 text-foreground border-border">{meal.time}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 pt-0">
              {meal.foods.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Clique para adicionar alimentos
                </p>
              ) : (
                <div className="space-y-1">
                  {meal.foods.map((food, idx) => (
                    <div key={`${food.id}-${idx}`} className="flex items-center justify-between text-xs bg-background/50 rounded px-2 py-1">
                      <span className="truncate flex-1">{food.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{food.calories}kcal</span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); removeFoodFromMeal(meal.id, idx); }}
                          className="text-destructive hover:text-destructive/80"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="text-xs text-orange-500 font-medium pt-1 border-t border-border/50">
                    Total: {meal.foods.reduce((acc, f) => acc + f.calories, 0)} kcal
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
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
              {filteredFoods.map((food) => (
                <motion.button
                  key={food.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => addFoodToMeal(food)}
                  className="p-3 bg-background/50 rounded-lg border border-border/50 hover:border-orange-500/50 text-left transition-all"
                >
                  <p className="text-sm font-medium truncate">{food.name}</p>
                  <p className="text-xs text-muted-foreground">{food.portion}</p>
                  <div className="flex gap-2 mt-1 text-xs">
                    <span className="text-orange-500">{food.calories}kcal</span>
                    <span className="text-red-400">P{food.protein}g</span>
                  </div>
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
          <Button 
            onClick={handleSave} 
            disabled={saving || !planName.trim() || totals.calories === 0}
            className="bg-orange-500 hover:bg-orange-600 sm:self-end"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            {saving ? 'Salvando...' : 'Salvar Cardápio'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InteractiveMealBuilder;

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dumbbell, ArrowLeft, Search, Video, Plus, Heart, 
  Zap, X, ChevronRight, Loader2, Play, Flame, Target, Star
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import YouTubePlayer from '@/components/shared/YouTubePlayer';

interface Exercise {
  id: string;
  name: string;
  muscle_group: string | null;
  video_url: string | null;
  description: string | null;
  equipment: string | null;
  difficulty: string | null;
  instructions: string | null;
}

interface MuscleGroupDashboardProps {
  onSelectExercise?: (exercise: Exercise) => void;
  onBack?: () => void;
}

// Muscle group data with icons and colors
const muscleGroups = [
  { 
    id: 'Peito', 
    name: 'Peito', 
    color: 'from-red-500 to-red-600',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/50',
    textColor: 'text-red-400',
    glowColor: 'shadow-red-500/30',
    icon: '🏋️',
    description: 'Peitoral maior e menor'
  },
  { 
    id: 'Costas', 
    name: 'Costas', 
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/50',
    textColor: 'text-blue-400',
    glowColor: 'shadow-blue-500/30',
    icon: '💪',
    description: 'Latíssimo, trapézio, romboides'
  },
  { 
    id: 'Ombros', 
    name: 'Ombros', 
    color: 'from-orange-500 to-orange-600',
    bgColor: 'bg-orange-500/20',
    borderColor: 'border-orange-500/50',
    textColor: 'text-orange-400',
    glowColor: 'shadow-orange-500/30',
    icon: '🏆',
    description: 'Deltoides anterior, lateral e posterior'
  },
  { 
    id: 'Bíceps', 
    name: 'Bíceps', 
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-500/20',
    borderColor: 'border-purple-500/50',
    textColor: 'text-purple-400',
    glowColor: 'shadow-purple-500/30',
    icon: '💪',
    description: 'Bíceps braquial'
  },
  { 
    id: 'Tríceps', 
    name: 'Tríceps', 
    color: 'from-pink-500 to-pink-600',
    bgColor: 'bg-pink-500/20',
    borderColor: 'border-pink-500/50',
    textColor: 'text-pink-400',
    glowColor: 'shadow-pink-500/30',
    icon: '🦾',
    description: 'Tríceps braquial (3 cabeças)'
  },
  { 
    id: 'Pernas', 
    name: 'Pernas', 
    color: 'from-green-500 to-green-600',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/50',
    textColor: 'text-green-400',
    glowColor: 'shadow-green-500/30',
    icon: '🦵',
    description: 'Quadríceps, isquiotibiais, panturrilha'
  },
  { 
    id: 'Abdômen', 
    name: 'Abdômen', 
    color: 'from-yellow-500 to-yellow-600',
    bgColor: 'bg-yellow-500/20',
    borderColor: 'border-yellow-500/50',
    textColor: 'text-yellow-400',
    glowColor: 'shadow-yellow-500/30',
    icon: '🔥',
    description: 'Reto abdominal, oblíquos'
  },
  { 
    id: 'Glúteos', 
    name: 'Glúteos', 
    color: 'from-rose-500 to-rose-600',
    bgColor: 'bg-rose-500/20',
    borderColor: 'border-rose-500/50',
    textColor: 'text-rose-400',
    glowColor: 'shadow-rose-500/30',
    icon: '🍑',
    description: 'Glúteo máximo, médio e mínimo'
  },
  { 
    id: 'Cardio', 
    name: 'Cardio', 
    color: 'from-cyan-500 to-cyan-600',
    bgColor: 'bg-cyan-500/20',
    borderColor: 'border-cyan-500/50',
    textColor: 'text-cyan-400',
    glowColor: 'shadow-cyan-500/30',
    icon: '🏃',
    description: 'Exercícios cardiovasculares'
  },
];

// Interactive Muscle Card Component
const MuscleCard: React.FC<{
  group: typeof muscleGroups[0];
  isSelected: boolean;
  onClick: () => void;
  index: number;
  exerciseCount?: number;
}> = ({ group, isSelected, onClick, index, exerciseCount }) => {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05, type: "spring", stiffness: 200 }}
      onClick={onClick}
      className={`relative p-3 sm:p-4 rounded-xl border-2 transition-all duration-300 text-center group overflow-hidden ${
        isSelected 
          ? `${group.borderColor} ${group.bgColor} ring-2 ring-offset-2 ring-offset-background ring-primary/50 shadow-lg ${group.glowColor}` 
          : 'border-border/30 bg-card/50 hover:border-primary/30 hover:bg-card/80'
      }`}
    >
      {/* Background gradient */}
      <motion.div 
        className={`absolute inset-0 bg-gradient-to-br ${group.color} transition-opacity duration-300`}
        initial={{ opacity: 0 }}
        animate={{ opacity: isSelected ? 0.15 : 0 }}
      />
      
      {/* Animated emoji */}
      <motion.div 
        className="relative z-10 text-2xl sm:text-3xl mb-1"
        animate={isSelected ? { 
          scale: [1, 1.15, 1],
          rotate: [0, 5, -5, 0]
        } : {}}
        transition={{ duration: 0.5, repeat: isSelected ? Infinity : 0, repeatDelay: 2 }}
      >
        {group.icon}
      </motion.div>
      
      <h4 className={`font-bebas text-sm sm:text-base tracking-wider relative z-10 ${isSelected ? group.textColor : 'text-foreground'}`}>
        {group.name}
      </h4>
      
      <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5 line-clamp-1 relative z-10 hidden sm:block">
        {group.description}
      </p>

      {/* Selection indicator */}
      {isSelected && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute top-1.5 right-1.5"
        >
          <div className={`w-2 h-2 rounded-full bg-gradient-to-br ${group.color} animate-pulse`} />
        </motion.div>
      )}
      
      {/* Hover arrow */}
      <motion.div
        className="absolute bottom-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
        animate={{ x: [0, 3, 0] }}
        transition={{ duration: 0.5, repeat: Infinity }}
      >
        <ChevronRight size={12} className={group.textColor} />
      </motion.div>
    </motion.button>
  );
};

const MuscleGroupDashboard: React.FC<MuscleGroupDashboardProps> = ({ onSelectExercise, onBack }) => {
  const { profile } = useAuth();
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [videoDialog, setVideoDialog] = useState<{ url: string; title: string; description?: string; instructions?: string } | null>(null);

  // Fetch favorites on mount
  useEffect(() => {
    if (profile?.profile_id) {
      fetchFavorites();
    }
  }, [profile?.profile_id]);

  useEffect(() => {
    if (selectedGroup) {
      fetchExercisesByGroup(selectedGroup);
    }
  }, [selectedGroup]);

  const fetchFavorites = async () => {
    if (!profile?.profile_id) return;
    
    try {
      const { data, error } = await supabase
        .from('exercise_favorites')
        .select('exercise_id')
        .eq('profile_id', profile.profile_id);

      if (error) throw error;
      setFavorites(new Set((data || []).map(f => f.exercise_id)));
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  };

  const fetchExercisesByGroup = async (group: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('is_system', true)
        .eq('muscle_group', group)
        .order('name');

      if (error) throw error;
      setExercises(data || []);
    } catch (error) {
      console.error('Error fetching exercises:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (exerciseId: string) => {
    if (!profile?.profile_id) {
      toast.error('Faça login para favoritar exercícios');
      return;
    }

    const isFavorited = favorites.has(exerciseId);

    try {
      if (isFavorited) {
        // Remove from favorites
        const { error } = await supabase
          .from('exercise_favorites')
          .delete()
          .eq('profile_id', profile.profile_id)
          .eq('exercise_id', exerciseId);

        if (error) throw error;
        
        setFavorites(prev => {
          const newSet = new Set(prev);
          newSet.delete(exerciseId);
          return newSet;
        });
        toast.success('Removido dos favoritos');
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('exercise_favorites')
          .insert({
            profile_id: profile.profile_id,
            exercise_id: exerciseId
          });

        if (error) throw error;
        
        setFavorites(prev => new Set([...prev, exerciseId]));
        toast.success('Adicionado aos favoritos! ⭐');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Erro ao atualizar favoritos');
    }
  };

  const filteredExercises = exercises.filter(ex => {
    const matchesSearch = ex.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFavorites = !showFavoritesOnly || favorites.has(ex.id);
    return matchesSearch && matchesFavorites;
  });

  const selectedGroupData = muscleGroups.find(g => g.id === selectedGroup);
  const favoriteCount = favorites.size;

  const getDifficultyColor = (difficulty: string | null) => {
    switch (difficulty?.toLowerCase()) {
      case 'iniciante': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'intermediário': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'avançado': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <motion.div 
            className="p-2 rounded-xl bg-gradient-to-br from-primary to-purple-500 shadow-lg shadow-primary/30"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            <Dumbbell className="w-5 h-5 text-white" />
          </motion.div>
          <div>
            <h2 className="text-lg sm:text-xl font-bebas text-primary tracking-wider">CARDÁPIO DE EXERCÍCIOS</h2>
            <p className="text-xs text-muted-foreground">
              {favoriteCount > 0 ? `${favoriteCount} favorito(s)` : 'Toque para explorar'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Favorites filter button */}
          <Button
            variant={showFavoritesOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`gap-1 ${showFavoritesOnly ? 'bg-yellow-500 hover:bg-yellow-600' : ''}`}
          >
            <Star size={14} className={showFavoritesOnly ? 'fill-current' : ''} />
            <span className="hidden sm:inline">Favoritos</span>
            {favoriteCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {favoriteCount}
              </Badge>
            )}
          </Button>
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
              <ArrowLeft size={14} /> Voltar
            </Button>
          )}
        </div>
      </div>

      {/* Muscle Group Cards Grid - 3x3 compact grid */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {muscleGroups.map((group, index) => (
          <MuscleCard
            key={group.id}
            group={group}
            isSelected={selectedGroup === group.id}
            onClick={() => setSelectedGroup(selectedGroup === group.id ? null : group.id)}
            index={index}
          />
        ))}
      </div>

      {/* Exercise List */}
      <AnimatePresence mode="wait">
        {selectedGroup ? (
          <motion.div
            key={selectedGroup}
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className={`rounded-xl border-2 ${selectedGroupData?.borderColor} ${selectedGroupData?.bgColor} overflow-hidden shadow-lg`}
          >
            {/* Exercise List Header */}
            <div className="p-3 sm:p-4 border-b border-border/30 bg-background/50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <motion.span 
                    className="text-2xl sm:text-3xl"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1, repeat: Infinity, repeatDelay: 1 }}
                  >
                    {selectedGroupData?.icon}
                  </motion.span>
                  <div>
                    <h3 className={`font-bebas text-lg sm:text-xl ${selectedGroupData?.textColor}`}>
                      {selectedGroup?.toUpperCase()}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {loading ? 'Carregando...' : `${exercises.length} exercício(s)`}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedGroup(null)}
                  className="rounded-full h-8 w-8"
                >
                  <X size={16} />
                </Button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar exercício..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 text-sm rounded-lg border-border/50 bg-background/80"
                />
              </div>
            </div>

            {/* Exercise List */}
            <ScrollArea className="h-[300px] sm:h-[350px]">
              <div className="p-3 space-y-2">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                    <p className="text-sm text-muted-foreground">Carregando...</p>
                  </div>
                ) : filteredExercises.length === 0 ? (
                  <div className="text-center py-12">
                    <Dumbbell className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">Nenhum exercício encontrado</p>
                  </div>
                ) : (
                  filteredExercises.map((exercise, index) => (
                    <motion.div
                      key={exercise.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="p-3 rounded-lg bg-background/90 border border-border/30 hover:border-primary/40 hover:shadow-md transition-all group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        {/* Favorite Button */}
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => toggleFavorite(exercise.id)}
                          className="flex-shrink-0 p-1.5 rounded-full hover:bg-yellow-500/20 transition-colors"
                        >
                          <Star 
                            size={16} 
                            className={`transition-colors ${
                              favorites.has(exercise.id) 
                                ? 'text-yellow-400 fill-yellow-400' 
                                : 'text-muted-foreground hover:text-yellow-400'
                            }`}
                          />
                        </motion.button>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-sm truncate">{exercise.name}</h4>
                            {exercise.video_url && (
                              <Video size={12} className="text-primary flex-shrink-0" />
                            )}
                          </div>
                          
                          <div className="flex flex-wrap gap-1 mb-1">
                            {exercise.equipment && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                {exercise.equipment}
                              </Badge>
                            )}
                            {exercise.difficulty && (
                              <Badge className={`text-[10px] px-1.5 py-0 border ${getDifficultyColor(exercise.difficulty)}`}>
                                {exercise.difficulty}
                              </Badge>
                            )}
                          </div>
                          
                          {exercise.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {exercise.description}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col gap-1">
                          {exercise.video_url && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1 hover:bg-primary/10 hover:border-primary"
                              onClick={() => setVideoDialog({ 
                                url: exercise.video_url!, 
                                title: exercise.name,
                                description: exercise.description || undefined,
                                instructions: exercise.instructions || undefined
                              })}
                            >
                              <Play size={10} />
                              Ver
                            </Button>
                          )}
                          {onSelectExercise && (
                            <Button
                              size="sm"
                              className="h-7 text-xs gap-1"
                              onClick={() => onSelectExercise(exercise)}
                            >
                              <Plus size={10} />
                              Usar
                            </Button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </ScrollArea>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-gradient-to-br from-primary/5 to-purple-500/5 backdrop-blur-md rounded-xl p-6 sm:p-8 border border-dashed border-primary/30 text-center"
          >
            <motion.div
              animate={{ 
                y: [0, -8, 0],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <Flame className="w-10 h-10 sm:w-12 sm:h-12 text-primary mx-auto mb-3" />
            </motion.div>
            <h3 className="font-bebas text-lg sm:text-xl text-primary mb-1">ESCOLHA UM GRUPO</h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xs mx-auto">
              Toque em um dos cards acima para ver os exercícios disponíveis
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video Dialog */}
      <Dialog open={!!videoDialog} onOpenChange={() => setVideoDialog(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-bebas text-xl sm:text-2xl text-primary flex items-center gap-2">
              <Video size={20} />
              {videoDialog?.title}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {videoDialog?.url && (
              <YouTubePlayer url={videoDialog.url} title={videoDialog.title} showThumbnail={false} />
            )}

            {videoDialog?.description && (
              <div className="p-3 rounded-lg bg-muted/50">
                <h4 className="font-semibold text-sm mb-1">📝 Descrição</h4>
                <p className="text-sm text-muted-foreground">{videoDialog.description}</p>
              </div>
            )}

            {videoDialog?.instructions && (
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
                <h4 className="font-semibold text-sm mb-1 text-primary">📋 Instruções</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{videoDialog.instructions}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default MuscleGroupDashboard;

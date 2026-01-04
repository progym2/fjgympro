import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Dumbbell, Search, Video, Filter, Sparkles, Plus, Play, Youtube, X, Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAudio } from '@/contexts/AudioContext';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SkeletonExerciseCard, SkeletonStatCard } from '@/components/ui/skeleton-loader';
import { toast } from 'sonner';
import InstructorPageHeader from './InstructorPageHeader';
import FadeScrollList from '@/components/shared/FadeScrollList';

interface Exercise {
  id: string;
  name: string;
  description: string | null;
  muscle_group: string | null;
  equipment: string | null;
  video_url: string | null;
  instructions: string | null;
  difficulty: string | null;
  is_system: boolean;
}

const muscleGroups = [
  'Todos',
  'Peito',
  'Costas',
  'Ombros',
  'Bíceps',
  'Tríceps',
  'Pernas',
  'Abdômen',
  'Glúteos',
  'Cardio'
];

const difficultyColors: { [key: string]: string } = {
  'Iniciante': 'bg-green-500/20 text-green-400 border-green-500/30',
  'Intermediário': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'Avançado': 'bg-red-500/20 text-red-400 border-red-500/30',
};

const muscleGroupColors: { [key: string]: string } = {
  'Peito': 'bg-red-500/20 text-red-400',
  'Costas': 'bg-blue-500/20 text-blue-400',
  'Ombros': 'bg-orange-500/20 text-orange-400',
  'Bíceps': 'bg-purple-500/20 text-purple-400',
  'Tríceps': 'bg-pink-500/20 text-pink-400',
  'Pernas': 'bg-green-500/20 text-green-400',
  'Abdômen': 'bg-yellow-500/20 text-yellow-400',
  'Glúteos': 'bg-rose-500/20 text-rose-400',
  'Cardio': 'bg-cyan-500/20 text-cyan-400',
};

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 }
  },
  hover: { 
    y: -4, 
    scale: 1.01,
    transition: { type: "spring" as const, stiffness: 400, damping: 20 }
  },
  tap: { scale: 0.98 }
};

const statCardVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { 
      type: "spring" as const,
      stiffness: 300,
      damping: 20
    }
  }
};

const ExerciseLibrary: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { playClickSound } = useAudio();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState('Todos');
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [videoDialog, setVideoDialog] = useState(false);
  
  // Create exercise dialog
  const [createDialog, setCreateDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newExercise, setNewExercise] = useState({
    name: '',
    description: '',
    muscle_group: '',
    equipment: '',
    video_url: '',
    instructions: '',
    difficulty: 'Intermediário'
  });

  useEffect(() => {
    fetchExercises();
  }, []);

  const fetchExercises = async () => {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .or(`is_system.eq.true,created_by.eq.${profile?.profile_id}`)
        .order('muscle_group')
        .order('name');

      if (error) throw error;
      setExercises(data || []);
    } catch (error) {
      console.error('Error fetching exercises:', error);
    } finally {
      setLoading(false);
    }
  };

  // Extract YouTube video ID for embedding
  const getYoutubeEmbedUrl = (url: string) => {
    if (!url) return '';
    const videoIdMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    if (videoIdMatch) {
      return `https://www.youtube.com/embed/${videoIdMatch[1]}`;
    }
    return url;
  };

  const handleCreateExercise = async () => {
    if (!newExercise.name.trim()) {
      toast.error('Nome do exercício é obrigatório');
      return;
    }
    if (!newExercise.muscle_group) {
      toast.error('Grupo muscular é obrigatório');
      return;
    }
    if (!profile?.profile_id) {
      toast.error('Você precisa estar logado');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('exercises').insert({
        name: newExercise.name.trim(),
        description: newExercise.description.trim() || null,
        muscle_group: newExercise.muscle_group,
        equipment: newExercise.equipment.trim() || null,
        video_url: newExercise.video_url.trim() || null,
        instructions: newExercise.instructions.trim() || null,
        difficulty: newExercise.difficulty,
        is_system: false,
        created_by: profile.profile_id
      });

      if (error) throw error;

      toast.success('Exercício criado com sucesso!');
      setCreateDialog(false);
      setNewExercise({
        name: '',
        description: '',
        muscle_group: '',
        equipment: '',
        video_url: '',
        instructions: '',
        difficulty: 'Intermediário'
      });
      fetchExercises();
    } catch (error) {
      console.error('Error creating exercise:', error);
      toast.error('Erro ao criar exercício');
    } finally {
      setSaving(false);
    }
  };

  const filteredExercises = exercises.filter(ex => {
    const matchesSearch = ex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ex.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ex.equipment?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMuscle = selectedMuscle === 'Todos' || ex.muscle_group === selectedMuscle;
    return matchesSearch && matchesMuscle;
  });

  const groupedExercises = filteredExercises.reduce((acc, ex) => {
    const group = ex.muscle_group || 'Outros';
    if (!acc[group]) acc[group] = [];
    acc[group].push(ex);
    return acc;
  }, {} as { [key: string]: Exercise[] });

  const openVideoDialog = (exercise: Exercise) => {
    playClickSound();
    setSelectedExercise(exercise);
    setVideoDialog(true);
  };

  // Loading Skeleton
  if (loading) {
    return (
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        className="space-y-4"
      >
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="h-5 w-16 bg-muted/50 rounded animate-pulse" />
            <div className="h-8 w-64 bg-muted/50 rounded animate-pulse" />
          </div>
        </div>

        {/* Filter Skeleton */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 h-10 bg-muted/50 rounded-lg animate-pulse" />
          <div className="h-10 w-48 bg-muted/50 rounded-lg animate-pulse" />
        </div>

        {/* Stats Skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <SkeletonStatCard key={i} />
          ))}
        </div>

        {/* Cards Skeleton */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <div className="h-6 w-24 bg-muted/50 rounded-full animate-pulse" />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <SkeletonExerciseCard key={i} />
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full">
      <InstructorPageHeader 
        title="BIBLIOTECA DE EXERCÍCIOS"
        icon={<Dumbbell className="w-6 h-6" />}
        iconColor="text-green-500"
        action={
          <Button 
            onClick={() => { playClickSound(); setCreateDialog(true); }}
            size="sm"
            className="gap-2"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Novo Exercício</span>
          </Button>
        }
      />
      
      <FadeScrollList className="flex-1 space-y-4 pr-1">

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar exercício..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-background/50 border-border/50"
          />
        </div>
        <Select value={selectedMuscle} onValueChange={setSelectedMuscle}>
          <SelectTrigger className="w-full sm:w-48 bg-card border-border">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filtrar por músculo" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            {muscleGroups.map((group) => (
              <SelectItem key={group} value={group}>
                {group}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats with animated numbers */}
      <motion.div 
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        initial="hidden"
        animate="visible"
      >
        {[
          { value: exercises.length, label: 'Total', color: 'text-primary' },
          { value: exercises.filter(e => e.video_url).length, label: 'Com Vídeo', color: 'text-green-500' },
          { value: new Set(exercises.map(e => e.muscle_group)).size, label: 'Grupos', color: 'text-blue-500' },
          { value: filteredExercises.length, label: 'Filtrados', color: 'text-purple-500' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            custom={i}
            variants={statCardVariants}
            className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50 text-center hover-lift group"
          >
            <motion.p 
              className={`text-2xl font-bold ${stat.color} group-hover:scale-110 transition-transform`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
            >
              {stat.value}
            </motion.p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Exercise List by Muscle Group */}
      <AnimatePresence mode="wait">
        {Object.keys(groupedExercises).length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-card/80 backdrop-blur-md rounded-xl p-8 border border-border/50 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
            >
              <Dumbbell className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            </motion.div>
            <p className="text-muted-foreground">Nenhum exercício encontrado</p>
          </motion.div>
        ) : (
          <motion.div 
            className="space-y-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {Object.entries(groupedExercises).map(([group, exs]) => (
              <motion.div 
                key={group}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
              >
                <h3 className="font-bebas text-lg mb-3 flex items-center gap-2">
                  <motion.span 
                    className={`px-3 py-1 rounded-full text-sm ${muscleGroupColors[group] || 'bg-muted text-muted-foreground'}`}
                    whileHover={{ scale: 1.05 }}
                  >
                    {group}
                  </motion.span>
                  <span className="text-muted-foreground text-sm">({exs.length})</span>
                </h3>
                <motion.div 
                  className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3"
                  variants={containerVariants}
                >
                  {exs.map((exercise) => (
                    <motion.div
                      key={exercise.id}
                      variants={cardVariants}
                      whileHover="hover"
                      whileTap="tap"
                      layout
                      className="bg-card/80 backdrop-blur-md rounded-xl border border-border/50 overflow-hidden cursor-pointer card-interactive"
                      onClick={() => openVideoDialog(exercise)}
                    >
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold truncate group-hover:text-primary transition-colors">{exercise.name}</h4>
                            {exercise.equipment && (
                              <p className="text-xs text-muted-foreground mt-1 truncate">
                                {exercise.equipment}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {exercise.difficulty && (
                              <Badge variant="outline" className={`text-xs ${difficultyColors[exercise.difficulty] || ''}`}>
                                {exercise.difficulty}
                              </Badge>
                            )}
                            {exercise.video_url && (
                              <motion.div
                                initial={{ scale: 1 }}
                                whileHover={{ scale: 1.2 }}
                                className="relative"
                              >
                                <Video className="w-4 h-4 text-primary" />
                                <motion.div 
                                  className="absolute inset-0 bg-primary/20 rounded-full"
                                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                                  transition={{ duration: 2, repeat: Infinity }}
                                />
                              </motion.div>
                            )}
                          </div>
                        </div>
                        {exercise.description && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                            {exercise.description}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video Dialog */}
      <Dialog open={videoDialog} onOpenChange={setVideoDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-bebas text-xl text-primary flex items-center gap-2">
              <Dumbbell size={24} />
              {selectedExercise?.name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedExercise && (
            <div className="space-y-4">
              {/* Video */}
              {selectedExercise.video_url && (
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                  {selectedExercise.video_url.includes('youtube') || selectedExercise.video_url.includes('youtu.be') ? (
                    <iframe
                      src={selectedExercise.video_url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                      className="w-full h-full"
                      allowFullScreen
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    />
                  ) : (
                    <video src={selectedExercise.video_url} controls className="w-full h-full" />
                  )}
                </div>
              )}

              {/* Info */}
              <div className="grid grid-cols-2 gap-4">
                {selectedExercise.muscle_group && (
                  <div>
                    <p className="text-xs text-muted-foreground">Grupo Muscular</p>
                    <Badge className={muscleGroupColors[selectedExercise.muscle_group] || ''}>
                      {selectedExercise.muscle_group}
                    </Badge>
                  </div>
                )}
                {selectedExercise.difficulty && (
                  <div>
                    <p className="text-xs text-muted-foreground">Dificuldade</p>
                    <Badge variant="outline" className={difficultyColors[selectedExercise.difficulty] || ''}>
                      {selectedExercise.difficulty}
                    </Badge>
                  </div>
                )}
                {selectedExercise.equipment && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Equipamento</p>
                    <p className="text-sm">{selectedExercise.equipment}</p>
                  </div>
                )}
              </div>

              {/* Description */}
              {selectedExercise.description && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Descrição</p>
                  <p className="text-sm">{selectedExercise.description}</p>
                </div>
              )}

              {/* Instructions */}
              {selectedExercise.instructions && (
                <div className="bg-primary/10 rounded-lg p-4 border border-primary/30">
                  <p className="text-xs text-primary mb-1 font-medium">Como Executar</p>
                  <p className="text-sm">{selectedExercise.instructions}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Exercise Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-bebas text-xl text-primary flex items-center gap-2">
              <Plus size={24} />
              Criar Novo Exercício
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Exercício *</Label>
              <Input
                id="name"
                placeholder="Ex: Supino Reto com Barra"
                value={newExercise.name}
                onChange={(e) => setNewExercise({ ...newExercise, name: e.target.value })}
              />
            </div>

            {/* Muscle Group & Difficulty */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Grupo Muscular *</Label>
                <Select 
                  value={newExercise.muscle_group} 
                  onValueChange={(value) => setNewExercise({ ...newExercise, muscle_group: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {muscleGroups.filter(g => g !== 'Todos').map((group) => (
                      <SelectItem key={group} value={group}>{group}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Dificuldade</Label>
                <Select 
                  value={newExercise.difficulty} 
                  onValueChange={(value) => setNewExercise({ ...newExercise, difficulty: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Iniciante">Iniciante</SelectItem>
                    <SelectItem value="Intermediário">Intermediário</SelectItem>
                    <SelectItem value="Avançado">Avançado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Equipment */}
            <div className="space-y-2">
              <Label htmlFor="equipment">Equipamento</Label>
              <Input
                id="equipment"
                placeholder="Ex: Barra, Banco, Anilhas"
                value={newExercise.equipment}
                onChange={(e) => setNewExercise({ ...newExercise, equipment: e.target.value })}
              />
            </div>

            {/* Video URL */}
            <div className="space-y-2">
              <Label htmlFor="video" className="flex items-center gap-2">
                <Youtube size={16} className="text-red-500" />
                URL do Vídeo (YouTube)
              </Label>
              <Input
                id="video"
                placeholder="https://www.youtube.com/watch?v=..."
                value={newExercise.video_url}
                onChange={(e) => setNewExercise({ ...newExercise, video_url: e.target.value })}
              />
              {newExercise.video_url && (
                <div className="aspect-video bg-black rounded-lg overflow-hidden mt-2">
                  <iframe
                    src={getYoutubeEmbedUrl(newExercise.video_url)}
                    className="w-full h-full"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                </div>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                placeholder="Descreva o exercício..."
                value={newExercise.description}
                onChange={(e) => setNewExercise({ ...newExercise, description: e.target.value })}
                rows={2}
              />
            </div>

            {/* Instructions */}
            <div className="space-y-2">
              <Label htmlFor="instructions">Instruções de Execução</Label>
              <Textarea
                id="instructions"
                placeholder="Como executar o exercício corretamente..."
                value={newExercise.instructions}
                onChange={(e) => setNewExercise({ ...newExercise, instructions: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateExercise} disabled={saving}>
              {saving && <Loader2 size={16} className="mr-2 animate-spin" />}
              Criar Exercício
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </FadeScrollList>
    </motion.div>
  );
};

export default ExerciseLibrary;
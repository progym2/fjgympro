import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Dumbbell, Clock, Target, Weight, RotateCcw, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Exercise {
  id: string;
  name: string;
  description: string | null;
  muscle_group: string | null;
  equipment: string | null;
  video_url: string | null;
}

interface WorkoutExercise {
  id: string;
  exercise_id: string;
  sets: number;
  reps: number;
  weight_kg: number | null;
  rest_seconds: number;
  day_of_week: number | null;
  exercise: Exercise;
}

interface WorkoutDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  planName: string;
  planDescription?: string | null;
  exercises: WorkoutExercise[];
  dayName: string;
  isToday: boolean;
  isLocked: boolean;
}

const muscleColors: Record<string, string> = {
  'Peito': 'bg-red-500/20 text-red-400 border-red-500/30',
  'Costas': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Ombros': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'Bíceps': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'Tríceps': 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  'Pernas': 'bg-green-500/20 text-green-400 border-green-500/30',
  'Abdômen': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'Glúteos': 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  'Cardio': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
};

const WorkoutDetailsModal: React.FC<WorkoutDetailsModalProps> = ({
  isOpen,
  onClose,
  planName,
  planDescription,
  exercises,
  dayName,
  isToday,
  isLocked,
}) => {
  // Group exercises by muscle group
  const groupedExercises = exercises.reduce((acc, ex) => {
    const group = ex.exercise?.muscle_group || 'Outros';
    if (!acc[group]) acc[group] = [];
    acc[group].push(ex);
    return acc;
  }, {} as Record<string, WorkoutExercise[]>);

  const totalSets = exercises.reduce((sum, ex) => sum + (ex.sets || 0), 0);
  const estimatedTime = exercises.reduce((sum, ex) => {
    const setTime = (ex.sets || 3) * 45; // 45 seconds per set average
    const restTime = (ex.rest_seconds || 60) * ((ex.sets || 3) - 1);
    return sum + setTime + restTime;
  }, 0);
  const estimatedMinutes = Math.ceil(estimatedTime / 60);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] p-0 overflow-hidden bg-card border-border">
        <DialogHeader className="p-4 pb-2 border-b border-border/50">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-primary" />
                {planName}
              </DialogTitle>
              {planDescription && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {planDescription}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  {dayName}
                </Badge>
                {isToday && (
                  <Badge className="bg-primary/20 text-primary text-xs">
                    Hoje
                  </Badge>
                )}
                {isLocked && (
                  <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-500">
                    Visualização
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 p-4 bg-muted/30">
          <div className="text-center p-2 rounded-lg bg-card/50">
            <div className="text-lg font-bold text-primary">{exercises.length}</div>
            <div className="text-[10px] text-muted-foreground">Exercícios</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-card/50">
            <div className="text-lg font-bold text-primary">{totalSets}</div>
            <div className="text-[10px] text-muted-foreground">Séries</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-card/50">
            <div className="text-lg font-bold text-primary">~{estimatedMinutes}</div>
            <div className="text-[10px] text-muted-foreground">Minutos</div>
          </div>
        </div>

        {/* Exercises List */}
        <ScrollArea className="flex-1 max-h-[45vh]">
          <div className="p-4 space-y-4">
            {exercises.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Info className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>Nenhum exercício para este dia</p>
              </div>
            ) : (
              Object.entries(groupedExercises).map(([muscleGroup, groupExercises]) => (
                <div key={muscleGroup}>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={`text-xs ${muscleColors[muscleGroup] || 'bg-muted'}`}>
                      <Target className="w-3 h-3 mr-1" />
                      {muscleGroup}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      ({groupExercises.length} exercício{groupExercises.length > 1 ? 's' : ''})
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    {groupExercises.map((ex, index) => (
                      <motion.div
                        key={ex.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-card/80 rounded-lg p-3 border border-border/50"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm truncate">
                              {ex.exercise?.name || 'Exercício'}
                            </h4>
                            {ex.exercise?.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                {ex.exercise.description}
                              </p>
                            )}
                            
                            {/* Exercise Details */}
                            <div className="flex flex-wrap gap-2 mt-2">
                              <div className="flex items-center gap-1 text-xs bg-muted/50 px-2 py-1 rounded">
                                <Target className="w-3 h-3 text-primary" />
                                <span>{ex.sets}x{ex.reps}</span>
                              </div>
                              
                              {ex.weight_kg && ex.weight_kg > 0 && (
                                <div className="flex items-center gap-1 text-xs bg-muted/50 px-2 py-1 rounded">
                                  <Weight className="w-3 h-3 text-primary" />
                                  <span>{ex.weight_kg}kg</span>
                                </div>
                              )}
                              
                              <div className="flex items-center gap-1 text-xs bg-muted/50 px-2 py-1 rounded">
                                <RotateCcw className="w-3 h-3 text-primary" />
                                <span>{ex.rest_seconds}s</span>
                              </div>
                              
                              {ex.exercise?.equipment && (
                                <div className="flex items-center gap-1 text-xs bg-muted/50 px-2 py-1 rounded">
                                  <Dumbbell className="w-3 h-3 text-muted-foreground" />
                                  <span className="text-muted-foreground">{ex.exercise.equipment}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t border-border/50 bg-muted/20">
          {isLocked ? (
            <p className="text-xs text-center text-muted-foreground">
              🔒 Este treino só pode ser executado no dia correto
            </p>
          ) : (
            <p className="text-xs text-center text-green-500">
              ✓ Treino disponível para execução
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WorkoutDetailsModal;

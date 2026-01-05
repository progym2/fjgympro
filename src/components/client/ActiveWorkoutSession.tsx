import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, Square, CheckCircle, Timer, 
  Dumbbell, Target, Flame, Clock, Video,
  Trash2, ChevronDown, ChevronUp, X, Zap,
  SkipForward
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import IntegratedTimer from './IntegratedTimer';
import YouTubePlayer from '@/components/shared/YouTubePlayer';

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

interface ActiveWorkoutSessionProps {
  planName: string;
  exercises: WorkoutExercise[];
  completedExerciseIds: string[];
  onCompleteExercise: (exercise: WorkoutExercise) => Promise<void>;
  onDeleteExerciseLog: (exerciseId: string) => void;
  onFinishWorkout: () => Promise<void>;
  onClose: () => void;
  startedAt?: Date;
  isInstructorPlan?: boolean; // If true, hide delete option - preserve history
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

const ActiveWorkoutSession: React.FC<ActiveWorkoutSessionProps> = ({
  planName,
  exercises,
  completedExerciseIds,
  onCompleteExercise,
  onDeleteExerciseLog,
  onFinishWorkout,
  onClose,
  startedAt = new Date(),
  isInstructorPlan = false
}) => {
  // Session timer - starts immediately when component mounts
  const [sessionTime, setSessionTime] = useState(() => {
    // Calculate elapsed time since session started
    const elapsed = Math.floor((Date.now() - startedAt.getTime()) / 1000);
    return elapsed > 0 ? elapsed : 0;
  });
  const [isSessionPaused, setIsSessionPaused] = useState(false);
  
  // Current exercise state
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState<number>(() => {
    const firstIncomplete = exercises.findIndex(e => !completedExerciseIds.includes(e.id));
    return firstIncomplete >= 0 ? firstIncomplete : 0;
  });
  
  
  // Rest timer state (between exercises - optional)
  const [isResting, setIsResting] = useState(false);
  const [restDuration, setRestDuration] = useState(60);
  
  // Custom timer dialog
  const [showCustomTimer, setShowCustomTimer] = useState(false);
  
  // Video dialog
  const [videoUrl, setVideoUrl] = useState<{ url: string; title: string } | null>(null);
  
  // Confirm finish dialog
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  
  // Close confirmation dialog
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  
  const sessionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Session timer effect - starts automatically
  useEffect(() => {
    if (!isSessionPaused) {
      sessionIntervalRef.current = setInterval(() => {
        setSessionTime(prev => prev + 1);
      }, 1000);
    }
    
    return () => {
      if (sessionIntervalRef.current) {
        clearInterval(sessionIntervalRef.current);
      }
    };
  }, [isSessionPaused]);


  // Update current exercise when completedExerciseIds changes
  useEffect(() => {
    const firstIncomplete = exercises.findIndex(e => !completedExerciseIds.includes(e.id));
    if (firstIncomplete >= 0 && firstIncomplete !== currentExerciseIndex) {
      setCurrentExerciseIndex(firstIncomplete);
    }
  }, [completedExerciseIds, exercises]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const completedCount = completedExerciseIds.length;
  const totalCount = exercises.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  
  const currentExercise = exercises[currentExerciseIndex];
  const isCurrentCompleted = currentExercise ? completedExerciseIds.includes(currentExercise.id) : false;
  
  // Simplified: complete entire exercise (all sets) in one action
  const handleCompleteExercise = async (exercise: WorkoutExercise) => {
    await onCompleteExercise(exercise);
    
    // Move to next exercise automatically
    const nextIndex = exercises.findIndex((e, i) => i > currentExerciseIndex && !completedExerciseIds.includes(e.id));
    if (nextIndex >= 0) {
      setCurrentExerciseIndex(nextIndex);
    }
  };

  const handleRestComplete = () => {
    setIsResting(false);
  };

  const handleFinish = async () => {
    await onFinishWorkout();
    setShowFinishConfirm(false);
  };

  const handleCloseRequest = () => {
    // If workout has exercises completed, ask for confirmation
    if (completedCount > 0 && completedCount === totalCount) {
      setShowFinishConfirm(true);
    } else if (completedCount > 0) {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  };

  const selectExercise = (index: number) => {
    setCurrentExerciseIndex(index);
    setIsResting(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background flex flex-col"
    >
      {/* Top Bar - Professional Timer Design */}
      <div className="bg-gradient-to-r from-card via-card to-card/95 border-b border-border/50 p-3 safe-area-top">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-9 w-9"
              onClick={handleCloseRequest}
            >
              <X size={20} />
            </Button>
            <div>
              <h1 className="font-bebas text-lg text-primary">{planName}</h1>
              <p className="text-[10px] text-muted-foreground">
                {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
              </p>
            </div>
          </div>
          
          {/* Professional Session Timer */}
          <motion.div 
            className="relative flex items-center gap-1 px-4 py-2 rounded-xl bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 border border-primary/30 shadow-lg shadow-primary/10"
            animate={{ 
              boxShadow: isSessionPaused 
                ? '0 0 0 rgba(0,0,0,0)' 
                : ['0 0 10px rgba(var(--primary), 0.2)', '0 0 20px rgba(var(--primary), 0.3)', '0 0 10px rgba(var(--primary), 0.2)']
            }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            {/* Animated ring indicator */}
            <div className="relative w-8 h-8 flex items-center justify-center">
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle
                  cx="16"
                  cy="16"
                  r="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-primary/20"
                />
                <motion.circle
                  cx="16"
                  cy="16"
                  r="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray={88}
                  strokeDashoffset={isSessionPaused ? 88 : 0}
                  strokeLinecap="round"
                  className="text-primary"
                  animate={isSessionPaused ? {} : { 
                    strokeDashoffset: [88, 0, 88] 
                  }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                />
              </svg>
              <Timer size={14} className="text-primary relative z-10" />
            </div>
            
            {/* Time Display */}
            <div className="flex flex-col items-end">
              <span className="font-mono text-lg font-bold tracking-wider text-foreground">
                {formatTime(sessionTime)}
              </span>
              <span className="text-[8px] text-muted-foreground uppercase tracking-widest">
                {isSessionPaused ? 'Pausado' : 'Em treino'}
              </span>
            </div>
          </motion.div>
        </div>
        
        {/* Progress Bar - More compact */}
        <div className="mt-2">
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
            <span>{completedCount}/{totalCount} exercícios</span>
            <span className="font-bold text-primary">{progress}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Exercise List - Left/Top - More compact */}
        <div className="lg:w-72 border-b lg:border-b-0 lg:border-r border-border/50 bg-card/50">
          <div className="p-2 border-b border-border/50 flex items-center justify-between">
            <h2 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Dumbbell size={12} />
              Exercícios
            </h2>
            <Badge variant="outline" className="text-[9px] px-1.5 py-0">
              Toque ● para concluir
            </Badge>
          </div>
          <ScrollArea className="h-[25vh] lg:h-[calc(100vh-14rem)]">
            <div className="p-1.5 space-y-1">
                  {exercises.map((exercise, index) => {
                    const isCompleted = completedExerciseIds.includes(exercise.id);
                    const isCurrent = index === currentExerciseIndex;
                    
                    return (
                      <motion.div
                        key={exercise.id}
                        className={`w-full p-2 rounded-lg text-left transition-all flex items-center gap-2 ${
                          isCurrent
                            ? 'bg-primary/20 border border-primary/50'
                            : isCompleted
                            ? 'bg-green-500/10 border border-green-500/30'
                            : 'bg-muted/30 hover:bg-muted/50 border border-transparent'
                        }`}
                        whileHover={{ scale: 1.01 }}
                      >
                        {/* Number/Check - Click to COMPLETE or UNDO */}
                        <motion.button 
                          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold cursor-pointer transition-all ${
                            isCompleted 
                              ? 'bg-green-500 text-white hover:bg-green-600' 
                              : isCurrent
                              ? 'bg-primary text-primary-foreground hover:bg-primary/80'
                              : 'bg-muted hover:bg-primary/50 hover:text-primary-foreground'
                          }`}
                          onClick={() => {
                            if (isCompleted) {
                              if (!isInstructorPlan) {
                                onDeleteExerciseLog(exercise.id);
                              }
                            } else {
                              handleCompleteExercise(exercise);
                            }
                          }}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          title={isCompleted ? 'Desfazer' : 'Concluir'}
                        >
                          {isCompleted ? (
                            <CheckCircle size={16} />
                          ) : (
                            <span>{index + 1}</span>
                          )}
                        </motion.button>
                        
                        {/* Info - Click to SELECT */}
                        <button 
                          className="flex-1 min-w-0 text-left"
                          onClick={() => selectExercise(index)}
                        >
                          <p className={`text-xs font-medium truncate ${isCompleted ? 'line-through opacity-60' : ''}`}>
                            {exercise.exercise?.name}
                          </p>
                          <p className="text-[9px] text-muted-foreground">
                            {exercise.sets}x{exercise.reps} {exercise.weight_kg ? `• ${exercise.weight_kg}kg` : ''}
                          </p>
                        </button>
                        
                        {/* Quick action */}
                        {!isCompleted && isCurrent && (
                          <Button
                            size="sm"
                            className="h-6 px-2 text-[9px] bg-green-500 hover:bg-green-600"
                            onClick={() => handleCompleteExercise(exercise)}
                          >
                            <CheckCircle size={10} className="mr-0.5" />
                            Feito
                          </Button>
                        )}
                      </motion.div>
                    );
                  })}
            </div>
          </ScrollArea>
        </div>

        {/* Current Exercise Panel - Right/Bottom */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <AnimatePresence mode="wait">
            {isResting ? (
              /* Rest Timer Panel - Compact */
              <motion.div
                key="rest"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex-1 flex flex-col items-center justify-center p-4 bg-green-500/5 relative"
              >
                {/* Session timer visible during rest */}
                <div className="absolute top-3 right-3 bg-card/80 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="font-mono text-xs font-bold">{formatTime(sessionTime)}</span>
                </div>
                
                <Badge className="bg-green-500/20 text-green-500 mb-2">DESCANSO</Badge>
                <p className="text-xs text-muted-foreground mb-4 text-center">
                  Próximo: {exercises[currentExerciseIndex]?.exercise?.name}
                </p>
                
                <IntegratedTimer
                  exerciseName="Descanso"
                  isResting={true}
                  restDuration={restDuration}
                  defaultRestSeconds={restDuration}
                  onRestComplete={handleRestComplete}
                />
                
                <Button 
                  size="sm"
                  className="mt-3 bg-primary"
                  onClick={handleRestComplete}
                >
                  <SkipForward size={14} className="mr-1" />
                  Pular
                </Button>
              </motion.div>
            ) : currentExercise ? (
              /* Active Exercise Panel - Compact */
              <motion.div
                key={currentExercise.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col p-3 overflow-auto"
              >
                {/* Compact Exercise Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge className={`text-[10px] ${muscleColors[currentExercise.exercise?.muscle_group || ''] || 'bg-muted'}`}>
                      {currentExercise.exercise?.muscle_group || 'Geral'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {currentExerciseIndex + 1}/{totalCount}
                    </span>
                  </div>
                  {/* Video Button - compact */}
                  {currentExercise.exercise?.video_url && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => setVideoUrl({
                        url: currentExercise.exercise!.video_url!,
                        title: currentExercise.exercise!.name
                      })}
                    >
                      <Video size={12} className="mr-1" />
                      Demo
                    </Button>
                  )}
                </div>

                <h2 className="text-xl font-bebas text-primary mb-3">
                  {currentExercise.exercise?.name}
                </h2>

                {/* Compact Exercise Stats - Inline */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-card border border-border/50 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold">{currentExercise.sets}x{currentExercise.reps}</p>
                    <p className="text-[10px] text-muted-foreground">Séries</p>
                  </div>
                  <div className="bg-card border border-border/50 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-orange-500">{currentExercise.weight_kg || 0}kg</p>
                    <p className="text-[10px] text-muted-foreground">Peso</p>
                  </div>
                  <div className="bg-card border border-border/50 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-green-500">{currentExercise.rest_seconds}s</p>
                    <p className="text-[10px] text-muted-foreground">Descanso</p>
                  </div>
                </div>

                {/* Description - compact */}
                {currentExercise.exercise?.description && (
                  <div className="p-2 bg-muted/30 rounded-lg mb-3">
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {currentExercise.exercise.description}
                    </p>
                  </div>
                )}

                {/* Action Buttons - Simplified: Mark entire exercise as done */}
                <div className="mt-auto space-y-2">
                  {isCurrentCompleted ? (
                    <div className="flex items-center justify-between bg-green-500/10 rounded-lg p-3">
                      <Badge className="bg-green-500/20 text-green-500">
                        <CheckCircle size={14} className="mr-1" />
                        Concluído
                      </Badge>
                      {/* Hide undo button for instructor plans - preserve workout history */}
                      {!isInstructorPlan && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-destructive"
                          onClick={() => onDeleteExerciseLog(currentExercise.id)}
                        >
                          <Trash2 size={12} className="mr-1" />
                          Desfazer
                        </Button>
                      )}
                    </div>
                  ) : (
                    <Button
                      size="lg"
                      className="w-full h-12 bg-primary hover:bg-primary/90"
                      onClick={() => handleCompleteExercise(currentExercise)}
                    >
                      <CheckCircle size={20} className="mr-2" />
                      Marcar Exercício Concluído
                    </Button>
                  )}
                </div>
              </motion.div>
            ) : (
              /* All Done - Session Summary - Compact Layout */
              <motion.div
                key="done"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 flex flex-col p-4 overflow-auto"
              >
                {/* Compact Header */}
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center mb-4"
                >
                  <div className="w-14 h-14 mx-auto mb-2 bg-green-500/20 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                  <h2 className="text-xl font-bebas text-green-500">TREINO COMPLETO!</h2>
                </motion.div>

                {/* Compact Stats Grid - 4 columns */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  <div className="bg-card border border-border/50 rounded-lg p-2 text-center">
                    <Clock className="w-4 h-4 mx-auto mb-1 text-primary" />
                    <p className="text-sm font-mono font-bold text-primary">{formatTime(sessionTime)}</p>
                    <p className="text-[10px] text-muted-foreground">Tempo</p>
                  </div>
                  <div className="bg-card border border-border/50 rounded-lg p-2 text-center">
                    <Target className="w-4 h-4 mx-auto mb-1 text-blue-500" />
                    <p className="text-sm font-bold text-blue-500">{completedCount}/{totalCount}</p>
                    <p className="text-[10px] text-muted-foreground">Exercícios</p>
                  </div>
                  <div className="bg-card border border-border/50 rounded-lg p-2 text-center">
                    <Dumbbell className="w-4 h-4 mx-auto mb-1 text-purple-500" />
                    <p className="text-sm font-bold text-purple-500">
                      {exercises.filter(e => completedExerciseIds.includes(e.id)).reduce((acc, e) => acc + (e.sets || 0), 0)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Séries</p>
                  </div>
                  <div className="bg-card border border-border/50 rounded-lg p-2 text-center">
                    <Flame className="w-4 h-4 mx-auto mb-1 text-orange-500" />
                    <p className="text-sm font-bold text-orange-500">
                      {Math.round((sessionTime / 60) * 5 + completedCount * 15)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">kcal</p>
                  </div>
                </div>

                {/* Compact Muscle Groups */}
                <div className="bg-card border border-border/50 rounded-lg p-3 mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap size={12} className="text-yellow-500" />
                    <span className="text-xs font-medium">Músculos Trabalhados</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {[...new Set(exercises
                      .filter(e => completedExerciseIds.includes(e.id))
                      .map(e => e.exercise?.muscle_group)
                      .filter(Boolean)
                    )].map(muscle => (
                      <Badge key={muscle} variant="secondary" className="text-[10px] py-0 px-2">
                        {muscle}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Compact Exercises List */}
                <div className="bg-card border border-border/50 rounded-lg p-3 mb-3 flex-1 min-h-0">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle size={12} className="text-green-500" />
                    <span className="text-xs font-medium">Exercícios ({completedCount})</span>
                  </div>
                  <ScrollArea className="h-24">
                    <div className="space-y-1">
                      {exercises
                        .filter(e => completedExerciseIds.includes(e.id))
                        .map((exercise, idx) => (
                          <div 
                            key={exercise.id}
                            className="flex items-center justify-between text-xs bg-muted/30 rounded px-2 py-1.5"
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="w-4 h-4 rounded-full bg-green-500/20 text-green-500 text-[10px] flex items-center justify-center font-bold">
                                {idx + 1}
                              </span>
                              <span className="truncate max-w-[120px]">{exercise.exercise?.name}</span>
                            </div>
                            <span className="text-muted-foreground text-[10px]">
                              {exercise.sets}x{exercise.reps}
                            </span>
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                </div>

                {/* Total Weight */}
                <div className="bg-muted/30 rounded-lg p-2 mb-4 text-center">
                  <span className="text-xs text-muted-foreground">Peso total levantado: </span>
                  <span className="text-sm font-bold text-primary">
                    {exercises.filter(e => completedExerciseIds.includes(e.id)).reduce((acc, e) => acc + ((e.weight_kg || 0) * (e.sets || 0) * (e.reps || 0)), 0).toLocaleString()} kg
                  </span>
                </div>

                {/* Finish Button */}
                <Button 
                  size="lg" 
                  className="w-full bg-green-500 hover:bg-green-600"
                  onClick={() => setShowFinishConfirm(true)}
                >
                  <CheckCircle size={18} className="mr-2" />
                  Finalizar Sessão
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom Bar - Stylized with prominent end button */}
      <div className="bg-card border-t border-border/50 p-3 safe-area-bottom">
        <div className="flex gap-2">
          {/* Timer Button */}
          <Button 
            variant="outline" 
            size="sm"
            className="h-10 px-3"
            onClick={() => setShowCustomTimer(true)}
          >
            <Timer size={16} />
          </Button>
          
          {/* Pause/Resume Button */}
          <Button 
            variant={isSessionPaused ? "default" : "outline"}
            size="sm"
            className={`h-10 flex-1 ${isSessionPaused ? 'bg-amber-500 hover:bg-amber-600' : ''}`}
            onClick={() => setIsSessionPaused(!isSessionPaused)}
          >
            {isSessionPaused ? (
              <>
                <Play size={14} className="mr-1" />
                Retomar
              </>
            ) : (
              <>
                <Pause size={14} className="mr-1" />
                Pausar
              </>
            )}
          </Button>
          
          {/* Stylized End Session Button */}
          <motion.button
            onClick={() => setShowFinishConfirm(true)}
            disabled={completedCount === 0}
            className={`relative h-10 px-4 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all overflow-hidden ${
              completedCount === 0 
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : 'bg-gradient-to-r from-red-600 via-red-500 to-orange-500 text-white shadow-lg shadow-red-500/30 hover:shadow-red-500/50'
            }`}
            whileHover={completedCount > 0 ? { scale: 1.02 } : {}}
            whileTap={completedCount > 0 ? { scale: 0.98 } : {}}
          >
            {completedCount > 0 && (
              <motion.div 
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
              />
            )}
            <Square size={16} className="relative z-10" />
            <span className="relative z-10">Encerrar Sessão</span>
          </motion.button>
        </div>
      </div>

      {/* Custom Timer Dialog */}
      <Dialog open={showCustomTimer} onOpenChange={setShowCustomTimer}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Timer Personalizado</DialogTitle>
            <DialogDescription>
              Use o timer para controlar seus exercícios
            </DialogDescription>
          </DialogHeader>
          <IntegratedTimer
            onComplete={() => setShowCustomTimer(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Video Dialog */}
      <Dialog open={!!videoUrl} onOpenChange={() => setVideoUrl(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-bebas text-primary">{videoUrl?.title}</DialogTitle>
          </DialogHeader>
          {videoUrl && (
            <YouTubePlayer url={videoUrl.url} title={videoUrl.title} showThumbnail={false} />
          )}
        </DialogContent>
      </Dialog>

      {/* Finish Confirm Dialog */}
      <Dialog open={showFinishConfirm} onOpenChange={setShowFinishConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>🎉 Finalizar Treino?</DialogTitle>
            <DialogDescription>
              {completedCount < totalCount 
                ? `Você completou ${completedCount} de ${totalCount} exercícios. Deseja finalizar mesmo assim?`
                : `Parabéns! Você completou todos os ${totalCount} exercícios!`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-2">Tempo de treino:</p>
            <p className="text-3xl font-mono font-bold text-primary">{formatTime(sessionTime)}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowFinishConfirm(false)}>
              Continuar
            </Button>
            <Button className="flex-1 bg-green-500 hover:bg-green-600" onClick={handleFinish}>
              <CheckCircle size={16} className="mr-2" />
              Confirmar e Registrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Close Confirm Dialog */}
      <Dialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sair do Treino?</DialogTitle>
            <DialogDescription>
              Você tem exercícios em andamento. O que deseja fazer?
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-1">Progresso atual:</p>
            <p className="text-2xl font-bold text-primary">{completedCount}/{totalCount} exercícios</p>
            <p className="text-sm text-muted-foreground mt-1">Tempo: {formatTime(sessionTime)}</p>
          </div>
          <div className="flex flex-col gap-2">
            <Button variant="outline" onClick={() => setShowCloseConfirm(false)}>
              Continuar Treino
            </Button>
            <Button 
              className="bg-green-500 hover:bg-green-600" 
              onClick={() => {
                setShowCloseConfirm(false);
                setShowFinishConfirm(true);
              }}
            >
              <CheckCircle size={16} className="mr-2" />
              Finalizar e Registrar Sessão
            </Button>
            <Button 
              variant="ghost" 
              className="text-muted-foreground"
              onClick={() => {
                setShowCloseConfirm(false);
                onClose();
              }}
            >
              Pausar (continuar depois)
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default ActiveWorkoutSession;

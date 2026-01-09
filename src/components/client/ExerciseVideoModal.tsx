import React, { forwardRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, ExternalLink, Dumbbell, Clock, Target, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ExerciseVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  exerciseName: string;
  muscleGroup?: string;
  sets?: number;
  reps?: number;
  restSeconds?: number;
  videoUrl?: string | null;
}

// Mapeamento de vídeos do YouTube para cada exercício do plano iniciante
const EXERCISE_VIDEOS: Record<string, string> = {
  // Segunda - Peito e Tríceps
  'Supino Reto com Halteres': 'https://www.youtube.com/embed/VmB1G1K7v94',
  'Supino Inclinado com Halteres': 'https://www.youtube.com/embed/8iPEnn-ltC8',
  'Crucifixo': 'https://www.youtube.com/embed/eozdVDA78K0',
  'Tríceps Pulley': 'https://www.youtube.com/embed/2-LAMcpzODU',
  'Tríceps Testa': 'https://www.youtube.com/embed/d_KZxkY_0cM',
  'Mergulho no Banco': 'https://www.youtube.com/embed/6kALZikXxLc',
  
  // Terça - Costas e Bíceps
  'Puxada Frontal': 'https://www.youtube.com/embed/CAwf7n6Luuc',
  'Remada Curvada': 'https://www.youtube.com/embed/9efgcAjQe7E',
  'Remada Unilateral': 'https://www.youtube.com/embed/pYcpY20QaE8',
  'Rosca Direta': 'https://www.youtube.com/embed/ykJmrZ5v0Oo',
  'Rosca Alternada': 'https://www.youtube.com/embed/sAq_ocpRh_I',
  'Rosca Martelo': 'https://www.youtube.com/embed/zC3nLlEvin4',
  
  // Quarta - Pernas e Glúteos
  'Agachamento Livre': 'https://www.youtube.com/embed/ultWZbUMPL8',
  'Leg Press 45°': 'https://www.youtube.com/embed/IZxyjW7MPJQ',
  'Cadeira Extensora': 'https://www.youtube.com/embed/YyvSfVjQeL0',
  'Mesa Flexora': 'https://www.youtube.com/embed/1Tq3QdYUuHs',
  'Elevação Pélvica': 'https://www.youtube.com/embed/SEdqd1n0cvg',
  'Abdução de Quadril': 'https://www.youtube.com/embed/FgKNUDNhKrI',
  
  // Quinta - Ombros e Abdômen
  'Desenvolvimento com Halteres': 'https://www.youtube.com/embed/qEwKCR5JCog',
  'Elevação Lateral': 'https://www.youtube.com/embed/3VcKaXpzqRo',
  'Elevação Frontal': 'https://www.youtube.com/embed/-t7fuZ0KhDA',
  'Encolhimento de Ombros': 'https://www.youtube.com/embed/cJRVVxmytaM',
  'Abdominal Crunch': 'https://www.youtube.com/embed/Xyd_fa5zoEU',
  'Prancha': 'https://www.youtube.com/embed/ASdvN_XEl_c',
  
  // Sexta - Cardio + Full Body
  'Esteira - Caminhada/Corrida': 'https://www.youtube.com/embed/8vsTJc0NwJo',
  'Burpee': 'https://www.youtube.com/embed/TU8QYVW0gDU',
  'Agachamento com Salto': 'https://www.youtube.com/embed/Azl5tkCzDcc',
  'Polichinelo': 'https://www.youtube.com/embed/c4DAnQ6DtF8',
  'Mountain Climber': 'https://www.youtube.com/embed/nmwgirgXLYM',
  'Abdominal Bicicleta': 'https://www.youtube.com/embed/9FGilxCbdz8',
};

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

const ExerciseVideoModal = forwardRef<HTMLDivElement, ExerciseVideoModalProps>(({
  isOpen,
  onClose,
  exerciseName,
  muscleGroup,
  sets,
  reps,
  restSeconds,
  videoUrl
}, ref) => {
  // Get video URL from provided or from mapping
  const embedUrl = videoUrl || EXERCISE_VIDEOS[exerciseName];
  const hasVideo = !!embedUrl;
  
  const muscleColor = muscleGroup ? muscleColors[muscleGroup] || 'bg-primary/20 text-primary border-primary/30' : '';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        ref={ref}
        className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto p-0 bg-card border-border/50"
      >
        <DialogHeader className="p-4 pb-2 border-b border-border/30">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-primary" />
                {exerciseName}
              </DialogTitle>
              {muscleGroup && (
                <Badge className={`mt-2 ${muscleColor}`}>
                  <Target className="w-3 h-3 mr-1" />
                  {muscleGroup}
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="p-4 space-y-4">
          {/* Video Player */}
          {hasVideo ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative w-full aspect-video rounded-xl overflow-hidden bg-black/50 border border-border/30"
            >
              <iframe
                src={`${embedUrl}?rel=0&modestbranding=1`}
                title={`Como fazer ${exerciseName}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </motion.div>
          ) : (
            <div className="w-full aspect-video rounded-xl bg-muted/50 border border-border/30 flex flex-col items-center justify-center gap-3">
              <div className="p-4 rounded-full bg-muted">
                <Play className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Vídeo não disponível para este exercício
              </p>
            </div>
          )}

          {/* Exercise Details */}
          {(sets || reps || restSeconds) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-3 gap-3"
            >
              {sets && (
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-center">
                  <div className="text-2xl font-bold text-primary">{sets}</div>
                  <div className="text-xs text-muted-foreground">Séries</div>
                </div>
              )}
              {reps && (
                <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
                  <div className="text-2xl font-bold text-green-500">{reps}</div>
                  <div className="text-xs text-muted-foreground">Repetições</div>
                </div>
              )}
              {restSeconds && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                  <div className="text-2xl font-bold text-amber-500">{restSeconds}s</div>
                  <div className="text-xs text-muted-foreground">Descanso</div>
                </div>
              )}
            </motion.div>
          )}

          {/* Tips */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20"
          >
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-400">Dicas de Execução</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Mantenha a postura correta durante todo o movimento</li>
                  <li>• Controle a respiração: expire no esforço, inspire no retorno</li>
                  <li>• Faça movimentos lentos e controlados</li>
                  <li>• Respeite os intervalos de descanso entre as séries</li>
                </ul>
              </div>
            </div>
          </motion.div>

          {/* Close Button */}
          <Button
            onClick={onClose}
            className="w-full bg-primary hover:bg-primary/90"
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
});

ExerciseVideoModal.displayName = 'ExerciseVideoModal';

export default memo(ExerciseVideoModal);

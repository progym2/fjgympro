import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dumbbell, ChevronDown, Check, AlertCircle, X } from 'lucide-react';
import { useInstructorContext } from '@/hooks/useInstructorContext';
import { useAudio } from '@/contexts/AudioContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface InstructorSelectorProps {
  compact?: boolean;
}

const InstructorSelector: React.FC<InstructorSelectorProps> = ({ compact = false }) => {
  const { 
    isMaster, 
    instructors, 
    selectedInstructorId, 
    selectedInstructor,
    selectInstructor, 
    loading,
    needsInstructorSelection 
  } = useInstructorContext();
  const { playClickSound } = useAudio();

  // Só exibe para masters
  if (!isMaster) return null;

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-lg">
        <Dumbbell className="w-4 h-4 text-green-500 animate-pulse" />
        <span className="text-xs text-muted-foreground">Carregando...</span>
      </div>
    );
  }

  if (instructors.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
        <AlertCircle className="w-4 h-4 text-yellow-500" />
        <span className="text-xs text-yellow-500">Nenhum instrutor cadastrado</span>
      </div>
    );
  }

  if (compact) {
    return (
      <Select 
        value={selectedInstructorId || ''} 
        onValueChange={(value) => {
          playClickSound();
          selectInstructor(value || null);
        }}
      >
        <SelectTrigger className="w-auto min-w-[160px] h-8 bg-green-500/10 border-green-500/30 text-green-500 text-xs">
          <Dumbbell className="w-3 h-3 mr-1" />
          <SelectValue placeholder="Selecionar instrutor" />
        </SelectTrigger>
        <SelectContent>
          {instructors.map((instructor) => (
            <SelectItem key={instructor.id} value={instructor.id}>
              <div className="flex items-center gap-2">
                <span>{instructor.full_name || instructor.username}</span>
                {instructor.cref && (
                  <span className="text-[10px] text-muted-foreground">
                    CREF: {instructor.cref}
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <AnimatePresence>
      {needsInstructorSelection && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/50 rounded-xl p-4 mb-4"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Dumbbell className="w-5 h-5 text-green-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-bebas text-green-500 text-lg mb-1">MODO MASTER</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Selecione um instrutor para gerenciar seus alunos e treinos:
              </p>
              
              <Select 
                value={selectedInstructorId || ''} 
                onValueChange={(value) => {
                  playClickSound();
                  selectInstructor(value || null);
                }}
              >
                <SelectTrigger className="w-full max-w-sm bg-background/50 border-green-500/30">
                  <SelectValue placeholder="Escolha um instrutor..." />
                </SelectTrigger>
                <SelectContent>
                  {instructors.map((instructor) => (
                    <SelectItem key={instructor.id} value={instructor.id}>
                      <div className="flex items-center gap-2">
                        <Dumbbell className="w-4 h-4 text-green-500" />
                        <span>{instructor.full_name || instructor.username}</span>
                        {instructor.cref && (
                          <Badge variant="outline" className="text-[10px] text-green-500 border-green-500/50">
                            CREF: {instructor.cref}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </motion.div>
      )}

      {selectedInstructor && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2 mb-4"
        >
          <Badge className="bg-green-500/20 text-green-500 border border-green-500/50 flex items-center gap-2">
            <Dumbbell className="w-3 h-3" />
            Gerenciando: {selectedInstructor.full_name || selectedInstructor.username}
            <button
              onClick={() => {
                playClickSound();
                selectInstructor(null);
              }}
              className="ml-1 p-0.5 hover:bg-green-500/30 rounded"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InstructorSelector;

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Mail, Phone, Calendar, MapPin, Ruler, Weight, Target, Award, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface StudentProfile {
  id: string;
  username: string;
  full_name: string | null;
  email: string | null;
  cpf: string | null;
  phone?: string | null;
  birth_date?: string | null;
  city?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  fitness_goal?: string | null;
  fitness_level?: string | null;
  created_at?: string | null;
  enrollment_status?: string | null;
  link_status?: string;
}

interface StudentProfileModalProps {
  student: StudentProfile | null;
  isOpen: boolean;
  onClose: () => void;
}

const fitnessGoalLabels: Record<string, string> = {
  muscle_gain: 'Ganho Muscular',
  weight_loss: 'Perda de Peso',
  hypertrophy: 'Hipertrofia',
  conditioning: 'Condicionamento',
  maintenance: 'Manutenção',
};

const fitnessLevelLabels: Record<string, string> = {
  beginner: 'Iniciante',
  intermediate: 'Intermediário',
  advanced: 'Avançado',
};

const StudentProfileModal: React.FC<StudentProfileModalProps> = ({ student, isOpen, onClose }) => {
  if (!student) return null;

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    try {
      return format(new Date(dateStr), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'accepted':
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/50">Vinculado</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/50">Pendente</Badge>;
      default:
        return null;
    }
  };

  const getEnrollmentBadge = (status?: string | null) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/50">Ativo</Badge>;
      case 'inactive':
        return <Badge className="bg-red-500/20 text-red-500 border-red-500/50">Inativo</Badge>;
      case 'frozen':
        return <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/50">Congelado</Badge>;
      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-x-4 top-[10%] sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-md z-50 max-h-[80vh] overflow-hidden"
          >
            <div className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/10 p-4 sm:p-6 border-b border-border/50">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-500/30 to-emerald-500/20 border-2 border-green-500/50 flex items-center justify-center">
                      <span className="text-2xl font-bebas text-green-500">
                        {(student.full_name || student.username).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">
                        {student.full_name || student.username}
                      </h2>
                      <p className="text-sm text-muted-foreground">@{student.username}</p>
                      <div className="flex gap-2 mt-1">
                        {getStatusBadge(student.link_status)}
                        {getEnrollmentBadge(student.enrollment_status)}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="rounded-full hover:bg-background/50"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 sm:p-6 space-y-4 max-h-[50vh] overflow-y-auto">
                {/* ID */}
                <div className="p-3 bg-background/50 rounded-lg border border-border/30">
                  <p className="text-xs text-muted-foreground mb-1">ID do Aluno</p>
                  <p className="text-xs font-mono text-foreground/80 break-all">{student.id}</p>
                </div>

                {/* Contact Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {student.email && (
                    <div className="flex items-center gap-2 p-3 bg-background/50 rounded-lg border border-border/30">
                      <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">E-mail</p>
                        <p className="text-sm truncate">{student.email}</p>
                      </div>
                    </div>
                  )}
                  
                  {student.phone && (
                    <div className="flex items-center gap-2 p-3 bg-background/50 rounded-lg border border-border/30">
                      <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Telefone</p>
                        <p className="text-sm">{student.phone}</p>
                      </div>
                    </div>
                  )}
                  
                  {student.cpf && (
                    <div className="flex items-center gap-2 p-3 bg-background/50 rounded-lg border border-border/30">
                      <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">CPF</p>
                        <p className="text-sm">{student.cpf}</p>
                      </div>
                    </div>
                  )}
                  
                  {student.birth_date && (
                    <div className="flex items-center gap-2 p-3 bg-background/50 rounded-lg border border-border/30">
                      <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Nascimento</p>
                        <p className="text-sm">{formatDate(student.birth_date)}</p>
                      </div>
                    </div>
                  )}
                  
                  {student.city && (
                    <div className="flex items-center gap-2 p-3 bg-background/50 rounded-lg border border-border/30">
                      <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Cidade</p>
                        <p className="text-sm">{student.city}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Physical Info */}
                {(student.height_cm || student.weight_kg) && (
                  <div className="grid grid-cols-2 gap-3">
                    {student.height_cm && (
                      <div className="flex items-center gap-2 p-3 bg-background/50 rounded-lg border border-border/30">
                        <Ruler className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">Altura</p>
                          <p className="text-sm font-medium">{student.height_cm} cm</p>
                        </div>
                      </div>
                    )}
                    {student.weight_kg && (
                      <div className="flex items-center gap-2 p-3 bg-background/50 rounded-lg border border-border/30">
                        <Weight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">Peso</p>
                          <p className="text-sm font-medium">{student.weight_kg} kg</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Fitness Info */}
                {(student.fitness_goal || student.fitness_level) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {student.fitness_goal && (
                      <div className="flex items-center gap-2 p-3 bg-background/50 rounded-lg border border-border/30">
                        <Target className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">Objetivo</p>
                          <p className="text-sm font-medium">
                            {fitnessGoalLabels[student.fitness_goal] || student.fitness_goal}
                          </p>
                        </div>
                      </div>
                    )}
                    {student.fitness_level && (
                      <div className="flex items-center gap-2 p-3 bg-background/50 rounded-lg border border-border/30">
                        <Award className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">Nível</p>
                          <p className="text-sm font-medium">
                            {fitnessLevelLabels[student.fitness_level] || student.fitness_level}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Created At */}
                {student.created_at && (
                  <div className="flex items-center gap-2 p-3 bg-background/50 rounded-lg border border-border/30">
                    <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Cadastrado em</p>
                      <p className="text-sm">{formatDate(student.created_at)}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-border/50 bg-background/30">
                <Button onClick={onClose} className="w-full bg-green-500 hover:bg-green-600">
                  Fechar
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default StudentProfileModal;

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Search, Phone, Mail, Scale, Ruler, 
  Target, Calendar, Dumbbell, TrendingUp, Eye,
  ChevronRight, Loader2, Award, Save, Camera
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useInstructorContext } from '@/hooks/useInstructorContext';
import { useAudio } from '@/contexts/AudioContext';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import InstructorPageHeader from './InstructorPageHeader';
import FadeScrollList from '@/components/shared/FadeScrollList';
import { useEscapeBack } from '@/hooks/useEscapeBack';

interface Student {
  id: string;
  link_id: string;
  username: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  gender: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  fitness_goal: string | null;
  fitness_level: string | null;
  fitness_level_by_instructor: string | null;
  avatar_url: string | null;
  linked_at: string | null;
  link_status: string;
}

const fitnessGoalLabels: Record<string, string> = {
  muscle_gain: 'Ganho de Massa',
  weight_loss: 'Perda de Peso',
  hypertrophy: 'Hipertrofia',
  conditioning: 'Condicionamento',
  maintenance: 'Manutenção',
};

const MyStudents: React.FC = () => {
  const navigate = useNavigate();
  const { effectiveInstructorId, needsInstructorSelection } = useInstructorContext();
  const { playClickSound } = useAudio();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [savingLevel, setSavingLevel] = useState<string | null>(null);

  // ESC volta para /instructor
  useEscapeBack({ to: '/instructor', disableWhen: [selectedStudent !== null] });

  useEffect(() => {
    if (effectiveInstructorId) {
      fetchStudents();
    }
  }, [effectiveInstructorId]);

  const fetchStudents = async () => {
    if (!effectiveInstructorId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('instructor_clients')
        .select(`
          id,
          linked_at,
          client_id,
          fitness_level_by_instructor,
          link_status,
          profiles!instructor_clients_client_id_fkey (
            id,
            username,
            full_name,
            email,
            phone,
            birth_date,
            gender,
            height_cm,
            weight_kg,
            fitness_goal,
            fitness_level,
            avatar_url
          )
        `)
        .eq('instructor_id', effectiveInstructorId)
        .eq('is_active', true)
        .eq('link_status', 'accepted');

      if (error) throw error;

      const studentsList: Student[] = (data || []).map((item: any) => ({
        id: item.profiles.id,
        link_id: item.id,
        username: item.profiles.username,
        full_name: item.profiles.full_name,
        email: item.profiles.email,
        phone: item.profiles.phone,
        birth_date: item.profiles.birth_date,
        gender: item.profiles.gender,
        height_cm: item.profiles.height_cm,
        weight_kg: item.profiles.weight_kg,
        fitness_goal: item.profiles.fitness_goal,
        fitness_level: item.profiles.fitness_level,
        fitness_level_by_instructor: item.fitness_level_by_instructor,
        avatar_url: item.profiles.avatar_url,
        linked_at: item.linked_at,
        link_status: item.link_status,
      }));

      setStudents(studentsList);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter((student) =>
    student.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const calculateAge = (birthDate: string | null): number | null => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const calculateBMI = (weight: number | null, height: number | null): string | null => {
    if (!weight || !height) return null;
    const heightM = height / 100;
    const bmi = weight / (heightM * heightM);
    return bmi.toFixed(1);
  };

  const handleSaveLevel = async (student: Student, level: string) => {
    setSavingLevel(student.id);
    try {
      const { error } = await supabase
        .from('instructor_clients')
        .update({ fitness_level_by_instructor: level })
        .eq('id', student.link_id);

      if (error) throw error;

      // Update local state
      setStudents(prev => prev.map(s => 
        s.id === student.id ? { ...s, fitness_level_by_instructor: level } : s
      ));
      
      toast.success(`Nível de ${student.full_name || student.username} atualizado para ${
        level === 'beginner' ? 'Iniciante' : level === 'intermediate' ? 'Intermediário' : 'Avançado'
      }`);
    } catch (err) {
      console.error('Error updating level:', err);
      toast.error('Erro ao atualizar nível');
    } finally {
      setSavingLevel(null);
    }
  };

  const getLevelLabel = (level: string | null) => {
    switch (level) {
      case 'beginner': return 'Iniciante';
      case 'intermediate': return 'Intermediário';
      case 'advanced': return 'Avançado';
      default: return 'Não definido';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
      </div>
    );
  }

  if (needsInstructorSelection) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full">
        <InstructorPageHeader 
          title="MEUS ALUNOS"
          icon={<Users className="w-6 h-6" />}
          iconColor="text-green-500"
        />
        <div className="bg-card/80 backdrop-blur-md rounded-xl p-8 border border-border/50 text-center">
          <Users className="w-16 h-16 mx-auto text-green-500/50 mb-4" />
          <p className="text-muted-foreground">
            Selecione um instrutor no menu superior para visualizar seus alunos.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-full"
    >
      <InstructorPageHeader 
        title={`MEUS ALUNOS (${students.length})`}
        icon={<Users className="w-6 h-6" />}
        iconColor="text-green-500"
      />
      
      <FadeScrollList className="flex-1 space-y-4 pr-1">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar aluno..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-background/50 border-border/50 w-full sm:w-64"
          />
        </div>

      {/* Student List */}
      {filteredStudents.length === 0 ? (
        <div className="bg-card/80 backdrop-blur-md rounded-xl p-8 border border-border/50 text-center">
          <Users className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">
            {searchTerm ? 'Nenhum aluno encontrado.' : 'Você ainda não tem alunos vinculados.'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => { playClickSound(); navigate('/instructor/link-student'); }}
              className="mt-4 px-4 py-2 bg-green-500/20 text-green-500 rounded-lg hover:bg-green-500/30 transition-colors"
            >
              Vincular Primeiro Aluno
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredStudents.map((student, index) => (
            <motion.div
              key={student.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-card/80 backdrop-blur-md rounded-xl border border-border/50 hover:border-green-500/50 transition-all overflow-hidden"
            >
              <div
                className="p-4 cursor-pointer"
                onClick={() => {
                  playClickSound();
                  setSelectedStudent(selectedStudent?.id === student.id ? null : student);
                }}
              >
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 flex items-center justify-center flex-shrink-0">
                    {student.avatar_url ? (
                      <img
                        src={student.avatar_url}
                        alt={student.full_name || student.username}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-lg sm:text-xl font-bebas text-green-500">
                        {(student.full_name || student.username).charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">
                      {student.full_name || student.username}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate">
                      @{student.username}
                    </p>
                    {student.fitness_goal && (
                      <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-500">
                        {fitnessGoalLabels[student.fitness_goal] || student.fitness_goal}
                      </span>
                    )}
                  </div>

                  {/* Quick Stats */}
                  <div className="hidden sm:flex items-center gap-4 text-sm text-muted-foreground">
                    {student.weight_kg && (
                      <div className="flex items-center gap-1">
                        <Scale className="w-4 h-4" />
                        <span>{student.weight_kg}kg</span>
                      </div>
                    )}
                    {student.height_cm && (
                      <div className="flex items-center gap-1">
                        <Ruler className="w-4 h-4" />
                        <span>{student.height_cm}cm</span>
                      </div>
                    )}
                  </div>

                  {/* Expand Icon */}
                  <ChevronRight
                    className={`w-5 h-5 text-muted-foreground transition-transform ${
                      selectedStudent?.id === student.id ? 'rotate-90' : ''
                    }`}
                  />
                </div>
              </div>

              {/* Expanded Details */}
              {selectedStudent?.id === student.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-border/50 bg-background/30"
                >
                  <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {/* Contact Info */}
                    {student.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-green-500" />
                        <span className="truncate">{student.email}</span>
                      </div>
                    )}
                    {student.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-green-500" />
                        <span>{student.phone}</span>
                      </div>
                    )}

                    {/* Physical Info */}
                    {calculateAge(student.birth_date) && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-green-500" />
                        <span>{calculateAge(student.birth_date)} anos</span>
                      </div>
                    )}
                    {calculateBMI(student.weight_kg, student.height_cm) && (
                      <div className="flex items-center gap-2 text-sm">
                        <Target className="w-4 h-4 text-green-500" />
                        <span>IMC: {calculateBMI(student.weight_kg, student.height_cm)}</span>
                      </div>
                    )}

                    {/* Linked At */}
                    {student.linked_at && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span>
                          Vinculado em {format(new Date(student.linked_at), 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Fitness Level Setting */}
                  <div className="px-4 pb-4 border-t border-border/30 pt-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Award className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm font-medium">Nível de Condicionamento</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={student.fitness_level_by_instructor || ''}
                        onValueChange={(value) => handleSaveLevel(student, value)}
                        disabled={savingLevel === student.id}
                      >
                        <SelectTrigger className="w-48 bg-background/50">
                          <SelectValue placeholder="Selecione o nível" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="beginner">Iniciante</SelectItem>
                          <SelectItem value="intermediate">Intermediário</SelectItem>
                          <SelectItem value="advanced">Avançado</SelectItem>
                        </SelectContent>
                      </Select>
                      {savingLevel === student.id && (
                        <Loader2 className="w-4 h-4 animate-spin text-green-500" />
                      )}
                      {student.fitness_level_by_instructor && (
                        <span className="text-xs text-muted-foreground">
                          (O aluno não pode alterar este campo)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="px-4 pb-4 flex flex-wrap gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        playClickSound();
                        navigate(`/instructor/create-workout?student=${student.id}`);
                      }}
                      className="px-3 py-1.5 text-sm bg-green-500/20 text-green-500 rounded-lg hover:bg-green-500/30 transition-colors flex items-center gap-1"
                    >
                      <Dumbbell className="w-4 h-4" />
                      Criar Treino
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        playClickSound();
                        navigate(`/instructor/progress?student=${student.id}`);
                      }}
                      className="px-3 py-1.5 text-sm bg-blue-500/20 text-blue-500 rounded-lg hover:bg-blue-500/30 transition-colors flex items-center gap-1"
                    >
                      <TrendingUp className="w-4 h-4" />
                      Ver Progresso
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        playClickSound();
                        navigate(`/instructor/workout-plans?student=${student.id}`);
                      }}
                      className="px-3 py-1.5 text-sm bg-purple-500/20 text-purple-500 rounded-lg hover:bg-purple-500/30 transition-colors flex items-center gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      Ver Planos
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        playClickSound();
                        navigate(`/instructor/student-gallery?student=${student.id}`);
                      }}
                      className="px-3 py-1.5 text-sm bg-pink-500/20 text-pink-500 rounded-lg hover:bg-pink-500/30 transition-colors flex items-center gap-1"
                    >
                      <Camera className="w-4 h-4" />
                      Galeria Evolução
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      )}
      </FadeScrollList>
    </motion.div>
  );
};

export default MyStudents;

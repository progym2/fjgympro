import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { UserMinus, Loader2, AlertTriangle, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAudio } from '@/contexts/AudioContext';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface LinkedStudent {
  link_id: string;
  id: string;
  username: string;
  full_name: string | null;
}

const UnlinkStudent: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { playClickSound } = useAudio();
  const [students, setStudents] = useState<LinkedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlinking, setUnlinking] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<LinkedStudent | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (profile?.profile_id) {
      fetchStudents();
    }
  }, [profile?.profile_id]);

  const fetchStudents = async () => {
    if (!profile?.profile_id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('instructor_clients')
        .select(`
          id,
          profiles!instructor_clients_client_id_fkey (
            id,
            username,
            full_name
          )
        `)
        .eq('instructor_id', profile.profile_id)
        .eq('is_active', true);

      if (error) throw error;

      const studentsList: LinkedStudent[] = (data || []).map((item: any) => ({
        link_id: item.id,
        id: item.profiles.id,
        username: item.profiles.username,
        full_name: item.profiles.full_name,
      }));

      setStudents(studentsList);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlink = async () => {
    if (!selectedStudent) return;

    setUnlinking(true);
    try {
      const { error } = await supabase
        .from('instructor_clients')
        .update({
          is_active: false,
          unlinked_at: new Date().toISOString(),
        })
        .eq('id', selectedStudent.link_id);

      if (error) throw error;

      toast.success('Aluno desvinculado com sucesso!');
      setStudents(students.filter((s) => s.link_id !== selectedStudent.link_id));
      setSelectedStudent(null);
      setConfirmOpen(false);
    } catch (err) {
      console.error('Unlink error:', err);
      toast.error('Erro ao desvincular aluno.');
    } finally {
      setUnlinking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-lg mx-auto"
    >
      <div className="bg-card/80 backdrop-blur-md rounded-xl p-6 border border-border/50">
        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => { playClickSound(); navigate('/instructor'); }}
            className="text-sm text-muted-foreground hover:text-green-500 transition-colors"
          >
            ← Voltar
          </button>
          <h2 className="text-xl sm:text-2xl font-bebas text-red-500 flex items-center gap-2">
            <UserMinus className="w-6 h-6" />
            DESVINCULAR ALUNO
          </h2>
        </div>

        {/* Student List */}
        {students.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Você não tem alunos vinculados.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {students.map((student, index) => (
              <motion.div
                key={student.link_id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-4 bg-background/50 rounded-xl border border-border/50 hover:border-red-500/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30 flex items-center justify-center">
                    <span className="text-lg font-bebas text-red-500">
                      {(student.full_name || student.username).charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">
                      {student.full_name || student.username}
                    </h3>
                    <p className="text-sm text-muted-foreground">@{student.username}</p>
                  </div>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    playClickSound();
                    setSelectedStudent(student);
                    setConfirmOpen(true);
                  }}
                >
                  <UserMinus className="w-4 h-4 mr-1" />
                  Desvincular
                </Button>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="w-5 h-5" />
              Confirmar Desvinculação
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desvincular{' '}
              <strong>{selectedStudent?.full_name || selectedStudent?.username}</strong>?
              <br />
              <br />
              Os planos de treino atribuídos permanecerão, mas você não terá mais acesso ao perfil do aluno.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => playClickSound()}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnlink}
              disabled={unlinking}
              className="bg-destructive hover:bg-destructive/90"
            >
              {unlinking ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Desvinculando...
                </>
              ) : (
                'Confirmar Desvinculação'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

export default UnlinkStudent;

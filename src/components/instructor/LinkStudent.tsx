import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Search, Loader2, Check, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useInstructorContext } from '@/hooks/useInstructorContext';
import { useAudio } from '@/contexts/AudioContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const LinkStudent: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { effectiveInstructorId, isMaster, selectedInstructor } = useInstructorContext();
  const { playClickSound } = useAudio();
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [linking, setLinking] = useState(false);
  const [foundStudent, setFoundStudent] = useState<{
    id: string;
    username: string;
    full_name: string | null;
    email: string | null;
    already_linked: boolean;
    pending_link: boolean;
    linked_to_other: boolean;
  } | null>(null);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!searchTerm.trim() || !effectiveInstructorId) return;

    setSearching(true);
    setError('');
    setFoundStudent(null);

    try {
      // Search for student by username
      const { data: studentData, error: studentError } = await supabase
        .from('profiles')
        .select('id, username, full_name, email')
        .eq('username', searchTerm.trim())
        .maybeSingle();

      if (studentError) throw studentError;

      if (!studentData) {
        setError('Aluno não encontrado. Verifique o nome de usuário.');
        return;
      }

      // Check if already linked to THIS instructor (any status)
      const { data: myLinkData } = await supabase
        .from('instructor_clients')
        .select('id, link_status')
        .eq('instructor_id', effectiveInstructorId)
        .eq('client_id', studentData.id)
        .in('link_status', ['pending', 'accepted'])
        .maybeSingle();

      // Check if linked to ANY OTHER instructor (accepted only)
      const { data: otherLinkData } = await supabase
        .from('instructor_clients')
        .select('id, instructor_id')
        .eq('client_id', studentData.id)
        .eq('link_status', 'accepted')
        .neq('instructor_id', effectiveInstructorId)
        .maybeSingle();

      setFoundStudent({
        ...studentData,
        already_linked: myLinkData?.link_status === 'accepted',
        pending_link: myLinkData?.link_status === 'pending',
        linked_to_other: !!otherLinkData,
      });
    } catch (err) {
      console.error('Search error:', err);
      setError('Erro ao buscar aluno.');
    } finally {
      setSearching(false);
    }
  };

  const handleLink = async () => {
    if (!foundStudent || !effectiveInstructorId) return;

    setLinking(true);
    try {
      // Create link with PENDING status - needs client confirmation
      const { error: linkError } = await supabase
        .from('instructor_clients')
        .insert({
          instructor_id: effectiveInstructorId,
          client_id: foundStudent.id,
          is_active: true,
          link_status: 'pending', // Requires client confirmation
        });

      if (linkError) throw linkError;

      // Send notification to client - use the selected instructor name for masters
      const instructorName = isMaster && selectedInstructor 
        ? (selectedInstructor.full_name || selectedInstructor.username)
        : (profile?.full_name || profile?.username);
      
      await supabase.from('notifications').insert({
        profile_id: foundStudent.id,
        title: 'Solicitação de Vínculo',
        message: `O instrutor ${instructorName} deseja vincular você como aluno. Acesse seu painel para aceitar ou rejeitar.`,
        type: 'link_request',
      });

      toast.success('Solicitação enviada! Aguardando confirmação do aluno.');
      playClickSound();
      navigate('/instructor/students');
    } catch (err: any) {
      console.error('Link error:', err);
      if (err.code === '23505') {
        toast.error('Já existe uma solicitação para este aluno.');
      } else {
        toast.error('Erro ao enviar solicitação.');
      }
    } finally {
      setLinking(false);
    }
  };

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
          <h2 className="text-xl sm:text-2xl font-bebas text-green-500 flex items-center gap-2">
            <UserPlus className="w-6 h-6" />
            VINCULAR ALUNO
          </h2>
        </div>

        {/* Search Form */}
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              Nome de usuário do aluno
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="Ex: cliente01"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="bg-background/50 border-border/50"
              />
              <Button
                onClick={handleSearch}
                disabled={searching || !searchTerm.trim()}
                className="bg-green-500 hover:bg-green-600"
              >
                {searching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 p-3 bg-destructive/20 border border-destructive/50 rounded-lg text-destructive"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </motion.div>
          )}

          {/* Found Student */}
          {foundStudent && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-background/50 rounded-xl border border-green-500/30"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 flex items-center justify-center">
                  <span className="text-xl font-bebas text-green-500">
                    {(foundStudent.full_name || foundStudent.username).charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    {foundStudent.full_name || foundStudent.username}
                  </h3>
                  <p className="text-sm text-muted-foreground">@{foundStudent.username}</p>
                  {foundStudent.email && (
                    <p className="text-sm text-muted-foreground">{foundStudent.email}</p>
                  )}
                </div>
              </div>

              {foundStudent.already_linked ? (
                <div className="flex items-center gap-2 p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-500">
                  <Check className="w-5 h-5" />
                  <span className="text-sm">Este aluno já está vinculado a você.</span>
                </div>
              ) : foundStudent.pending_link ? (
                <div className="flex items-center gap-2 p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg text-yellow-500">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-sm">Solicitação pendente. Aguardando confirmação do aluno.</span>
                </div>
              ) : foundStudent.linked_to_other ? (
                <div className="flex items-center gap-2 p-3 bg-destructive/20 border border-destructive/50 rounded-lg text-destructive">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-sm">Este aluno já está vinculado a outro instrutor. Não é possível vincular.</span>
                </div>
              ) : (
                <Button
                  onClick={handleLink}
                  disabled={linking}
                  className="w-full bg-green-500 hover:bg-green-600"
                >
                  {linking ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Vinculando...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Vincular Aluno
                    </>
                  )}
                </Button>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default LinkStudent;

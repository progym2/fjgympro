import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Search, Loader2, Check, AlertCircle, Hash } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useInstructorContext } from '@/hooks/useInstructorContext';
import { useAudio } from '@/contexts/AudioContext';
import { useEscapeBack } from '@/hooks/useEscapeBack';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

const LinkStudent: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { effectiveInstructorId, isMaster, selectedInstructor } = useInstructorContext();
  const { playClickSound } = useAudio();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchById, setSearchById] = useState('');
  const [searchType, setSearchType] = useState<'username' | 'id'>('username');
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

  // ESC to go back
  useEscapeBack({ to: '/instructor' });

  const handleSearch = async () => {
    const term = searchType === 'username' ? searchTerm.trim() : searchById.trim();
    if (!term || !effectiveInstructorId) return;

    setSearching(true);
    setError('');
    setFoundStudent(null);

    try {
      let studentData;
      
      if (searchType === 'id') {
        // Search by ID (exact match)
        const { data, error: studentError } = await supabase
          .from('profiles')
          .select('id, username, full_name, email')
          .eq('id', term)
          .maybeSingle();
        
        if (studentError) throw studentError;
        studentData = data;
        
        if (!studentData) {
          setError('Aluno não encontrado. Verifique o ID informado.');
          return;
        }
      } else {
        // Search by username
        const { data, error: studentError } = await supabase
          .from('profiles')
          .select('id, username, full_name, email')
          .eq('username', term)
          .maybeSingle();

        if (studentError) throw studentError;
        studentData = data;
        
        if (!studentData) {
          setError('Aluno não encontrado. Verifique o nome de usuário.');
          return;
        }
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
      <div className="bg-card/80 backdrop-blur-md rounded-xl p-5 border border-border/50">
        {/* Header */}
        <div className="flex items-center gap-2 mb-5">
          <button
            onClick={() => { playClickSound(); navigate('/instructor'); }}
            className="text-sm text-muted-foreground hover:text-green-500 transition-colors"
          >
            ← Voltar
          </button>
          <h2 className="text-lg sm:text-xl font-bebas text-green-500 flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            VINCULAR ALUNO
          </h2>
        </div>

        {/* Search Form */}
        <div className="space-y-4">
          <Tabs value={searchType} onValueChange={(v) => { setSearchType(v as 'username' | 'id'); setFoundStudent(null); setError(''); }}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="username" className="gap-2">
                <Search className="w-3 h-3" />
                Usuário
              </TabsTrigger>
              <TabsTrigger value="id" className="gap-2">
                <Hash className="w-3 h-3" />
                ID
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="username" className="mt-0">
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
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Search className="w-3 h-3" />
                  )}
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="id" className="mt-0">
              <label className="text-sm text-muted-foreground mb-2 block">
                ID do aluno (UUID)
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: a1b2c3d4-e5f6-..."
                  value={searchById}
                  onChange={(e) => setSearchById(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="bg-background/50 border-border/50 font-mono text-sm"
                />
                <Button
                  onClick={handleSearch}
                  disabled={searching || !searchById.trim()}
                  className="bg-green-500 hover:bg-green-600"
                >
                  {searching ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Search className="w-3 h-3" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                O ID pode ser encontrado no QR Code do aluno ou nas configurações de perfil dele.
              </p>
            </TabsContent>
          </Tabs>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 p-3 bg-destructive/20 border border-destructive/50 rounded-lg text-destructive"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </motion.div>
          )}

          {/* Found Student */}
          {foundStudent && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-background/50 rounded-lg border border-green-500/30"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 flex items-center justify-center">
                  <span className="text-lg font-bebas text-green-500">
                    {(foundStudent.full_name || foundStudent.username).charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm text-foreground truncate">
                    {foundStudent.full_name || foundStudent.username}
                  </h3>
                  <p className="text-xs text-muted-foreground">@{foundStudent.username}</p>
                  {foundStudent.email && (
                    <p className="text-xs text-muted-foreground truncate">{foundStudent.email}</p>
                  )}
                </div>
              </div>

              {foundStudent.already_linked ? (
                <div className="flex items-center gap-2 p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-500">
                  <Check className="w-4 h-4" />
                  <span className="text-sm">Este aluno já está vinculado a você.</span>
                </div>
              ) : foundStudent.pending_link ? (
                <div className="flex items-center gap-2 p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg text-yellow-500">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">Solicitação pendente. Aguardando confirmação do aluno.</span>
                </div>
              ) : foundStudent.linked_to_other ? (
                <div className="flex items-center gap-2 p-3 bg-destructive/20 border border-destructive/50 rounded-lg text-destructive">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">Este aluno já está vinculado a outro instrutor. Não é possível vincular.</span>
                </div>
              ) : (
                <Button
                  onClick={handleLink}
                  disabled={linking}
                  className="w-full bg-green-500 hover:bg-green-600"
                  size="sm"
                >
                  {linking ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
                      Vinculando...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5 mr-2" />
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

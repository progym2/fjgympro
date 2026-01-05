import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Search, Loader2, Check, AlertCircle, Hash, CreditCard, Users, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useInstructorContext } from '@/hooks/useInstructorContext';
import { useAudio } from '@/contexts/AudioContext';
import { useEscapeBack } from '@/hooks/useEscapeBack';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import StudentProfileModal from './StudentProfileModal';

interface ClientProfile {
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

interface FoundStudent extends ClientProfile {
  already_linked: boolean;
  pending_link: boolean;
  linked_to_other: boolean;
}

const LinkStudent: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { effectiveInstructorId, isMaster, selectedInstructor } = useInstructorContext();
  const { playClickSound } = useAudio();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [searchById, setSearchById] = useState('');
  const [searchByCpf, setSearchByCpf] = useState('');
  const [searchType, setSearchType] = useState<'username' | 'id' | 'cpf' | 'list'>('list');
  const [searching, setSearching] = useState(false);
  const [linking, setLinking] = useState(false);
  const [foundStudent, setFoundStudent] = useState<FoundStudent | null>(null);
  const [error, setError] = useState('');
  
  // My linked students list (only show students linked by this instructor)
  const [myLinkedStudents, setMyLinkedStudents] = useState<ClientProfile[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  
  // Profile modal state
  const [selectedStudentProfile, setSelectedStudentProfile] = useState<ClientProfile | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  useEscapeBack({ to: '/instructor' });

  // Fetch only MY linked students
  useEffect(() => {
    const fetchMyLinkedStudents = async () => {
      if (!effectiveInstructorId) return;
      
      setLoadingStudents(true);
      try {
        // Get only students linked to this instructor
        const { data: myLinks, error: linksError } = await supabase
          .from('instructor_clients')
          .select(`
            client_id,
            link_status,
            profiles:client_id (
              id,
              username,
              full_name,
              email,
              cpf,
              phone,
              birth_date,
              city,
              height_cm,
              weight_kg,
              fitness_goal,
              fitness_level,
              created_at,
              enrollment_status
            )
          `)
          .eq('instructor_id', effectiveInstructorId)
          .in('link_status', ['pending', 'accepted'])
          .eq('is_active', true);

        if (linksError) throw linksError;

        const students = myLinks?.map(link => ({
          ...(link.profiles as unknown as ClientProfile),
          link_status: link.link_status
        })).filter(s => s.id) || [];

        setMyLinkedStudents(students);
      } catch (err) {
        console.error('Error fetching my students:', err);
      } finally {
        setLoadingStudents(false);
      }
    };

    fetchMyLinkedStudents();
  }, [effectiveInstructorId]);

  const formatCpf = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  const handleSearch = async () => {
    let term = '';
    if (searchType === 'username') term = searchTerm.trim();
    else if (searchType === 'id') term = searchById.trim();
    else if (searchType === 'cpf') term = searchByCpf.trim();
    
    if (!term || !effectiveInstructorId) return;

    const isUuid = (value: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

    if (searchType === 'id' && !isUuid(term)) {
      setError('ID inválido. Cole o UUID completo do aluno (com hífens).');
      setFoundStudent(null);
      return;
    }

    setSearching(true);
    setError('');
    setFoundStudent(null);

    try {
      let studentData: ClientProfile | null = null;

      if (searchType === 'id') {
        const { data, error: studentError } = await supabase
          .from('profiles')
          .select('id, username, full_name, email, cpf')
          .eq('id', term)
          .maybeSingle();
        if (studentError) throw studentError;
        studentData = data;
        if (!studentData) {
          setError('Aluno não encontrado. Verifique o ID informado.');
          return;
        }
      } else if (searchType === 'cpf') {
        const { data, error: studentError } = await supabase
          .from('profiles')
          .select('id, username, full_name, email, cpf')
          .eq('cpf', term)
          .maybeSingle();
        if (studentError) throw studentError;
        studentData = data;
        if (!studentData) {
          setError('Aluno não encontrado. Verifique o CPF informado.');
          return;
        }
      } else {
        const { data, error: studentError } = await supabase
          .from('profiles')
          .select('id, username, full_name, email, cpf')
          .ilike('username', term)
          .maybeSingle();
        if (studentError) throw studentError;
        studentData = data;
        if (!studentData) {
          setError('Aluno não encontrado. Verifique o nome de usuário.');
          return;
        }
      }

      await checkAndSetStudent(studentData);
    } catch (err) {
      console.error('Search error:', err);
      setError('Erro ao buscar aluno.');
    } finally {
      setSearching(false);
    }
  };

  const checkAndSetStudent = async (studentData: ClientProfile) => {
    if (!effectiveInstructorId) return;

    const { data: myLinkData } = await supabase
      .from('instructor_clients')
      .select('id, link_status')
      .eq('instructor_id', effectiveInstructorId)
      .eq('client_id', studentData.id)
      .in('link_status', ['pending', 'accepted'])
      .maybeSingle();

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
  };

  const handleSelectFromList = async (client: ClientProfile) => {
    playClickSound();
    setSearchType('list');
    setError('');
    await checkAndSetStudent(client);
  };

  const handleLink = async () => {
    if (!foundStudent || !effectiveInstructorId) return;

    setLinking(true);
    try {
      const { error: linkError } = await supabase
        .from('instructor_clients')
        .insert({
          instructor_id: effectiveInstructorId,
          client_id: foundStudent.id,
          is_active: true,
          link_status: 'pending',
        });

      if (linkError) throw linkError;

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
      
      // Refresh linked students list
      setMyLinkedStudents(prev => [...prev, { ...foundStudent, link_status: 'pending' } as any]);
      setFoundStudent(null);
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

  const getStatusBadge = (student: any) => {
    const status = student.link_status;
    if (status === 'accepted') {
      return <span className="text-xs bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full">Vinculado</span>;
    }
    if (status === 'pending') {
      return <span className="text-xs bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-full">Pendente</span>;
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-2xl mx-auto"
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

        {/* Search/List Tabs */}
        <Tabs value={searchType} onValueChange={(v) => { setSearchType(v as typeof searchType); setFoundStudent(null); setError(''); }}>
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="list" className="gap-1 text-xs">
              <Users className="w-3 h-3" />
              Meus Alunos
            </TabsTrigger>
            <TabsTrigger value="username" className="gap-1 text-xs">
              <Search className="w-3 h-3" />
              Buscar
            </TabsTrigger>
            <TabsTrigger value="cpf" className="gap-1 text-xs">
              <CreditCard className="w-3 h-3" />
              CPF
            </TabsTrigger>
            <TabsTrigger value="id" className="gap-1 text-xs">
              <Hash className="w-3 h-3" />
              ID
            </TabsTrigger>
          </TabsList>
          
          {/* List of MY linked students only */}
          <TabsContent value="list" className="mt-0">
            <p className="text-sm text-muted-foreground mb-3">
              Seus alunos vinculados:
            </p>
            {loadingStudents ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-green-500" />
              </div>
            ) : myLinkedStudents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Você ainda não tem alunos vinculados.</p>
                <p className="text-sm mt-1">Use as abas acima para buscar e vincular novos alunos.</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px] rounded-lg border border-border/50">
                <div className="p-2 space-y-1">
                  {myLinkedStudents.map((student: any) => (
                    <div
                      key={student.id}
                      onClick={() => {
                        playClickSound();
                        setSelectedStudentProfile(student);
                        setProfileModalOpen(true);
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-lg bg-accent/30 text-left cursor-pointer hover:bg-accent/50 transition-colors"
                    >
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bebas text-green-500">
                          {(student.full_name || student.username).charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {student.full_name || student.username}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          @{student.username} {student.cpf && `• ${student.cpf}`}
                        </p>
                      </div>
                      <Eye className="w-4 h-4 text-muted-foreground" />
                      {getStatusBadge(student)}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

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
                {searching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="cpf" className="mt-0">
            <label className="text-sm text-muted-foreground mb-2 block">
              CPF do aluno
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="000.000.000-00"
                value={searchByCpf}
                onChange={(e) => setSearchByCpf(formatCpf(e.target.value))}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="bg-background/50 border-border/50"
                maxLength={14}
              />
              <Button
                onClick={handleSearch}
                disabled={searching || searchByCpf.length < 14}
                className="bg-green-500 hover:bg-green-600"
              >
                {searching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
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
                {searching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              O ID pode ser encontrado no QR Code do aluno.
            </p>
          </TabsContent>
        </Tabs>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-3 bg-destructive/20 border border-destructive/50 rounded-lg text-destructive mt-4"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </motion.div>
        )}

        {/* Found/Selected Student */}
        {foundStudent && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-background/50 rounded-lg border border-green-500/30 mt-4"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 flex items-center justify-center">
                <span className="text-xl font-bebas text-green-500">
                  {(foundStudent.full_name || foundStudent.username).charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate">
                  {foundStudent.full_name || foundStudent.username}
                </h3>
                <p className="text-xs text-muted-foreground">@{foundStudent.username}</p>
                {foundStudent.cpf && (
                  <p className="text-xs text-muted-foreground">CPF: {foundStudent.cpf}</p>
                )}
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
                <span className="text-sm">Este aluno já está vinculado a outro instrutor.</span>
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
      
      {/* Student Profile Modal */}
      <StudentProfileModal
        student={selectedStudentProfile}
        isOpen={profileModalOpen}
        onClose={() => {
          setProfileModalOpen(false);
          setSelectedStudentProfile(null);
        }}
      />
    </motion.div>
  );
};

export default LinkStudent;

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, User, CheckCircle, XCircle, Loader2, Home, IdCard, Calendar, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface StudentInfo {
  student_id: string;
  full_name: string;
  enrollment_status: string;
  enrollment_date: string | null;
  avatar_url: string | null;
}

const StudentLookup: React.FC = () => {
  const navigate = useNavigate();
  const [searchId, setSearchId] = useState('');
  const [loading, setLoading] = useState(false);
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!searchId.trim()) {
      setError('Digite o ID do aluno');
      return;
    }

    setLoading(true);
    setError('');
    setStudent(null);
    setSearched(true);

    try {
      // Usar função segura que retorna apenas dados básicos
      const { data, error: fetchError } = await supabase.rpc('get_student_basic_info', {
        p_student_id: searchId.toUpperCase().trim()
      });

      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        setStudent({
          ...data[0],
          enrollment_date: null // Não retornamos mais essa informação por segurança
        } as StudentInfo);
      } else {
        setError('Aluno não encontrado');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Erro ao buscar aluno');
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'active':
        return { label: 'ATIVO', color: 'text-green-500', bgColor: 'bg-green-500/20', icon: CheckCircle };
      case 'frozen':
        return { label: 'CONGELADO', color: 'text-blue-500', bgColor: 'bg-blue-500/20', icon: AlertTriangle };
      case 'cancelled':
        return { label: 'CANCELADO', color: 'text-red-500', bgColor: 'bg-red-500/20', icon: XCircle };
      default:
        return { label: 'INATIVO', color: 'text-muted-foreground', bgColor: 'bg-muted/20', icon: XCircle };
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-6"
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <IdCard className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bebas text-primary">CONSULTA DE ALUNO</h1>
          <p className="text-sm text-muted-foreground">
            Verifique o status de matrícula de um aluno
          </p>
        </div>

        {/* Search Form */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-md">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">ID do Aluno</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="ALU-XXXXXXXX"
                    value={searchId}
                    onChange={(e) => setSearchId(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-10 bg-background/50 uppercase"
                    maxLength={12}
                  />
                </div>
                <Button
                  onClick={handleSearch}
                  disabled={loading}
                  className="bg-primary hover:bg-primary/90"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Results */}
            {searched && !loading && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="pt-4"
              >
                {error ? (
                  <div className="text-center py-8 space-y-2">
                    <XCircle className="w-12 h-12 text-destructive mx-auto" />
                    <p className="text-destructive">{error}</p>
                  </div>
                ) : student && (
                  <div className="space-y-4">
                    {/* Student Card */}
                    <div className="bg-muted/30 rounded-xl p-4 space-y-4">
                      {/* Avatar & Name */}
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                          {student.avatar_url ? (
                            <img src={student.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-8 h-8 text-primary" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-lg">{student.full_name}</p>
                          <p className="text-sm text-muted-foreground font-mono">{student.student_id}</p>
                        </div>
                      </div>

                      {/* Status */}
                      {(() => {
                        const statusInfo = getStatusInfo(student.enrollment_status);
                        const StatusIcon = statusInfo.icon;
                        return (
                          <div className={`flex items-center justify-center gap-3 p-4 rounded-lg ${statusInfo.bgColor}`}>
                            <StatusIcon className={`w-8 h-8 ${statusInfo.color}`} />
                            <span className={`text-2xl font-bebas ${statusInfo.color}`}>
                              {statusInfo.label}
                            </span>
                          </div>
                        );
                      })()}

                      {/* Enrollment Date */}
                      {student.enrollment_date && (
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>
                            Matriculado em {format(new Date(student.enrollment_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </CardContent>
        </Card>

        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="w-full text-muted-foreground"
        >
          <Home className="w-4 h-4 mr-2" />
          Voltar ao Início
        </Button>
      </motion.div>
    </div>
  );
};

export default StudentLookup;

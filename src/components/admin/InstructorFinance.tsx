import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Users, DollarSign, Loader2, Search, 
  TrendingUp, ChevronDown, ChevronUp, User
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAudio } from '@/contexts/AudioContext';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface InstructorFinance {
  id: string;
  full_name: string;
  username: string;
  cref: string | null;
  clientCount: number;
  totalReceived: number;
  totalPending: number;
  payments: {
    client_name: string;
    amount: number;
    status: string;
    paid_at: string | null;
  }[];
}

const InstructorFinance: React.FC = () => {
  const navigate = useNavigate();
  const { playClickSound } = useAudio();
  const { role } = useAuth();
  const [instructors, setInstructors] = useState<InstructorFinance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedInstructor, setExpandedInstructor] = useState<string | null>(null);

  const isMaster = role === 'master';

  useEffect(() => {
    loadInstructorFinance();
  }, []);

  const loadInstructorFinance = async () => {
    setLoading(true);
    try {
      // Get all instructors (profiles with CREF)
      const { data: instructorProfiles, error: instructorError } = await supabase
        .from('profiles')
        .select('id, full_name, username, cref')
        .not('cref', 'is', null);

      if (instructorError) throw instructorError;

      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      const instructorFinanceData: InstructorFinance[] = [];

      for (const instructor of instructorProfiles || []) {
        // Get linked clients count
        const { count: clientCount } = await supabase
          .from('instructor_clients')
          .select('id', { count: 'exact', head: true })
          .eq('instructor_id', instructor.id)
          .eq('is_active', true);

        // Get payments for this instructor's clients
        const { data: payments } = await supabase
          .from('payments')
          .select(`
            amount, status, paid_at,
            profiles!payments_client_id_fkey (full_name)
          `)
          .eq('instructor_id', instructor.id)
          .gte('created_at', monthStart.toISOString())
          .lte('created_at', monthEnd.toISOString());

        const totalReceived = (payments || [])
          .filter((p: any) => p.status === 'paid')
          .reduce((sum: number, p: any) => sum + p.amount, 0);

        const totalPending = (payments || [])
          .filter((p: any) => p.status === 'pending')
          .reduce((sum: number, p: any) => sum + p.amount, 0);

        const paymentDetails = (payments || []).map((p: any) => ({
          client_name: p.profiles?.full_name || 'Cliente',
          amount: p.amount,
          status: p.status,
          paid_at: p.paid_at,
        }));

        instructorFinanceData.push({
          id: instructor.id,
          full_name: instructor.full_name || instructor.username,
          username: instructor.username,
          cref: instructor.cref,
          clientCount: clientCount || 0,
          totalReceived,
          totalPending,
          payments: paymentDetails,
        });
      }

      // Sort by total received (descending)
      instructorFinanceData.sort((a, b) => b.totalReceived - a.totalReceived);

      setInstructors(instructorFinanceData);
    } catch (err) {
      console.error('Error loading instructor finance:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredInstructors = instructors.filter(
    (instructor) =>
      instructor.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      instructor.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      instructor.cref?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalReceived = instructors.reduce((sum, i) => sum + i.totalReceived, 0);
  const totalPending = instructors.reduce((sum, i) => sum + i.totalPending, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { playClickSound(); navigate('/admin'); }}
            className="text-sm text-muted-foreground hover:text-blue-500 transition-colors"
          >
            ← Voltar
          </button>
          <h2 className="text-xl sm:text-2xl font-bebas text-blue-500 flex items-center gap-2">
            <TrendingUp className="w-6 h-6" />
            FINANCEIRO POR INSTRUTOR
          </h2>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar instrutor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-background/50 border-border/50 w-full sm:w-64"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Instrutores</p>
              <p className="text-lg font-bebas">{instructors.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Recebido (Mês)</p>
              <p className="text-lg font-bebas text-green-500">R$ {totalReceived.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Pendente</p>
              <p className="text-lg font-bebas text-yellow-500">R$ {totalPending.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Geral</p>
              <p className="text-lg font-bebas text-emerald-500">R$ {(totalReceived + totalPending).toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Instructor List */}
      {filteredInstructors.length === 0 ? (
        <div className="bg-card/80 backdrop-blur-md rounded-xl p-8 border border-border/50 text-center">
          <Users className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">Nenhum instrutor encontrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredInstructors.map((instructor, index) => (
            <motion.div
              key={instructor.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-card/80 backdrop-blur-md rounded-xl border border-border/50 overflow-hidden"
            >
              <div
                className="p-4 cursor-pointer hover:bg-background/30 transition-colors"
                onClick={() => {
                  playClickSound();
                  setExpandedInstructor(
                    expandedInstructor === instructor.id ? null : instructor.id
                  );
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500/20 to-emerald-500/20 border border-blue-500/30 flex items-center justify-center">
                      <User className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{instructor.full_name}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>@{instructor.username}</span>
                        {instructor.cref && (
                          <span className="px-2 py-0.5 bg-green-500/20 text-green-500 rounded text-xs">
                            CREF: {instructor.cref}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-center hidden sm:block">
                      <p className="text-xs text-muted-foreground">Alunos</p>
                      <p className="font-bebas text-lg">{instructor.clientCount}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Recebido</p>
                      <p className="font-bebas text-lg text-green-500">
                        R$ {instructor.totalReceived.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-center hidden sm:block">
                      <p className="text-xs text-muted-foreground">Pendente</p>
                      <p className="font-bebas text-lg text-yellow-500">
                        R$ {instructor.totalPending.toFixed(2)}
                      </p>
                    </div>
                    {expandedInstructor === instructor.id ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedInstructor === instructor.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="border-t border-border/50 bg-background/30"
                >
                  <div className="p-4">
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-green-500" />
                      Pagamentos dos Alunos (Mês Atual)
                    </h4>
                    {instructor.payments.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhum pagamento registrado este mês
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {instructor.payments.map((payment, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-3 bg-background/50 rounded-lg"
                          >
                            <div>
                              <p className="font-medium text-sm">{payment.client_name}</p>
                              {payment.paid_at && (
                                <p className="text-xs text-muted-foreground">
                                  Pago em {format(new Date(payment.paid_at), 'dd/MM/yyyy', { locale: ptBR })}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-bebas text-lg">
                                R$ {payment.amount.toFixed(2)}
                              </span>
                              <span
                                className={`px-2 py-1 text-xs rounded-full ${
                                  payment.status === 'paid'
                                    ? 'bg-green-500/20 text-green-500'
                                    : 'bg-yellow-500/20 text-yellow-500'
                                }`}
                              >
                                {payment.status === 'paid' ? 'Pago' : 'Pendente'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default InstructorFinance;
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Users, DollarSign, Loader2, Search, 
  TrendingUp, ChevronDown, ChevronUp, User,
  MessageCircle, Calendar, CreditCard, Banknote, Smartphone
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAudio } from '@/contexts/AudioContext';
import { useAuth } from '@/contexts/AuthContext';
import { useEscapeBack } from '@/hooks/useEscapeBack';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/printUtils';

interface InstructorFinanceData {
  id: string;
  full_name: string;
  username: string;
  cref: string | null;
  phone: string | null;
  clientCount: number;
  totalReceived: number;
  totalPending: number;
  payments: {
    client_name: string;
    amount: number;
    status: string;
    paid_at: string | null;
    payment_method: string | null;
    description: string | null;
  }[];
}

const InstructorFinance: React.FC = () => {
  const navigate = useNavigate();
  const { playClickSound } = useAudio();
  const { role } = useAuth();
  const [instructors, setInstructors] = useState<InstructorFinanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedInstructor, setExpandedInstructor] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('1');

  useEscapeBack({ to: '/admin' });

  const isMaster = role === 'master';

  useEffect(() => {
    loadInstructorFinance();
  }, [selectedPeriod]);

  const loadInstructorFinance = async () => {
    setLoading(true);
    try {
      const { data: instructorProfiles, error: instructorError } = await supabase
        .from('profiles')
        .select('id, full_name, username, cref, phone')
        .not('cref', 'is', null);

      if (instructorError) throw instructorError;

      const months = parseInt(selectedPeriod);
      const monthStart = startOfMonth(subMonths(new Date(), months - 1));
      const monthEnd = endOfMonth(new Date());

      const instructorFinanceData: InstructorFinanceData[] = [];

      for (const instructor of instructorProfiles || []) {
        const { count: clientCount } = await supabase
          .from('instructor_clients')
          .select('id', { count: 'exact', head: true })
          .eq('instructor_id', instructor.id)
          .eq('is_active', true);

        const { data: payments } = await supabase
          .from('payments')
          .select(`
            amount, status, paid_at, payment_method, description,
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
          payment_method: p.payment_method,
          description: p.description,
        }));

        instructorFinanceData.push({
          id: instructor.id,
          full_name: instructor.full_name || instructor.username,
          username: instructor.username,
          cref: instructor.cref,
          phone: instructor.phone,
          clientCount: clientCount || 0,
          totalReceived,
          totalPending,
          payments: paymentDetails,
        });
      }

      instructorFinanceData.sort((a, b) => b.totalReceived - a.totalReceived);

      setInstructors(instructorFinanceData);
    } catch (err) {
      console.error('Error loading instructor finance:', err);
      toast.error('Erro ao carregar dados financeiros');
    } finally {
      setLoading(false);
    }
  };

  const sendWhatsAppMessage = (phone: string | null, instructorName: string, totalReceived: number, totalPending: number) => {
    if (!phone) {
      toast.error('Instrutor sem telefone cadastrado');
      return;
    }
    
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    
    const message = encodeURIComponent(
      `Olá ${instructorName}! 👋\n\n` +
      `📊 *Resumo Financeiro*\n\n` +
      `✅ Total Recebido: ${formatCurrency(totalReceived)}\n` +
      `⏳ Pendente: ${formatCurrency(totalPending)}\n` +
      `💰 Total: ${formatCurrency(totalReceived + totalPending)}\n\n` +
      `Qualquer dúvida, entre em contato! 🏋️`
    );
    
    window.open(`https://wa.me/${formattedPhone}?text=${message}`, '_blank');
    toast.success('WhatsApp aberto!');
  };

  const getMethodIcon = (method: string | null) => {
    switch (method) {
      case 'pix': return <Smartphone size={14} className="text-green-500" />;
      case 'card': return <CreditCard size={14} className="text-blue-500" />;
      default: return <Banknote size={14} className="text-emerald-500" />;
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
        <div className="flex items-center gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32 bg-background/50">
              <Calendar size={14} className="mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Este mês</SelectItem>
              <SelectItem value="3">3 meses</SelectItem>
              <SelectItem value="6">6 meses</SelectItem>
              <SelectItem value="12">12 meses</SelectItem>
            </SelectContent>
          </Select>
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
              <p className="text-xs text-muted-foreground">Total Recebido</p>
              <p className="text-lg font-bebas text-green-500">{formatCurrency(totalReceived)}</p>
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
              <p className="text-lg font-bebas text-yellow-500">{formatCurrency(totalPending)}</p>
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
              <p className="text-lg font-bebas text-emerald-500">{formatCurrency(totalReceived + totalPending)}</p>
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

                  <div className="flex items-center gap-4">
                    <div className="text-center hidden sm:block">
                      <p className="text-xs text-muted-foreground">Alunos</p>
                      <p className="font-bebas text-lg">{instructor.clientCount}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Recebido</p>
                      <p className="font-bebas text-lg text-green-500">
                        {formatCurrency(instructor.totalReceived)}
                      </p>
                    </div>
                    <div className="text-center hidden sm:block">
                      <p className="text-xs text-muted-foreground">Pendente</p>
                      <p className="font-bebas text-lg text-yellow-500">
                        {formatCurrency(instructor.totalPending)}
                      </p>
                    </div>
                    {instructor.phone && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-green-500 hover:bg-green-500/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          sendWhatsAppMessage(
                            instructor.phone, 
                            instructor.full_name, 
                            instructor.totalReceived, 
                            instructor.totalPending
                          );
                        }}
                      >
                        <MessageCircle size={18} />
                      </Button>
                    )}
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
                      Pagamentos Recebidos (Período Selecionado)
                    </h4>
                    {instructor.payments.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhum pagamento registrado no período
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {instructor.payments.map((payment, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-3 bg-background/50 rounded-lg"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm">{payment.client_name}</p>
                                {payment.description && (
                                  <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                                    {payment.description}
                                  </span>
                                )}
                              </div>
                              {payment.paid_at && (
                                <p className="text-xs text-muted-foreground">
                                  Pago em {format(new Date(payment.paid_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              {payment.payment_method && getMethodIcon(payment.payment_method)}
                              <span className="font-bebas text-lg">
                                {formatCurrency(payment.amount)}
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

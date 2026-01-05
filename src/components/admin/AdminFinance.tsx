import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { CreditCard, DollarSign, TrendingUp, Users, Loader2, CheckCircle, Clock, XCircle, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAudio } from '@/contexts/AudioContext';
import { useAuth } from '@/contexts/AuthContext';
import { useEscapeBack } from '@/hooks/useEscapeBack';
import { format, startOfMonth, endOfMonth } from 'date-fns';

interface PaymentStats {
  total: number;
  paid: number;
  pending: number;
  overdue: number;
  clientCount: number;
  instructorCount: number;
}

interface Payment {
  id: string;
  amount: number;
  status: string | null;
  due_date: string | null;
  paid_at: string | null;
  description: string | null;
  client?: { full_name: string; username: string };
}

const AdminFinance: React.FC = () => {
  const navigate = useNavigate();
  const { playClickSound } = useAudio();
  const { role, profile: currentProfile } = useAuth();
  const [stats, setStats] = useState<PaymentStats>({ total: 0, paid: 0, pending: 0, overdue: 0, clientCount: 0, instructorCount: 0 });
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  // ESC para voltar ao menu admin
  useEscapeBack({ to: '/admin' });

  const isMaster = role === 'master';

  useEffect(() => {
    if (currentProfile?.profile_id) {
      loadData();
    }
  }, [currentProfile?.profile_id, isMaster]);

  const loadData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      // Get profiles created by this admin (if not master)
      let myProfileIds: string[] = [];
      if (!isMaster && currentProfile?.profile_id) {
        const { data: myProfiles } = await supabase
          .from('profiles')
          .select('id')
          .eq('created_by_admin', currentProfile.profile_id);
        
        myProfileIds = (myProfiles || []).map(p => p.id);
      }

      // Get payments
      let paymentsQuery = supabase
        .from('payments')
        .select(`
          id, amount, status, due_date, paid_at, description, client_id,
          profiles!payments_client_id_fkey (full_name, username)
        `)
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString())
        .order('created_at', { ascending: false });

      // Se não for master, filtra apenas pagamentos de clientes cadastrados por ele
      if (!isMaster && myProfileIds.length > 0) {
        paymentsQuery = paymentsQuery.in('client_id', myProfileIds);
      } else if (!isMaster && myProfileIds.length === 0) {
        // Gerente sem cadastros - não mostra nada
        setRecentPayments([]);
        setStats({ total: 0, paid: 0, pending: 0, overdue: 0, clientCount: 0, instructorCount: 0 });
        setLoading(false);
        return;
      }

      const { data: payments } = await paymentsQuery;

      // Deduplicate payments by client_id + description + amount + date (same day)
      const seenPayments = new Set<string>();
      const uniquePayments = (payments || []).filter((p: any) => {
        const dateKey = p.paid_at ? p.paid_at.split('T')[0] : (p.due_date || p.created_at?.split('T')[0]);
        const key = `${p.client_id}-${p.description}-${p.amount}-${dateKey}`;
        if (seenPayments.has(key)) return false;
        seenPayments.add(key);
        return true;
      });

      const paymentsWithClients = uniquePayments.map((p: any) => ({
        ...p,
        client: p.profiles ? { full_name: p.profiles.full_name, username: p.profiles.username } : undefined,
      }));

      setRecentPayments(paymentsWithClients.slice(0, 10));

      // Calculate stats using unique payments
      const total = paymentsWithClients.filter((p: any) => p.status !== 'cancelled').reduce((sum: number, p: any) => sum + p.amount, 0);
      const paid = paymentsWithClients.filter((p: any) => p.status === 'paid').reduce((sum: number, p: any) => sum + p.amount, 0);
      const pending = paymentsWithClients.filter((p: any) => p.status === 'pending').reduce((sum: number, p: any) => sum + p.amount, 0);
      const overdue = paymentsWithClients
        .filter((p: any) => p.status === 'pending' && p.due_date && new Date(p.due_date) < now)
        .reduce((sum: number, p: any) => sum + p.amount, 0);

      // Get user counts (filtered by created_by_admin if not master)
      let clientQuery = supabase.from('profiles').select('id', { count: 'exact', head: true }).is('cref', null);
      let instructorQuery = supabase.from('profiles').select('id', { count: 'exact', head: true }).not('cref', 'is', null);

      if (!isMaster && currentProfile?.profile_id) {
        clientQuery = clientQuery.eq('created_by_admin', currentProfile.profile_id);
        instructorQuery = instructorQuery.eq('created_by_admin', currentProfile.profile_id);
      }

      const { count: clientCount } = await clientQuery;
      const { count: instructorCount } = await instructorQuery;

      setStats({ total, paid, pending, overdue, clientCount: clientCount || 0, instructorCount: instructorCount || 0 });
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'paid':
        return <span className="px-2 py-1 text-xs rounded-full bg-emerald-500/20 text-emerald-500">Pago</span>;
      case 'cancelled':
        return <span className="px-2 py-1 text-xs rounded-full bg-destructive/20 text-destructive">Cancelado</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-500">Pendente</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => { playClickSound(); navigate('/admin'); }}
          className="text-sm text-muted-foreground hover:text-blue-500 transition-colors"
        >
          ← Voltar
        </button>
        <h2 className="text-xl sm:text-2xl font-bebas text-emerald-500 flex items-center gap-2">
          <CreditCard className="w-6 h-6" />
          {isMaster ? 'FINANCEIRO GLOBAL' : 'MEU FINANCEIRO'}
        </h2>
      </div>

      {!isMaster && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 flex items-center gap-2 text-sm text-emerald-400">
          <Shield className="w-4 h-4" />
          <span>Exibindo dados financeiros apenas dos seus cadastros. Acesse o Painel Master para ver o financeiro global.</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Mês</p>
              <p className="text-lg font-bebas text-emerald-500">R$ {stats.total.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Recebido</p>
              <p className="text-lg font-bebas text-green-500">R$ {stats.paid.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pendente</p>
              <p className="text-lg font-bebas text-yellow-500">R$ {stats.pending.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-destructive/20 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Em Atraso</p>
              <p className="text-lg font-bebas text-destructive">R$ {stats.overdue.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* User Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{isMaster ? 'Total Clientes' : 'Meus Clientes'}</p>
              <p className="text-lg font-bebas">{stats.clientCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{isMaster ? 'Total Instrutores' : 'Meus Instrutores'}</p>
              <p className="text-lg font-bebas">{stats.instructorCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Payments */}
      <div className="bg-card/80 backdrop-blur-md rounded-xl border border-border/50 overflow-hidden">
        <div className="p-4 border-b border-border/50">
          <h3 className="font-bebas text-lg">PAGAMENTOS RECENTES</h3>
        </div>
        <div className="divide-y divide-border/50">
          {recentPayments.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {isMaster ? 'Nenhum pagamento este mês' : 'Nenhum pagamento dos seus cadastros este mês'}
            </div>
          ) : (
            recentPayments.map((payment) => (
              <div key={payment.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{payment.client?.full_name || 'Cliente'}</p>
                  <p className="text-sm text-muted-foreground">{payment.description || 'Mensalidade'}</p>
                </div>
                <div className="text-right">
                  <p className="font-bebas text-lg">R$ {payment.amount.toFixed(2)}</p>
                  {getStatusBadge(payment.status)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default AdminFinance;

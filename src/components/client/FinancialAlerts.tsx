import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CreditCard, Calendar, X, DollarSign, Clock, Ban } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, differenceInDays, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Payment {
  id: string;
  amount: number;
  due_date: string | null;
  status: string | null;
  description: string | null;
  installment_number: number | null;
  total_installments: number | null;
  late_fee: number | null;
}

const FinancialAlerts: React.FC = () => {
  const { profile } = useAuth();
  const [overduePayments, setOverduePayments] = useState<Payment[]>([]);
  const [upcomingPayments, setUpcomingPayments] = useState<Payment[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.profile_id) {
      loadPayments();
    }
  }, [profile?.profile_id]);

  const loadPayments = async () => {
    if (!profile?.profile_id) return;

    try {
      const today = new Date().toISOString().split('T')[0];

      // Fetch overdue payments
      const { data: overdue } = await supabase
        .from('payments')
        .select('*')
        .eq('client_id', profile.profile_id)
        .eq('status', 'pending')
        .lt('due_date', today)
        .order('due_date', { ascending: true });

      // Fetch upcoming payments (next 7 days)
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      const { data: upcoming } = await supabase
        .from('payments')
        .select('*')
        .eq('client_id', profile.profile_id)
        .eq('status', 'pending')
        .gte('due_date', today)
        .lte('due_date', nextWeek.toISOString().split('T')[0])
        .order('due_date', { ascending: true });

      setOverduePayments(overdue || []);
      setUpcomingPayments(upcoming || []);
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysOverdue = (dueDate: string) => {
    return differenceInDays(new Date(), new Date(dueDate));
  };

  const getDaysUntilDue = (dueDate: string) => {
    return differenceInDays(new Date(dueDate), new Date());
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const totalOverdue = overduePayments.reduce((sum, p) => sum + Number(p.amount) + Number(p.late_fee || 0), 0);
  const hasAlerts = overduePayments.length > 0 || upcomingPayments.length > 0;

  if (loading || !hasAlerts) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="mb-4"
      >
        {/* Overdue Payments Alert - Critical */}
        {overduePayments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-3 p-4 rounded-xl bg-red-500/10 border-2 border-red-500/30 backdrop-blur-sm"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-red-500/20">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-red-500 flex items-center gap-2">
                    <Ban className="w-4 h-4" />
                    Pagamento em Atraso!
                  </h3>
                  <Badge variant="destructive" className="animate-pulse">
                    {overduePayments.length} {overduePayments.length === 1 ? 'pendência' : 'pendências'}
                  </Badge>
                </div>
                
                <div className="mt-3 space-y-2">
                  {overduePayments.map((payment) => (
                    <motion.div
                      key={payment.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-3 rounded-lg bg-red-500/10 border border-red-500/20"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-red-400" />
                          <span className="font-medium text-sm">
                            {payment.description || 'Mensalidade'}
                            {payment.total_installments && payment.total_installments > 1 && (
                              <span className="text-red-400 ml-1">
                                ({payment.installment_number}/{payment.total_installments})
                              </span>
                            )}
                          </span>
                        </div>
                        <span className="font-bold text-red-500">
                          {formatCurrency(Number(payment.amount) + Number(payment.late_fee || 0))}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-red-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Venceu: {payment.due_date && format(new Date(payment.due_date), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                        <span className="flex items-center gap-1 font-bold">
                          <Clock className="w-3 h-3" />
                          {payment.due_date && getDaysOverdue(payment.due_date)} dias em atraso
                        </span>
                        {payment.late_fee && Number(payment.late_fee) > 0 && (
                          <span className="text-red-500">
                            +{formatCurrency(Number(payment.late_fee))} multa
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-3 pt-3 border-t border-red-500/20 flex items-center justify-between">
                  <span className="text-sm text-red-400">Total em atraso:</span>
                  <span className="font-bold text-lg text-red-500">{formatCurrency(totalOverdue)}</span>
                </div>

                <p className="mt-3 text-xs text-red-400/80">
                  ⚠️ Entre em contato com seu instrutor ou a administração para regularizar sua situação.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Upcoming Payments - Warning */}
        {upcomingPayments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 backdrop-blur-sm"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-yellow-500/20">
                <DollarSign className="w-5 h-5 text-yellow-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-yellow-500">Pagamentos Próximos</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-yellow-500 hover:text-yellow-400 h-6 px-2"
                  >
                    {isExpanded ? 'Ocultar' : 'Ver'}
                  </Button>
                </div>
                
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-3 space-y-2 overflow-hidden"
                    >
                      {upcomingPayments.map((payment) => (
                        <div
                          key={payment.id}
                          className="p-2 rounded-lg bg-yellow-500/10 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-yellow-400" />
                            <span className="text-sm">
                              {payment.description || 'Mensalidade'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-yellow-400">
                              {payment.due_date && getDaysUntilDue(payment.due_date) === 0 
                                ? 'Vence hoje!' 
                                : `Vence em ${payment.due_date && getDaysUntilDue(payment.due_date)} dias`}
                            </span>
                            <span className="font-semibold text-yellow-500">
                              {formatCurrency(Number(payment.amount))}
                            </span>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default FinancialAlerts;
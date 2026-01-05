import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Search, Send, Loader2, Phone, Mail, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAudio } from '@/contexts/AudioContext';
import { useEscapeBack } from '@/hooks/useEscapeBack';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { format, parseISO, differenceInDays } from 'date-fns';

interface Defaulter {
  id: string;
  client_id: string;
  amount: number;
  due_date: string;
  description: string | null;
  days_overdue: number;
  client: {
    full_name: string;
    username: string;
    phone: string | null;
    email: string | null;
  };
}

const Defaulters: React.FC = () => {
  const navigate = useNavigate();
  const { playClickSound } = useAudio();
  const [defaulters, setDefaulters] = useState<Defaulter[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sendingAlert, setSendingAlert] = useState<string | null>(null);

  // ESC para voltar ao menu admin
  useEscapeBack({ to: '/admin' });

  useEffect(() => {
    loadDefaulters();
  }, []);

  const loadDefaulters = async () => {
    setLoading(true);
    try {
      const now = new Date();
      
      const { data, error } = await supabase
        .from('payments')
        .select(`
          id, client_id, amount, due_date, description,
          profiles!payments_client_id_fkey (full_name, username, phone, email)
        `)
        .eq('status', 'pending')
        .lt('due_date', now.toISOString())
        .order('due_date');

      if (error) throw error;

      const defaultersList = (data || []).map((p: any) => ({
        id: p.id,
        client_id: p.client_id,
        amount: p.amount,
        due_date: p.due_date,
        description: p.description,
        days_overdue: differenceInDays(now, parseISO(p.due_date)),
        client: {
          full_name: p.profiles?.full_name || p.profiles?.username || 'Desconhecido',
          username: p.profiles?.username || '',
          phone: p.profiles?.phone,
          email: p.profiles?.email,
        },
      }));

      setDefaulters(defaultersList);
    } catch (err) {
      console.error('Error:', err);
      toast.error('Erro ao carregar inadimplentes');
    } finally {
      setLoading(false);
    }
  };

  const sendAlert = async (defaulter: Defaulter) => {
    playClickSound();
    setSendingAlert(defaulter.id);
    
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          profile_id: defaulter.client_id,
          title: 'Pagamento em Atraso',
          message: `Seu pagamento de R$ ${defaulter.amount.toFixed(2)} está em atraso há ${defaulter.days_overdue} dias. Por favor, regularize sua situação.`,
          type: 'payment_overdue',
        });

      if (error) throw error;
      toast.success('Alerta enviado para o cliente!');
    } catch (err) {
      toast.error('Erro ao enviar alerta');
    } finally {
      setSendingAlert(null);
    }
  };

  const filteredDefaulters = defaulters.filter(d =>
    d.client.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.client.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalOverdue = defaulters.reduce((sum, d) => sum + d.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
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
          <h2 className="text-xl sm:text-2xl font-bebas text-red-500 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6" />
            INADIMPLENTES ({defaulters.length})
          </h2>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-background/50 w-full sm:w-64"
          />
        </div>
      </div>

      {/* Total */}
      <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Total em Atraso:</span>
          <span className="text-2xl font-bebas text-destructive">R$ {totalOverdue.toFixed(2)}</span>
        </div>
      </div>

      {/* List */}
      {filteredDefaulters.length === 0 ? (
        <div className="bg-card/80 backdrop-blur-md rounded-xl p-8 border border-border/50 text-center">
          <AlertTriangle className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">
            {searchTerm ? 'Nenhum inadimplente encontrado.' : 'Nenhum pagamento em atraso. 🎉'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDefaulters.map((defaulter, index) => (
            <motion.div
              key={defaulter.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-destructive/30"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold">{defaulter.client.full_name}</h3>
                  <p className="text-sm text-muted-foreground">@{defaulter.client.username}</p>
                  <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                    {defaulter.client.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {defaulter.client.phone}
                      </span>
                    )}
                    {defaulter.client.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {defaulter.client.email}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bebas text-destructive">R$ {defaulter.amount.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">
                    Venceu em {format(parseISO(defaulter.due_date), 'dd/MM/yyyy')}
                  </p>
                  <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-destructive/20 text-destructive">
                    {defaulter.days_overdue} dias em atraso
                  </span>
                </div>
                <div className="flex gap-2">
                  {defaulter.client.phone && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const phone = defaulter.client.phone?.replace(/\D/g, '') || '';
                        const message = encodeURIComponent(
                          `Olá ${defaulter.client.full_name}! 🏋️\n\n` +
                          `Verificamos que seu pagamento de R$ ${defaulter.amount.toFixed(2)} ` +
                          `venceu em ${format(parseISO(defaulter.due_date), 'dd/MM/yyyy')} ` +
                          `e está há ${defaulter.days_overdue} dias em atraso.\n\n` +
                          `Por favor, regularize sua situação para continuar aproveitando nossos serviços.\n\n` +
                          `Qualquer dúvida, estamos à disposição! 💪`
                        );
                        window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
                        toast.success('WhatsApp aberto!');
                      }}
                      className="border-green-500/50 text-green-500 hover:bg-green-500/10"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => sendAlert(defaulter)}
                    disabled={sendingAlert === defaulter.id}
                    className="border-destructive/50 text-destructive hover:bg-destructive/10"
                  >
                    {sendingAlert === defaulter.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-1" />
                        Alertar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default Defaulters;

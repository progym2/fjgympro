import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, User, Calendar, Clock, UserMinus, UserPlus, Check, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ClientPageHeader from './ClientPageHeader';

interface LinkHistoryItem {
  id: string;
  instructor_id: string;
  link_status: string;
  linked_at: string | null;
  responded_at: string | null;
  unlinked_at: string | null;
  instructor: {
    username: string;
    full_name: string | null;
    cref: string | null;
    avatar_url: string | null;
  } | null;
}

const LinkHistory: React.FC = () => {
  const { profile } = useAuth();
  const [history, setHistory] = useState<LinkHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [profile?.profile_id]);

  const fetchHistory = async () => {
    if (!profile?.profile_id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('instructor_clients')
        .select(`
          id,
          instructor_id,
          link_status,
          linked_at,
          responded_at,
          unlinked_at,
          instructor:profiles!instructor_clients_instructor_id_fkey(
            username,
            full_name,
            cref,
            avatar_url
          )
        `)
        .eq('client_id', profile.profile_id)
        .order('linked_at', { ascending: false });

      if (error) throw error;
      
      // Transform data
      const transformed = (data || []).map((item: any) => ({
        ...item,
        instructor: item.instructor || null
      }));
      
      setHistory(transformed);
    } catch (err) {
      console.error('Error fetching link history:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Ativo</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">Pendente</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">Rejeitado</Badge>;
      case 'unlinked':
        return <Badge className="bg-muted text-muted-foreground border-border">Desvinculado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'rejected':
        return <X className="h-4 w-4 text-red-500" />;
      case 'unlinked':
        return <UserMinus className="h-4 w-4 text-muted-foreground" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const getTimeAgo = (dateString: string | null) => {
    if (!dateString) return '';
    return formatDistanceToNow(new Date(dateString), { locale: ptBR, addSuffix: true });
  };

  // Summary stats
  const totalLinks = history.length;
  const activeLinks = history.filter(h => h.link_status === 'accepted').length;
  const pendingLinks = history.filter(h => h.link_status === 'pending').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-full min-h-0"
    >
      <ClientPageHeader 
        title="HISTÓRICO DE VÍNCULOS"
        icon={<History className="w-6 h-6" />}
        iconColor="text-blue-500"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-card/80 backdrop-blur-md rounded-xl p-3 border border-border/50 text-center">
          <p className="text-2xl font-bold text-foreground">{totalLinks}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="bg-green-500/10 rounded-xl p-3 border border-green-500/30 text-center">
          <p className="text-2xl font-bold text-green-500">{activeLinks}</p>
          <p className="text-xs text-green-500/70">Ativos</p>
        </div>
        <div className="bg-yellow-500/10 rounded-xl p-3 border border-yellow-500/30 text-center">
          <p className="text-2xl font-bold text-yellow-500">{pendingLinks}</p>
          <p className="text-xs text-yellow-500/70">Pendentes</p>
        </div>
      </div>

      {/* History List */}
      <ScrollArea className="flex-1">
        <div className="space-y-3 pb-4">
          {history.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Nenhum histórico de vínculo encontrado.</p>
              <p className="text-sm">Aguarde um instrutor enviar uma solicitação.</p>
            </div>
          ) : (
            <AnimatePresence>
              {history.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50"
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-primary/20 border-2 border-primary/30 flex items-center justify-center flex-shrink-0">
                      {item.instructor?.avatar_url ? (
                        <img
                          src={item.instructor.avatar_url}
                          alt="Avatar"
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-6 w-6 text-primary" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-foreground truncate">
                          {item.instructor?.full_name || item.instructor?.username || 'Instrutor Removido'}
                        </p>
                        {getStatusBadge(item.link_status)}
                      </div>

                      {item.instructor && (
                        <p className="text-xs text-muted-foreground mb-2">
                          @{item.instructor.username}
                          {item.instructor.cref && ` • CREF: ${item.instructor.cref}`}
                        </p>
                      )}

                      {/* Timeline */}
                      <div className="space-y-1 text-xs">
                        {item.linked_at && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <UserPlus className="h-3 w-3 text-blue-400" />
                            <span>Solicitação: {formatDate(item.linked_at)}</span>
                            <span className="text-muted-foreground/60">({getTimeAgo(item.linked_at)})</span>
                          </div>
                        )}

                        {item.responded_at && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            {getStatusIcon(item.link_status)}
                            <span>
                              {item.link_status === 'accepted' ? 'Aceito' : 'Rejeitado'}: {formatDate(item.responded_at)}
                            </span>
                          </div>
                        )}

                        {item.unlinked_at && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <UserMinus className="h-3 w-3 text-orange-400" />
                            <span>Desvinculado: {formatDate(item.unlinked_at)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </ScrollArea>
    </motion.div>
  );
};

export default LinkHistory;

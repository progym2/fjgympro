import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  History, ArrowLeft, UserPlus, UserMinus, 
  Calendar, Clock, User, Filter, Search
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAudio } from '@/contexts/AudioContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LinkHistoryItem {
  id: string;
  client_id: string;
  is_active: boolean;
  linked_at: string | null;
  unlinked_at: string | null;
  client: {
    id: string;
    username: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
}

const LinkHistory: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { playClickSound } = useAudio();
  
  const [history, setHistory] = useState<LinkHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    if (profile?.profile_id) {
      fetchHistory();
    }
  }, [profile?.profile_id]);

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('instructor_clients')
        .select(`
          id,
          client_id,
          is_active,
          linked_at,
          unlinked_at,
          client:profiles!instructor_clients_client_id_fkey (
            id,
            username,
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('instructor_id', profile?.profile_id)
        .order('linked_at', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error fetching link history:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = history.filter(item => {
    const matchesSearch = !searchTerm || 
      item.client?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.client?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.client?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || 
      (filterStatus === 'active' && item.is_active) ||
      (filterStatus === 'inactive' && !item.is_active);

    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (item: LinkHistoryItem) => {
    if (item.is_active) {
      return (
        <Badge className="bg-green-500/20 text-green-500">
          <UserPlus className="w-3 h-3 mr-1" />
          Vinculado
        </Badge>
      );
    }
    return (
      <Badge className="bg-red-500/20 text-red-500">
        <UserMinus className="w-3 h-3 mr-1" />
        Desvinculado
      </Badge>
    );
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Data não disponível';
    return format(new Date(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const getTimeAgo = (dateStr: string | null) => {
    if (!dateStr) return '';
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ptBR });
  };

  // Stats
  const totalActive = history.filter(h => h.is_active).length;
  const totalInactive = history.filter(h => !h.is_active).length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => { playClickSound(); navigate('/instructor'); }}
          className="text-sm text-muted-foreground hover:text-green-500 transition-colors"
        >
          ← Voltar
        </button>
        <h2 className="text-xl sm:text-2xl font-bebas text-green-500 flex items-center gap-2">
          <History className="w-6 h-6" />
          HISTÓRICO DE VÍNCULOS
        </h2>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50 text-center">
          <div className="text-2xl font-bold text-foreground">{history.length}</div>
          <div className="text-xs text-muted-foreground">Total</div>
        </div>
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-500">{totalActive}</div>
          <div className="text-xs text-muted-foreground">Ativos</div>
        </div>
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-red-500">{totalInactive}</div>
          <div className="text-xs text-muted-foreground">Desvinculados</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, username ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-background/50"
            />
          </div>
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filtrar status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Desvinculados</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* History List */}
      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-card/80 rounded-xl p-4 border border-border/50 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/3" />
                    <div className="h-3 bg-muted rounded w-1/4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="bg-card/80 backdrop-blur-md rounded-xl p-8 border border-border/50 text-center">
            <History className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">
              {searchTerm || filterStatus !== 'all' 
                ? 'Nenhum resultado encontrado'
                : 'Nenhum vínculo registrado ainda'}
            </p>
          </div>
        ) : (
          filteredHistory.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className={`bg-card/80 backdrop-blur-md rounded-xl p-4 border ${
                item.is_active ? 'border-green-500/30' : 'border-red-500/20'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                  item.is_active 
                    ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30' 
                    : 'bg-muted/50'
                }`}>
                  {item.client?.avatar_url ? (
                    <img 
                      src={item.client.avatar_url} 
                      alt={item.client.full_name || item.client.username}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className={`text-lg font-bebas ${item.is_active ? 'text-green-500' : 'text-muted-foreground'}`}>
                      {(item.client?.full_name || item.client?.username || '?').charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold truncate">
                      {item.client?.full_name || item.client?.username || 'Usuário desconhecido'}
                    </h3>
                    {getStatusBadge(item)}
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    @{item.client?.username || 'unknown'}
                  </p>

                  {/* Timeline */}
                  <div className="mt-3 space-y-2 text-xs">
                    {item.linked_at && (
                      <div className="flex items-center gap-2 text-green-500/80">
                        <UserPlus className="w-3 h-3" />
                        <span>Vinculado em {formatDate(item.linked_at)}</span>
                        <span className="text-muted-foreground">({getTimeAgo(item.linked_at)})</span>
                      </div>
                    )}
                    
                    {item.unlinked_at && (
                      <div className="flex items-center gap-2 text-red-500/80">
                        <UserMinus className="w-3 h-3" />
                        <span>Desvinculado em {formatDate(item.unlinked_at)}</span>
                        <span className="text-muted-foreground">({getTimeAgo(item.unlinked_at)})</span>
                      </div>
                    )}

                    {!item.linked_at && !item.unlinked_at && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>Data de vínculo não registrada</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Duration indicator for active links */}
                {item.is_active && item.linked_at && (
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs text-muted-foreground">Duração</div>
                    <div className="text-sm font-medium text-green-500">
                      {getTimeAgo(item.linked_at).replace('há ', '')}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
};

export default LinkHistory;

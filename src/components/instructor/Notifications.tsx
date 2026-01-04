import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, Plus, Send, Users, User, Dumbbell, 
  CreditCard, Calendar, Trash2, Check, CheckCheck
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAudio } from '@/contexts/AudioContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import InstructorPageHeader from './InstructorPageHeader';

interface Notification {
  id: string;
  profile_id: string;
  title: string;
  message: string;
  type: string | null;
  is_read: boolean | null;
  created_at: string | null;
  client?: {
    full_name: string;
    username: string;
  };
}

interface Client {
  id: string;
  full_name: string;
  username: string;
}

const notificationTemplates = [
  { 
    id: 'workout_reminder',
    title: 'Lembrete de Treino',
    message: 'Não se esqueça do seu treino hoje! Vamos manter o foco e alcançar seus objetivos.',
    type: 'workout',
    icon: Dumbbell,
    color: 'text-primary'
  },
  { 
    id: 'payment_reminder',
    title: 'Lembrete de Pagamento',
    message: 'Sua mensalidade está próxima do vencimento. Entre em contato para regularizar.',
    type: 'payment',
    icon: CreditCard,
    color: 'text-emerald-500'
  },
  { 
    id: 'schedule_reminder',
    title: 'Lembrete de Agendamento',
    message: 'Você tem uma sessão agendada. Confirme sua presença!',
    type: 'schedule',
    icon: Calendar,
    color: 'text-cyan-500'
  },
  { 
    id: 'motivation',
    title: 'Mensagem Motivacional',
    message: 'Continue firme! Cada treino te deixa mais perto dos seus objetivos. Você consegue!',
    type: 'motivation',
    icon: Bell,
    color: 'text-yellow-500'
  }
];

const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { playClickSound } = useAudio();
  
  const [clients, setClients] = useState<Client[]>([]);
  const [sentNotifications, setSentNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sending, setSending] = useState(false);
  
  // Form state
  const [newNotification, setNewNotification] = useState({
    recipient: 'all', // 'all' or specific client_id
    title: '',
    message: '',
    type: 'general'
  });

  useEffect(() => {
    if (profile?.id) {
      loadData();
    }
  }, [profile?.id]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadClients(), loadSentNotifications()]);
    setLoading(false);
  };

  const loadClients = async () => {
    if (!profile?.id) return;
    
    const { data, error } = await supabase
      .from('instructor_clients')
      .select(`
        client_id,
        profiles!instructor_clients_client_id_fkey (
          id,
          full_name,
          username
        )
      `)
      .eq('instructor_id', profile.id)
      .eq('is_active', true)
      .eq('link_status', 'accepted');

    if (!error && data) {
      const clientList = data
        .filter(d => d.profiles)
        .map(d => ({
          id: (d.profiles as any).id,
          full_name: (d.profiles as any).full_name || (d.profiles as any).username,
          username: (d.profiles as any).username
        }));
      setClients(clientList);
    }
  };

  const loadSentNotifications = async () => {
    if (!profile?.id) return;

    // Get notifications sent to instructor's clients
    const { data: clientsData } = await supabase
      .from('instructor_clients')
      .select('client_id')
      .eq('instructor_id', profile.id)
      .eq('is_active', true)
      .eq('link_status', 'accepted');

    if (!clientsData || clientsData.length === 0) return;

    const clientIds = clientsData.map(c => c.client_id);

    const { data, error } = await supabase
      .from('notifications')
      .select(`
        *,
        profiles!notifications_profile_id_fkey (
          full_name,
          username
        )
      `)
      .in('profile_id', clientIds)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      const notificationsWithClients = data.map(n => ({
        ...n,
        client: n.profiles ? {
          full_name: (n.profiles as any).full_name || (n.profiles as any).username,
          username: (n.profiles as any).username
        } : undefined
      }));
      setSentNotifications(notificationsWithClients);
    }
  };

  const useTemplate = (template: typeof notificationTemplates[0]) => {
    playClickSound();
    setNewNotification({
      ...newNotification,
      title: template.title,
      message: template.message,
      type: template.type
    });
  };

  const handleSendNotification = async () => {
    if (!newNotification.title || !newNotification.message) {
      toast.error('Preencha o título e a mensagem');
      return;
    }

    setSending(true);

    try {
      const recipientIds = newNotification.recipient === 'all' 
        ? clients.map(c => c.id)
        : [newNotification.recipient];

      const notifications = recipientIds.map(clientId => ({
        profile_id: clientId,
        title: newNotification.title,
        message: newNotification.message,
        type: newNotification.type,
        is_read: false
      }));

      const { error } = await supabase
        .from('notifications')
        .insert(notifications);

      if (error) throw error;

      toast.success(`Notificação enviada para ${recipientIds.length} aluno(s)!`);
      setDialogOpen(false);
      setNewNotification({
        recipient: 'all',
        title: '',
        message: '',
        type: 'general'
      });
      loadSentNotifications();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao enviar notificação');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    playClickSound();
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) {
      toast.error('Erro ao excluir notificação');
    } else {
      toast.success('Notificação excluída');
      loadSentNotifications();
    }
  };

  const getTypeIcon = (type: string | null) => {
    switch (type) {
      case 'workout': return <Dumbbell size={16} className="text-primary" />;
      case 'payment': return <CreditCard size={16} className="text-emerald-500" />;
      case 'schedule': return <Calendar size={16} className="text-cyan-500" />;
      default: return <Bell size={16} className="text-pink-500" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-full"
    >
      <InstructorPageHeader 
        title="NOTIFICAÇÕES"
        icon={<Bell className="w-6 h-6" />}
        iconColor="text-pink-500"
      />
      
      <div className="flex-1 overflow-auto space-y-4 sm:space-y-6">
        {/* Actions */}
        <div className="flex justify-end">

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => playClickSound()} 
              className="bg-pink-600 hover:bg-pink-700"
            >
              <Plus size={18} className="mr-2" />
              Nova Notificação
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-bebas text-pink-500 text-xl">
                Enviar Notificação
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {/* Templates */}
              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">Templates Rápidos</Label>
                <div className="grid grid-cols-2 gap-2">
                  {notificationTemplates.map(template => (
                    <button
                      key={template.id}
                      onClick={() => useTemplate(template)}
                      className="p-3 text-left bg-background/50 rounded-lg border border-border/50 hover:border-pink-500/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <template.icon size={16} className={template.color} />
                        <span className="text-sm font-medium">{template.title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{template.message}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Destinatário</Label>
                <Select
                  value={newNotification.recipient}
                  onValueChange={(v) => setNewNotification({ ...newNotification, recipient: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <Users size={16} />
                        Todos os Alunos ({clients.length})
                      </div>
                    </SelectItem>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        <div className="flex items-center gap-2">
                          <User size={16} />
                          {client.full_name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Título *</Label>
                <Input
                  value={newNotification.title}
                  onChange={(e) => setNewNotification({ ...newNotification, title: e.target.value })}
                  placeholder="Título da notificação"
                />
              </div>

              <div className="space-y-2">
                <Label>Mensagem *</Label>
                <Textarea
                  value={newNotification.message}
                  onChange={(e) => setNewNotification({ ...newNotification, message: e.target.value })}
                  placeholder="Digite sua mensagem..."
                  rows={4}
                />
              </div>

              <Button 
                onClick={handleSendNotification} 
                className="w-full bg-pink-600 hover:bg-pink-700"
                disabled={sending}
              >
                <Send size={16} className="mr-2" />
                {sending ? 'Enviando...' : 'Enviar Notificação'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center">
              <Bell size={20} className="text-pink-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Enviadas</p>
              <p className="text-lg font-bebas text-foreground">{sentNotifications.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Dumbbell size={20} className="text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Treino</p>
              <p className="text-lg font-bebas text-foreground">
                {sentNotifications.filter(n => n.type === 'workout').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <CreditCard size={20} className="text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pagamento</p>
              <p className="text-lg font-bebas text-foreground">
                {sentNotifications.filter(n => n.type === 'payment').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <CheckCheck size={20} className="text-green-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Lidas</p>
              <p className="text-lg font-bebas text-green-500">
                {sentNotifications.filter(n => n.is_read).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sent Notifications List */}
      <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-border/50">
        <h3 className="font-bebas text-lg text-pink-500 mb-4">NOTIFICAÇÕES ENVIADAS</h3>
        
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : sentNotifications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell size={48} className="mx-auto mb-4 opacity-50" />
            <p>Nenhuma notificação enviada ainda</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sentNotifications.map(notification => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-lg border transition-colors ${
                  notification.is_read 
                    ? 'bg-background/30 border-border/30' 
                    : 'bg-background/50 border-border/50'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center shrink-0">
                      {getTypeIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-foreground">{notification.title}</h4>
                        {notification.is_read && (
                          <Check size={14} className="text-green-500" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{notification.message}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User size={12} />
                          {notification.client?.full_name || 'N/A'}
                        </span>
                        <span>
                          {notification.created_at && formatDistanceToNow(parseISO(notification.created_at), { 
                            addSuffix: true, 
                            locale: ptBR 
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteNotification(notification.id)}
                    className="p-2 hover:bg-destructive/20 rounded-lg transition-colors shrink-0"
                  >
                    <Trash2 size={16} className="text-destructive" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      </div>
    </motion.div>
  );
};

export default Notifications;

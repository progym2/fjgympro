import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, Send, Users, Loader2, CheckCircle, Shield, History, 
  Trash2, Eye, Calendar, Clock, AlertTriangle, Info, BellRing,
  BarChart3, MessageCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAudio } from '@/contexts/AudioContext';
import { useAuth } from '@/contexts/AuthContext';
import { useEscapeBack } from '@/hooks/useEscapeBack';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Profile {
  id: string;
  full_name: string;
  username: string;
  role?: string;
  phone?: string | null;
}

interface Notification {
  id: string;
  profile_id: string;
  title: string;
  message: string;
  type: string | null;
  is_read: boolean | null;
  created_at: string | null;
  profiles?: {
    full_name: string | null;
    username: string;
  };
}

const SendAlerts: React.FC = () => {
  const navigate = useNavigate();
  const { playClickSound } = useAudio();
  const { role, profile: currentProfile } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [activeTab, setActiveTab] = useState('send');
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | null>(null);

  // ESC para voltar ao menu admin
  useEscapeBack({ to: '/admin', disableWhen: [selectedNotification !== null] });
  
  const isMaster = role === 'master';
  
  const [formData, setFormData] = useState({
    target: 'all',
    userType: 'all', // 'all', 'clients', 'instructors'
    title: '',
    message: '',
    type: 'info',
    sendPush: true
  });

  // Templates de mensagens pré-definidas
  const messageTemplates = [
    { 
      id: 'payment_reminder', 
      label: '💰 Lembrete de Pagamento',
      title: 'Lembrete de Pagamento',
      message: 'Olá! Este é um lembrete amigável de que sua mensalidade está próxima do vencimento. Por favor, efetue o pagamento para manter seu acesso ativo.',
      type: 'warning'
    },
    { 
      id: 'payment_overdue', 
      label: '⚠️ Pagamento em Atraso',
      title: 'Pagamento em Atraso',
      message: 'Identificamos que sua mensalidade está em atraso. Por favor, regularize seu pagamento o mais breve possível para evitar a suspensão do acesso.',
      type: 'alert'
    },
    { 
      id: 'welcome', 
      label: '👋 Boas-vindas',
      title: 'Bem-vindo(a)!',
      message: 'Seja bem-vindo(a) à nossa academia! Estamos muito felizes em ter você conosco. Qualquer dúvida, não hesite em nos procurar.',
      type: 'success'
    },
    { 
      id: 'schedule_change', 
      label: '📅 Mudança de Horário',
      title: 'Alteração de Horário',
      message: 'Informamos que haverá alteração nos horários de funcionamento. Fique atento às novas programações.',
      type: 'info'
    },
    { 
      id: 'maintenance', 
      label: '🔧 Manutenção',
      title: 'Aviso de Manutenção',
      message: 'Informamos que realizaremos manutenção em nossas instalações. Agradecemos a compreensão.',
      type: 'info'
    },
    { 
      id: 'promotion', 
      label: '🎉 Promoção',
      title: 'Promoção Especial',
      message: 'Temos uma promoção especial para você! Entre em contato conosco para saber mais detalhes.',
      type: 'success'
    }
  ];

  useEffect(() => {
    // Check push notification support
    if ('Notification' in window) {
      setPushSupported(true);
      setPushPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (currentProfile?.profile_id) {
      loadProfiles();
      loadNotificationHistory();
    }
  }, [currentProfile?.profile_id, isMaster]);

  const loadProfiles = async () => {
    setLoading(true);
    
    // First get profiles with phone
    let query = supabase
      .from('profiles')
      .select('id, full_name, username, phone')
      .order('full_name');
    
    // Se não for master, filtra apenas os cadastrados pelo gerente atual
    if (!isMaster && currentProfile?.profile_id) {
      query = query.eq('created_by_admin', currentProfile.profile_id);
    }
    
    const { data: profilesData } = await query;
    
    if (profilesData) {
      // Get roles for each profile
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role');
      
      // Get user_id mapping from profiles
      const { data: profilesWithUserId } = await supabase
        .from('profiles')
        .select('id, user_id')
        .in('id', profilesData.map(p => p.id));
      
      // Map roles to profiles
      const profilesWithRoles = profilesData.map(p => {
        const profileWithUserId = profilesWithUserId?.find(pu => pu.id === p.id);
        const userRole = rolesData?.find(r => r.user_id === profileWithUserId?.user_id);
        return {
          ...p,
          role: userRole?.role || 'client',
          phone: p.phone
        };
      });
      
      setProfiles(profilesWithRoles);
    }
    
    setLoading(false);
  };

  const sendWhatsAppMessage = (phone: string | null, name: string, title: string, message: string) => {
    if (!phone) {
      toast.error('Usuário sem telefone cadastrado');
      return;
    }
    
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    
    const whatsappMessage = encodeURIComponent(
      `Olá ${name}! 👋\n\n` +
      `📢 *${title}*\n\n` +
      `${message}\n\n` +
      `Atenciosamente,\nEquipe da Academia 🏋️`
    );
    
    window.open(`https://wa.me/${formattedPhone}?text=${whatsappMessage}`, '_blank');
    toast.success('WhatsApp aberto!');
  };

  const sendWhatsAppToSelected = () => {
    playClickSound();
    
    let targetProfiles: Profile[] = [];
    if (formData.target === 'all') {
      targetProfiles = filteredProfiles.filter(p => p.phone);
    } else {
      const profile = filteredProfiles.find(p => p.id === formData.target);
      if (profile?.phone) targetProfiles = [profile];
    }

    if (targetProfiles.length === 0) {
      toast.error('Nenhum destinatário com telefone cadastrado');
      return;
    }

    if (!formData.title.trim() || !formData.message.trim()) {
      toast.error('Preencha título e mensagem primeiro');
      return;
    }

    // Send to first one
    const first = targetProfiles[0];
    sendWhatsAppMessage(first.phone || null, first.full_name || first.username, formData.title, formData.message);
    
    if (targetProfiles.length > 1) {
      toast.info(`Mais ${targetProfiles.length - 1} usuário(s) com telefone para enviar`);
    }
  };

  // Filter profiles based on userType
  const filteredProfiles = useMemo(() => {
    if (formData.userType === 'all') return profiles;
    if (formData.userType === 'clients') return profiles.filter(p => p.role === 'client');
    if (formData.userType === 'instructors') return profiles.filter(p => p.role === 'instructor');
    return profiles;
  }, [profiles, formData.userType]);

  const applyTemplate = (templateId: string) => {
    const template = messageTemplates.find(t => t.id === templateId);
    if (template) {
      setFormData(prev => ({
        ...prev,
        title: template.title,
        message: template.message,
        type: template.type
      }));
      toast.success('Template aplicado!');
    }
  };

  const loadNotificationHistory = async () => {
    setLoadingHistory(true);
    
    try {
      // Query notifications - for non-masters, we'll filter by the profiles they created
      let profileIds: string[] = [];
      
      if (!isMaster && currentProfile?.profile_id) {
        const { data: managedProfiles } = await supabase
          .from('profiles')
          .select('id')
          .eq('created_by_admin', currentProfile.profile_id);
        
        profileIds = managedProfiles?.map(p => p.id) || [];
      }
      
      let query = supabase
        .from('notifications')
        .select(`
          *,
          profiles:profile_id (
            full_name,
            username
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (!isMaster && profileIds.length > 0) {
        query = query.in('profile_id', profileIds);
      } else if (!isMaster && profileIds.length === 0) {
        setNotifications([]);
        setLoadingHistory(false);
        return;
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      console.error('Error loading history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const requestPushPermission = async () => {
    if (!pushSupported) {
      toast.error('Seu navegador não suporta notificações push');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      
      if (permission === 'granted') {
        toast.success('Notificações push ativadas!');
        // Show test notification
        new Notification('Teste de Notificação', {
          body: 'As notificações push estão funcionando!',
          icon: '/favicon.ico'
        });
      } else {
        toast.error('Permissão para notificações negada');
      }
    } catch (err) {
      console.error('Error requesting permission:', err);
      toast.error('Erro ao solicitar permissão');
    }
  };

  const sendPushNotification = (title: string, message: string, type: string) => {
    if (pushPermission === 'granted') {
      const icons: { [key: string]: string } = {
        info: 'ℹ️',
        warning: '⚠️',
        alert: '🚨',
        success: '✅'
      };
      
      try {
        new Notification(`${icons[type] || ''} ${title}`, {
          body: message,
          icon: '/favicon.ico',
          tag: `notification-${Date.now()}`,
          requireInteraction: type === 'alert'
        });
      } catch (err) {
        console.error('Error sending push notification:', err);
      }
    }
  };

  const handleSend = async () => {
    if (!formData.title.trim() || !formData.message.trim()) {
      toast.error('Preencha todos os campos');
      return;
    }

    playClickSound();
    setSending(true);

    try {
      let targetProfiles: Profile[] = [];

      if (formData.target === 'all') {
        targetProfiles = filteredProfiles;
      } else {
        const profile = filteredProfiles.find(p => p.id === formData.target);
        if (profile) targetProfiles = [profile];
      }

      if (targetProfiles.length === 0) {
        toast.error('Nenhum destinatário selecionado');
        setSending(false);
        return;
      }

      const notifications = targetProfiles.map(p => ({
        profile_id: p.id,
        title: formData.title,
        message: formData.message,
        type: formData.type,
      }));

      const { error } = await supabase.from('notifications').insert(notifications);

      if (error) throw error;

      // Send push notification if enabled
      if (formData.sendPush) {
        sendPushNotification(formData.title, formData.message, formData.type);
      }

      setSent(true);
      toast.success(`Alerta enviado para ${targetProfiles.length} usuário(s)!`);
      
      // Reload history
      loadNotificationHistory();
      
      setTimeout(() => {
        setFormData({ target: 'all', userType: 'all', title: '', message: '', type: 'info', sendPush: true });
        setSent(false);
      }, 2000);
    } catch (err) {
      console.error('Error:', err);
      toast.error('Erro ao enviar alerta');
    } finally {
      setSending(false);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('Notificação removida');
      setNotifications(notifications.filter(n => n.id !== id));
      setSelectedNotification(null);
    } catch (err) {
      console.error('Error deleting notification:', err);
      toast.error('Erro ao remover notificação');
    }
  };

  const getTypeIcon = (type: string | null) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'alert': return <Bell className="w-4 h-4 text-red-500" />;
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getTypeBadge = (type: string | null) => {
    const variants: { [key: string]: string } = {
      info: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
      warning: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
      alert: 'bg-red-500/20 text-red-500 border-red-500/30',
      success: 'bg-green-500/20 text-green-500 border-green-500/30'
    };
    return variants[type || 'info'] || variants.info;
  };

  // Group notifications by date
  const groupedNotifications = notifications.reduce((groups, notif) => {
    const date = notif.created_at ? format(new Date(notif.created_at), 'yyyy-MM-dd') : 'unknown';
    if (!groups[date]) groups[date] = [];
    groups[date].push(notif);
    return groups;
  }, {} as { [key: string]: Notification[] });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { playClickSound(); navigate('/admin'); }}
            className="text-sm text-muted-foreground hover:text-blue-500 transition-colors"
          >
            ← Voltar
          </button>
          <h2 className="text-xl sm:text-2xl font-bebas text-pink-500 flex items-center gap-2">
            <Bell className="w-6 h-6" />
            {isMaster ? 'ALERTAS (GLOBAL)' : 'ALERTAS'}
          </h2>
        </div>
        
        {/* Push Permission Button */}
        {pushSupported && pushPermission !== 'granted' && (
          <Button
            variant="outline"
            size="sm"
            onClick={requestPushPermission}
            className="border-pink-500/50 text-pink-500"
          >
            <BellRing className="w-4 h-4 mr-2" />
            Ativar Push
          </Button>
        )}
        {pushPermission === 'granted' && (
          <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
            <BellRing className="w-3 h-3 mr-1" />
            Push Ativo
          </Badge>
        )}
      </div>

      {!isMaster && (
        <div className="bg-pink-500/10 border border-pink-500/30 rounded-lg p-3 flex items-center gap-2 text-sm text-pink-400">
          <Shield className="w-4 h-4" />
          <span>Você pode enviar alertas apenas para usuários cadastrados por você ({profiles.length} usuários).</span>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="send" className="flex items-center gap-2">
            <Send size={16} />
            Enviar
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History size={16} />
            Histórico
          </TabsTrigger>
          <TabsTrigger 
            value="stats" 
            onClick={() => navigate('/admin/alerts/stats')}
            className="flex items-center gap-2"
          >
            <BarChart3 size={16} />
            Estatísticas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="send">
          <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-border/50 space-y-4">
            {sent ? (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center py-8"
              >
                <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                <p className="text-xl font-bebas text-green-500">ALERTA ENVIADO!</p>
              </motion.div>
            ) : profiles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Você ainda não cadastrou nenhum usuário.</p>
                <p className="text-sm">Cadastre clientes ou instrutores para enviar alertas.</p>
              </div>
            ) : (
              <>
                {/* Templates de Mensagem */}
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">📋 Templates Rápidos</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {messageTemplates.map(template => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => applyTemplate(template.id)}
                        className="p-2 text-xs bg-background/50 border border-border/50 rounded-lg hover:border-primary/50 hover:bg-primary/10 transition-colors text-left"
                      >
                        {template.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Filtro por Tipo de Usuário */}
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Tipo de Usuário</label>
                  <Select value={formData.userType} onValueChange={(v) => setFormData({ ...formData, userType: v, target: 'all' })}>
                    <SelectTrigger className="bg-background/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">👥 Todos ({profiles.length})</SelectItem>
                      <SelectItem value="clients">🏋️ Apenas Clientes ({profiles.filter(p => p.role === 'client').length})</SelectItem>
                      <SelectItem value="instructors">💪 Apenas Instrutores ({profiles.filter(p => p.role === 'instructor').length})</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Destinatário</label>
                  <Select value={formData.target} onValueChange={(v) => setFormData({ ...formData, target: v })}>
                    <SelectTrigger className="bg-background/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          {formData.userType === 'clients' ? 'Todos os Clientes' : 
                           formData.userType === 'instructors' ? 'Todos os Instrutores' : 
                           isMaster ? 'Todos os Usuários' : 'Meus Usuários'} ({filteredProfiles.length})
                        </div>
                      </SelectItem>
                      {filteredProfiles.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          <span className="flex items-center gap-2">
                            {p.role === 'instructor' ? '💪' : '🏋️'}
                            {p.full_name || p.username}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Tipo de Notificação</label>
                  <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                    <SelectTrigger className="bg-background/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">ℹ️ Informação</SelectItem>
                      <SelectItem value="warning">⚠️ Aviso</SelectItem>
                      <SelectItem value="alert">🚨 Alerta/Cobrança</SelectItem>
                      <SelectItem value="success">✅ Sucesso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Título *</label>
                  <Input
                    placeholder="Título do alerta"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="bg-background/50"
                  />
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Mensagem *</label>
                  <Textarea
                    placeholder="Digite a mensagem do alerta..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="bg-background/50 min-h-[120px]"
                  />
                </div>

                {/* Push notification toggle */}
                <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border/50">
                  <div className="flex items-center gap-2">
                    <BellRing className="w-4 h-4 text-pink-500" />
                    <div>
                      <p className="text-sm font-medium">Notificação Push</p>
                      <p className="text-xs text-muted-foreground">
                        {pushPermission === 'granted' 
                          ? 'Enviar notificação push imediatamente' 
                          : 'Ative as notificações push primeiro'}
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.sendPush && pushPermission === 'granted'}
                    onChange={(e) => setFormData({ ...formData, sendPush: e.target.checked })}
                    disabled={pushPermission !== 'granted'}
                    className="w-5 h-5 rounded accent-pink-500"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={sendWhatsAppToSelected}
                    variant="outline"
                    className="flex-1 border-green-500/50 text-green-500 hover:bg-green-500/10"
                    disabled={!formData.title.trim() || !formData.message.trim()}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    WhatsApp
                  </Button>
                  <Button
                    onClick={handleSend}
                    disabled={sending}
                    className="flex-1 bg-pink-600 hover:bg-pink-700"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    {sending ? 'Enviando...' : 'Enviar Alerta'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="history">
          <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-border/50">
            {loadingHistory ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-pink-500" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum alerta enviado ainda</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedNotifications).map(([date, notifs]) => (
                  <div key={date}>
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">
                        {format(new Date(date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {notifs.length} alerta(s)
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      {notifs.map((notif) => (
                        <motion.div
                          key={notif.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`p-3 rounded-lg border cursor-pointer transition-all hover:border-pink-500/50 ${
                            notif.is_read ? 'bg-background/30 border-border/30' : 'bg-background/70 border-border/50'
                          }`}
                          onClick={() => setSelectedNotification(notif)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              {getTypeIcon(notif.type)}
                              <div>
                                <p className="font-medium text-sm">{notif.title}</p>
                                <p className="text-xs text-muted-foreground line-clamp-1">
                                  {notif.message}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {notif.profiles?.full_name || notif.profiles?.username || 'Usuário'}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {notif.created_at && format(new Date(notif.created_at), 'HH:mm')}
                                  </span>
                                  {notif.is_read && (
                                    <Badge className="bg-green-500/20 text-green-500 text-xs">Lido</Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <Badge className={`text-xs ${getTypeBadge(notif.type)}`}>
                              {notif.type || 'info'}
                            </Badge>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Notification Detail Dialog */}
      <Dialog open={!!selectedNotification} onOpenChange={() => setSelectedNotification(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedNotification && getTypeIcon(selectedNotification.type)}
              {selectedNotification?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedNotification && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge className={getTypeBadge(selectedNotification.type)}>
                  {selectedNotification.type || 'info'}
                </Badge>
                <Badge variant="outline">
                  {selectedNotification.profiles?.full_name || selectedNotification.profiles?.username}
                </Badge>
                {selectedNotification.is_read && (
                  <Badge className="bg-green-500/20 text-green-500">Lido</Badge>
                )}
              </div>
              
              <div className="p-4 bg-background/50 rounded-lg">
                <p className="text-sm whitespace-pre-wrap">{selectedNotification.message}</p>
              </div>
              
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {selectedNotification.created_at && format(
                    new Date(selectedNotification.created_at), 
                    "dd/MM/yyyy 'às' HH:mm", 
                    { locale: ptBR }
                  )}
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => deleteNotification(selectedNotification.id)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setSelectedNotification(null)}
                >
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default SendAlerts;
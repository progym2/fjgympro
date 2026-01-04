import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, CheckCheck, AlertTriangle, Info, CheckCircle, Clock, DollarSign, UserPlus, UserMinus, Dumbbell, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import DraggableFloatingButton from '@/components/shared/DraggableFloatingButton';

interface NotificationProps {
  isVisible?: boolean;
  onVisibilityChange?: (visible: boolean) => void;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string | null;
  is_read: boolean | null;
  created_at: string | null;
}

const RealtimeNotifications: React.FC<NotificationProps> = ({ 
  isVisible = true,
  onVisibilityChange 
}) => {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [newNotification, setNewNotification] = useState<Notification | null>(null);

  const handleClose = useCallback(() => {
    if (onVisibilityChange) {
      onVisibilityChange(false);
    }
  }, [onVisibilityChange]);

  const loadNotifications = useCallback(async () => {
    if (!profile?.profile_id) return;

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('profile_id', profile.profile_id)
      .order('created_at', { ascending: false })
      .limit(50);

    setNotifications(data || []);
    setUnreadCount((data || []).filter(n => !n.is_read).length);
  }, [profile?.profile_id]);

  const updateUnreadCount = useCallback(async () => {
    if (!profile?.profile_id) return;

    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', profile.profile_id)
      .eq('is_read', false);

    setUnreadCount(count || 0);
  }, [profile?.profile_id]);

  useEffect(() => {
    if (!profile?.profile_id) return;

    // Load initial notifications
    loadNotifications();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('client-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `profile_id=eq.${profile.profile_id}`
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications(prev => [newNotif, ...prev]);
          setUnreadCount(prev => prev + 1);
          setNewNotification(newNotif);
          
          // Show toast notification
          toast.info(newNotif.title, {
            description: newNotif.message,
            duration: 5000,
          });

          // Send browser notification if permitted
          if ('Notification' in window && window.Notification.permission === 'granted') {
            new window.Notification(newNotif.title, {
              body: newNotif.message,
              icon: '/favicon.ico',
              tag: `notif-${newNotif.id}`
            });
          }

          // Auto-hide new notification popup after 5 seconds
          setTimeout(() => setNewNotification(null), 5000);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `profile_id=eq.${profile.profile_id}`
        },
        (payload) => {
          const updatedNotif = payload.new as Notification;
          setNotifications(prev => 
            prev.map(n => n.id === updatedNotif.id ? updatedNotif : n)
          );
          updateUnreadCount();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `profile_id=eq.${profile.profile_id}`
        },
        (payload) => {
          const deletedNotif = payload.old as Notification;
          setNotifications(prev => prev.filter(n => n.id !== deletedNotif.id));
          updateUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.profile_id, loadNotifications, updateUnreadCount]);

  // Early return after all hooks
  if (!isVisible) return null;

  const markAsRead = async (id: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    if (!profile?.profile_id) return;

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('profile_id', profile.profile_id)
      .eq('is_read', false);

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
    toast.success('Todas as notificações marcadas como lidas');
  };

  const getTypeIcon = (type: string | null) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'alert': return <Bell className="w-4 h-4 text-red-500" />;
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'payment_overdue': return <DollarSign className="w-4 h-4 text-red-500" />;
      case 'payment_reminder': return <DollarSign className="w-4 h-4 text-yellow-500" />;
      case 'link_request': return <UserPlus className="w-4 h-4 text-blue-500" />;
      case 'link_accepted': return <UserPlus className="w-4 h-4 text-green-500" />;
      case 'link_rejected': return <UserMinus className="w-4 h-4 text-red-500" />;
      case 'unlink': return <UserMinus className="w-4 h-4 text-orange-500" />;
      case 'workout_created': return <Dumbbell className="w-4 h-4 text-primary" />;
      case 'instructor_message': return <MessageCircle className="w-4 h-4 text-blue-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getTypeBg = (type: string | null) => {
    switch (type) {
      case 'warning': return 'bg-yellow-500/10 border-yellow-500/30';
      case 'alert': return 'bg-red-500/10 border-red-500/30';
      case 'success': return 'bg-green-500/10 border-green-500/30';
      case 'payment_overdue': return 'bg-red-500/10 border-red-500/30';
      case 'payment_reminder': return 'bg-yellow-500/10 border-yellow-500/30';
      case 'link_request': return 'bg-blue-500/10 border-blue-500/30';
      case 'link_accepted': return 'bg-green-500/10 border-green-500/30';
      case 'link_rejected': return 'bg-red-500/10 border-red-500/30';
      case 'unlink': return 'bg-orange-500/10 border-orange-500/30';
      case 'workout_created': return 'bg-primary/10 border-primary/30';
      case 'instructor_message': return 'bg-blue-500/10 border-blue-500/30';
      default: return 'bg-blue-500/10 border-blue-500/30';
    }
  };

  return (
    <>
      {/* Floating notification bell with drag support */}
      <DraggableFloatingButton
        storageKey="notifications-widget"
        defaultPosition={{ x: 0, y: -60 }}
        onClose={handleClose}
        showCloseButton={true}
      >
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsOpen(!isOpen)}
          className="p-3 rounded-full bg-primary shadow-lg shadow-primary/30 text-primary-foreground"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </motion.button>
      </DraggableFloatingButton>

      {/* New notification popup */}
      <AnimatePresence>
        {newNotification && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: 50 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: -50, x: 50 }}
            className={`fixed top-20 right-4 z-50 max-w-sm p-4 rounded-xl border-2 shadow-xl ${getTypeBg(newNotification.type)}`}
          >
            <div className="flex items-start gap-3">
              {getTypeIcon(newNotification.type)}
              <div className="flex-1">
                <h4 className="font-semibold text-sm">{newNotification.title}</h4>
                <p className="text-xs text-muted-foreground mt-1">{newNotification.message}</p>
              </div>
              <button onClick={() => setNewNotification(null)}>
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notifications panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40 bg-background/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              className="fixed bottom-28 right-4 z-50 w-80 max-h-[60vh] bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
            >
              <div className="p-3 border-b border-border flex items-center justify-between bg-muted/30">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-sm">Notificações</span>
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="text-xs px-1.5 py-0">
                      {unreadCount}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={markAllAsRead}
                      className="text-xs h-7 px-2"
                    >
                      <CheckCheck className="w-3 h-3 mr-1" />
                      Marcar todas
                    </Button>
                  )}
                  <button onClick={() => setIsOpen(false)}>
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>

              <ScrollArea className="max-h-[calc(60vh-50px)]">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhuma notificação</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {notifications.map((notif) => (
                      <motion.div
                        key={notif.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        onClick={() => !notif.is_read && markAsRead(notif.id)}
                        className={`p-3 cursor-pointer hover:bg-muted/30 transition-colors ${
                          !notif.is_read ? 'bg-primary/5' : ''
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {getTypeIcon(notif.type)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className={`text-sm truncate ${!notif.is_read ? 'font-semibold' : ''}`}>
                                {notif.title}
                              </h4>
                              {!notif.is_read && (
                                <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                              {notif.message}
                            </p>
                            <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {notif.created_at && format(new Date(notif.created_at), "dd/MM HH:mm", { locale: ptBR })}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default RealtimeNotifications;

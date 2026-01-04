import { useEffect, useCallback, useState } from 'react';
import { toast } from 'sonner';

interface WorkoutNotificationSettings {
  enabled: boolean;
  time: string;
  days: number[];
  minutesBefore: number;
}

const STORAGE_KEY = 'workout_push_settings';
const LAST_NOTIFICATION_KEY = 'last_workout_notification';
const DAILY_NOTIFICATION_KEY = 'daily_workout_available_notification';

export const usePushNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [settings, setSettings] = useState<WorkoutNotificationSettings>({
    enabled: false,
    time: '08:00',
    days: [1, 2, 3, 4, 5],
    minutesBefore: 30
  });
  const [isSupported, setIsSupported] = useState(false);

  // Check support and load settings on mount
  useEffect(() => {
    const supported = 'Notification' in window;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
    }

    // Load saved settings
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading notification settings:', e);
      }
    }
  }, []);

  // Save settings when changed
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  // Request permission
  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      toast.error('Seu navegador não suporta notificações');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        toast.success('Notificações push ativadas!');
        setSettings(prev => ({ ...prev, enabled: true }));
        return true;
      } else {
        toast.error('Permissão negada. Ative nas configurações do navegador.');
        return false;
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast.error('Erro ao solicitar permissão');
      return false;
    }
  }, [isSupported]);

  // Send notification
  const sendNotification = useCallback((title: string, body: string, options?: NotificationOptions) => {
    if (!isSupported || permission !== 'granted') {
      console.log('Notifications not available');
      return;
    }

    try {
      const notification = new Notification(title, {
        body,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: 'workout-reminder',
        requireInteraction: true,
        ...options
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      return notification;
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }, [isSupported, permission]);

  // Check and send workout reminder
  const checkWorkoutReminder = useCallback(() => {
    if (!settings.enabled || permission !== 'granted') return;

    const now = new Date();
    const currentDay = now.getDay();

    // Check if today is a scheduled day
    if (!settings.days.includes(currentDay)) return;

    const [targetHours, targetMinutes] = settings.time.split(':').map(Number);
    const targetTime = new Date(now);
    targetTime.setHours(targetHours, targetMinutes, 0, 0);

    // Calculate reminder time
    const reminderTime = new Date(targetTime.getTime() - settings.minutesBefore * 60000);

    // Check if current time is within 1 minute of reminder time
    const timeDiff = Math.abs(now.getTime() - reminderTime.getTime());

    if (timeDiff < 60000) {
      // Check if already sent today
      const lastSent = localStorage.getItem(LAST_NOTIFICATION_KEY);
      const today = now.toDateString();

      if (lastSent !== today) {
        sendNotification(
          '💪 Hora de Treinar!',
          `Seu treino está programado para daqui a ${settings.minutesBefore} minutos. Prepare-se!`
        );
        localStorage.setItem(LAST_NOTIFICATION_KEY, today);

        // Also show in-app toast
        toast('💪 Hora de Treinar!', {
          description: `Treino em ${settings.minutesBefore} minutos!`,
          duration: 10000
        });
      }
    }
  }, [settings, permission, sendNotification]);

  // Set up interval to check for reminders
  useEffect(() => {
    if (!settings.enabled || permission !== 'granted') return;

    // Check every minute
    const interval = setInterval(checkWorkoutReminder, 60000);

    // Initial check
    checkWorkoutReminder();

    return () => clearInterval(interval);
  }, [settings.enabled, permission, checkWorkoutReminder]);

  // Update settings
  const updateSettings = useCallback((newSettings: Partial<WorkoutNotificationSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  // Toggle day
  const toggleDay = useCallback((day: number) => {
    setSettings(prev => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day].sort((a, b) => a - b)
    }));
  }, []);

  // Test notification
  const testNotification = useCallback(() => {
    if (permission !== 'granted') {
      toast.error('Ative as notificações primeiro');
      return;
    }

    sendNotification('🧪 Teste de Notificação', 'Suas notificações de treino estão funcionando!');
    toast.success('Notificação de teste enviada!');
  }, [permission, sendNotification]);

  // Send daily workout available notification
  const sendWorkoutAvailableNotification = useCallback((workoutName: string) => {
    if (!settings.enabled || permission !== 'granted') return;

    const today = new Date().toDateString();
    const lastSent = localStorage.getItem(DAILY_NOTIFICATION_KEY);

    if (lastSent !== today) {
      sendNotification(
        '🏋️ Treino Disponível!',
        `Seu treino "${workoutName}" está liberado para hoje. Bora treinar!`,
        { tag: 'workout-available' }
      );
      localStorage.setItem(DAILY_NOTIFICATION_KEY, today);

      toast('🏋️ Treino de Hoje Liberado!', {
        description: `"${workoutName}" está disponível para execução.`,
        duration: 8000
      });
    }
  }, [settings.enabled, permission, sendNotification]);

  // Calculate next reminder time
  const getNextReminderTime = useCallback((): Date | null => {
    if (!settings.enabled || settings.days.length === 0) return null;

    const now = new Date();
    const [hours, minutes] = settings.time.split(':').map(Number);
    
    // Calculate reminder time offset
    const reminderOffset = settings.minutesBefore * 60000;

    for (let i = 0; i <= 7; i++) {
      const checkDate = new Date(now);
      checkDate.setDate(now.getDate() + i);
      checkDate.setHours(hours, minutes, 0, 0);

      const reminderTime = new Date(checkDate.getTime() - reminderOffset);

      if (settings.days.includes(checkDate.getDay()) && reminderTime > now) {
        return reminderTime;
      }
    }

    return null;
  }, [settings]);

  // Send link request notification (for clients)
  const sendLinkRequestNotification = useCallback((instructorName: string) => {
    if (permission !== 'granted') return;

    sendNotification(
      '🤝 Nova Solicitação de Vínculo',
      `O instrutor ${instructorName} deseja vincular você como aluno. Acesse seu painel para aceitar ou rejeitar.`,
      { tag: 'link-request', requireInteraction: true }
    );

    toast('🤝 Nova Solicitação!', {
      description: `${instructorName} quer vincular você como aluno.`,
      duration: 10000,
      action: {
        label: 'Ver',
        onClick: () => window.location.href = '/client'
      }
    });
  }, [permission, sendNotification]);

  // Send link response notification (for instructors)
  const sendLinkResponseNotification = useCallback((clientName: string, accepted: boolean) => {
    if (permission !== 'granted') return;

    const title = accepted ? '✅ Vínculo Aceito!' : '❌ Vínculo Rejeitado';
    const body = accepted
      ? `${clientName} aceitou seu pedido de vínculo. Você já pode criar treinos!`
      : `${clientName} rejeitou seu pedido de vínculo.`;

    sendNotification(title, body, { 
      tag: 'link-response', 
      requireInteraction: true 
    });

    toast(title, {
      description: body,
      duration: 8000
    });
  }, [permission, sendNotification]);

  return {
    isSupported,
    permission,
    settings,
    requestPermission,
    sendNotification,
    updateSettings,
    toggleDay,
    testNotification,
    getNextReminderTime,
    sendWorkoutAvailableNotification,
    sendLinkRequestNotification,
    sendLinkResponseNotification
  };
};

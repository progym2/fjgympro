import { useEffect, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications, ScheduleOptions, PendingLocalNotificationSchema } from '@capacitor/local-notifications';
import { toast } from 'sonner';

interface HydrationNotificationSettings {
  enabled: boolean;
  intervalMinutes: number;
  startHour: number;
  endHour: number;
  dailyGoalMl: number;
}

interface UseHydrationNotificationsReturn {
  isNative: boolean;
  hasPermission: boolean;
  pendingNotifications: number;
  requestPermission: () => Promise<boolean>;
  scheduleHydrationReminders: (settings: HydrationNotificationSettings) => Promise<void>;
  cancelAllReminders: () => Promise<void>;
  sendImmediateReminder: (message?: string) => Promise<void>;
}

const HYDRATION_NOTIFICATION_IDS = {
  BASE_ID: 1000,
  IMMEDIATE_ID: 999,
};

export const useHydrationNotifications = (): UseHydrationNotificationsReturn => {
  const [hasPermission, setHasPermission] = useState(false);
  const [pendingNotifications, setPendingNotifications] = useState(0);
  
  const isNative = Capacitor.isNativePlatform();

  // Check permission status on mount
  useEffect(() => {
    if (isNative) {
      checkPermission();
      countPendingNotifications();
      setupNotificationListeners();
    }
  }, [isNative]);

  const checkPermission = async () => {
    try {
      const result = await LocalNotifications.checkPermissions();
      setHasPermission(result.display === 'granted');
    } catch (error) {
      console.error('Error checking notification permission:', error);
    }
  };

  const countPendingNotifications = async () => {
    try {
      const pending = await LocalNotifications.getPending();
      setPendingNotifications(pending.notifications.length);
    } catch (error) {
      console.error('Error counting pending notifications:', error);
    }
  };

  const setupNotificationListeners = () => {
    // Listen for notification received while app is open
    LocalNotifications.addListener('localNotificationReceived', (notification) => {
      console.log('Notification received:', notification);
      // Play sound or show in-app alert
      toast.info('💧 Hora de beber água!', {
        description: notification.body || 'Mantenha-se hidratado!',
        duration: 10000,
        action: {
          label: 'Registrar',
          onClick: () => {
            // This will be handled by the component
            window.dispatchEvent(new CustomEvent('hydration-reminder-action'));
          }
        }
      });
    });

    // Listen for notification action (when user taps)
    LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
      console.log('Notification action performed:', action);
      // Navigate to hydration tracker or perform action
      window.dispatchEvent(new CustomEvent('hydration-notification-tap', {
        detail: action
      }));
    });
  };

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isNative) {
      toast.info('Notificações nativas requerem o app instalado no dispositivo.');
      return false;
    }

    try {
      const result = await LocalNotifications.requestPermissions();
      const granted = result.display === 'granted';
      setHasPermission(granted);
      
      if (granted) {
        toast.success('Notificações ativadas! Você receberá lembretes de hidratação.');
      } else {
        toast.error('Permissão negada. Ative nas configurações do dispositivo.');
      }
      
      return granted;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Erro ao solicitar permissão de notificação.');
      return false;
    }
  }, [isNative]);

  const scheduleHydrationReminders = useCallback(async (
    settings: HydrationNotificationSettings
  ): Promise<void> => {
    if (!isNative) {
      console.log('Not a native platform, skipping native notifications');
      return;
    }

    if (!settings.enabled) {
      await cancelAllReminders();
      return;
    }

    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) return;
    }

    try {
      // Cancel existing reminders first
      await cancelAllReminders();

      const now = new Date();
      const notifications: ScheduleOptions['notifications'] = [];
      
      // Calculate how many notifications to schedule for today
      const currentHour = now.getHours();
      const currentMinutes = now.getMinutes();
      
      // Schedule notifications for the rest of today
      let notificationId = HYDRATION_NOTIFICATION_IDS.BASE_ID;
      
      // Generate notifications for today
      for (let hour = settings.startHour; hour < settings.endHour; hour++) {
        for (let minute = 0; minute < 60; minute += settings.intervalMinutes) {
          // Skip past times
          if (hour < currentHour || (hour === currentHour && minute <= currentMinutes)) {
            continue;
          }
          
          const scheduleDate = new Date();
          scheduleDate.setHours(hour, minute, 0, 0);
          
          // Only schedule for today and tomorrow (Capacitor handles repeating)
          notifications.push({
            id: notificationId++,
            title: '💧 Hora de Hidratar!',
            body: getRandomHydrationMessage(),
            schedule: { at: scheduleDate },
            sound: 'default',
            smallIcon: 'ic_stat_water_drop',
            largeIcon: 'ic_launcher',
            channelId: 'hydration-reminders',
            extra: {
              type: 'hydration-reminder',
              goalMl: settings.dailyGoalMl
            }
          });
          
          // Limit to prevent too many notifications
          if (notifications.length >= 20) break;
        }
        if (notifications.length >= 20) break;
      }

      // Also schedule repeating notifications for future days
      const tomorrowStart = new Date();
      tomorrowStart.setDate(tomorrowStart.getDate() + 1);
      tomorrowStart.setHours(settings.startHour, 0, 0, 0);

      // Schedule a few key reminders for tomorrow
      const tomorrowIntervals = [
        settings.startHour,
        settings.startHour + 3,
        settings.startHour + 6,
        settings.startHour + 9,
        Math.min(settings.startHour + 12, settings.endHour - 1)
      ];

      for (const hour of tomorrowIntervals) {
        if (hour >= settings.startHour && hour < settings.endHour) {
          const scheduleDate = new Date(tomorrowStart);
          scheduleDate.setHours(hour, 0, 0, 0);
          
          notifications.push({
            id: notificationId++,
            title: '💧 Hora de Hidratar!',
            body: getRandomHydrationMessage(),
            schedule: { at: scheduleDate },
            sound: 'default',
            smallIcon: 'ic_stat_water_drop',
            channelId: 'hydration-reminders',
            extra: {
              type: 'hydration-reminder',
              goalMl: settings.dailyGoalMl
            }
          });
        }
      }

      if (notifications.length > 0) {
        // Create notification channel for Android
        await createNotificationChannel();
        
        await LocalNotifications.schedule({ notifications });
        setPendingNotifications(notifications.length);
        
        console.log(`Scheduled ${notifications.length} hydration reminders`);
        toast.success(`${notifications.length} lembretes de hidratação agendados!`);
      }
    } catch (error) {
      console.error('Error scheduling notifications:', error);
      toast.error('Erro ao agendar notificações.');
    }
  }, [isNative, hasPermission, requestPermission]);

  const createNotificationChannel = async () => {
    try {
      await LocalNotifications.createChannel({
        id: 'hydration-reminders',
        name: 'Lembretes de Hidratação',
        description: 'Notificações para lembrar você de beber água',
        importance: 4, // High importance
        visibility: 1, // Public
        sound: 'default',
        vibration: true,
        lights: true,
        lightColor: '#00BCD4' // Cyan color
      });
    } catch (error) {
      console.log('Channel creation error (might already exist):', error);
    }
  };

  const cancelAllReminders = useCallback(async (): Promise<void> => {
    if (!isNative) return;

    try {
      const pending = await LocalNotifications.getPending();
      
      if (pending.notifications.length > 0) {
        const idsToCancel = pending.notifications
          .filter(n => n.id >= HYDRATION_NOTIFICATION_IDS.IMMEDIATE_ID)
          .map(n => ({ id: n.id }));
        
        if (idsToCancel.length > 0) {
          await LocalNotifications.cancel({ notifications: idsToCancel });
        }
      }
      
      setPendingNotifications(0);
      console.log('Cancelled all hydration reminders');
    } catch (error) {
      console.error('Error cancelling notifications:', error);
    }
  }, [isNative]);

  const sendImmediateReminder = useCallback(async (message?: string): Promise<void> => {
    if (!isNative) {
      // Fallback to browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('💧 Hora de beber água!', {
          body: message || 'Mantenha-se hidratado para melhor desempenho.',
          icon: '/pwa-192x192.png'
        });
      }
      return;
    }

    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) return;
    }

    try {
      await LocalNotifications.schedule({
        notifications: [{
          id: HYDRATION_NOTIFICATION_IDS.IMMEDIATE_ID,
          title: '💧 Hora de Hidratar!',
          body: message || getRandomHydrationMessage(),
          schedule: { at: new Date(Date.now() + 1000) }, // 1 second from now
          sound: 'default',
          channelId: 'hydration-reminders'
        }]
      });
    } catch (error) {
      console.error('Error sending immediate notification:', error);
    }
  }, [isNative, hasPermission, requestPermission]);

  return {
    isNative,
    hasPermission,
    pendingNotifications,
    requestPermission,
    scheduleHydrationReminders,
    cancelAllReminders,
    sendImmediateReminder
  };
};

// Helper function for random messages
const getRandomHydrationMessage = (): string => {
  const messages = [
    'Beba um copo de água agora! 💧',
    'Seu corpo precisa de hidratação. Beba água!',
    'Mantenha-se hidratado para melhor desempenho!',
    'Hora de hidratar! Seu corpo agradece. 🌊',
    'Pausa para a água! Hidratação é essencial.',
    'Lembrete: beba pelo menos 200ml agora.',
    'Água é vida! Não esqueça de se hidratar.',
    'Seu treino rende mais com hidratação adequada!',
    'Beba água regularmente para manter a energia.',
    'Hidratação em dia = saúde em dia! 💪'
  ];
  
  return messages[Math.floor(Math.random() * messages.length)];
};

export default useHydrationNotifications;

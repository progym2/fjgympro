import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Clock, Dumbbell, X, Check, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface WorkoutPlan {
  id: string;
  name: string;
}

interface ReminderSettings {
  enabled: boolean;
  time: string; // HH:MM format
  minutesBefore: number;
  days: number[]; // 0-6 for Sunday-Saturday
}

const daysOfWeek = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
];

const WorkoutReminder: React.FC = () => {
  const { profile } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [settings, setSettings] = useState<ReminderSettings>({
    enabled: false,
    time: '08:00',
    minutesBefore: 30,
    days: [1, 2, 3, 4, 5] // Monday to Friday by default
  });
  const [showSettings, setShowSettings] = useState(false);
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [nextReminder, setNextReminder] = useState<Date | null>(null);

  useEffect(() => {
    // Check notification permission
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
    
    // Load saved settings from localStorage
    const savedSettings = localStorage.getItem('workout_reminder_settings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }

    fetchPlans();
  }, [profile]);

  useEffect(() => {
    // Save settings to localStorage
    localStorage.setItem('workout_reminder_settings', JSON.stringify(settings));
    
    // Calculate next reminder
    if (settings.enabled) {
      calculateNextReminder();
    } else {
      setNextReminder(null);
    }
  }, [settings]);

  // Set up reminder check interval
  useEffect(() => {
    if (!settings.enabled || permission !== 'granted') return;

    const checkInterval = setInterval(() => {
      checkAndSendReminder();
    }, 60000); // Check every minute

    // Initial check
    checkAndSendReminder();

    return () => clearInterval(checkInterval);
  }, [settings, permission]);

  const fetchPlans = async () => {
    if (!profile?.profile_id) return;

    try {
      const { data } = await supabase
        .from('workout_plans')
        .select('id, name')
        .or(`created_by.eq.${profile.profile_id},assigned_to.eq.${profile.profile_id}`)
        .eq('is_active', true);

      setPlans(data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  };

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Seu navegador não suporta notificações');
      return;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        toast.success('Notificações ativadas!');
        setSettings(prev => ({ ...prev, enabled: true }));
      } else if (result === 'denied') {
        toast.error('Permissão negada. Ative nas configurações do navegador.');
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast.error('Erro ao solicitar permissão');
    }
  };

  const calculateNextReminder = () => {
    const now = new Date();
    const [hours, minutes] = settings.time.split(':').map(Number);
    
    // Calculate reminder time (subtract minutesBefore)
    let reminderMinutes = hours * 60 + minutes - settings.minutesBefore;
    let reminderHours = Math.floor(reminderMinutes / 60);
    reminderMinutes = reminderMinutes % 60;
    
    // Handle negative time (previous day)
    if (reminderHours < 0) {
      reminderHours += 24;
    }

    // Find next scheduled day
    let daysToAdd = 0;
    let found = false;
    
    for (let i = 0; i <= 7; i++) {
      const checkDay = (now.getDay() + i) % 7;
      if (settings.days.includes(checkDay)) {
        const checkDate = new Date(now);
        checkDate.setDate(now.getDate() + i);
        checkDate.setHours(reminderHours, reminderMinutes, 0, 0);
        
        if (checkDate > now) {
          setNextReminder(checkDate);
          found = true;
          break;
        }
      }
    }
    
    if (!found) {
      setNextReminder(null);
    }
  };

  const checkAndSendReminder = () => {
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
    
    // Check if current time matches reminder time (within 1 minute)
    const timeDiff = Math.abs(now.getTime() - reminderTime.getTime());
    
    if (timeDiff < 60000) { // Within 1 minute
      sendNotification();
    }
  };

  const sendNotification = () => {
    const lastSent = localStorage.getItem('last_workout_reminder');
    const today = new Date().toDateString();
    
    // Only send once per day
    if (lastSent === today) return;

    const notification = new Notification('💪 Hora de Treinar!', {
      body: `Seu treino está programado para daqui a ${settings.minutesBefore} minutos. Prepare-se!`,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'workout-reminder',
      requireInteraction: true
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    localStorage.setItem('last_workout_reminder', today);
    
    // Also show in-app toast
    toast('💪 Hora de Treinar!', {
      description: `Seu treino está programado para daqui a ${settings.minutesBefore} minutos!`,
      duration: 10000,
      action: {
        label: 'Ver Treinos',
        onClick: () => window.location.href = '/client/workouts'
      }
    });
  };

  const toggleDay = (day: number) => {
    setSettings(prev => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day].sort((a, b) => a - b)
    }));
  };

  const testNotification = () => {
    if (permission !== 'granted') {
      toast.error('Ative as notificações primeiro');
      return;
    }

    new Notification('🧪 Teste de Notificação', {
      body: 'Suas notificações de treino estão funcionando!',
      icon: '/favicon.ico'
    });

    toast.success('Notificação de teste enviada!');
  };

  const formatNextReminder = () => {
    if (!nextReminder) return 'Não agendado';
    
    const now = new Date();
    const diff = nextReminder.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `Em ${days} dia(s)`;
    } else if (hours > 0) {
      return `Em ${hours}h ${minutes}min`;
    } else {
      return `Em ${minutes} minutos`;
    }
  };

  return (
    <>
      <Card className="bg-gradient-to-br from-orange-500/10 to-yellow-500/10 border-orange-500/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bebas tracking-wider flex items-center gap-2">
            <Bell className="w-5 h-5 text-orange-500" />
            LEMBRETES DE TREINO
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Permission Status */}
          {permission !== 'granted' && (
            <div className="bg-background/50 rounded-lg p-3 border border-border/50">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <BellOff className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Notificações desativadas</span>
                </div>
                <Button size="sm" onClick={requestPermission}>
                  <Bell size={14} className="mr-1" />
                  Ativar
                </Button>
              </div>
            </div>
          )}

          {/* Quick Status */}
          {permission === 'granted' && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Switch
                  checked={settings.enabled}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enabled: checked }))}
                />
                <Label className="text-sm">
                  {settings.enabled ? 'Lembretes ativos' : 'Lembretes desativados'}
                </Label>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)}>
                <Settings size={16} />
              </Button>
            </div>
          )}

          {/* Next Reminder */}
          {settings.enabled && permission === 'granted' && (
            <div className="bg-background/50 rounded-lg p-3 border border-primary/30">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">Próximo lembrete:</span>
                <Badge variant="secondary" className="bg-primary/20 text-primary">
                  {formatNextReminder()}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Treino às {settings.time} • {settings.minutesBefore}min antes
              </p>
            </div>
          )}

          {/* Active Days Summary */}
          {settings.enabled && permission === 'granted' && (
            <div className="flex gap-1">
              {daysOfWeek.map(day => (
                <div
                  key={day.value}
                  className={`flex-1 text-center py-1 px-1 rounded text-[10px] font-medium ${
                    settings.days.includes(day.value)
                      ? 'bg-primary/20 text-primary border border-primary/30'
                      : 'bg-muted/30 text-muted-foreground'
                  }`}
                >
                  {day.label}
                </div>
              ))}
            </div>
          )}

          {/* Test Button */}
          {permission === 'granted' && (
            <Button variant="outline" size="sm" className="w-full" onClick={testNotification}>
              Testar Notificação
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Configurar Lembretes
            </DialogTitle>
            <DialogDescription>
              Configure quando você quer ser lembrado de treinar
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Workout Time */}
            <div className="space-y-2">
              <Label>Horário do Treino</Label>
              <input
                type="time"
                value={settings.time}
                onChange={(e) => setSettings(prev => ({ ...prev, time: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            {/* Minutes Before */}
            <div className="space-y-2">
              <Label>Lembrar antes do treino</Label>
              <Select
                value={settings.minutesBefore.toString()}
                onValueChange={(value) => setSettings(prev => ({ ...prev, minutesBefore: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutos antes</SelectItem>
                  <SelectItem value="30">30 minutos antes</SelectItem>
                  <SelectItem value="45">45 minutos antes</SelectItem>
                  <SelectItem value="60">1 hora antes</SelectItem>
                  <SelectItem value="120">2 horas antes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Days Selection */}
            <div className="space-y-2">
              <Label>Dias de Treino</Label>
              <div className="grid grid-cols-7 gap-1">
                {daysOfWeek.map(day => (
                  <button
                    key={day.value}
                    onClick={() => toggleDay(day.value)}
                    className={`p-2 rounded-lg text-center text-xs font-medium transition-colors ${
                      settings.days.includes(day.value)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Plans Info */}
            {plans.length > 0 && (
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-2">Seus planos ativos:</p>
                <div className="flex flex-wrap gap-1">
                  {plans.map(plan => (
                    <Badge key={plan.id} variant="outline" className="text-xs">
                      <Dumbbell size={10} className="mr-1" />
                      {plan.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowSettings(false)}>
              Cancelar
            </Button>
            <Button onClick={() => {
              setShowSettings(false);
              toast.success('Configurações salvas!');
            }}>
              <Check size={14} className="mr-1" />
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WorkoutReminder;

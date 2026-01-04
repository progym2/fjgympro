import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Bell, BellOff, Clock, Settings, Check, X, 
  ChevronRight, Smartphone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const DAYS = [
  { value: 0, label: 'Dom', full: 'Domingo' },
  { value: 1, label: 'Seg', full: 'Segunda' },
  { value: 2, label: 'Ter', full: 'Terça' },
  { value: 3, label: 'Qua', full: 'Quarta' },
  { value: 4, label: 'Qui', full: 'Quinta' },
  { value: 5, label: 'Sex', full: 'Sexta' },
  { value: 6, label: 'Sáb', full: 'Sábado' },
];

const PushNotificationSetup: React.FC = () => {
  const {
    isSupported,
    permission,
    settings,
    requestPermission,
    updateSettings,
    toggleDay,
    testNotification,
    getNextReminderTime
  } = usePushNotifications();

  const [showSettings, setShowSettings] = useState(false);
  const nextReminder = getNextReminderTime();

  if (!isSupported) {
    return (
      <Card className="bg-muted/30 border-border/50">
        <CardContent className="p-4 flex items-center gap-3">
          <BellOff className="w-5 h-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Notificações não suportadas</p>
            <p className="text-xs text-muted-foreground">
              Seu navegador não suporta notificações push
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-gradient-to-br from-primary/10 to-orange-500/10 border-primary/30 overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bebas tracking-wider flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            NOTIFICAÇÕES PUSH
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Permission not granted */}
          {permission !== 'granted' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card/80 rounded-lg p-3 border border-border/50"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Receba lembretes de treino</span>
                </div>
                <Button size="sm" onClick={requestPermission} className="bg-primary">
                  <Bell size={14} className="mr-1" />
                  Ativar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Nunca mais esqueça de treinar! Receba notificações no horário programado.
              </p>
            </motion.div>
          )}

          {/* Permission granted - Quick controls */}
          {permission === 'granted' && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={settings.enabled}
                    onCheckedChange={(enabled) => updateSettings({ enabled })}
                  />
                  <span className="text-sm">
                    {settings.enabled ? 'Lembretes ativos' : 'Lembretes desativados'}
                  </span>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setShowSettings(true)}
                  className="h-8 w-8"
                >
                  <Settings size={16} />
                </Button>
              </div>

              {/* Next reminder */}
              {settings.enabled && nextReminder && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-card/80 rounded-lg p-3 border border-primary/30"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Próximo lembrete:</span>
                    <Badge className="bg-primary/20 text-primary text-xs">
                      {formatDistanceToNow(nextReminder, { addSuffix: true, locale: ptBR })}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Treino às {settings.time} • {settings.minutesBefore}min antes
                  </p>
                </motion.div>
              )}

              {/* Active days preview */}
              {settings.enabled && (
                <div className="flex gap-1">
                  {DAYS.map(day => (
                    <div
                      key={day.value}
                      className={`flex-1 text-center py-1 rounded text-[10px] font-medium transition-colors ${
                        settings.days.includes(day.value)
                          ? 'bg-primary/20 text-primary'
                          : 'bg-muted/30 text-muted-foreground'
                      }`}
                    >
                      {day.label}
                    </div>
                  ))}
                </div>
              )}

              {/* Test button */}
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full" 
                onClick={testNotification}
              >
                Testar Notificação
              </Button>
            </>
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
              <label className="text-sm font-medium">Horário do Treino</label>
              <input
                type="time"
                value={settings.time}
                onChange={(e) => updateSettings({ time: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            {/* Minutes Before */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Lembrar antes do treino</label>
              <Select
                value={settings.minutesBefore.toString()}
                onValueChange={(value) => updateSettings({ minutesBefore: parseInt(value) })}
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
              <label className="text-sm font-medium">Dias de Treino</label>
              <div className="grid grid-cols-7 gap-1">
                {DAYS.map(day => (
                  <motion.button
                    key={day.value}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => toggleDay(day.value)}
                    className={`p-2 rounded-lg text-center text-xs font-medium transition-all ${
                      settings.days.includes(day.value)
                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {day.label}
                  </motion.button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowSettings(false)}>
              Fechar
            </Button>
            <Button onClick={() => {
              setShowSettings(false);
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

export default PushNotificationSetup;

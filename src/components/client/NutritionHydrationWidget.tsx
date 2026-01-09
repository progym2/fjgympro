import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Droplets, Plus, Target, TrendingUp, Bell, BellOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { format, startOfDay, endOfDay } from 'date-fns';

interface HydrationRecord {
  id: string;
  amount_ml: number;
  recorded_at: string;
}

interface HydrationSettings {
  daily_goal_ml: number;
  reminder_enabled: boolean;
  reminder_interval_minutes: number;
  start_hour: number;
  end_hour: number;
}

const NutritionHydrationWidget: React.FC = () => {
  const { profile } = useAuth();
  const [records, setRecords] = useState<HydrationRecord[]>([]);
  const [settings, setSettings] = useState<HydrationSettings>({
    daily_goal_ml: 2000,
    reminder_enabled: false,
    reminder_interval_minutes: 60,
    start_hour: 7,
    end_hour: 22
  });
  const [saving, setSaving] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [customAmount, setCustomAmount] = useState('');

  useEffect(() => {
    if (profile?.profile_id) {
      fetchData();
    }
  }, [profile?.profile_id]);

  // Reminder effect
  useEffect(() => {
    if (!settings.reminder_enabled) return;
    
    const checkReminder = () => {
      const now = new Date();
      const currentHour = now.getHours();
      
      if (currentHour >= settings.start_hour && currentHour < settings.end_hour) {
        const totalToday = records.reduce((sum, r) => sum + r.amount_ml, 0);
        const progressPercentage = (totalToday / settings.daily_goal_ml) * 100;
        
        // Remind if below expected progress for time of day
        const expectedProgress = ((currentHour - settings.start_hour) / (settings.end_hour - settings.start_hour)) * 100;
        
        if (progressPercentage < expectedProgress - 20) {
          toast.info('💧 Hora de beber água!', {
            description: `Você bebeu ${totalToday}ml de ${settings.daily_goal_ml}ml hoje`,
            duration: 5000
          });
        }
      }
    };

    const interval = setInterval(checkReminder, settings.reminder_interval_minutes * 60 * 1000);
    return () => clearInterval(interval);
  }, [settings, records]);

  const fetchData = async () => {
    if (!profile?.profile_id) return;

    try {
      const today = new Date();
      
      // Fetch today's records
      const { data: recordsData } = await supabase
        .from('hydration_records')
        .select('*')
        .eq('profile_id', profile.profile_id)
        .gte('recorded_at', startOfDay(today).toISOString())
        .lte('recorded_at', endOfDay(today).toISOString())
        .order('recorded_at', { ascending: false });

      setRecords(recordsData || []);

      // Fetch settings
      const { data: settingsData } = await supabase
        .from('hydration_settings')
        .select('*')
        .eq('profile_id', profile.profile_id)
        .maybeSingle();

      if (settingsData) {
        setSettings({
          daily_goal_ml: settingsData.daily_goal_ml || 2000,
          reminder_enabled: settingsData.reminder_enabled || false,
          reminder_interval_minutes: settingsData.reminder_interval_minutes || 60,
          start_hour: settingsData.start_hour || 7,
          end_hour: settingsData.end_hour || 22
        });
      }
    } catch (error) {
      console.error('Error fetching hydration data:', error);
    }
  };

  const addWater = async (amount: number) => {
    if (!profile?.profile_id || amount <= 0 || saving) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('hydration_records')
        .insert({
          profile_id: profile.profile_id,
          amount_ml: amount
        });

      if (error) throw error;

      toast.success(`💧 +${amount}ml adicionado!`);
      fetchData();
      setCustomAmount('');
    } catch (error) {
      console.error('Error adding water:', error);
      toast.error('Erro ao registrar');
    } finally {
      setSaving(false);
    }
  };

  const saveSettings = async () => {
    if (!profile?.profile_id) return;

    try {
      const { error } = await supabase
        .from('hydration_settings')
        .upsert({
          profile_id: profile.profile_id,
          daily_goal_ml: settings.daily_goal_ml,
          reminder_enabled: settings.reminder_enabled,
          reminder_interval_minutes: settings.reminder_interval_minutes,
          start_hour: settings.start_hour,
          end_hour: settings.end_hour
        });

      if (error) throw error;
      toast.success('Configurações salvas!');
      setShowSettings(false);
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Erro ao salvar');
    }
  };

  const totalToday = records.reduce((sum, r) => sum + r.amount_ml, 0);
  const progressPercentage = Math.min((totalToday / settings.daily_goal_ml) * 100, 100);
  const remaining = Math.max(settings.daily_goal_ml - totalToday, 0);
  const glasses = Math.floor(totalToday / 250);

  return (
    <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Droplets className="w-5 h-5 text-cyan-500" />
            <span className="font-bebas text-lg text-cyan-500">HIDRATAÇÃO</span>
          </span>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="h-7 px-2"
            >
              {settings.reminder_enabled ? (
                <Bell className="w-4 h-4 text-cyan-500" />
              ) : (
                <BellOff className="w-4 h-4 text-muted-foreground" />
              )}
            </Button>
            <Badge variant="outline" className="bg-background/50">
              {glasses} copos
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-3 bg-background/50 rounded-lg space-y-3 border border-border/50"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Meta diária (ml)</Label>
                  <Input
                    type="number"
                    value={settings.daily_goal_ml}
                    onChange={(e) => setSettings({ ...settings, daily_goal_ml: parseInt(e.target.value) || 2000 })}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">Intervalo (min)</Label>
                  <Input
                    type="number"
                    value={settings.reminder_interval_minutes}
                    onChange={(e) => setSettings({ ...settings, reminder_interval_minutes: parseInt(e.target.value) || 60 })}
                    className="h-8"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={settings.reminder_enabled}
                    onCheckedChange={(checked) => setSettings({ ...settings, reminder_enabled: checked })}
                  />
                  <Label className="text-xs">Lembretes ativos</Label>
                </div>
                <Button size="sm" onClick={saveSettings} className="h-7">
                  Salvar
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-2xl font-bold text-cyan-500">{totalToday}ml</span>
            <span className="text-sm text-muted-foreground">/ {settings.daily_goal_ml}ml</span>
          </div>
          
          <div className="relative h-4 bg-background/50 rounded-full overflow-hidden border border-cyan-500/30">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
            />
            {/* Wave effect */}
            <motion.div
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-y-0 w-20 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              style={{ left: 0 }}
            />
          </div>
          
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{Math.round(progressPercentage)}% concluído</span>
            {remaining > 0 && <span>Faltam {remaining}ml</span>}
          </div>
        </div>

        {/* Quick Add Buttons */}
        <div className="grid grid-cols-4 gap-2">
          {[150, 200, 250, 300].map((amount) => (
            <motion.button
              key={amount}
              whileTap={{ scale: 0.95 }}
              onClick={() => addWater(amount)}
              disabled={saving}
              className="py-2 px-1 rounded-lg bg-background/50 border border-cyan-500/30 hover:border-cyan-500 hover:bg-cyan-500/10 transition-all disabled:opacity-50"
            >
              <span className="text-sm font-bold text-cyan-500">+{amount}</span>
              <p className="text-[10px] text-muted-foreground">ml</p>
            </motion.button>
          ))}
        </div>

        {/* Custom Amount */}
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Quantidade personalizada"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            className="h-9 bg-background/50"
          />
          <Button 
            onClick={() => customAmount && addWater(parseInt(customAmount))}
            disabled={!customAmount || saving}
            size="sm"
            className="bg-cyan-500 hover:bg-cyan-600"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Recent Records */}
        {records.length > 0 && (
          <div className="pt-3 border-t border-border/50">
            <p className="text-xs text-muted-foreground mb-2">Registros de hoje</p>
            <div className="flex flex-wrap gap-1">
              {records.slice(0, 8).map((record) => (
                <Badge key={record.id} variant="outline" className="text-xs bg-background/50">
                  {record.amount_ml}ml às {format(new Date(record.recorded_at), 'HH:mm')}
                </Badge>
              ))}
              {records.length > 8 && (
                <Badge variant="outline" className="text-xs">+{records.length - 8}</Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NutritionHydrationWidget;

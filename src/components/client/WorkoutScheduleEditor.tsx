import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar as CalendarIcon, Clock, Save, X, Check,
  Repeat, CalendarDays, Timer
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface WorkoutPlan {
  id: string;
  name: string;
  description: string | null;
  weekdays: number[] | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
}

interface WorkoutScheduleEditorProps {
  isOpen: boolean;
  onClose: () => void;
  plan: WorkoutPlan | null;
  onSuccess: () => void;
}

const DAYS = [
  { value: 0, label: 'Dom', full: 'Domingo' },
  { value: 1, label: 'Seg', full: 'Segunda' },
  { value: 2, label: 'Ter', full: 'Terça' },
  { value: 3, label: 'Qua', full: 'Quarta' },
  { value: 4, label: 'Qui', full: 'Quinta' },
  { value: 5, label: 'Sex', full: 'Sexta' },
  { value: 6, label: 'Sáb', full: 'Sábado' },
];

const WorkoutScheduleEditor: React.FC<WorkoutScheduleEditorProps> = ({
  isOpen,
  onClose,
  plan,
  onSuccess
}) => {
  const [saving, setSaving] = useState(false);
  const [scheduleType, setScheduleType] = useState<'weekdays' | 'date' | 'none'>('none');
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [scheduledTime, setScheduledTime] = useState<string>('');
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  // Reset form when plan changes
  useEffect(() => {
    if (plan) {
      if (plan.weekdays && plan.weekdays.length > 0) {
        setScheduleType('weekdays');
        setSelectedWeekdays(plan.weekdays);
      } else if (plan.scheduled_date) {
        setScheduleType('date');
        setSelectedDate(new Date(plan.scheduled_date));
      } else {
        setScheduleType('none');
        setSelectedWeekdays([]);
        setSelectedDate(undefined);
      }
      setScheduledTime(plan.scheduled_time ? plan.scheduled_time.slice(0, 5) : '');
    }
  }, [plan]);

  const toggleWeekday = (day: number) => {
    if (selectedWeekdays.includes(day)) {
      setSelectedWeekdays(selectedWeekdays.filter(d => d !== day));
    } else {
      setSelectedWeekdays([...selectedWeekdays, day].sort((a, b) => a - b));
    }
  };

  const handleSave = async () => {
    if (!plan) return;

    setSaving(true);
    try {
      const updateData: any = {
        weekdays: null,
        scheduled_date: null,
        scheduled_time: scheduledTime || null,
      };

      if (scheduleType === 'weekdays' && selectedWeekdays.length > 0) {
        updateData.weekdays = selectedWeekdays;
      } else if (scheduleType === 'date' && selectedDate) {
        updateData.scheduled_date = format(selectedDate, 'yyyy-MM-dd');
      }

      const { error } = await supabase
        .from('workout_plans')
        .update(updateData)
        .eq('id', plan.id);

      if (error) throw error;

      toast.success('Agendamento atualizado com sucesso!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error updating schedule:', error);
      toast.error(error.message || 'Erro ao atualizar agendamento');
    } finally {
      setSaving(false);
    }
  };

  const getScheduleSummary = () => {
    if (scheduleType === 'weekdays' && selectedWeekdays.length > 0) {
      const dayNames = selectedWeekdays.map(d => DAYS[d].label).join(', ');
      return `Repete: ${dayNames}`;
    } else if (scheduleType === 'date' && selectedDate) {
      return `Data: ${format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}`;
    }
    return 'Sem agendamento (disponível sempre)';
  };

  if (!plan) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary" />
            Agendar Treino
          </DialogTitle>
          <DialogDescription>
            Configure quando você deseja executar "{plan.name}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Schedule Type Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Tipo de Agendamento</Label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => {
                  setScheduleType('none');
                  setSelectedWeekdays([]);
                  setSelectedDate(undefined);
                }}
                className={cn(
                  "p-3 rounded-lg border text-center transition-all",
                  scheduleType === 'none'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <Check size={20} className="mx-auto mb-1" />
                <span className="text-xs">Livre</span>
              </button>
              <button
                onClick={() => {
                  setScheduleType('weekdays');
                  setSelectedDate(undefined);
                }}
                className={cn(
                  "p-3 rounded-lg border text-center transition-all",
                  scheduleType === 'weekdays'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <Repeat size={20} className="mx-auto mb-1" />
                <span className="text-xs">Semanal</span>
              </button>
              <button
                onClick={() => {
                  setScheduleType('date');
                  setSelectedWeekdays([]);
                }}
                className={cn(
                  "p-3 rounded-lg border text-center transition-all",
                  scheduleType === 'date'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <CalendarDays size={20} className="mx-auto mb-1" />
                <span className="text-xs">Data</span>
              </button>
            </div>
          </div>

          {/* Weekdays Selection */}
          {scheduleType === 'weekdays' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <Label className="text-sm font-medium">Dias da Semana</Label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day) => (
                  <button
                    key={day.value}
                    onClick={() => toggleWeekday(day.value)}
                    className={cn(
                      "w-11 h-11 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                      selectedWeekdays.includes(day.value)
                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                        : 'bg-muted hover:bg-muted/80'
                    )}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
              {selectedWeekdays.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Selecione pelo menos um dia da semana
                </p>
              )}
            </motion.div>
          )}

          {/* Date Selection */}
          {scheduleType === 'date' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <Label className="text-sm font-medium">Data Específica</Label>
              <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate
                      ? format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                      : "Selecione uma data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      setSelectedDate(date);
                      setDatePopoverOpen(false);
                    }}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </motion.div>
          )}

          {/* Time Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Clock size={14} />
                Horário Preferido
              </Label>
              <span className="text-xs text-muted-foreground">(opcional)</span>
            </div>
            <Input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Defina um horário para receber lembretes
            </p>
          </div>

          {/* Summary */}
          <div className="bg-muted/50 rounded-lg p-3 border border-border/50">
            <div className="flex items-center gap-2 text-sm">
              <Timer size={14} className="text-primary" />
              <span className="font-medium">Resumo:</span>
              <span className="text-muted-foreground">{getScheduleSummary()}</span>
            </div>
            {scheduledTime && (
              <div className="flex items-center gap-2 text-sm mt-1">
                <Clock size={14} className="text-primary" />
                <span className="text-muted-foreground">às {scheduledTime}</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            <X size={14} className="mr-1" />
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || (scheduleType === 'weekdays' && selectedWeekdays.length === 0) || (scheduleType === 'date' && !selectedDate)}
          >
            {saving ? (
              <>Salvando...</>
            ) : (
              <>
                <Save size={14} className="mr-1" />
                Salvar Agendamento
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WorkoutScheduleEditor;

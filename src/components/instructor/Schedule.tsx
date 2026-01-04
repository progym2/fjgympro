import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, User, Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAudio } from '@/contexts/AudioContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import InstructorPageHeader from './InstructorPageHeader';

interface ScheduleEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  duration_minutes: number;
  client_id: string | null;
  client_name?: string;
  notes?: string;
}

interface Client {
  id: string;
  full_name: string;
  username: string;
}

const Schedule: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { playClickSound } = useAudio();
  
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Form state
  const [newEvent, setNewEvent] = useState({
    title: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '08:00',
    duration_minutes: 60,
    client_id: '',
    notes: ''
  });

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  const timeSlots = Array.from({ length: 15 }, (_, i) => `${(6 + i).toString().padStart(2, '0')}:00`);

  useEffect(() => {
    if (profile?.profile_id) {
      loadClients();
      loadEvents();
    }
  }, [profile?.profile_id, currentWeekStart]);

  const loadClients = async () => {
    if (!profile?.profile_id) return;
    
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
      .eq('instructor_id', profile.profile_id)
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

  const loadEvents = async () => {
    setLoading(true);
    // For now, we'll use a local storage simulation since we don't have a schedule table
    // In production, this would fetch from a schedules table
    const storedEvents = localStorage.getItem(`instructor_schedule_${profile?.profile_id}`);
    if (storedEvents) {
      const parsed = JSON.parse(storedEvents);
      setEvents(parsed);
    }
    setLoading(false);
  };

  const saveEvents = (newEvents: ScheduleEvent[]) => {
    localStorage.setItem(`instructor_schedule_${profile?.profile_id}`, JSON.stringify(newEvents));
    setEvents(newEvents);
  };

  const handleAddEvent = () => {
    if (!newEvent.title || !newEvent.date || !newEvent.time) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const client = clients.find(c => c.id === newEvent.client_id);
    const event: ScheduleEvent = {
      id: crypto.randomUUID(),
      title: newEvent.title,
      date: newEvent.date,
      time: newEvent.time,
      duration_minutes: newEvent.duration_minutes,
      client_id: newEvent.client_id || null,
      client_name: client?.full_name,
      notes: newEvent.notes
    };

    saveEvents([...events, event]);
    setNewEvent({
      title: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      time: '08:00',
      duration_minutes: 60,
      client_id: '',
      notes: ''
    });
    setDialogOpen(false);
    toast.success('Evento adicionado com sucesso!');
  };

  const handleDeleteEvent = (eventId: string) => {
    playClickSound();
    const newEvents = events.filter(e => e.id !== eventId);
    saveEvents(newEvents);
    toast.success('Evento removido!');
  };

  const getEventsForDay = (day: Date) => {
    return events.filter(e => isSameDay(parseISO(e.date), day));
  };

  const previousWeek = () => {
    playClickSound();
    setCurrentWeekStart(addDays(currentWeekStart, -7));
  };

  const nextWeek = () => {
    playClickSound();
    setCurrentWeekStart(addDays(currentWeekStart, 7));
  };

  const goToToday = () => {
    playClickSound();
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-full"
    >
      <InstructorPageHeader 
        title="AGENDA"
        icon={<Calendar className="w-6 h-6" />}
        iconColor="text-cyan-500"
      />
      
      <div className="flex-1 overflow-auto space-y-4 sm:space-y-6">
        {/* Actions */}
        <div className="flex justify-end w-full sm:w-auto">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                onClick={() => playClickSound()} 
                className="bg-cyan-600 hover:bg-cyan-700 flex-1 sm:flex-initial"
              >
                <Plus size={18} className="mr-2" />
                Novo Evento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="font-bebas text-cyan-500 text-xl">
                  Adicionar Evento
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Título *</Label>
                  <Input
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    placeholder="Ex: Treino de Força"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data *</Label>
                    <Input
                      type="date"
                      value={newEvent.date}
                      onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Horário *</Label>
                    <Input
                      type="time"
                      value={newEvent.time}
                      onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Duração (min)</Label>
                    <Select
                      value={newEvent.duration_minutes.toString()}
                      onValueChange={(v) => setNewEvent({ ...newEvent, duration_minutes: parseInt(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 min</SelectItem>
                        <SelectItem value="45">45 min</SelectItem>
                        <SelectItem value="60">1 hora</SelectItem>
                        <SelectItem value="90">1h30</SelectItem>
                        <SelectItem value="120">2 horas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Aluno</Label>
                    <Select
                      value={newEvent.client_id || "none"}
                      onValueChange={(v) => setNewEvent({ ...newEvent, client_id: v === "none" ? "" : v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {clients.map(client => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Input
                    value={newEvent.notes}
                    onChange={(e) => setNewEvent({ ...newEvent, notes: e.target.value })}
                    placeholder="Notas adicionais..."
                  />
                </div>
                <Button onClick={handleAddEvent} className="w-full bg-cyan-600 hover:bg-cyan-700">
                  Adicionar Evento
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

      {/* Week Navigation */}
      <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50">
        <div className="flex items-center justify-between mb-4">
          <Button variant="outline" size="sm" onClick={previousWeek}>
            <ChevronLeft size={18} />
          </Button>
          <div className="text-center">
            <h3 className="font-bebas text-lg text-foreground">
              {format(currentWeekStart, "dd 'de' MMMM", { locale: ptBR })} - {format(addDays(currentWeekStart, 6), "dd 'de' MMMM", { locale: ptBR })}
            </h3>
            <button 
              onClick={goToToday}
              className="text-xs text-cyan-500 hover:underline"
            >
              Ir para hoje
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={nextWeek}>
            <ChevronRight size={18} />
          </Button>
        </div>

        {/* Week Grid */}
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day, index) => {
            const dayEvents = getEventsForDay(day);
            const isToday = isSameDay(day, new Date());
            
            return (
              <div 
                key={index} 
                className={`min-h-[120px] p-2 rounded-lg border ${
                  isToday 
                    ? 'border-cyan-500 bg-cyan-500/10' 
                    : 'border-border/50 bg-background/50'
                }`}
              >
                <div className={`text-center mb-2 ${isToday ? 'text-cyan-500' : 'text-muted-foreground'}`}>
                  <p className="text-xs font-medium">
                    {format(day, 'EEE', { locale: ptBR }).toUpperCase()}
                  </p>
                  <p className={`text-lg font-bebas ${isToday ? 'text-cyan-500' : 'text-foreground'}`}>
                    {format(day, 'd')}
                  </p>
                </div>
                <div className="space-y-1">
                  {dayEvents.map(event => (
                    <div 
                      key={event.id}
                      className="p-1.5 bg-cyan-500/20 rounded text-xs border border-cyan-500/30 group relative"
                    >
                      <div className="flex items-center gap-1">
                        <Clock size={10} className="text-cyan-500" />
                        <span className="text-cyan-500 font-medium">{event.time}</span>
                      </div>
                      <p className="text-foreground truncate font-medium">{event.title}</p>
                      {event.client_name && (
                        <p className="text-muted-foreground truncate flex items-center gap-1">
                          <User size={10} /> {event.client_name}
                        </p>
                      )}
                      <button
                        onClick={() => handleDeleteEvent(event.id)}
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-0.5 hover:bg-destructive/20 rounded transition-opacity"
                      >
                        <Trash2 size={12} className="text-destructive" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming Events List */}
      <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-border/50">
        <h3 className="font-bebas text-lg text-cyan-500 mb-4">PRÓXIMOS EVENTOS</h3>
        <div className="space-y-2">
          {events
            .filter(e => new Date(`${e.date}T${e.time}`) >= new Date())
            .sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime())
            .slice(0, 5)
            .map(event => (
              <div 
                key={event.id}
                className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                    <Calendar size={20} className="text-cyan-500" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{event.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(parseISO(event.date), "dd/MM/yyyy")} às {event.time}
                      {event.client_name && ` • ${event.client_name}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteEvent(event.id)}
                  className="p-2 hover:bg-destructive/20 rounded-lg transition-colors"
                >
                  <Trash2 size={16} className="text-destructive" />
                </button>
              </div>
            ))}
          {events.filter(e => new Date(`${e.date}T${e.time}`) >= new Date()).length === 0 && (
            <p className="text-muted-foreground text-center py-4">Nenhum evento agendado</p>
          )}
        </div>
      </div>
      </div>
    </motion.div>
  );
};

export default Schedule;

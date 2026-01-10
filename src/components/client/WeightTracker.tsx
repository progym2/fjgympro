import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Scale, Plus, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ClientPageHeader from './ClientPageHeader';

interface WeightRecord {
  id: string;
  weight_kg: number;
  body_fat_percentage: number | null;
  muscle_mass_kg: number | null;
  notes: string | null;
  recorded_at: string;
}

const WeightTracker: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [records, setRecords] = useState<WeightRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    weight_kg: '',
    body_fat_percentage: '',
    muscle_mass_kg: '',
    notes: ''
  });

  useEffect(() => {
    if (profile) {
      fetchRecords();
    }
  }, [profile]);

  const fetchRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('weight_records')
        .select('*')
        .eq('profile_id', profile?.profile_id)
        .order('recorded_at', { ascending: false })
        .limit(30);

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error('Error fetching weight records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.profile_id || !formData.weight_kg) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('weight_records')
        .insert({
          profile_id: profile.profile_id,
          weight_kg: parseFloat(formData.weight_kg),
          body_fat_percentage: formData.body_fat_percentage ? parseFloat(formData.body_fat_percentage) : null,
          muscle_mass_kg: formData.muscle_mass_kg ? parseFloat(formData.muscle_mass_kg) : null,
          notes: formData.notes || null
        });

      if (error) throw error;

      toast.success('Registro adicionado!');
      setFormData({ weight_kg: '', body_fat_percentage: '', muscle_mass_kg: '', notes: '' });
      setShowForm(false);
      fetchRecords();
    } catch (error: any) {
      console.error('Error saving weight record:', error);
      toast.error('Erro ao salvar registro');
    } finally {
      setSaving(false);
    }
  };

  const chartData = [...records]
    .reverse()
    .map(r => ({
      date: format(new Date(r.recorded_at), 'dd/MM', { locale: ptBR }),
      peso: r.weight_kg,
      gordura: r.body_fat_percentage,
      massa: r.muscle_mass_kg
    }));

  const getWeightChange = () => {
    if (records.length < 2) return null;
    const change = records[0].weight_kg - records[1].weight_kg;
    return change;
  };

  const weightChange = getWeightChange();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col overflow-hidden"
    >
      <ClientPageHeader 
        title="PESO E EVOLUÇÃO" 
        icon={<Scale className="w-5 h-5" />} 
        iconColor="text-green-500" 
      />

      <div className="flex-1 overflow-auto space-y-6">
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => setShowForm(!showForm)}>
            <Plus size={18} className="mr-2" /> Novo Registro
          </Button>
        </div>

        {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50">
          <p className="text-sm text-muted-foreground">Peso Atual</p>
          <p className="text-2xl font-bold text-foreground">
            {records[0]?.weight_kg?.toFixed(1) || '-'} kg
          </p>
        </div>
        <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50">
          <p className="text-sm text-muted-foreground">Variação</p>
          <div className="flex items-center gap-2">
            {weightChange !== null ? (
              <>
                {weightChange > 0 ? (
                  <TrendingUp className="w-5 h-5 text-red-500" />
                ) : weightChange < 0 ? (
                  <TrendingDown className="w-5 h-5 text-green-500" />
                ) : (
                  <Minus className="w-5 h-5 text-muted-foreground" />
                )}
                <span className={`text-2xl font-bold ${
                  weightChange > 0 ? 'text-red-500' : weightChange < 0 ? 'text-green-500' : 'text-muted-foreground'
                }`}>
                  {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)} kg
                </span>
              </>
            ) : (
              <span className="text-2xl font-bold text-muted-foreground">-</span>
            )}
          </div>
        </div>
        <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50">
          <p className="text-sm text-muted-foreground">% Gordura</p>
          <p className="text-2xl font-bold text-foreground">
            {records[0]?.body_fat_percentage?.toFixed(1) || '-'}%
          </p>
        </div>
        <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50">
          <p className="text-sm text-muted-foreground">Massa Muscular</p>
          <p className="text-2xl font-bold text-foreground">
            {records[0]?.muscle_mass_kg?.toFixed(1) || '-'} kg
          </p>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <motion.form
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          onSubmit={handleSubmit}
          className="bg-card/80 backdrop-blur-md rounded-xl p-6 border border-green-500/30 space-y-4"
        >
          <h3 className="font-bebas text-lg text-green-500">NOVO REGISTRO</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Peso (kg) *</Label>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={formData.weight_kg}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || parseFloat(val) >= 0) {
                    setFormData({ ...formData, weight_kg: val });
                  }
                }}
                placeholder="70.0"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>% Gordura Corporal</Label>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={formData.body_fat_percentage}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || parseFloat(val) >= 0) {
                    setFormData({ ...formData, body_fat_percentage: val });
                  }
                }}
                placeholder="15.0"
              />
            </div>
            <div className="space-y-2">
              <Label>Massa Muscular (kg)</Label>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={formData.muscle_mass_kg}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || parseFloat(val) >= 0) {
                    setFormData({ ...formData, muscle_mass_kg: val });
                  }
                }}
                placeholder="30.0"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Anotações sobre este registro..."
              rows={2}
            />
          </div>
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? 'Salvando...' : 'Salvar Registro'}
          </Button>
        </motion.form>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-card/80 backdrop-blur-md rounded-xl p-6 border border-border/50">
          <h3 className="font-bebas text-lg mb-4">EVOLUÇÃO DO PESO</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" stroke="#888" fontSize={12} />
                <YAxis stroke="#888" fontSize={12} domain={['auto', 'auto']} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                  labelStyle={{ color: '#888' }}
                />
                <Line type="monotone" dataKey="peso" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* History */}
      <div className="bg-card/80 backdrop-blur-md rounded-xl p-6 border border-border/50">
        <h3 className="font-bebas text-lg mb-4">HISTÓRICO</h3>
        {loading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : records.length === 0 ? (
          <p className="text-muted-foreground">Nenhum registro encontrado</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {records.map((record) => (
              <div key={record.id} className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                <div>
                  <p className="font-medium">{record.weight_kg.toFixed(1)} kg</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(record.recorded_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <div className="text-right text-sm">
                  {record.body_fat_percentage && (
                    <p className="text-muted-foreground">{record.body_fat_percentage}% gordura</p>
                  )}
                  {record.muscle_mass_kg && (
                    <p className="text-muted-foreground">{record.muscle_mass_kg}kg massa</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
    </motion.div>
  );
};

export default WeightTracker;

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Settings, Building, Clock, Save, Loader2, AlertTriangle, Shield } from 'lucide-react';
import { useAudio } from '@/contexts/AudioContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

const AdminSettings: React.FC = () => {
  const navigate = useNavigate();
  const { playClickSound } = useAudio();
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState({
    gymName: 'FrancGymPro',
    gymAddress: '',
    gymPhone: '',
    openTime: '06:00',
    closeTime: '22:00',
    allowDemoAccounts: true,
    trialDays: 7,
    demoMinutes: 30,
  });

  const handleSave = () => {
    playClickSound();
    setSaving(true);
    
    // Simulate save
    setTimeout(() => {
      setSaving(false);
      toast.success('Configurações salvas!');
    }, 1000);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => { playClickSound(); navigate('/admin'); }}
          className="text-sm text-muted-foreground hover:text-blue-500 transition-colors"
        >
          ← Voltar
        </button>
        <h2 className="text-xl sm:text-2xl font-bebas text-gray-500 flex items-center gap-2">
          <Settings className="w-6 h-6" />
          CONFIGURAÇÕES
        </h2>
      </div>

      <div className="space-y-4">
        {/* Gym Info */}
        <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-border/50 space-y-4">
          <h3 className="font-bebas text-lg flex items-center gap-2">
            <Building className="w-5 h-5" />
            INFORMAÇÕES DA ACADEMIA
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Nome da Academia</label>
              <Input
                value={settings.gymName}
                onChange={(e) => setSettings({ ...settings, gymName: e.target.value })}
                className="bg-background/50"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Telefone</label>
              <Input
                value={settings.gymPhone}
                onChange={(e) => setSettings({ ...settings, gymPhone: e.target.value })}
                className="bg-background/50"
                placeholder="(00) 0000-0000"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm text-muted-foreground mb-2 block">Endereço</label>
              <Input
                value={settings.gymAddress}
                onChange={(e) => setSettings({ ...settings, gymAddress: e.target.value })}
                className="bg-background/50"
                placeholder="Rua, número, bairro, cidade"
              />
            </div>
          </div>
        </div>

        {/* Hours */}
        <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-border/50 space-y-4">
          <h3 className="font-bebas text-lg flex items-center gap-2">
            <Clock className="w-5 h-5" />
            HORÁRIO DE FUNCIONAMENTO
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Abertura</label>
              <Input
                type="time"
                value={settings.openTime}
                onChange={(e) => setSettings({ ...settings, openTime: e.target.value })}
                className="bg-background/50"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Fechamento</label>
              <Input
                type="time"
                value={settings.closeTime}
                onChange={(e) => setSettings({ ...settings, closeTime: e.target.value })}
                className="bg-background/50"
              />
            </div>
          </div>
        </div>

        {/* Demo/Trial Settings - Only visible info, management moved to Master */}
        <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-yellow-500/30 space-y-4">
          <h3 className="font-bebas text-lg flex items-center gap-2 text-yellow-500">
            <AlertTriangle className="w-5 h-5" />
            CONTAS DE TESTE
          </h3>
          
          <div className="text-center py-4 text-muted-foreground">
            <Shield className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">O gerenciamento de contas de teste está disponível apenas no Painel Master.</p>
            <p className="text-xs mt-1">Acesse com credenciais master para configurar.</p>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>
    </motion.div>
  );
};

export default AdminSettings;

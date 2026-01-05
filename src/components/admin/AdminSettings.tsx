import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Settings, Building, Clock, Save, Loader2, AlertTriangle, Shield, Wallet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAudio } from '@/contexts/AudioContext';
import { useAuth } from '@/contexts/AuthContext';
import { useEscapeBack } from '@/hooks/useEscapeBack';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface GymSettings {
  gymName: string;
  gymAddress: string;
  gymPhone: string;
  openTime: string;
  closeTime: string;
  pixKey: string;
  pixKeyType: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';
}

const AdminSettings: React.FC = () => {
  const navigate = useNavigate();
  const { playClickSound } = useAudio();
  const { profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);

  // ESC para voltar ao menu admin
  useEscapeBack({ to: '/admin' });

  const [settings, setSettings] = useState<GymSettings>({
    gymName: 'FrancGymPro',
    gymAddress: '',
    gymPhone: '',
    openTime: '06:00',
    closeTime: '22:00',
    pixKey: '',
    pixKeyType: 'random',
  });

  useEffect(() => {
    loadSettings();
  }, [profile?.profile_id]);

  const loadSettings = async () => {
    if (!profile?.profile_id) {
      setLoading(false);
      return;
    }

    try {
      // Get tenant_id from profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', profile.profile_id)
        .single();

      if (!profileData?.tenant_id) {
        setLoading(false);
        return;
      }

      setTenantId(profileData.tenant_id);

      const { data, error } = await supabase
        .from('tenants')
        .select('name, settings')
        .eq('id', profileData.tenant_id)
        .single();

      if (error) throw error;

      if (data) {
        const tenantSettings = (data.settings || {}) as Record<string, unknown>;
        setSettings({
          gymName: data.name || 'FrancGymPro',
          gymAddress: (tenantSettings.gymAddress as string) || '',
          gymPhone: (tenantSettings.gymPhone as string) || '',
          openTime: (tenantSettings.openTime as string) || '06:00',
          closeTime: (tenantSettings.closeTime as string) || '22:00',
          pixKey: (tenantSettings.pixKey as string) || '',
          pixKeyType: (tenantSettings.pixKeyType as GymSettings['pixKeyType']) || 'random',
        });
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    playClickSound();
    setSaving(true);
    
    try {
      if (!tenantId) {
        // For users without tenant, just show success (settings would be local)
        toast.success('Configurações salvas!');
        return;
      }

      const { error } = await supabase
        .from('tenants')
        .update({
          name: settings.gymName,
          settings: {
            gymAddress: settings.gymAddress,
            gymPhone: settings.gymPhone,
            openTime: settings.openTime,
            closeTime: settings.closeTime,
            pixKey: settings.pixKey,
            pixKeyType: settings.pixKeyType,
          },
        })
        .eq('id', tenantId);

      if (error) throw error;
      toast.success('Configurações salvas!');
    } catch (err: any) {
      console.error('Error saving settings:', err);
      toast.error('Erro ao salvar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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

        {/* PIX Settings */}
        <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-green-500/30 space-y-4">
          <h3 className="font-bebas text-lg flex items-center gap-2 text-green-500">
            <Wallet className="w-5 h-5" />
            CHAVE PIX PADRÃO
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="text-sm text-muted-foreground mb-2 block">Chave PIX</label>
              <Input
                value={settings.pixKey}
                onChange={(e) => setSettings({ ...settings, pixKey: e.target.value })}
                className="bg-background/50"
                placeholder="CPF, CNPJ, email, telefone ou chave aleatória"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Tipo</label>
              <select
                value={settings.pixKeyType}
                onChange={(e) => setSettings({ ...settings, pixKeyType: e.target.value as GymSettings['pixKeyType'] })}
                className="w-full h-10 px-3 rounded-md border border-input bg-background/50 text-sm"
              >
                <option value="cpf">CPF</option>
                <option value="cnpj">CNPJ</option>
                <option value="email">E-mail</option>
                <option value="phone">Telefone</option>
                <option value="random">Chave Aleatória</option>
              </select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Esta chave PIX será usada automaticamente ao gerar carnês e boletos de pagamento.
          </p>
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
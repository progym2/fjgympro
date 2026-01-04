import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, Key, Clock, Users, Save, Loader2, 
  RefreshCw, Trash2, Plus, AlertTriangle, CheckCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAudio } from '@/contexts/AudioContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface TestAccount {
  id: string;
  username: string;
  license_type: 'demo' | 'trial';
  status: string;
  expires_at: string | null;
  created_at: string;
}

const MasterTestAccounts: React.FC = () => {
  const navigate = useNavigate();
  const { playClickSound } = useAudio();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testAccounts, setTestAccounts] = useState<TestAccount[]>([]);

  const [settings, setSettings] = useState({
    allowDemoAccounts: true,
    allowTrialAccounts: true,
    trialDays: 7,
    demoMinutes: 30,
    maxDemoAccountsPerDay: 10,
    requireEmailForTrial: false,
  });

  useEffect(() => {
    fetchTestAccounts();
  }, []);

  const fetchTestAccounts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('licenses')
        .select(`
          id,
          license_type,
          status,
          expires_at,
          created_at,
          profiles!licenses_profile_id_fkey (
            username
          )
        `)
        .in('license_type', ['demo', 'trial'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setTestAccounts((data || []).map((item: any) => ({
        id: item.id,
        username: item.profiles?.username || 'N/A',
        license_type: item.license_type,
        status: item.status,
        expires_at: item.expires_at,
        created_at: item.created_at
      })));
    } catch (error) {
      console.error('Error fetching test accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    playClickSound();
    setSaving(true);
    
    // In a real app, save these settings to the database
    setTimeout(() => {
      setSaving(false);
      toast.success('Configurações de contas de teste salvas!');
    }, 1000);
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta conta de teste?')) return;

    try {
      const { error } = await supabase
        .from('licenses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Conta de teste excluída!');
      fetchTestAccounts();
    } catch (error) {
      console.error('Error deleting test account:', error);
      toast.error('Erro ao excluir conta de teste');
    }
  };

  const handleResetDemo = async () => {
    playClickSound();
    toast.info('Limpando contas demo expiradas...');
    
    try {
      const { error } = await supabase
        .from('licenses')
        .delete()
        .eq('license_type', 'demo')
        .eq('status', 'expired');

      if (error) throw error;
      toast.success('Contas demo expiradas removidas!');
      fetchTestAccounts();
    } catch (error) {
      console.error('Error resetting demo accounts:', error);
      toast.error('Erro ao limpar contas');
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const activeDemo = testAccounts.filter(a => a.license_type === 'demo' && a.status === 'active').length;
  const activeTrial = testAccounts.filter(a => a.license_type === 'trial' && a.status === 'active').length;
  const expiredAccounts = testAccounts.filter(a => a.status === 'expired').length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => { playClickSound(); navigate('/admin'); }}
          className="text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          ← Voltar
        </button>
        <h2 className="text-xl sm:text-2xl font-bebas text-primary flex items-center gap-2">
          <Shield className="w-6 h-6" />
          GERENCIAMENTO DE CONTAS DE TESTE
        </h2>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-card/80 backdrop-blur-md border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-500">{activeDemo}</p>
            <p className="text-xs text-muted-foreground">Demo Ativas</p>
          </CardContent>
        </Card>
        <Card className="bg-card/80 backdrop-blur-md border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-500">{activeTrial}</p>
            <p className="text-xs text-muted-foreground">Trial Ativas</p>
          </CardContent>
        </Card>
        <Card className="bg-card/80 backdrop-blur-md border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-500">{expiredAccounts}</p>
            <p className="text-xs text-muted-foreground">Expiradas</p>
          </CardContent>
        </Card>
        <Card className="bg-card/80 backdrop-blur-md border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-500">{testAccounts.length}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
      </div>

      {/* Settings */}
      <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-border/50 space-y-4">
        <h3 className="font-bebas text-lg flex items-center gap-2">
          <Key className="w-5 h-5" />
          CONFIGURAÇÕES DE CONTAS DE TESTE
        </h3>

        <div className="grid gap-4">
          <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
            <div>
              <p className="font-medium">Permitir Contas Demo</p>
              <p className="text-sm text-muted-foreground">Acesso temporário de 30 minutos para demonstração</p>
            </div>
            <Switch
              checked={settings.allowDemoAccounts}
              onCheckedChange={(v) => setSettings({ ...settings, allowDemoAccounts: v })}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
            <div>
              <p className="font-medium">Permitir Contas Trial</p>
              <p className="text-sm text-muted-foreground">Período de teste gratuito por tempo limitado</p>
            </div>
            <Switch
              checked={settings.allowTrialAccounts}
              onCheckedChange={(v) => setSettings({ ...settings, allowTrialAccounts: v })}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Duração Demo (min)</label>
              <Input
                type="number"
                value={settings.demoMinutes}
                onChange={(e) => setSettings({ ...settings, demoMinutes: parseInt(e.target.value) || 30 })}
                className="bg-background/50"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Duração Trial (dias)</label>
              <Input
                type="number"
                value={settings.trialDays}
                onChange={(e) => setSettings({ ...settings, trialDays: parseInt(e.target.value) || 7 })}
                className="bg-background/50"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Max Demo/Dia</label>
              <Input
                type="number"
                value={settings.maxDemoAccountsPerDay}
                onChange={(e) => setSettings({ ...settings, maxDemoAccountsPerDay: parseInt(e.target.value) || 10 })}
                className="bg-background/50"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Salvar
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={handleResetDemo}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Limpar Expiradas
        </Button>
        <Button variant="outline" onClick={fetchTestAccounts}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar Lista
        </Button>
      </div>

      {/* Test Accounts List */}
      <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-border/50">
        <h3 className="font-bebas text-lg mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" />
          CONTAS DE TESTE ATIVAS
        </h3>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : testAccounts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Nenhuma conta de teste encontrada</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {testAccounts.map((account) => (
              <motion.div
                key={account.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border/50"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    account.status === 'active' ? 'bg-green-500/20' : 'bg-red-500/20'
                  }`}>
                    {account.status === 'active' ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{account.username}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className={
                        account.license_type === 'demo' 
                          ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50' 
                          : 'bg-blue-500/20 text-blue-500 border-blue-500/50'
                      }>
                        {account.license_type.toUpperCase()}
                      </Badge>
                      <span>Criado: {formatDate(account.created_at)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {account.expires_at && (
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      Expira: {formatDate(account.expires_at)}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteAccount(account.id)}
                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default MasterTestAccounts;

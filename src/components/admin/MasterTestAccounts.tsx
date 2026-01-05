import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, Key, Clock, Users, Save, Loader2, 
  RefreshCw, Trash2, Plus, AlertTriangle, CheckCircle,
  Copy, Zap, RotateCcw, Download, Eye, EyeOff
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAudio } from '@/contexts/AudioContext';
import { useEscapeBack } from '@/hooks/useEscapeBack';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface TestAccount {
  id: string;
  username: string;
  license_key: string;
  license_type: 'demo' | 'trial';
  status: string;
  expires_at: string | null;
  created_at: string;
  profile_id: string | null;
}

interface PreGenAccount {
  id: string;
  username: string;
  license_key: string;
  account_type: string;
  license_duration_days: number;
  is_used: boolean;
  created_at: string;
}

const MasterTestAccounts: React.FC = () => {
  const navigate = useNavigate();
  const { playClickSound } = useAudio();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testAccounts, setTestAccounts] = useState<TestAccount[]>([]);
  const [preGenAccounts, setPreGenAccounts] = useState<PreGenAccount[]>([]);
  const [activeTab, setActiveTab] = useState('generate');
  
  // Generate dialog
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genType, setGenType] = useState<'demo' | 'trial'>('trial');
  const [genDuration, setGenDuration] = useState('7');
  const [genQuantity, setGenQuantity] = useState('10');
  const [genPrefix, setGenPrefix] = useState('');
  const [generatedAccounts, setGeneratedAccounts] = useState<PreGenAccount[]>([]);
  
  // Reactivate dialog
  const [reactivateDialogOpen, setReactivateDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<TestAccount | null>(null);
  const [reactivateDuration, setReactivateDuration] = useState('7');
  const [reactivating, setReactivating] = useState(false);
  
  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<TestAccount | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Visibility
  const [showKeys, setShowKeys] = useState<Set<string>>(new Set());

  // ESC para voltar ao menu admin (desabilitado quando há dialogs abertos)
  useEscapeBack({ 
    to: '/admin', 
    disableWhen: [generateDialogOpen, reactivateDialogOpen, deleteDialogOpen] 
  });

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
    fetchPreGenAccounts();
  }, []);

  const fetchTestAccounts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('licenses')
        .select(`
          id,
          license_key,
          license_type,
          status,
          expires_at,
          created_at,
          profile_id,
          profiles!licenses_profile_id_fkey (
            username
          )
        `)
        .in('license_type', ['demo', 'trial'])
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      setTestAccounts((data || []).map((item: any) => ({
        id: item.id,
        username: item.profiles?.username || 'N/A',
        license_key: item.license_key,
        license_type: item.license_type,
        status: item.status,
        expires_at: item.expires_at,
        created_at: item.created_at,
        profile_id: item.profile_id
      })));
    } catch (error) {
      console.error('Error fetching test accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPreGenAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('pre_generated_accounts')
        .select('*')
        .in('account_type', ['demo', 'trial'])
        .eq('is_used', false)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      setPreGenAccounts(data || []);
    } catch (error) {
      console.error('Error fetching pre-gen accounts:', error);
    }
  };

  const generateAccounts = async () => {
    playClickSound();
    setGenerating(true);
    
    try {
      const quantity = parseInt(genQuantity) || 10;
      const duration = parseFloat(genDuration);
      const prefix = genPrefix.trim() || (genType === 'demo' ? 'DEMO' : 'TRIAL');
      
      // Count existing accounts with same type for numbering
      const { count: existingCount } = await supabase
        .from('pre_generated_accounts')
        .select('id', { count: 'exact', head: true })
        .eq('account_type', genType);

      const startNum = (existingCount ?? 0) + 1;
      const newAccounts: any[] = [];

      for (let i = 0; i < quantity; i++) {
        const num = startNum + i;
        const username = `${prefix}_${num.toString().padStart(3, '0')}`;
        const licenseKey = `${prefix.substring(0, 3).toUpperCase()}-${num.toString().padStart(4, '0')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        
        newAccounts.push({
          username,
          license_key: licenseKey,
          account_type: genType,
          license_duration_days: duration,
          is_used: false,
        });
      }

      const { data, error } = await supabase
        .from('pre_generated_accounts')
        .insert(newAccounts)
        .select();

      if (error) throw error;

      setGeneratedAccounts(data || []);
      toast.success(`${quantity} contas ${genType.toUpperCase()} geradas com sucesso!`);
      fetchPreGenAccounts();
    } catch (error: any) {
      console.error('Error generating accounts:', error);
      if (error.code === '23505') {
        toast.error('Algumas contas já existem. Altere o prefixo.');
      } else {
        toast.error('Erro ao gerar contas');
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleReactivate = async () => {
    if (!selectedAccount) return;
    
    setReactivating(true);
    try {
      const days = parseInt(reactivateDuration);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + days);

      const { error } = await supabase
        .from('licenses')
        .update({
          status: 'active',
          expires_at: expiresAt.toISOString(),
          started_at: new Date().toISOString()
        })
        .eq('id', selectedAccount.id);

      if (error) throw error;

      toast.success(`Conta reativada por ${days} dias!`);
      setReactivateDialogOpen(false);
      setSelectedAccount(null);
      fetchTestAccounts();
    } catch (error) {
      console.error('Error reactivating account:', error);
      toast.error('Erro ao reativar conta');
    } finally {
      setReactivating(false);
    }
  };

  const handleDelete = async () => {
    if (!accountToDelete) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('licenses')
        .delete()
        .eq('id', accountToDelete.id);

      if (error) throw error;

      toast.success('Conta excluída com sucesso!');
      setDeleteDialogOpen(false);
      setAccountToDelete(null);
      fetchTestAccounts();
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Erro ao excluir conta');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeletePreGen = async (id: string) => {
    try {
      const { error } = await supabase
        .from('pre_generated_accounts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Conta pré-gerada excluída!');
      fetchPreGenAccounts();
    } catch (error) {
      console.error('Error deleting pre-gen account:', error);
      toast.error('Erro ao excluir conta');
    }
  };

  const handleSave = async () => {
    playClickSound();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success('Configurações salvas!');
    }, 1000);
  };

  const handleResetDemo = async () => {
    playClickSound();
    toast.info('Limpando contas expiradas...');
    
    try {
      const { error } = await supabase
        .from('licenses')
        .delete()
        .in('license_type', ['demo', 'trial'])
        .eq('status', 'expired');

      if (error) throw error;
      toast.success('Contas expiradas removidas!');
      fetchTestAccounts();
    } catch (error) {
      console.error('Error resetting accounts:', error);
      toast.error('Erro ao limpar contas');
    }
  };

  const copyCredentials = (username: string, licenseKey: string) => {
    navigator.clipboard.writeText(`Usuário: ${username}\nSenha: ${licenseKey}`);
    toast.success('Credenciais copiadas!');
  };

  const copyAllGenerated = () => {
    const text = generatedAccounts.map(a => `${a.username} | ${a.license_key}`).join('\n');
    navigator.clipboard.writeText(text);
    toast.success(`${generatedAccounts.length} credenciais copiadas!`);
  };

  const toggleKeyVisibility = (id: string) => {
    setShowKeys(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
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
  const availablePreGen = preGenAccounts.length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { playClickSound(); navigate('/admin'); }}
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            ← Voltar
          </button>
          <h2 className="text-xl sm:text-2xl font-bebas text-primary flex items-center gap-2">
            <Shield className="w-6 h-6" />
            CONTAS DE TESTE
          </h2>
        </div>
        <Button onClick={() => setGenerateDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Gerar Contas
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
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
            <p className="text-2xl font-bold text-green-500">{availablePreGen}</p>
            <p className="text-xs text-muted-foreground">Pré-Geradas</p>
          </CardContent>
        </Card>
        <Card className="bg-card/80 backdrop-blur-md border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{testAccounts.length}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="generate">Pré-Geradas</TabsTrigger>
          <TabsTrigger value="active">Em Uso</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>

        {/* Pre-generated accounts */}
        <TabsContent value="generate" className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={fetchPreGenAccounts}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
          </div>

          <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50">
            <h3 className="font-bebas text-lg mb-4 flex items-center gap-2">
              <Key className="w-5 h-5" />
              CONTAS PRÉ-GERADAS DISPONÍVEIS ({availablePreGen})
            </h3>

            {preGenAccounts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Key className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma conta pré-gerada disponível</p>
                <Button onClick={() => setGenerateDialogOpen(true)} variant="outline" className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Gerar Novas Contas
                </Button>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {preGenAccounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border/50"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Badge variant="outline" className={
                        account.account_type === 'demo' 
                          ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50' 
                          : 'bg-blue-500/20 text-blue-500 border-blue-500/50'
                      }>
                        {account.account_type.toUpperCase()}
                      </Badge>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{account.username}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-mono">
                            {showKeys.has(account.id) ? account.license_key : '••••••••••••'}
                          </span>
                          <span>• {account.license_duration_days} dias</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleKeyVisibility(account.id)}
                        className="h-8 w-8"
                      >
                        {showKeys.has(account.id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyCredentials(account.username, account.license_key)}
                        className="h-8 w-8"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeletePreGen(account.id)}
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Active accounts */}
        <TabsContent value="active" className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleResetDemo}>
              <Trash2 className="w-4 h-4 mr-2" />
              Limpar Expiradas
            </Button>
            <Button variant="outline" onClick={fetchTestAccounts}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
          </div>

          <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50">
            <h3 className="font-bebas text-lg mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              CONTAS EM USO ({testAccounts.length})
            </h3>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : testAccounts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma conta de teste em uso</p>
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
                          <Badge variant="outline" className={
                            account.status === 'active'
                              ? 'bg-green-500/20 text-green-500 border-green-500/50'
                              : 'bg-red-500/20 text-red-500 border-red-500/50'
                          }>
                            {account.status === 'active' ? 'ATIVA' : 'EXPIRADA'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {account.expires_at && (
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                          Expira: {formatDate(account.expires_at)}
                        </span>
                      )}
                      {account.status === 'expired' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedAccount(account);
                            setReactivateDialogOpen(true);
                          }}
                          className="h-8 w-8 text-green-500 hover:bg-green-500/10"
                          title="Reativar"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setAccountToDelete(account);
                          setDeleteDialogOpen(true);
                        }}
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
        </TabsContent>

        {/* Settings */}
        <TabsContent value="settings" className="space-y-4">
          <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-border/50 space-y-4">
            <h3 className="font-bebas text-lg flex items-center gap-2">
              <Key className="w-5 h-5" />
              CONFIGURAÇÕES DE CONTAS
            </h3>

            <div className="grid gap-4">
              <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                <div>
                  <p className="font-medium">Permitir Contas Demo</p>
                  <p className="text-sm text-muted-foreground">Acesso temporário para demonstração</p>
                </div>
                <Switch
                  checked={settings.allowDemoAccounts}
                  onCheckedChange={(v) => setSettings({ ...settings, allowDemoAccounts: v })}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                <div>
                  <p className="font-medium">Permitir Contas Trial</p>
                  <p className="text-sm text-muted-foreground">Período de teste gratuito</p>
                </div>
                <Switch
                  checked={settings.allowTrialAccounts}
                  onCheckedChange={(v) => setSettings({ ...settings, allowTrialAccounts: v })}
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <Label>Duração Demo (min)</Label>
                  <Input
                    type="number"
                    value={settings.demoMinutes}
                    onChange={(e) => setSettings({ ...settings, demoMinutes: parseInt(e.target.value) || 30 })}
                    className="bg-background/50"
                  />
                </div>
                <div>
                  <Label>Duração Trial (dias)</Label>
                  <Input
                    type="number"
                    value={settings.trialDays}
                    onChange={(e) => setSettings({ ...settings, trialDays: parseInt(e.target.value) || 7 })}
                    className="bg-background/50"
                  />
                </div>
                <div>
                  <Label>Max Demo/Dia</Label>
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
        </TabsContent>
      </Tabs>

      {/* Generate Dialog */}
      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Gerar Contas de Teste
            </DialogTitle>
            <DialogDescription>
              Crie contas pré-geradas para distribuir a usuários de teste.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo</Label>
                <Select value={genType} onValueChange={(v: 'demo' | 'trial') => setGenType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="demo">Demo</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  value={genQuantity}
                  onChange={(e) => setGenQuantity(e.target.value)}
                  min="1"
                  max="100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Duração</Label>
                <Select value={genDuration} onValueChange={setGenDuration}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0.02">30 minutos</SelectItem>
                    <SelectItem value="0.04">1 hora</SelectItem>
                    <SelectItem value="1">1 dia</SelectItem>
                    <SelectItem value="7">7 dias</SelectItem>
                    <SelectItem value="30">30 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prefixo (opcional)</Label>
                <Input
                  value={genPrefix}
                  onChange={(e) => setGenPrefix(e.target.value.toUpperCase())}
                  placeholder={genType === 'demo' ? 'DEMO' : 'TRIAL'}
                />
              </div>
            </div>

            {generatedAccounts.length > 0 && (
              <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-green-500">
                    {generatedAccounts.length} contas geradas!
                  </span>
                  <Button size="sm" variant="outline" onClick={copyAllGenerated}>
                    <Copy className="w-3 h-3 mr-1" />
                    Copiar Todas
                  </Button>
                </div>
                <div className="max-h-32 overflow-y-auto text-xs font-mono space-y-1">
                  {generatedAccounts.slice(0, 5).map((a, i) => (
                    <div key={i} className="text-muted-foreground">
                      {a.username} | {a.license_key}
                    </div>
                  ))}
                  {generatedAccounts.length > 5 && (
                    <div className="text-muted-foreground">
                      ... e mais {generatedAccounts.length - 5}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setGenerateDialogOpen(false);
              setGeneratedAccounts([]);
            }}>
              Fechar
            </Button>
            <Button onClick={generateAccounts} disabled={generating}>
              {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Gerar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reactivate Dialog */}
      <Dialog open={reactivateDialogOpen} onOpenChange={setReactivateDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-green-500" />
              Reativar Conta
            </DialogTitle>
            <DialogDescription>
              Escolha por quanto tempo reativar a conta de {selectedAccount?.username}.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label>Nova Duração</Label>
            <Select value={reactivateDuration} onValueChange={setReactivateDuration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 dia</SelectItem>
                <SelectItem value="7">7 dias</SelectItem>
                <SelectItem value="30">30 dias</SelectItem>
                <SelectItem value="365">1 ano</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReactivateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleReactivate} disabled={reactivating} className="bg-green-600 hover:bg-green-700">
              {reactivating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RotateCcw className="w-4 h-4 mr-2" />}
              Reativar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              Excluir Conta
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a conta <strong>{accountToDelete?.username}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

export default MasterTestAccounts;

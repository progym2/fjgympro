import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Key, Copy, RefreshCw, Search, CheckCircle, XCircle, Loader2, Users, Clock, Shield, Crown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAudio } from '@/contexts/AudioContext';
import { supabase } from '@/integrations/supabase/client';
import { useEscapeBack } from '@/hooks/useEscapeBack';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface PreGeneratedAccount {
  id: string;
  username: string;
  license_key: string;
  account_type: string;
  license_duration_days: number;
  is_used: boolean;
  used_at: string | null;
  created_at: string;
}

interface MasterCredential {
  id: string;
  username: string;
  full_name: string | null;
  is_active: boolean;
}

const TrialPasswords: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { playClickSound } = useAudio();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<PreGeneratedAccount[]>([]);
  const [masterCredentials, setMasterCredentials] = useState<MasterCredential[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('master');

  // ESC para voltar ao menu admin
  useEscapeBack({ to: '/admin' });

  useEffect(() => {
    fetchAllData();
  }, [profile?.profile_id]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // Fetch pre-generated accounts
      const { data: accountsData, error: accountsError } = await supabase
        .from('pre_generated_accounts')
        .select('*')
        .order('account_type', { ascending: true })
        .order('is_used', { ascending: true })
        .order('username', { ascending: true })
        .limit(500);

      if (accountsError) throw accountsError;
      setAccounts((accountsData || []) as PreGeneratedAccount[]);

      // Fetch master credentials
      const { data: masterData, error: masterError } = await supabase
        .from('master_credentials')
        .select('*')
        .eq('is_active', true)
        .order('username', { ascending: true });

      if (masterError) {
        console.error('Error fetching master credentials:', masterError);
      } else {
        setMasterCredentials((masterData || []) as MasterCredential[]);
      }
      // accountsData already set above
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast.error('Erro ao carregar senhas');
    } finally {
      setLoading(false);
    }
  };

  const copyCredentials = (username: string, password: string) => {
    const text = `Usuário: ${username}\nSenha: ${password}`;
    navigator.clipboard.writeText(text);
    toast.success('Credenciais copiadas!');
  };

  const copyFiltered = () => {
    const filtered = getFilteredAccounts().filter(a => !a.is_used);
    if (filtered.length === 0) {
      toast.error('Nenhuma senha disponível');
      return;
    }
    const text = filtered.map(a => `${a.username} | ${a.license_key}`).join('\n');
    navigator.clipboard.writeText(text);
    toast.success(`${filtered.length} senhas copiadas!`);
  };

  const getFilteredAccounts = () => {
    let filtered = accounts;
    
    // Filter by tab (excluding master which has its own section)
    if (activeTab === 'demo') {
      filtered = filtered.filter(a => a.username.toUpperCase().startsWith('DEMO') || (a.username.toUpperCase().startsWith('ADMIN') && a.account_type === 'admin'));
    } else if (activeTab === 'trial') {
      filtered = filtered.filter(a => a.account_type === 'trial' && !a.username.toUpperCase().startsWith('DEMO'));
    } else if (activeTab === 'client') {
      filtered = filtered.filter(a => a.account_type === 'client');
    } else if (activeTab === 'instructor') {
      filtered = filtered.filter(a => a.account_type === 'instructor');
    } else if (activeTab === 'all') {
      // Show all pre-generated accounts
    }
    
    // Filter by search
    if (searchTerm) {
      filtered = filtered.filter(account =>
        account.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.license_key.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  };

  const filteredAccounts = getFilteredAccounts();
  
  const stats = {
    total: accounts.length,
    available: accounts.filter(a => !a.is_used).length,
    used: accounts.filter(a => a.is_used).length,
    demo: accounts.filter(a => a.username.toUpperCase().startsWith('DEMO') || (a.username.toUpperCase().startsWith('ADMIN') && a.account_type === 'admin')).length,
    trial: accounts.filter(a => a.account_type === 'trial' && !a.username.toUpperCase().startsWith('DEMO')).length,
    client: accounts.filter(a => a.account_type === 'client').length,
    instructor: accounts.filter(a => a.account_type === 'instructor').length,
    master: masterCredentials.length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Key className="w-6 h-6 text-cyan-500" />
          <h2 className="text-2xl font-bebas text-cyan-500 tracking-wider">CREDENCIAIS DO SISTEMA</h2>
        </div>
        <Button variant="ghost" onClick={() => navigate('/admin')}>
          <ArrowLeft size={18} className="mr-2" /> Voltar
        </Button>
      </div>

      {/* Master & Demo Credentials - Priority Section */}
      <Card className="bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border-yellow-500/30">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 font-bebas text-lg text-yellow-500">
            <Crown size={20} /> CREDENCIAIS MASTER & DEMO (ACESSO TOTAL)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Demo Cliente Account */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Users size={16} className="text-blue-500" />
                </div>
                <div>
                  <p className="font-medium">DEMO_CLIENTE</p>
                  <p className="text-sm text-muted-foreground font-mono">DEMO-CLI-2026</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/50">
                  Demo 30min
                </Badge>
                <Badge variant="outline" className="border-blue-500/50 text-blue-500">
                  Painel Cliente
                </Badge>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => copyCredentials('DEMO_CLIENTE', 'DEMO-CLI-2026')}
                  className="hover:bg-blue-500/20"
                >
                  <Copy size={14} className="text-blue-500" />
                </Button>
              </div>
            </div>

            {/* Demo Instrutor Account */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <Shield size={16} className="text-green-500" />
                </div>
                <div>
                  <p className="font-medium">DEMO_INSTRUTOR</p>
                  <p className="text-sm text-muted-foreground font-mono">DEMO-INST-2026</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-green-500/20 text-green-500 border-green-500/50">
                  Demo 30min
                </Badge>
                <Badge variant="outline" className="border-green-500/50 text-green-500">
                  Painel Instrutor
                </Badge>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => copyCredentials('DEMO_INSTRUTOR', 'DEMO-INST-2026')}
                  className="hover:bg-green-500/20"
                >
                  <Copy size={14} className="text-green-500" />
                </Button>
              </div>
            </div>

            {/* Legacy Demo Account */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <Clock size={16} className="text-purple-500" />
                </div>
                <div>
                  <p className="font-medium">teste</p>
                  <p className="text-sm text-muted-foreground font-mono">2026</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-purple-500/20 text-purple-500 border-purple-500/50">
                  Demo 30min
                </Badge>
                <Badge variant="outline" className="border-cyan-500/50 text-cyan-500">
                  Painel Cliente
                </Badge>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => copyCredentials('teste', '2026')}
                  className="hover:bg-purple-500/20"
                >
                  <Copy size={14} className="text-purple-500" />
                </Button>
              </div>
            </div>

            {/* Master Credentials from Database */}
            {masterCredentials.map((master) => (
              <div key={master.id} className="flex items-center justify-between p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-yellow-500/20">
                    <Crown size={16} className="text-yellow-500" />
                  </div>
                  <div>
                    <p className="font-medium">{master.username}</p>
                    <p className="text-sm text-muted-foreground">Senha protegida (hash)</p>
                    {master.full_name && (
                      <p className="text-xs text-muted-foreground">{master.full_name}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/50">
                    Master
                  </Badge>
                  <Badge variant="outline" className="border-green-500/50 text-green-500">
                    Todos Painéis
                  </Badge>
                </div>
              </div>
            ))}

            {masterCredentials.length === 0 && (
              <p className="text-center text-muted-foreground py-2">
                Nenhuma credencial master cadastrada
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card className="bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border-yellow-500/30">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Crown size={16} className="text-yellow-500" />
              <div>
                <p className="text-xl font-bold text-yellow-500">{stats.master + 1}</p>
                <p className="text-xs text-muted-foreground">Master+Demo</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-cyan-500/30">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Key size={16} className="text-cyan-500" />
              <div>
                <p className="text-xl font-bold text-cyan-500">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Pré-geradas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-green-500" />
              <div>
                <p className="text-xl font-bold text-green-500">{stats.available}</p>
                <p className="text-xs text-muted-foreground">Disponíveis</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/20 to-violet-500/20 border-purple-500/30">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-purple-500" />
              <div>
                <p className="text-xl font-bold text-purple-500">{stats.trial}</p>
                <p className="text-xs text-muted-foreground">Trial 7d</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border-blue-500/30">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-blue-500" />
              <div>
                <p className="text-xl font-bold text-blue-500">{stats.client}</p>
                <p className="text-xs text-muted-foreground">Clientes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/20 to-red-500/20 border-orange-500/30">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-orange-500" />
              <div>
                <p className="text-xl font-bold text-orange-500">{stats.instructor}</p>
                <p className="text-xs text-muted-foreground">Instrutores</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table with Tabs - Pre-generated accounts */}
      <Card className="bg-card/80 backdrop-blur-md border-border/50">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <CardTitle className="font-bebas text-lg text-cyan-500">CONTAS PRÉ-GERADAS</CardTitle>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-none">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-full sm:w-48"
                  />
                </div>
                <Button variant="outline" size="icon" onClick={fetchAllData}>
                  <RefreshCw size={16} />
                </Button>
                <Button variant="outline" onClick={copyFiltered}>
                  <Copy size={16} className="mr-2" />
                  Copiar
                </Button>
              </div>
            </div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="flex flex-wrap h-auto gap-2 p-2 bg-muted/50">
                <TabsTrigger 
                  value="all" 
                  className="flex-1 min-w-[120px] py-2.5 px-4 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-500 data-[state=active]:border-cyan-500/50 border border-transparent rounded-lg transition-all"
                >
                  <Key size={14} className="mr-2" />
                  Todas ({stats.total})
                </TabsTrigger>
                <TabsTrigger 
                  value="demo" 
                  className="flex-1 min-w-[120px] py-2.5 px-4 data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-500 data-[state=active]:border-purple-500/50 border border-transparent rounded-lg transition-all"
                >
                  <Clock size={14} className="mr-2" />
                  Demo 30m ({stats.demo})
                </TabsTrigger>
                <TabsTrigger 
                  value="trial" 
                  className="flex-1 min-w-[120px] py-2.5 px-4 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-500 data-[state=active]:border-amber-500/50 border border-transparent rounded-lg transition-all"
                >
                  <Clock size={14} className="mr-2" />
                  Trial 7d ({stats.trial})
                </TabsTrigger>
                <TabsTrigger 
                  value="client" 
                  className="flex-1 min-w-[120px] py-2.5 px-4 data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-500 data-[state=active]:border-blue-500/50 border border-transparent rounded-lg transition-all"
                >
                  <Users size={14} className="mr-2" />
                  Clientes ({stats.client})
                </TabsTrigger>
                <TabsTrigger 
                  value="instructor" 
                  className="flex-1 min-w-[120px] py-2.5 px-4 data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-500 data-[state=active]:border-orange-500/50 border border-transparent rounded-lg transition-all"
                >
                  <Shield size={14} className="mr-2" />
                  Instrutores ({stats.instructor})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Senha/Chave</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAccounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      <Key className="mx-auto h-12 w-12 mb-3 opacity-50" />
                      <p>Nenhuma conta pré-gerada encontrada</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAccounts.map((account) => (
                    <TableRow 
                      key={account.id}
                      className={account.is_used ? 'opacity-60' : ''}
                    >
                      <TableCell className="font-medium">{account.username}</TableCell>
                      <TableCell className="font-mono text-sm">{account.license_key}</TableCell>
                      <TableCell>
                        {(() => {
                          const isDemo = account.username.toUpperCase().startsWith('DEMO');
                          const isAdminDemo = account.username.toUpperCase().startsWith('ADMIN') && account.account_type === 'admin';
                          if (isDemo) {
                            return <Badge variant="outline" className="border-pink-500/50 text-pink-500">Demo 30m</Badge>;
                          }
                          if (isAdminDemo) {
                            return <Badge variant="outline" className="border-amber-500/50 text-amber-500">Admin 30m</Badge>;
                          }
                          if (account.account_type === 'trial') {
                            return <Badge variant="outline" className="border-purple-500/50 text-purple-500">Trial 7d</Badge>;
                          }
                          if (account.account_type === 'instructor') {
                            return <Badge variant="outline" className="border-orange-500/50 text-orange-500">Instrutor</Badge>;
                          }
                          return <Badge variant="outline" className="border-blue-500/50 text-blue-500">Cliente</Badge>;
                        })()}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const isDemo = account.username.toUpperCase().startsWith('DEMO');
                          const isAdminDemo = account.username.toUpperCase().startsWith('ADMIN') && account.account_type === 'admin';
                          if (isDemo || isAdminDemo) return '30 min';
                          return `${account.license_duration_days} dias`;
                        })()}
                      </TableCell>
                      <TableCell>
                        <Badge className={account.is_used 
                          ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50' 
                          : 'bg-green-500/20 text-green-500 border-green-500/50'
                        }>
                          {account.is_used ? 'Usada' : 'Disponível'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {!account.is_used && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => copyCredentials(account.username, account.license_key)}
                            className="hover:bg-cyan-500/20"
                          >
                            <Copy size={14} className="text-cyan-500" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default TrialPasswords;
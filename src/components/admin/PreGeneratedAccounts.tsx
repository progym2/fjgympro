import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, Key, Users, Loader2, RefreshCw, Download, 
  CheckCircle, XCircle, User, UserCheck, Briefcase, Clock,
  Copy, Printer, Zap, Trash2, Edit, Eye, X, Search, CheckSquare, Square
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAudio } from '@/contexts/AudioContext';
import { useEscapeBack } from '@/hooks/useEscapeBack';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { printAccountsReport } from '@/lib/printUtils';
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

interface PreGeneratedAccount {
  id: string;
  username: string;
  license_key: string;
  account_type: 'client' | 'instructor' | 'admin' | 'trial';
  license_duration_days: number;
  is_used: boolean;
  used_at: string | null;
  used_by_profile_id: string | null;
  created_at: string;
}

interface ActiveAccountWithProfile extends PreGeneratedAccount {
  profile?: {
    id: string;
    full_name: string | null;
    username: string;
    email: string | null;
    phone: string | null;
    cpf: string | null;
  } | null;
}

type AccountType = 'client' | 'instructor' | 'admin' | 'trial';

// Opções de tempo de expiração (em minutos para valores < 1 dia, senão em dias)
// Armazenamos como minutos negativos para diferenciar de dias
const EXPIRATION_OPTIONS = [
  { value: '-30', label: '30 minutos', isMinutes: true },
  { value: '-60', label: '1 hora', isMinutes: true },
  { value: '7', label: '7 dias', isMinutes: false },
  { value: '30', label: '30 dias', isMinutes: false },
];

const ACCOUNT_TYPE_OPTIONS: { value: AccountType; label: string }[] = [
  { value: 'client', label: 'Cliente' },
  { value: 'instructor', label: 'Instrutor' },
  { value: 'admin', label: 'Gerente' },
  { value: 'trial', label: 'Trial' },
];

const PreGeneratedAccounts: React.FC = () => {
  const navigate = useNavigate();
  const { playClickSound } = useAudio();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [accounts, setAccounts] = useState<PreGeneratedAccount[]>([]);
  const [activeAccounts, setActiveAccounts] = useState<ActiveAccountWithProfile[]>([]);
  const [activeTab, setActiveTab] = useState('client');
  const [activeAccountsLoading, setActiveAccountsLoading] = useState(false);
  const [quickExpiration, setQuickExpiration] = useState('-30');
  const [quickQuantity, setQuickQuantity] = useState('10');
  const [quickPrefix, setQuickPrefix] = useState('TESTE');
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [activeAccountsFilter, setActiveAccountsFilter] = useState<'all' | AccountType>('all');
  const [activeAccountsSearch, setActiveAccountsSearch] = useState('');
  
  // Batch selection state
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
  const [showBatchDeleteDialog, setShowBatchDeleteDialog] = useState(false);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  
  // Modal states
  const [selectedAccount, setSelectedAccount] = useState<PreGeneratedAccount | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editAccountType, setEditAccountType] = useState<AccountType>('client');
  const [editDurationDays, setEditDurationDays] = useState<string>('30');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // ESC para voltar ao menu admin (desabilitado quando há dialogs abertos)
  useEscapeBack({ 
    to: '/admin', 
    disableWhen: [showDetailsDialog, showDeleteDialog, showEditDialog, showBatchDeleteDialog] 
  });

  useEffect(() => {
    fetchAccounts();
    fetchActiveAccounts();
  }, []);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const types: AccountType[] = ['admin', 'client', 'instructor', 'trial'];

      const results = await Promise.all(
        types.map((type) =>
          supabase
            .from('pre_generated_accounts')
            .select('*')
            .eq('account_type', type)
            .order('is_used', { ascending: true })
            .order('created_at', { ascending: false })
        )
      );

      const firstError = results.find((r) => r.error)?.error;
      if (firstError) throw firstError;

      const merged = results.flatMap((r) => r.data || []);

      setAccounts(
        merged.map((item) => ({
          ...item,
          account_type: item.account_type as AccountType,
        }))
      );
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast.error('Erro ao carregar contas');
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveAccounts = async () => {
    setActiveAccountsLoading(true);
    try {
      // Fetch used accounts
      const { data: usedAccounts, error: usedError } = await supabase
        .from('pre_generated_accounts')
        .select('*')
        .eq('is_used', true)
        .order('used_at', { ascending: false });

      if (usedError) throw usedError;

      // Get profile IDs
      const profileIds = usedAccounts
        ?.filter(a => a.used_by_profile_id)
        .map(a => a.used_by_profile_id) || [];

      // Fetch profiles
      let profilesMap: Record<string, ActiveAccountWithProfile['profile']> = {};
      if (profileIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, username, email, phone, cpf')
          .in('id', profileIds);

        if (!profilesError && profiles) {
          profiles.forEach(p => {
            profilesMap[p.id] = p;
          });
        }
      }

      // Combine accounts with profiles
      const accountsWithProfiles: ActiveAccountWithProfile[] = (usedAccounts || []).map(account => ({
        ...account,
        account_type: account.account_type as AccountType,
        profile: account.used_by_profile_id ? profilesMap[account.used_by_profile_id] : null
      }));

      setActiveAccounts(accountsWithProfiles);
    } catch (error) {
      console.error('Error fetching active accounts:', error);
      toast.error('Erro ao carregar contas ativas');
    } finally {
      setActiveAccountsLoading(false);
    }
  };

  const generateLicenseKey = (prefix: string): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = prefix + '-';
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 4; j++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      if (i < 2) result += '-';
    }
    return result;
  };

  const generateAccounts = async (type: 'client' | 'instructor' | 'admin' | 'trial', count: number) => {
    playClickSound();
    setGenerating(true);

    try {
      const durationMap: Record<AccountType, number> = {
        client: 30,
        instructor: 30,
        admin: 365,
        trial: 7,
      };

      // Use the same naming as the Master panel to avoid collisions and keep consistency.
      const namePrefixMap: Record<AccountType, string> = {
        trial: 'TRIAL7',
        client: 'FULL30',
        instructor: 'INST30',
        admin: 'ADMIN',
      };

      const licensePrefixMap: Record<AccountType, string> = {
        trial: 'T7',
        client: 'F30',
        instructor: 'I30',
        admin: 'ADM',
      };

      const duration = durationMap[type];
      const namePrefix = namePrefixMap[type];
      const licensePrefix = licensePrefixMap[type];

      // Count existing rows for this type+duration (safe even with lots of rows)
      const { count: existingCount, error: countError } = await supabase
        .from('pre_generated_accounts')
        .select('id', { count: 'exact', head: true })
        .eq('account_type', type)
        .eq('license_duration_days', duration);

      if (countError) throw countError;

      const startNum = (existingCount ?? 0) + 1;
      const year = new Date().getFullYear();

      const newAccounts = [];
      for (let i = 0; i < count; i++) {
        const num = startNum + i;
        const code = num.toString().padStart(4, '0');
        newAccounts.push({
          username: `${namePrefix}-${code}`,
          license_key: `${licensePrefix}-${code}-${year}`,
          account_type: type,
          license_duration_days: duration,
          is_used: false,
        });
      }

      const { error } = await supabase
        .from('pre_generated_accounts')
        .insert(newAccounts);

      if (error) throw error;

      toast.success(`${count} contas ${type} geradas com sucesso!`);
      fetchAccounts();
    } catch (error: any) {
      console.error('Error generating accounts:', error);
      if (error.code === '23505') {
        toast.error('Algumas contas já existem. Tente novamente.');
      } else {
        toast.error('Erro ao gerar contas');
      }
    } finally {
      setGenerating(false);
    }
  };

  const generateAllAccounts = async () => {
    playClickSound();
    setGenerating(true);
    
    try {
      // Check how many accounts already exist
      const clientCount = accounts.filter(a => a.account_type === 'client').length;
      const instructorCount = accounts.filter(a => a.account_type === 'instructor').length;
      const adminCount = accounts.filter(a => a.account_type === 'admin').length;
      const trialCount = accounts.filter(a => a.account_type === 'trial').length;

      // Calculate how many to generate
      const clientsNeeded = Math.max(0, 100 - clientCount);
      const instructorsNeeded = Math.max(0, 50 - instructorCount);
      const adminsNeeded = Math.max(0, 50 - adminCount);
      const trialsNeeded = Math.max(0, 30 - trialCount);

      if (clientsNeeded > 0) await generateAccounts('client', clientsNeeded);
      if (instructorsNeeded > 0) await generateAccounts('instructor', instructorsNeeded);
      if (adminsNeeded > 0) await generateAccounts('admin', adminsNeeded);
      if (trialsNeeded > 0) await generateAccounts('trial', trialsNeeded);

      toast.success('Todas as contas foram geradas!');
    } catch (error) {
      console.error('Error generating all accounts:', error);
    } finally {
      setGenerating(false);
    }
  };

  const generateQuickPasswords = async () => {
    playClickSound();
    setGenerating(true);

    try {
      const quantity = parseInt(quickQuantity) || 10;
      const durationValue = parseInt(quickExpiration);
      const prefix = quickPrefix.trim() || 'TESTE';
      
      // Valores negativos são minutos, positivos são dias
      // Para armazenar no banco (que aceita apenas int), usamos:
      // - Valores negativos para minutos (ex: -30 = 30 minutos)
      // - Valores positivos para dias (ex: 7 = 7 dias)
      const storedDuration = durationValue;

      const newAccounts = [];
      for (let i = 1; i <= quantity; i++) {
        const username = `${prefix}${i}`;
        const licenseKey = `${prefix}${i}`;
        newAccounts.push({
          username,
          license_key: licenseKey,
          account_type: 'trial' as const,
          license_duration_days: storedDuration,
          is_used: false,
        });
      }

      const { error } = await supabase
        .from('pre_generated_accounts')
        .insert(newAccounts);

      if (error) throw error;

      const expLabel = EXPIRATION_OPTIONS.find(o => o.value === quickExpiration)?.label || quickExpiration;
      toast.success(`${quantity} senhas ${prefix}1-${prefix}${quantity} criadas (${expLabel})!`);
      fetchAccounts();
    } catch (error: any) {
      console.error('Error generating quick passwords:', error);
      if (error.code === '23505') {
        toast.error('Algumas senhas já existem. Altere o prefixo ou limpe as existentes.');
      } else {
        toast.error('Erro ao gerar senhas rápidas');
      }
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado!');
  };

  const handlePrint = (type: string) => {
    const filtered = accounts.filter(a => a.account_type === type && !a.is_used);
    printAccountsReport(filtered, type);
  };

  const exportToCSV = (type: string) => {
    const filtered = accounts.filter(a => a.account_type === type);
    const csv = [
      'Username,Senha,Tipo,Duração (dias),Usado,Data Criação',
      ...filtered.map(a => 
        `${a.username},${a.license_key},${a.account_type},${a.license_duration_days},${a.is_used ? 'Sim' : 'Não'},${new Date(a.created_at).toLocaleDateString('pt-BR')}`
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contas-${type}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Arquivo CSV exportado!');
  };

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'client': return <User className="w-4 h-4" />;
      case 'instructor': return <UserCheck className="w-4 h-4" />;
      case 'admin': return <Briefcase className="w-4 h-4" />;
      case 'trial': return <Clock className="w-4 h-4" />;
      default: return <User className="w-4 h-4" />;
    }
  };

  const getAccountColor = (type: string) => {
    switch (type) {
      case 'client': return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'instructor': return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'admin': return 'bg-purple-500/20 text-purple-400 border-purple-500/50';
      case 'trial': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  // Filter by tab and search term
  const filteredAccounts = accounts.filter(a => {
    if (a.account_type !== activeTab) return false;
    if (!searchTerm.trim()) return true;
    
    const search = searchTerm.toLowerCase().trim();
    return (
      a.username.toLowerCase().includes(search) ||
      a.license_key.toLowerCase().includes(search)
    );
  });
  const usedCount = filteredAccounts.filter(a => a.is_used).length;
  const availableCount = filteredAccounts.filter(a => !a.is_used).length;
  
  // Filter active accounts by type and search
  const filteredActiveAccounts = activeAccounts.filter(a => {
    // Type filter
    if (activeAccountsFilter !== 'all' && a.account_type !== activeAccountsFilter) {
      return false;
    }
    
    // Search filter (by name, username, or CPF)
    if (activeAccountsSearch.trim()) {
      const search = activeAccountsSearch.toLowerCase().trim();
      const searchNormalized = search.replace(/[.\-]/g, ''); // Remove CPF formatting
      
      const fullName = a.profile?.full_name?.toLowerCase() || '';
      const username = a.profile?.username?.toLowerCase() || '';
      const cpf = a.profile?.cpf?.replace(/[.\-]/g, '') || '';
      const cpfFormatted = a.profile?.cpf?.toLowerCase() || '';
      
      return fullName.includes(search) || 
             username.includes(search) || 
             cpf.includes(searchNormalized) ||
             cpfFormatted.includes(search);
    }
    
    return true;
  });
  
  // Toggle account selection
  const toggleAccountSelection = (accountId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedAccounts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(accountId)) {
        newSet.delete(accountId);
      } else {
        newSet.add(accountId);
      }
      return newSet;
    });
  };
  
  // Select all visible accounts
  const selectAllVisible = () => {
    const visibleIds = filteredAccounts.map(a => a.id);
    setSelectedAccounts(new Set(visibleIds));
  };
  
  // Clear selection
  const clearSelection = () => {
    setSelectedAccounts(new Set());
  };
  
  // Batch delete accounts (using backend cleanup so it also goes to Lixeira)
  const handleBatchDelete = async () => {
    if (selectedAccounts.size === 0) return;

    setIsBatchDeleting(true);
    try {
      const idsToDelete = Array.from(selectedAccounts);
      const { data: { session } } = await supabase.auth.getSession();

      let successCount = 0;
      for (const id of idsToDelete) {
        const { data, error } = await supabase.functions.invoke("admin-cleanup-user", {
          body: { type: "pre_generated_account", id },
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
        });

        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || "Erro desconhecido");
        successCount += 1;
      }

      toast.success(`${successCount} contas excluídas com sucesso!`);
      setShowBatchDeleteDialog(false);
      setSelectedAccounts(new Set());
      fetchAccounts();
      fetchActiveAccounts();
    } catch (error: any) {
      console.error('Error batch deleting accounts:', error);
      toast.error(error?.message || 'Erro ao excluir contas em lote');
    } finally {
      setIsBatchDeleting(false);
    }
  };

  // Calcula tempo restante de expiração
  const getRemainingTime = (account: PreGeneratedAccount): { text: string; expired: boolean; percentage: number } => {
    if (!account.is_used || !account.used_at) {
      return { text: 'Não ativado', expired: false, percentage: 100 };
    }

    const usedAt = new Date(account.used_at);
    const durationMs = account.license_duration_days * 24 * 60 * 60 * 1000;
    const expiresAt = new Date(usedAt.getTime() + durationMs);
    const now = new Date();
    const remainingMs = expiresAt.getTime() - now.getTime();

    if (remainingMs <= 0) {
      return { text: 'Expirado', expired: true, percentage: 0 };
    }

    const percentage = Math.max(0, Math.min(100, (remainingMs / durationMs) * 100));

    // Formatar tempo restante
    const remainingSeconds = Math.floor(remainingMs / 1000);
    const remainingMinutes = Math.floor(remainingSeconds / 60);
    const remainingHours = Math.floor(remainingMinutes / 60);
    const remainingDays = Math.floor(remainingHours / 24);

    let text = '';
    if (remainingDays > 0) {
      text = `${remainingDays}d ${remainingHours % 24}h`;
    } else if (remainingHours > 0) {
      text = `${remainingHours}h ${remainingMinutes % 60}min`;
    } else if (remainingMinutes > 0) {
      text = `${remainingMinutes}min ${remainingSeconds % 60}s`;
    } else {
      text = `${remainingSeconds}s`;
    }

    return { text, expired: false, percentage };
  };

  const getExpirationColor = (percentage: number, expired: boolean) => {
    if (expired) return 'text-red-500 bg-red-500/20';
    if (percentage > 50) return 'text-green-400 bg-green-500/20';
    if (percentage > 20) return 'text-yellow-400 bg-yellow-500/20';
    return 'text-orange-400 bg-orange-500/20';
  };

  const handleAccountClick = (account: PreGeneratedAccount) => {
    playClickSound();
    setSelectedAccount(account);
    setEditAccountType(account.account_type);
    setEditDurationDays(account.license_duration_days.toString());
    setShowDetailsDialog(true);
  };

  const handleDeleteAccount = async () => {
    if (!selectedAccount) return;

    setIsDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const { data, error } = await supabase.functions.invoke("admin-cleanup-user", {
        body: { type: "pre_generated_account", id: selectedAccount.id },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro desconhecido");

      toast.success('Conta excluída com sucesso!');
      setShowDeleteDialog(false);
      setShowDetailsDialog(false);
      setSelectedAccount(null);
      fetchAccounts();
      fetchActiveAccounts();
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast.error(error?.message || 'Erro ao excluir conta');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateAccount = async () => {
    if (!selectedAccount) return;
    
    const durationValue = parseFloat(editDurationDays);
    if (isNaN(durationValue) || durationValue <= 0) {
      toast.error('Duração inválida');
      return;
    }
    
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('pre_generated_accounts')
        .update({ 
          account_type: editAccountType,
          license_duration_days: durationValue
        })
        .eq('id', selectedAccount.id);

      if (error) throw error;

      toast.success('Conta atualizada com sucesso!');
      setShowEditDialog(false);
      setShowDetailsDialog(false);
      setSelectedAccount(null);
      fetchAccounts();
    } catch (error) {
      console.error('Error updating account:', error);
      toast.error('Erro ao atualizar conta');
    } finally {
      setIsUpdating(false);
    }
  };

  const getAccountTypeLabel = (type: AccountType) => {
    const option = ACCOUNT_TYPE_OPTIONS.find(o => o.value === type);
    return option?.label || type;
  };

  const stats = {
    client: { total: accounts.filter(a => a.account_type === 'client').length, used: accounts.filter(a => a.account_type === 'client' && a.is_used).length },
    instructor: { total: accounts.filter(a => a.account_type === 'instructor').length, used: accounts.filter(a => a.account_type === 'instructor' && a.is_used).length },
    admin: { total: accounts.filter(a => a.account_type === 'admin').length, used: accounts.filter(a => a.account_type === 'admin' && a.is_used).length },
    trial: { total: accounts.filter(a => a.account_type === 'trial').length, used: accounts.filter(a => a.account_type === 'trial' && a.is_used).length },
  };

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
          <Key className="w-6 h-6" />
          CONTAS PRÉ-GERADAS
        </h2>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className={`bg-card/80 backdrop-blur-md border-blue-500/30 ${activeTab === 'client' ? 'ring-2 ring-blue-500' : ''}`}>
          <CardContent className="p-4 text-center cursor-pointer" onClick={() => setActiveTab('client')}>
            <User className="w-6 h-6 mx-auto mb-2 text-blue-400" />
            <p className="text-2xl font-bold text-blue-400">{stats.client.total - stats.client.used}/{stats.client.total}</p>
            <p className="text-xs text-muted-foreground">Clientes</p>
          </CardContent>
        </Card>
        <Card className={`bg-card/80 backdrop-blur-md border-green-500/30 ${activeTab === 'instructor' ? 'ring-2 ring-green-500' : ''}`}>
          <CardContent className="p-4 text-center cursor-pointer" onClick={() => setActiveTab('instructor')}>
            <UserCheck className="w-6 h-6 mx-auto mb-2 text-green-400" />
            <p className="text-2xl font-bold text-green-400">{stats.instructor.total - stats.instructor.used}/{stats.instructor.total}</p>
            <p className="text-xs text-muted-foreground">Instrutores</p>
          </CardContent>
        </Card>
        <Card className={`bg-card/80 backdrop-blur-md border-purple-500/30 ${activeTab === 'admin' ? 'ring-2 ring-purple-500' : ''}`}>
          <CardContent className="p-4 text-center cursor-pointer" onClick={() => setActiveTab('admin')}>
            <Briefcase className="w-6 h-6 mx-auto mb-2 text-purple-400" />
            <p className="text-2xl font-bold text-purple-400">{stats.admin.total - stats.admin.used}/{stats.admin.total}</p>
            <p className="text-xs text-muted-foreground">Gerentes</p>
          </CardContent>
        </Card>
        <Card className={`bg-card/80 backdrop-blur-md border-yellow-500/30 ${activeTab === 'trial' ? 'ring-2 ring-yellow-500' : ''}`}>
          <CardContent className="p-4 text-center cursor-pointer" onClick={() => setActiveTab('trial')}>
            <Clock className="w-6 h-6 mx-auto mb-2 text-yellow-400" />
            <p className="text-2xl font-bold text-yellow-400">{stats.trial.total - stats.trial.used}/{stats.trial.total}</p>
            <p className="text-xs text-muted-foreground">Trial</p>
          </CardContent>
        </Card>
        <Card className={`bg-card/80 backdrop-blur-md border-emerald-500/30 ${activeTab === 'active' ? 'ring-2 ring-emerald-500' : ''}`}>
          <CardContent className="p-4 text-center cursor-pointer" onClick={() => setActiveTab('active')}>
            <CheckCircle className="w-6 h-6 mx-auto mb-2 text-emerald-400" />
            <p className="text-2xl font-bold text-emerald-400">{activeAccounts.length}</p>
            <p className="text-xs text-muted-foreground">Ativas</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Password Generator */}
      <Card className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-5 h-5 text-yellow-400" />
            <h3 className="font-bebas text-lg text-yellow-400">SENHA RÁPIDA</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
            <div>
              <Label className="text-xs text-muted-foreground">Prefixo</Label>
              <Input
                value={quickPrefix}
                onChange={(e) => setQuickPrefix(e.target.value.toUpperCase())}
                placeholder="TESTE"
                className="bg-background/50"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Quantidade</Label>
              <Input
                type="number"
                value={quickQuantity}
                onChange={(e) => setQuickQuantity(e.target.value)}
                min="1"
                max="100"
                className="bg-background/50"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Expiração</Label>
              <Select value={quickExpiration} onValueChange={setQuickExpiration}>
                <SelectTrigger className="bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPIRATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 sm:col-span-2">
              <Button 
                onClick={generateQuickPasswords}
                disabled={generating || !quickPrefix}
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-bold"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                Gerar Senhas Rápidas
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search and Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por username ou chave..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-background/50"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={generateAllAccounts} 
            disabled={generating}
            className="bg-primary hover:bg-primary/80"
            size="sm"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Key className="w-4 h-4 mr-2" />}
            Gerar Todas
          </Button>
          <Button variant="outline" onClick={fetchAccounts} size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          <Button variant="outline" onClick={() => exportToCSV(activeTab)} size="sm">
            <Download className="w-4 h-4 mr-2" />
            CSV
          </Button>
          <Button variant="outline" onClick={() => handlePrint(activeTab)} size="sm">
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
        </div>
      </div>
      
      {/* Batch Selection Actions */}
      {selectedAccounts.size > 0 && (
        <Card className="bg-destructive/10 border-destructive/30">
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-destructive" />
              <span className="font-medium">{selectedAccounts.size} conta(s) selecionada(s)</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={clearSelection}>
                Limpar Seleção
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => setShowBatchDeleteDialog(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir Selecionadas
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="client" className="text-xs sm:text-sm">
            <User className="w-4 h-4 mr-1 hidden sm:inline" />
            Clientes
          </TabsTrigger>
          <TabsTrigger value="instructor" className="text-xs sm:text-sm">
            <UserCheck className="w-4 h-4 mr-1 hidden sm:inline" />
            Instrutores
          </TabsTrigger>
          <TabsTrigger value="admin" className="text-xs sm:text-sm">
            <Briefcase className="w-4 h-4 mr-1 hidden sm:inline" />
            Gerentes
          </TabsTrigger>
          <TabsTrigger value="trial" className="text-xs sm:text-sm">
            <Clock className="w-4 h-4 mr-1 hidden sm:inline" />
            Trial
          </TabsTrigger>
          <TabsTrigger value="active" className="text-xs sm:text-sm bg-green-500/10 data-[state=active]:bg-green-500/20">
            <CheckCircle className="w-4 h-4 mr-1 hidden sm:inline text-green-500" />
            <span className="text-green-500">Ativas</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h3 className="font-bebas text-lg flex items-center gap-2">
                {getAccountIcon(activeTab)}
                {activeTab.toUpperCase()} - {availableCount} disponíveis / {usedCount} usadas
                {searchTerm && <span className="text-sm text-muted-foreground font-normal">({filteredAccounts.length} encontradas)</span>}
              </h3>
              <div className="flex items-center gap-2">
                {filteredAccounts.length > 0 && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={selectAllVisible}
                    className="text-xs"
                  >
                    <CheckSquare className="w-4 h-4 mr-1" />
                    Selecionar Todas
                  </Button>
                )}
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => generateAccounts(activeTab as any, 10)}
                  disabled={generating}
                >
                  {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : '+10'}
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : filteredAccounts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma conta encontrada</p>
                <Button 
                  className="mt-4" 
                  onClick={() => generateAccounts(activeTab as any, activeTab === 'client' ? 100 : activeTab === 'trial' ? 30 : 50)}
                  disabled={generating}
                >
                  Gerar Contas
                </Button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {filteredAccounts.map((account) => {
                  const isSelected = selectedAccounts.has(account.id);
                  return (
                    <motion.div
                      key={account.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={() => handleAccountClick(account)}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all hover:scale-[1.01] hover:shadow-md ${
                        isSelected 
                          ? 'bg-primary/10 border-primary/50 ring-1 ring-primary/30'
                          : account.is_used 
                            ? 'bg-muted/30 border-muted/50 opacity-60 hover:opacity-80' 
                            : 'bg-background/50 border-border/50 hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Selection Checkbox */}
                        <button
                          onClick={(e) => toggleAccountSelection(account.id, e)}
                          className={`w-6 h-6 rounded flex items-center justify-center border transition-colors ${
                            isSelected 
                              ? 'bg-primary border-primary text-primary-foreground' 
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          {isSelected && <CheckCircle className="w-4 h-4" />}
                        </button>
                        
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          account.is_used ? 'bg-red-500/20' : 'bg-green-500/20'
                        }`}>
                          {account.is_used ? (
                            <XCircle className="w-4 h-4 text-red-500" />
                          ) : (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-mono font-bold">{account.username}</p>
                            <Badge variant="outline" className={getAccountColor(account.account_type)}>
                              {account.license_duration_days}d
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground font-mono">{account.license_key}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {account.is_used ? (
                          <div className="flex items-center gap-2">
                            {(() => {
                              const { text, expired, percentage } = getRemainingTime(account);
                              return (
                                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getExpirationColor(percentage, expired)}`}>
                                  <Clock className="w-3 h-3" />
                                  <span>{text}</span>
                                </div>
                              );
                            })()}
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(`${account.username}\n${account.license_key}`);
                            }}
                            className="h-8 w-8"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        )}
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Active Accounts Tab */}
        <TabsContent value="active" className="mt-4">
          <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-green-500/30">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h3 className="font-bebas text-lg flex items-center gap-2 text-green-400">
                <CheckCircle className="w-5 h-5" />
                CONTAS ATIVAS ({filteredActiveAccounts.length})
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar nome ou CPF..."
                    value={activeAccountsSearch}
                    onChange={(e) => setActiveAccountsSearch(e.target.value)}
                    className="pl-8 h-8 w-44 text-xs"
                  />
                  {activeAccountsSearch && (
                    <button 
                      onClick={() => setActiveAccountsSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <Select value={activeAccountsFilter} onValueChange={(v) => setActiveAccountsFilter(v as 'all' | AccountType)}>
                  <SelectTrigger className="w-36 h-8 text-xs">
                    <SelectValue placeholder="Filtrar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="client">
                      <div className="flex items-center gap-2">
                        <User className="w-3 h-3" /> Cliente
                      </div>
                    </SelectItem>
                    <SelectItem value="instructor">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-3 h-3" /> Instrutor
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-3 h-3" /> Gerente
                      </div>
                    </SelectItem>
                    <SelectItem value="trial">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3" /> Trial
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchActiveAccounts}
                  disabled={activeAccountsLoading}
                >
                  {activeAccountsLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Atualizar
                </Button>
              </div>
            </div>

            {activeAccountsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-green-400" />
              </div>
            ) : filteredActiveAccounts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma conta ativa encontrada</p>
                {(activeAccountsFilter !== 'all' || activeAccountsSearch) && (
                  <Button 
                    variant="link" 
                    size="sm" 
                    onClick={() => {
                      setActiveAccountsFilter('all');
                      setActiveAccountsSearch('');
                    }}
                  >
                    Limpar filtros
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {filteredActiveAccounts.map((account) => {
                  const { text, expired, percentage } = getRemainingTime(account);
                  return (
                    <motion.div
                      key={account.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 rounded-lg border transition-all ${
                        expired 
                          ? 'bg-red-500/10 border-red-500/30' 
                          : 'bg-green-500/10 border-green-500/30'
                      }`}
                    >
                      {/* Account Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            expired ? 'bg-red-500/20' : 'bg-green-500/20'
                          }`}>
                            {getAccountIcon(account.account_type)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold">{account.username}</span>
                              <Badge variant="outline" className={getAccountColor(account.account_type)}>
                                {getAccountTypeLabel(account.account_type)}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground font-mono">{account.license_key}</p>
                          </div>
                        </div>
                        <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium ${getExpirationColor(percentage, expired)}`}>
                          <Clock className="w-4 h-4" />
                          <span>{text}</span>
                        </div>
                      </div>

                      {/* User Info */}
                      {account.profile ? (
                        <div className="bg-background/50 rounded-lg p-3 space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium text-primary">
                            <User className="w-4 h-4" />
                            Usuário Vinculado
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                            <div>
                              <span className="text-muted-foreground">Nome:</span>
                              <span className="ml-2 font-medium">{account.profile.full_name || '-'}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Username:</span>
                              <span className="ml-2 font-mono">{account.profile.username}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Email:</span>
                              <span className="ml-2">{account.profile.email || '-'}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Telefone:</span>
                              <span className="ml-2">{account.profile.phone || '-'}</span>
                            </div>
                            {account.profile.cpf && (
                              <div className="col-span-2">
                                <span className="text-muted-foreground">CPF:</span>
                                <span className="ml-2 font-mono">{account.profile.cpf}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-background/50 rounded-lg p-3 text-sm text-muted-foreground flex items-center gap-2">
                          <XCircle className="w-4 h-4" />
                          Usuário não encontrado ou sem perfil vinculado
                        </div>
                      )}

                      {/* Activation Info */}
                      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          Ativada em: {account.used_at ? new Date(account.used_at).toLocaleString('pt-BR') : '-'}
                        </span>
                        <span>Duração: {account.license_duration_days} dias</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Account Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedAccount && getAccountIcon(selectedAccount.account_type)}
              Detalhes da Conta
            </DialogTitle>
            <DialogDescription>
              Visualize o status e gerencie esta conta pré-gerada.
            </DialogDescription>
          </DialogHeader>
          
          {selectedAccount && (
            <div className="space-y-4">
              {/* Account Info */}
              <div className="space-y-3 p-4 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Username:</span>
                  <span className="font-mono font-bold">{selectedAccount.username}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Senha/Chave:</span>
                  <span className="font-mono text-sm">{selectedAccount.license_key}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Tipo:</span>
                  <Badge variant="outline" className={getAccountColor(selectedAccount.account_type)}>
                    {getAccountTypeLabel(selectedAccount.account_type)}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Duração:</span>
                  <span>{selectedAccount.license_duration_days} dias</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Badge variant={selectedAccount.is_used ? 'destructive' : 'default'}>
                    {selectedAccount.is_used ? 'Usada' : 'Disponível'}
                  </Badge>
                </div>
                {selectedAccount.is_used && selectedAccount.used_at && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Usada em:</span>
                      <span className="text-sm">{new Date(selectedAccount.used_at).toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Tempo Restante:</span>
                      {(() => {
                        const { text, expired, percentage } = getRemainingTime(selectedAccount);
                        return (
                          <span className={`font-medium ${expired ? 'text-red-500' : percentage > 50 ? 'text-green-400' : 'text-yellow-400'}`}>
                            {text}
                          </span>
                        );
                      })()}
                    </div>
                  </>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Criada em:</span>
                  <span className="text-sm">{new Date(selectedAccount.created_at).toLocaleString('pt-BR')}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    copyToClipboard(`${selectedAccount.username}\n${selectedAccount.license_key}`);
                  }}
                  className="w-full justify-start"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar Credenciais
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditAccountType(selectedAccount.account_type);
                    setShowEditDialog(true);
                  }}
                  className="w-full justify-start"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Alterar Tipo de Conta
                </Button>
                
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                  className="w-full justify-start"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir Conta
                </Button>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Account Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Editar Conta
            </DialogTitle>
            <DialogDescription>
              Altere o tipo e duração da conta "{selectedAccount?.username}".
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">Tipo de Conta:</Label>
              <Select value={editAccountType} onValueChange={(v) => setEditAccountType(v as AccountType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        {option.value === 'client' && <User className="w-4 h-4" />}
                        {option.value === 'instructor' && <UserCheck className="w-4 h-4" />}
                        {option.value === 'admin' && <Briefcase className="w-4 h-4" />}
                        {option.value === 'trial' && <Clock className="w-4 h-4" />}
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">Duração (dias):</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={editDurationDays}
                  onChange={(e) => setEditDurationDays(e.target.value)}
                  className="flex-1"
                  placeholder="Ex: 30"
                />
                <Select value={editDurationDays} onValueChange={setEditDurationDays}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Rápido" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0.02">30 min</SelectItem>
                    <SelectItem value="0.04">1 hora</SelectItem>
                    <SelectItem value="1">1 dia</SelectItem>
                    <SelectItem value="7">7 dias</SelectItem>
                    <SelectItem value="30">30 dias</SelectItem>
                    <SelectItem value="90">90 dias</SelectItem>
                    <SelectItem value="365">1 ano</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Use valores decimais para minutos (0.02 = 30min, 0.04 = 1h)
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateAccount} disabled={isUpdating}>
              {isUpdating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a conta "{selectedAccount?.username}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Batch Delete Confirmation Dialog */}
      <AlertDialog open={showBatchDeleteDialog} onOpenChange={setShowBatchDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Excluir {selectedAccounts.size} Contas
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{selectedAccounts.size}</strong> conta(s) selecionada(s)? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isBatchDeleting}
            >
              {isBatchDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Excluir {selectedAccounts.size} Contas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

export default PreGeneratedAccounts;

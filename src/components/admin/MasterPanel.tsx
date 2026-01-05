import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Shield, Key, Users, Activity, TrendingUp,
  CheckCircle, XCircle, Clock, AlertTriangle, Plus,
  Copy, Eye, EyeOff, RefreshCw, Search, Filter,
  BarChart3, Calendar, Zap, Lock, Unlock, Trash2, Edit2,
  UserPlus, Download, Printer, Loader2, Palette
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAudio } from '@/contexts/AudioContext';
import { useEscapeBack } from '@/hooks/useEscapeBack';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { format, subDays, subMonths, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MasterCredentials } from './MasterCredentials';
import LicenseUsageReport from './LicenseUsageReport';
import GlobalThemeManager from './GlobalThemeManager';
import { TrashBin } from './TrashBin';

interface License {
  id: string;
  license_key: string;
  license_type: 'demo' | 'trial' | 'full' | 'master';
  status: 'active' | 'expired' | 'blocked';
  profile_id: string | null;
  created_by: string | null;
  created_at: string;
  started_at: string | null;
  expires_at: string | null;
  profile?: {
    id: string;
    username: string;
    full_name: string | null;
    email: string | null;
  } | null;
}

interface LicenseStats {
  total: number;
  active: number;
  expired: number;
  blocked: number;
  demo: number;
  trial: number;
  full: number;
}

interface PreGenStats {
  trial7: { total: number; available: number };
  full30: { total: number; available: number };
  full365: { total: number; available: number };
  admin: { total: number; available: number };
  instructor30: { total: number; available: number };
  instructor365: { total: number; available: number };
}

interface PreGenAccount {
  id: string;
  username: string;
  license_key: string;
  account_type: string;
  license_duration_days: number;
  is_used: boolean;
  used_at: string | null;
  created_at: string;
}

const MasterPanel: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { playClickSound } = useAudio();
  const [loading, setLoading] = useState(true);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [stats, setStats] = useState<LicenseStats>({ total: 0, active: 0, expired: 0, blocked: 0, demo: 0, trial: 0, full: 0 });
  const [preGenStats, setPreGenStats] = useState<PreGenStats>({
    trial7: { total: 0, available: 0 },
    full30: { total: 0, available: 0 },
    full365: { total: 0, available: 0 },
    admin: { total: 0, available: 0 },
    instructor30: { total: 0, available: 0 },
    instructor365: { total: 0, available: 0 }
  });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  
  // Create license dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newLicenseType, setNewLicenseType] = useState<'trial' | 'full'>('full');
  const [newLicenseDays, setNewLicenseDays] = useState(30);
  const [createdLicenseKey, setCreatedLicenseKey] = useState<string | null>(null);
  
  // Edit/Delete dialogs
  const [selectedLicense, setSelectedLicense] = useState<License | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [renewDialogOpen, setRenewDialogOpen] = useState(false);
  const [renewDuration, setRenewDuration] = useState<string>('30d');
  const [showKeys, setShowKeys] = useState<Set<string>>(new Set());
  
  // Batch generation
  const [generating, setGenerating] = useState(false);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [batchType, setBatchType] = useState<string>('trial7');
  const [batchCount, setBatchCount] = useState(10);
  
  // Pre-generated accounts list
  const [preGenAccounts, setPreGenAccounts] = useState<PreGenAccount[]>([]);
  const [preGenFilter, setPreGenFilter] = useState<string>('trial');
  const [preGenSearch, setPreGenSearch] = useState('');
  
  // Reset expired licenses
  const [resetExpiredDialogOpen, setResetExpiredDialogOpen] = useState(false);
  const [resetDuration, setResetDuration] = useState<string>('30m');
  const [resettingExpired, setResettingExpired] = useState(false);
  
  // Delete pre-gen account confirmation
  const [deletePreGenConfirm, setDeletePreGenConfirm] = useState<PreGenAccount | null>(null);

  // ESC para voltar ao menu admin (desabilitado quando há dialogs abertos)
  useEscapeBack({ 
    to: '/admin', 
    disableWhen: [
      createDialogOpen, editDialogOpen, deleteDialogOpen, 
      renewDialogOpen, batchDialogOpen, resetExpiredDialogOpen,
      deletePreGenConfirm !== null
    ] 
  });

  useEffect(() => {
    if (profile?.profile_id) {
      fetchLicenses();
      fetchPreGenStats();
    }
  }, [profile]);

  const fetchLicenses = async () => {
    if (!profile?.profile_id) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('licenses')
        .select(`
          *,
          profile:profiles!licenses_profile_id_fkey (
            id,
            username,
            full_name,
            email
          )
        `)
        .neq('license_type', 'master')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setLicenses(data || []);
      
      const licensesData = data || [];
      setStats({
        total: licensesData.length,
        active: licensesData.filter(l => l.status === 'active').length,
        expired: licensesData.filter(l => l.status === 'expired').length,
        blocked: licensesData.filter(l => l.status === 'blocked').length,
        demo: licensesData.filter(l => l.license_type === 'demo').length,
        trial: licensesData.filter(l => l.license_type === 'trial').length,
        full: licensesData.filter(l => l.license_type === 'full').length,
      });
    } catch (error) {
      console.error('Error fetching licenses:', error);
      toast.error('Erro ao carregar licenças');
    } finally {
      setLoading(false);
    }
  };

  const fetchPreGenAccounts = async (filter: string) => {
    try {
      let q = supabase
        .from('pre_generated_accounts')
        .select('*')
        .order('is_used', { ascending: true })
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        q = q.eq('account_type', filter);
      }

      // Keep within backend per-request limits.
      const { data, error } = await q.limit(1000);
      if (error) throw error;

      setPreGenAccounts((data || []) as PreGenAccount[]);
    } catch (error) {
      console.error('Error fetching pre-gen accounts:', error);
    }
  };

  const fetchPreGenStats = async () => {
    try {
      const getCount = async (opts: { type: string; days?: number; onlyAvailable?: boolean }) => {
        let q = supabase
          .from('pre_generated_accounts')
          .select('id', { count: 'exact', head: true })
          .eq('account_type', opts.type);

        if (typeof opts.days === 'number') {
          q = q.eq('license_duration_days', opts.days);
        }

        if (opts.onlyAvailable) {
          q = q.eq('is_used', false);
        }

        const { count, error } = await q;
        if (error) throw error;
        return count ?? 0;
      };

      const [
        trialTotal,
        trialAvail,
        full30Total,
        full30Avail,
        full365Total,
        full365Avail,
        adminTotal,
        adminAvail,
        inst30Total,
        inst30Avail,
        inst365Total,
        inst365Avail,
      ] = await Promise.all([
        getCount({ type: 'trial', days: 7 }),
        getCount({ type: 'trial', days: 7, onlyAvailable: true }),
        getCount({ type: 'client', days: 30 }),
        getCount({ type: 'client', days: 30, onlyAvailable: true }),
        getCount({ type: 'client', days: 365 }),
        getCount({ type: 'client', days: 365, onlyAvailable: true }),
        getCount({ type: 'admin' }),
        getCount({ type: 'admin', onlyAvailable: true }),
        getCount({ type: 'instructor', days: 30 }),
        getCount({ type: 'instructor', days: 30, onlyAvailable: true }),
        getCount({ type: 'instructor', days: 365 }),
        getCount({ type: 'instructor', days: 365, onlyAvailable: true }),
      ]);

      setPreGenStats({
        trial7: { total: trialTotal, available: trialAvail },
        full30: { total: full30Total, available: full30Avail },
        full365: { total: full365Total, available: full365Avail },
        admin: { total: adminTotal, available: adminAvail },
        instructor30: { total: inst30Total, available: inst30Avail },
        instructor365: { total: inst365Total, available: inst365Avail },
      });

      // When refreshing from the "Senhas" tab, also refresh its list.
      if (activeTab === 'passwords') {
        await fetchPreGenAccounts(preGenFilter);
      }
    } catch (error) {
      console.error('Error fetching pre-gen stats:', error);
    }
  };

  useEffect(() => {
    if (!profile?.profile_id) return;
    if (activeTab !== 'passwords') return;
    fetchPreGenAccounts(preGenFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.profile_id, activeTab, preGenFilter]);

  const getFilteredPreGenAccounts = () => {
    return preGenAccounts.filter(account => {
      const matchesFilter = preGenFilter === 'all' || account.account_type === preGenFilter;
      const matchesSearch = preGenSearch === '' || 
        account.username.toLowerCase().includes(preGenSearch.toLowerCase()) ||
        account.license_key.toLowerCase().includes(preGenSearch.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  };

  const copyAccountCredentials = (account: PreGenAccount) => {
    const text = `Usuário: ${account.username}\nSenha: ${account.license_key}`;
    navigator.clipboard.writeText(text);
    toast.success('Credenciais copiadas!');
  };

  const generateLicenseKey = (prefix: string = 'LIC') => {
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

  const generateBatchAccounts = async () => {
    if (!profile?.profile_id) return;
    setGenerating(true);

    try {
      const typeConfig: Record<string, { accountType: string; duration: number; prefix: string; namePrefix: string }> = {
        trial7: { accountType: 'trial', duration: 7, prefix: 'T7', namePrefix: 'TRIAL7' },
        full30: { accountType: 'client', duration: 30, prefix: 'F30', namePrefix: 'FULL30' },
        full365: { accountType: 'client', duration: 365, prefix: 'ANL', namePrefix: 'ANUAL' },
        admin365: { accountType: 'admin', duration: 365, prefix: 'ADM', namePrefix: 'ADMIN' },
        instructor30: { accountType: 'instructor', duration: 30, prefix: 'I30', namePrefix: 'INST30' },
        instructor365: { accountType: 'instructor', duration: 365, prefix: 'I365', namePrefix: 'INST365' }
      };

      const config = typeConfig[batchType];
      if (!config) {
        toast.error('Tipo inválido');
        return;
      }

      // Get existing count (exact) without hitting per-query row limits
      const { count: existingCount, error: countError } = await supabase
        .from('pre_generated_accounts')
        .select('id', { count: 'exact', head: true })
        .eq('account_type', config.accountType)
        .eq('license_duration_days', config.duration);

      if (countError) throw countError;

      const startNum = (existingCount ?? 0) + 1;
      const newAccounts = [];

      for (let i = 0; i < batchCount; i++) {
        const num = startNum + i;
        const username = `${config.namePrefix}-${num.toString().padStart(4, '0')}`;
        const licenseKey = `${config.prefix}-${num.toString().padStart(4, '0')}-${new Date().getFullYear()}`;

        newAccounts.push({
          username,
          license_key: licenseKey,
          account_type: config.accountType,
          license_duration_days: config.duration,
          is_used: false,
          created_by: profile.profile_id
        });
      }

      const { error } = await supabase
        .from('pre_generated_accounts')
        .insert(newAccounts);

      if (error) throw error;

      toast.success(`${batchCount} contas geradas com sucesso!`);
      setBatchDialogOpen(false);
      fetchPreGenStats();
    } catch (error: any) {
      console.error('Error generating accounts:', error);
      toast.error(error.message || 'Erro ao gerar contas');
    } finally {
      setGenerating(false);
    }
  };

  const createLicense = async () => {
    if (!profile?.profile_id) return;

    try {
      const licenseKey = generateLicenseKey();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + newLicenseDays);

      const { error } = await supabase.from('licenses').insert({
        license_key: licenseKey,
        license_type: newLicenseType,
        status: 'active',
        created_by: profile.profile_id,
        expires_at: expiresAt.toISOString(),
        started_at: new Date().toISOString()
      });

      if (error) throw error;

      setCreatedLicenseKey(licenseKey);
      toast.success('Licença criada com sucesso!');
      fetchLicenses();
    } catch (error) {
      console.error('Error creating license:', error);
      toast.error('Erro ao criar licença');
    }
  };

  const updateLicenseStatus = async (licenseId: string, newStatus: 'active' | 'blocked') => {
    try {
      const { error } = await supabase
        .from('licenses')
        .update({ status: newStatus })
        .eq('id', licenseId);

      if (error) throw error;

      toast.success(`Licença ${newStatus === 'active' ? 'ativada' : 'bloqueada'} com sucesso!`);
      fetchLicenses();
      setEditDialogOpen(false);
    } catch (error) {
      console.error('Error updating license:', error);
      toast.error('Erro ao atualizar licença');
    }
  };

  const renewLicense = async (licenseId: string, duration: string) => {
    try {
      const now = new Date();
      let expiresAt: Date;
      let licenseType: 'demo' | 'trial' | 'full' = 'full';

      switch (duration) {
        case '30m':
          expiresAt = new Date(now.getTime() + 30 * 60 * 1000);
          licenseType = 'demo';
          break;
        case '7d':
          expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          licenseType = 'trial';
          break;
        case '30d':
          expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          licenseType = 'full';
          break;
        case '1y':
          expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
          licenseType = 'full';
          break;
        default:
          expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          licenseType = 'full';
      }

      const updateData: Record<string, unknown> = {
        status: 'active',
        expires_at: expiresAt.toISOString(),
        license_type: licenseType,
      };

      if (licenseType === 'demo') {
        updateData.demo_started_at = now.toISOString();
        updateData.trial_started_at = null;
      } else if (licenseType === 'trial') {
        updateData.trial_started_at = now.toISOString();
        updateData.demo_started_at = null;
      } else {
        updateData.demo_started_at = null;
        updateData.trial_started_at = null;
      }

      const { error } = await supabase
        .from('licenses')
        .update(updateData)
        .eq('id', licenseId);

      if (error) throw error;

      const durationText = duration === '30m' ? '30 minutos' : 
                          duration === '7d' ? '7 dias' : 
                          duration === '30d' ? '30 dias' : '1 ano';
      
      toast.success(`Licença renovada por ${durationText}!`);
      fetchLicenses();
      setRenewDialogOpen(false);
      setSelectedLicense(null);
    } catch (error) {
      console.error('Error renewing license:', error);
      toast.error('Erro ao renovar licença');
    }
  };

  const deleteLicense = async (licenseId: string) => {
    try {
      // Get current session for auth
      const { data: { session } } = await supabase.auth.getSession();
      
      // Use edge function for complete cleanup
      const { data, error } = await supabase.functions.invoke("admin-cleanup-user", {
        body: { type: "license", id: licenseId },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro desconhecido");

      toast.success('Licença excluída com sucesso!');
      fetchLicenses();
      setDeleteDialogOpen(false);
      setSelectedLicense(null);
    } catch (error: any) {
      console.error('Error deleting license:', error);
      toast.error(error?.message || 'Erro ao excluir licença');
    }
  };

  const deletePreGenAccount = async (accountId: string) => {
    try {
      // Get current session for auth
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke("admin-cleanup-user", {
        body: { type: "pre_generated_account", id: accountId },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro desconhecido");

      toast.success('Conta pré-gerada excluída com sucesso!');
      fetchPreGenStats();
      fetchPreGenAccounts(preGenFilter);
    } catch (error: any) {
      console.error('Error deleting pre-gen account:', error);
      toast.error(error?.message || 'Erro ao excluir conta');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado para a área de transferência!');
  };

  // Reset ALL expired licenses at once
  const resetAllExpiredLicenses = async () => {
    setResettingExpired(true);
    try {
      const expiredLicenses = licenses.filter(l => l.status === 'expired');
      
      if (expiredLicenses.length === 0) {
        toast.info('Não há licenças expiradas para resetar');
        setResetExpiredDialogOpen(false);
        return;
      }

      const now = new Date();
      let expiresAt: Date;
      let licenseType: 'demo' | 'trial' | 'full' = 'demo';

      switch (resetDuration) {
        case '30m':
          expiresAt = new Date(now.getTime() + 30 * 60 * 1000);
          licenseType = 'demo';
          break;
        case '7d':
          expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          licenseType = 'trial';
          break;
        case '30d':
          expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          licenseType = 'full';
          break;
        case '1y':
          expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
          licenseType = 'full';
          break;
        default:
          expiresAt = new Date(now.getTime() + 30 * 60 * 1000);
          licenseType = 'demo';
      }

      // Update all expired licenses
      for (const license of expiredLicenses) {
        const updateData: Record<string, unknown> = {
          status: 'active',
          expires_at: expiresAt.toISOString(),
          license_type: licenseType,
        };

        if (licenseType === 'demo') {
          updateData.demo_started_at = now.toISOString();
          updateData.trial_started_at = null;
        } else if (licenseType === 'trial') {
          updateData.trial_started_at = now.toISOString();
          updateData.demo_started_at = null;
        } else {
          updateData.demo_started_at = null;
          updateData.trial_started_at = null;
        }

        await supabase
          .from('licenses')
          .update(updateData)
          .eq('id', license.id);
      }

      const durationText = resetDuration === '30m' ? '30 minutos' : 
                          resetDuration === '7d' ? '7 dias' : 
                          resetDuration === '30d' ? '30 dias' : '1 ano';

      toast.success(`${expiredLicenses.length} licença(s) renovada(s) por ${durationText}!`);
      fetchLicenses();
      setResetExpiredDialogOpen(false);
    } catch (error) {
      console.error('Error resetting expired licenses:', error);
      toast.error('Erro ao resetar licenças');
    } finally {
      setResettingExpired(false);
    }
  };

  const toggleShowKey = (id: string) => {
    const newShowKeys = new Set(showKeys);
    if (newShowKeys.has(id)) {
      newShowKeys.delete(id);
    } else {
      newShowKeys.add(id);
    }
    setShowKeys(newShowKeys);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/50">Ativa</Badge>;
      case 'expired':
        return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/50">Expirada</Badge>;
      case 'blocked':
        return <Badge className="bg-red-500/20 text-red-500 border-red-500/50">Bloqueada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'demo':
        return <Badge variant="outline" className="border-yellow-500/50 text-yellow-500">Demo</Badge>;
      case 'trial':
        return <Badge variant="outline" className="border-blue-500/50 text-blue-500">Trial</Badge>;
      case 'full':
        return <Badge variant="outline" className="border-green-500/50 text-green-500">Full</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const filteredLicenses = licenses.filter(license => {
    const matchesSearch = 
      license.license_key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      license.profile?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      license.profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      license.profile?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || license.status === filterStatus;
    const matchesType = filterType === 'all' || license.license_type === filterType;

    return matchesSearch && matchesStatus && matchesType;
  });

  const getMonthlyData = () => {
    const months = eachMonthOfInterval({
      start: subMonths(new Date(), 5),
      end: new Date()
    });

    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      const monthLicenses = licenses.filter(l => {
        const createdAt = parseISO(l.created_at);
        return createdAt >= monthStart && createdAt <= monthEnd;
      });

      return {
        month: format(month, 'MMM', { locale: ptBR }),
        total: monthLicenses.length,
        full: monthLicenses.filter(l => l.license_type === 'full').length,
        trial: monthLicenses.filter(l => l.license_type === 'trial').length,
      };
    });
  };

  const pieData = [
    { name: 'Ativas', value: stats.active, color: '#22c55e' },
    { name: 'Expiradas', value: stats.expired, color: '#eab308' },
    { name: 'Bloqueadas', value: stats.blocked, color: '#ef4444' },
  ].filter(d => d.value > 0);

  const totalPreGen = preGenStats.trial7.total + preGenStats.full30.total + preGenStats.full365.total + 
                      preGenStats.admin.total + preGenStats.instructor30.total + preGenStats.instructor365.total;
  const availablePreGen = preGenStats.trial7.available + preGenStats.full30.available + preGenStats.full365.available +
                          preGenStats.admin.available + preGenStats.instructor30.available + preGenStats.instructor365.available;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bebas text-primary tracking-wider">PAINEL MASTER</h2>
        </div>
        <Button variant="ghost" onClick={() => navigate('/admin')}>
          <ArrowLeft size={18} className="mr-2" /> Voltar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/20 to-purple-500/20 border-primary/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Key size={20} className="text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total de Licenças</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <CheckCircle size={20} className="text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-500">{stats.active}</p>
                <p className="text-xs text-muted-foreground">Licenças Ativas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <UserPlus size={20} className="text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-500">{availablePreGen}</p>
                <p className="text-xs text-muted-foreground">Senhas Disponíveis</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border-yellow-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/20">
                <Clock size={20} className="text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-500">{totalPreGen}</p>
                <p className="text-xs text-muted-foreground">Total Pré-Geradas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card de Licenças Expiradas - Clicável para resetar */}
        {stats.expired > 0 && (
          <Card 
            className="bg-gradient-to-br from-red-500/20 to-orange-500/20 border-red-500/30 cursor-pointer hover:border-red-500/60 transition-colors col-span-2 md:col-span-4"
            onClick={() => setResetExpiredDialogOpen(true)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-500/20">
                    <AlertTriangle size={20} className="text-red-500" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-red-500">{stats.expired} licença(s) expirada(s)</p>
                    <p className="text-xs text-muted-foreground">Clique para resetar todas de uma vez</p>
                  </div>
                </div>
                <Button variant="destructive" size="sm" className="gap-2">
                  <RefreshCw size={16} />
                  Resetar Todas
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-8 mb-6">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 size={16} />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="report" className="flex items-center gap-2">
            <TrendingUp size={16} />
            <span className="hidden sm:inline">Relatório</span>
          </TabsTrigger>
          <TabsTrigger value="passwords" className="flex items-center gap-2">
            <Key size={16} />
            <span className="hidden sm:inline">Senhas</span>
          </TabsTrigger>
          <TabsTrigger value="licenses" className="flex items-center gap-2">
            <Shield size={16} />
            <span className="hidden sm:inline">Licenças</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users size={16} />
            <span className="hidden sm:inline">Usuários</span>
          </TabsTrigger>
          <TabsTrigger value="themes" className="flex items-center gap-2">
            <Palette size={16} />
            <span className="hidden sm:inline">Temas</span>
          </TabsTrigger>
          <TabsTrigger value="trash" className="flex items-center gap-2">
            <Trash2 size={16} />
            <span className="hidden sm:inline">Lixeira</span>
          </TabsTrigger>
          <TabsTrigger value="master-creds" className="flex items-center gap-2">
            <Lock size={16} />
            <span className="hidden sm:inline">Master</span>
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Pre-Generated Passwords Stats */}
          <Card className="bg-card/80 backdrop-blur-md border-border/50">
            <CardHeader>
              <CardTitle className="font-bebas text-lg text-primary flex items-center gap-2">
                <Key size={20} />
                SENHAS PRÉ-GERADAS DISPONÍVEIS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <button
                  type="button"
                  className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-center w-full hover:bg-blue-500/15 transition-colors"
                  onClick={() => {
                    setActiveTab('passwords');
                    setPreGenFilter('trial');
                    setPreGenSearch('');
                  }}
                >
                  <p className="text-xl font-bold text-blue-500">{preGenStats.trial7.available}</p>
                  <p className="text-[10px] text-muted-foreground">Trial 7 dias</p>
                  <p className="text-[10px] text-blue-400/70">de {preGenStats.trial7.total}</p>
                </button>
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-center">
                  <p className="text-xl font-bold text-green-500">{preGenStats.full30.available}</p>
                  <p className="text-[10px] text-muted-foreground">Full 30 dias</p>
                  <p className="text-[10px] text-green-400/70">de {preGenStats.full30.total}</p>
                </div>
                <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30 text-center">
                  <p className="text-xl font-bold text-purple-500">{preGenStats.full365.available}</p>
                  <p className="text-[10px] text-muted-foreground">Anual</p>
                  <p className="text-[10px] text-purple-400/70">de {preGenStats.full365.total}</p>
                </div>
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-center">
                  <p className="text-xl font-bold text-amber-500">{preGenStats.admin.available}</p>
                  <p className="text-[10px] text-muted-foreground">Admin</p>
                  <p className="text-[10px] text-amber-400/70">de {preGenStats.admin.total}</p>
                </div>
                <div className="p-3 rounded-lg bg-teal-500/10 border border-teal-500/30 text-center">
                  <p className="text-xl font-bold text-teal-500">{preGenStats.instructor30.available}</p>
                  <p className="text-[10px] text-muted-foreground">Inst 30d</p>
                  <p className="text-[10px] text-teal-400/70">de {preGenStats.instructor30.total}</p>
                </div>
                <div className="p-3 rounded-lg bg-pink-500/10 border border-pink-500/30 text-center">
                  <p className="text-xl font-bold text-pink-500">{preGenStats.instructor365.available}</p>
                  <p className="text-[10px] text-muted-foreground">Inst Anual</p>
                  <p className="text-[10px] text-pink-400/70">de {preGenStats.instructor365.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Monthly Chart */}
            <Card className="bg-card/80 backdrop-blur-md border-border/50">
              <CardHeader>
                <CardTitle className="font-bebas text-lg text-primary flex items-center gap-2">
                  <TrendingUp size={20} />
                  LICENÇAS POR MÊS
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={getMonthlyData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="full" name="Full" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="trial" name="Trial" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Status Pie Chart */}
            <Card className="bg-card/80 backdrop-blur-md border-border/50">
              <CardHeader>
                <CardTitle className="font-bebas text-lg text-primary flex items-center gap-2">
                  <Activity size={20} />
                  STATUS DAS LICENÇAS
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                    Nenhuma licença registrada
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Type Distribution */}
          <Card className="bg-card/80 backdrop-blur-md border-border/50">
            <CardHeader>
              <CardTitle className="font-bebas text-lg text-primary">DISTRIBUIÇÃO POR TIPO</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-center">
                  <p className="text-3xl font-bold text-yellow-500">{stats.demo}</p>
                  <p className="text-sm text-muted-foreground">Demo</p>
                </div>
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 text-center">
                  <p className="text-3xl font-bold text-blue-500">{stats.trial}</p>
                  <p className="text-sm text-muted-foreground">Trial</p>
                </div>
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-center">
                  <p className="text-3xl font-bold text-green-500">{stats.full}</p>
                  <p className="text-sm text-muted-foreground">Full</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Report Tab - License Usage Report with Charts */}
        <TabsContent value="report" className="space-y-6">
          <LicenseUsageReport />
        </TabsContent>

        {/* Passwords Tab - NEW */}
        <TabsContent value="passwords" className="space-y-6">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <h3 className="font-bebas text-xl text-primary flex items-center gap-2">
              <Key size={20} />
              GERAR SENHAS EM LOTE
            </h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchPreGenStats}>
                <RefreshCw size={14} className="mr-1" />
                Atualizar
              </Button>
              <Button size="sm" onClick={() => setBatchDialogOpen(true)}>
                <Plus size={14} className="mr-1" />
                Gerar Lote
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={preGenFilter === 'trial' ? 'default' : 'outline'}
              onClick={() => {
                setPreGenFilter('trial');
                setPreGenSearch('');
              }}
            >
              Trial
            </Button>
            <Button
              size="sm"
              variant={preGenFilter === 'client' ? 'default' : 'outline'}
              onClick={() => {
                setPreGenFilter('client');
                setPreGenSearch('');
              }}
            >
              Cliente
            </Button>
            <Button
              size="sm"
              variant={preGenFilter === 'instructor' ? 'default' : 'outline'}
              onClick={() => {
                setPreGenFilter('instructor');
                setPreGenSearch('');
              }}
            >
              Instrutor
            </Button>
            <Button
              size="sm"
              variant={preGenFilter === 'admin' ? 'default' : 'outline'}
              onClick={() => {
                setPreGenFilter('admin');
                setPreGenSearch('');
              }}
            >
              Admin
            </Button>
            <Button
              size="sm"
              variant={preGenFilter === 'all' ? 'default' : 'outline'}
              onClick={() => {
                setPreGenFilter('all');
                setPreGenSearch('');
              }}
            >
              Todos
            </Button>
          </div>

          {/* Batch Generation Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-500" />
                    <span className="font-bold text-blue-500">Trial 7 Dias</span>
                  </div>
                  <Badge variant="outline" className="border-blue-500/50 text-blue-500">
                    {preGenStats.trial7.available} / {preGenStats.trial7.total}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-3">Formato: TRIAL7-0001 / T7-0001-2026</p>
                <Button 
                  size="sm" 
                  className="w-full bg-blue-500 hover:bg-blue-600"
                  onClick={() => { setBatchType('trial7'); setBatchCount(50); setBatchDialogOpen(true); }}
                >
                  <Plus size={14} className="mr-1" /> Gerar +50
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-green-500" />
                    <span className="font-bold text-green-500">Full 30 Dias</span>
                  </div>
                  <Badge variant="outline" className="border-green-500/50 text-green-500">
                    {preGenStats.full30.available} / {preGenStats.full30.total}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-3">Formato: FULL30-0001 / F30-0001-2026</p>
                <Button 
                  size="sm" 
                  className="w-full bg-green-500 hover:bg-green-600"
                  onClick={() => { setBatchType('full30'); setBatchCount(100); setBatchDialogOpen(true); }}
                >
                  <Plus size={14} className="mr-1" /> Gerar +100
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-purple-500" />
                    <span className="font-bold text-purple-500">Anual (365d)</span>
                  </div>
                  <Badge variant="outline" className="border-purple-500/50 text-purple-500">
                    {preGenStats.full365.available} / {preGenStats.full365.total}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-3">Formato: ANUAL-0001 / ANL-0001-2026</p>
                <Button 
                  size="sm" 
                  className="w-full bg-purple-500 hover:bg-purple-600"
                  onClick={() => { setBatchType('full365'); setBatchCount(100); setBatchDialogOpen(true); }}
                >
                  <Plus size={14} className="mr-1" /> Gerar +100
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/10 border-amber-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-amber-500" />
                    <span className="font-bold text-amber-500">Admin (365d)</span>
                  </div>
                  <Badge variant="outline" className="border-amber-500/50 text-amber-500">
                    {preGenStats.admin.available} / {preGenStats.admin.total}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-3">Formato: ADMIN-0001 / ADM-0001-2026</p>
                <Button 
                  size="sm" 
                  className="w-full bg-amber-500 hover:bg-amber-600"
                  onClick={() => { setBatchType('admin365'); setBatchCount(20); setBatchDialogOpen(true); }}
                >
                  <Plus size={14} className="mr-1" /> Gerar +20
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-teal-500/10 to-teal-600/10 border-teal-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-teal-500" />
                    <span className="font-bold text-teal-500">Instrutor 30d</span>
                  </div>
                  <Badge variant="outline" className="border-teal-500/50 text-teal-500">
                    {preGenStats.instructor30.available} / {preGenStats.instructor30.total}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-3">Formato: INST30-0001 / I30-0001-2026</p>
                <Button 
                  size="sm" 
                  className="w-full bg-teal-500 hover:bg-teal-600"
                  onClick={() => { setBatchType('instructor30'); setBatchCount(20); setBatchDialogOpen(true); }}
                >
                  <Plus size={14} className="mr-1" /> Gerar +20
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-pink-500/10 to-pink-600/10 border-pink-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-pink-500" />
                    <span className="font-bold text-pink-500">Instrutor Anual</span>
                  </div>
                  <Badge variant="outline" className="border-pink-500/50 text-pink-500">
                    {preGenStats.instructor365.available} / {preGenStats.instructor365.total}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-3">Formato: INST365-0001 / I365-0001-2026</p>
                <Button 
                  size="sm" 
                  className="w-full bg-pink-500 hover:bg-pink-600"
                  onClick={() => { setBatchType('instructor365'); setBatchCount(20); setBatchDialogOpen(true); }}
                >
                  <Plus size={14} className="mr-1" /> Gerar +20
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Pre-generated Accounts List */}
          <Card className="bg-card/80 backdrop-blur-md border-border/50">
            <CardHeader>
              <CardTitle className="font-bebas text-lg text-primary flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Key size={18} />
                  LISTA DE SENHAS PRÉ-GERADAS
                </span>
                <Badge variant="outline">{getFilteredPreGenAccounts().length} contas</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <Input
                    placeholder="Buscar por usuário ou senha..."
                    value={preGenSearch}
                    onChange={(e) => setPreGenSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={preGenFilter} onValueChange={setPreGenFilter}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="trial">Trial (7d)</SelectItem>
                    <SelectItem value="client">Cliente</SelectItem>
                    <SelectItem value="instructor">Instrutor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Accounts List */}
              <ScrollArea className="h-[400px]">
                <div className="space-y-2 pr-4">
                  {getFilteredPreGenAccounts().length > 0 ? (
                    getFilteredPreGenAccounts().slice(0, 100).map((account) => (
                      <motion.div
                        key={account.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          account.is_used 
                            ? 'bg-muted/30 border-muted/50 opacity-60' 
                            : 'bg-background/50 border-border/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
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
                              <p className="font-mono font-bold text-sm">{account.username}</p>
                              <Badge 
                                variant="outline" 
                                className={
                                  account.account_type === 'trial' ? 'border-blue-500/50 text-blue-500' :
                                  account.account_type === 'client' ? 'border-green-500/50 text-green-500' :
                                  account.account_type === 'instructor' ? 'border-teal-500/50 text-teal-500' :
                                  'border-amber-500/50 text-amber-500'
                                }
                              >
                                {account.account_type} ({account.license_duration_days}d)
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground font-mono">{account.license_key}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {account.is_used ? (
                            <span className="text-xs text-muted-foreground">
                              Usado {account.used_at ? format(parseISO(account.used_at), 'dd/MM/yy', { locale: ptBR }) : ''}
                            </span>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => copyAccountCredentials(account)}
                              className="h-8 w-8"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletePreGenConfirm(account)}
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Key className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Nenhuma conta encontrada</p>
                      <p className="text-sm mt-1">Use os botões acima para gerar novas contas</p>
                    </div>
                  )}
                  {getFilteredPreGenAccounts().length > 100 && (
                    <p className="text-center text-sm text-muted-foreground py-2">
                      Mostrando 100 de {getFilteredPreGenAccounts().length} contas. 
                      Use o filtro para ver mais.
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-card/80 backdrop-blur-md border-border/50">
            <CardHeader>
              <CardTitle className="font-bebas text-lg text-primary">AÇÕES RÁPIDAS</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => navigate('/admin/pre-generated')}>
                  <Eye size={14} className="mr-2" />
                  Ver Todas as Senhas (Tela Cheia)
                </Button>
                <Button variant="outline" onClick={() => navigate('/admin/test-accounts')}>
                  <AlertTriangle size={14} className="mr-2" />
                  Contas de Teste
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Licenses Tab */}
        <TabsContent value="licenses" className="space-y-6">
          {/* Actions Bar */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-1 gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <Input
                  placeholder="Buscar licença..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativas</SelectItem>
                  <SelectItem value="expired">Expiradas</SelectItem>
                  <SelectItem value="blocked">Bloqueadas</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="demo">Demo</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="full">Full</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchLicenses}>
                <RefreshCw size={14} className="mr-1" />
                Atualizar
              </Button>
              <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
                <Plus size={14} className="mr-1" />
                Nova Licença
              </Button>
            </div>
          </div>

          {/* Licenses List */}
          <ScrollArea className="h-[500px]">
            <div className="space-y-3 pr-4">
              {filteredLicenses.length > 0 ? (
                filteredLicenses.map(license => (
                  <Card key={license.id} className="bg-card/80 backdrop-blur-md border-border/50">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getTypeBadge(license.license_type)}
                            {getStatusBadge(license.status)}
                          </div>
                          <div className="flex items-center gap-2">
                            <code className="text-sm font-mono bg-background/50 px-2 py-1 rounded">
                              {showKeys.has(license.id) ? license.license_key : '****-****-****-****'}
                            </code>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleShowKey(license.id)}>
                              {showKeys.has(license.id) ? <EyeOff size={14} /> : <Eye size={14} />}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard(license.license_key)}>
                              <Copy size={14} />
                            </Button>
                          </div>
                          {license.profile && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Vinculada a: {license.profile.full_name || license.profile.username}
                              {license.profile.email && ` (${license.profile.email})`}
                            </p>
                          )}
                          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                            <span>Criada: {format(parseISO(license.created_at), 'dd/MM/yyyy', { locale: ptBR })}</span>
                            {license.expires_at && (
                              <span>Expira: {format(parseISO(license.expires_at), 'dd/MM/yyyy', { locale: ptBR })}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-green-500 border-green-500/50 hover:bg-green-500/10"
                            onClick={() => {
                              setSelectedLicense(license);
                              setRenewDialogOpen(true);
                            }}
                          >
                            <RefreshCw size={14} className="mr-1" />
                            Renovar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedLicense(license);
                              setEditDialogOpen(true);
                            }}
                          >
                            <Edit2 size={14} className="mr-1" />
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive border-destructive/50 hover:bg-destructive/10"
                            onClick={() => {
                              setSelectedLicense(license);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="bg-card/80 backdrop-blur-md border-border/50">
                  <CardContent className="p-8 text-center">
                    <Key className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {searchTerm || filterStatus !== 'all' || filterType !== 'all'
                        ? 'Nenhuma licença encontrada com os filtros aplicados'
                        : 'Nenhuma licença criada ainda'}
                    </p>
                    <Button className="mt-4" onClick={() => setCreateDialogOpen(true)}>
                      <Plus size={16} className="mr-2" />
                      Criar Primeira Licença
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card className="bg-card/80 backdrop-blur-md border-border/50">
            <CardHeader>
              <CardTitle className="font-bebas text-lg text-primary flex items-center gap-2">
                <Users size={20} />
                USUÁRIOS LICENCIADOS
              </CardTitle>
            </CardHeader>
            <CardContent>
              {licenses.filter(l => l.profile).length > 0 ? (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3 pr-4">
                    {licenses.filter(l => l.profile).map(license => (
                      <div
                        key={license.id}
                        className="p-4 rounded-lg bg-background/50 border border-border/50 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            license.status === 'active' ? 'bg-green-500/20' :
                            license.status === 'expired' ? 'bg-yellow-500/20' : 'bg-red-500/20'
                          }`}>
                            <Users size={20} className={
                              license.status === 'active' ? 'text-green-500' :
                              license.status === 'expired' ? 'text-yellow-500' : 'text-red-500'
                            } />
                          </div>
                          <div>
                            <p className="font-medium">
                              {license.profile?.full_name || license.profile?.username}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {license.profile?.email || 'Sem email'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getTypeBadge(license.license_type)}
                          {getStatusBadge(license.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhum usuário vinculado às licenças</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Crie licenças e aguarde os usuários se cadastrarem
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Themes Tab */}
        <TabsContent value="themes" className="space-y-6">
          <GlobalThemeManager />
        </TabsContent>

        {/* Trash Bin Tab */}
        <TabsContent value="trash" className="space-y-6">
          <TrashBin />
        </TabsContent>

        {/* Master Credentials Tab */}
        <TabsContent value="master-creds" className="space-y-6">
          <MasterCredentials />
        </TabsContent>
      </Tabs>

      {/* Create License Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={(open) => {
        setCreateDialogOpen(open);
        if (!open) setCreatedLicenseKey(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key size={20} className="text-primary" />
              {createdLicenseKey ? 'Licença Criada!' : 'Criar Nova Licença'}
            </DialogTitle>
            <DialogDescription>
              {createdLicenseKey 
                ? 'Copie a chave abaixo e envie para o cliente.' 
                : 'Configure os detalhes da nova licença.'}
            </DialogDescription>
          </DialogHeader>

          {createdLicenseKey ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-center">
                <p className="text-sm text-muted-foreground mb-2">Chave da Licença:</p>
                <code className="text-xl font-mono font-bold text-green-500">{createdLicenseKey}</code>
              </div>
              <Button className="w-full" onClick={() => copyToClipboard(createdLicenseKey)}>
                <Copy size={16} className="mr-2" />
                Copiar Chave
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de Licença</Label>
                <Select value={newLicenseType} onValueChange={(v) => setNewLicenseType(v as 'trial' | 'full')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial">Trial (Teste)</SelectItem>
                    <SelectItem value="full">Full (Completa)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Duração (dias)</Label>
                <Select value={newLicenseDays.toString()} onValueChange={(v) => setNewLicenseDays(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 dias</SelectItem>
                    <SelectItem value="15">15 dias</SelectItem>
                    <SelectItem value="30">30 dias</SelectItem>
                    <SelectItem value="60">60 dias</SelectItem>
                    <SelectItem value="90">90 dias</SelectItem>
                    <SelectItem value="180">180 dias</SelectItem>
                    <SelectItem value="365">1 ano</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            {!createdLicenseKey && (
              <>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={createLicense}>
                  <Plus size={16} className="mr-2" />
                  Criar Licença
                </Button>
              </>
            )}
            {createdLicenseKey && (
              <Button onClick={() => {
                setCreateDialogOpen(false);
                setCreatedLicenseKey(null);
              }}>
                Fechar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit License Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 size={20} className="text-primary" />
              Editar Licença
            </DialogTitle>
          </DialogHeader>
          {selectedLicense && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-background/50 border border-border/50">
                <p className="text-sm text-muted-foreground mb-1">Chave:</p>
                <code className="font-mono">{selectedLicense.license_key}</code>
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  variant={selectedLicense.status === 'active' ? 'outline' : 'default'}
                  onClick={() => updateLicenseStatus(selectedLicense.id, 'active')}
                  disabled={selectedLicense.status === 'active'}
                >
                  <Unlock size={16} className="mr-2" />
                  Ativar
                </Button>
                <Button
                  className="flex-1"
                  variant={selectedLicense.status === 'blocked' ? 'outline' : 'destructive'}
                  onClick={() => updateLicenseStatus(selectedLicense.id, 'blocked')}
                  disabled={selectedLicense.status === 'blocked'}
                >
                  <Lock size={16} className="mr-2" />
                  Bloquear
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 size={20} />
              Excluir Licença
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta licença?
              {selectedLicense?.profile && (
                <>
                  <br /><br />
                  <strong>Atenção:</strong> Esta licença está vinculada ao usuário{' '}
                  <strong>{selectedLicense.profile.full_name || selectedLicense.profile.username}</strong>.
                  O usuário perderá o acesso ao sistema imediatamente.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => selectedLicense && deleteLicense(selectedLicense.id)}
            >
              Sim, Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Renew License Dialog */}
      <Dialog open={renewDialogOpen} onOpenChange={setRenewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw size={20} className="text-green-500" />
              Renovar Licença
            </DialogTitle>
            <DialogDescription>
              Escolha o período de renovação para esta licença.
            </DialogDescription>
          </DialogHeader>
          {selectedLicense && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-background/50 border border-border/50">
                <p className="text-sm text-muted-foreground mb-1">Chave:</p>
                <code className="font-mono text-sm">{selectedLicense.license_key}</code>
                {selectedLicense.profile && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Usuário: <strong>{selectedLicense.profile.full_name || selectedLicense.profile.username}</strong>
                  </p>
                )}
                <div className="flex gap-2 mt-2">
                  {getTypeBadge(selectedLicense.license_type)}
                  {getStatusBadge(selectedLicense.status)}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Período de Renovação</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={renewDuration === '30m' ? 'default' : 'outline'}
                    className={renewDuration === '30m' ? 'bg-yellow-500 hover:bg-yellow-600' : ''}
                    onClick={() => setRenewDuration('30m')}
                  >
                    <Clock size={16} className="mr-2" />
                    30 Minutos
                  </Button>
                  <Button
                    variant={renewDuration === '7d' ? 'default' : 'outline'}
                    className={renewDuration === '7d' ? 'bg-blue-500 hover:bg-blue-600' : ''}
                    onClick={() => setRenewDuration('7d')}
                  >
                    <Calendar size={16} className="mr-2" />
                    7 Dias
                  </Button>
                  <Button
                    variant={renewDuration === '30d' ? 'default' : 'outline'}
                    className={renewDuration === '30d' ? 'bg-green-500 hover:bg-green-600' : ''}
                    onClick={() => setRenewDuration('30d')}
                  >
                    <Calendar size={16} className="mr-2" />
                    30 Dias
                  </Button>
                  <Button
                    variant={renewDuration === '1y' ? 'default' : 'outline'}
                    className={renewDuration === '1y' ? 'bg-purple-500 hover:bg-purple-600' : ''}
                    onClick={() => setRenewDuration('1y')}
                  >
                    <Zap size={16} className="mr-2" />
                    1 Ano
                  </Button>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
                <p className="text-sm text-center">
                  A licença será renovada por{' '}
                  <strong className="text-primary">
                    {renewDuration === '30m' ? '30 minutos (Demo)' : 
                     renewDuration === '7d' ? '7 dias (Trial)' : 
                     renewDuration === '30d' ? '30 dias (Full)' : '1 ano (Full)'}
                  </strong>
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenewDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              className="bg-green-500 hover:bg-green-600"
              onClick={() => selectedLicense && renewLicense(selectedLicense.id, renewDuration)}
            >
              <RefreshCw size={16} className="mr-2" />
              Renovar Licença
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Generation Dialog */}
      <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus size={20} className="text-primary" />
              Gerar Senhas em Lote
            </DialogTitle>
            <DialogDescription>
              Escolha o tipo e a quantidade de senhas para gerar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Conta</Label>
              <Select value={batchType} onValueChange={setBatchType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial7">Trial 7 dias</SelectItem>
                  <SelectItem value="full30">Full 30 dias</SelectItem>
                  <SelectItem value="full365">Anual 365 dias</SelectItem>
                  <SelectItem value="admin365">Admin 365 dias</SelectItem>
                  <SelectItem value="instructor30">Instrutor 30 dias</SelectItem>
                  <SelectItem value="instructor365">Instrutor 365 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantidade</Label>
              <Select value={batchCount.toString()} onValueChange={(v) => setBatchCount(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 contas</SelectItem>
                  <SelectItem value="20">20 contas</SelectItem>
                  <SelectItem value="50">50 contas</SelectItem>
                  <SelectItem value="100">100 contas</SelectItem>
                  <SelectItem value="200">200 contas</SelectItem>
                  <SelectItem value="500">500 contas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={generateBatchAccounts} disabled={generating}>
              {generating ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Plus size={16} className="mr-2" />
                  Gerar {batchCount} Contas
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset All Expired Licenses Dialog */}
      <Dialog open={resetExpiredDialogOpen} onOpenChange={setResetExpiredDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <RefreshCw size={20} />
              Resetar Licenças Expiradas
            </DialogTitle>
            <DialogDescription>
              Você está prestes a renovar <strong className="text-red-500">{stats.expired}</strong> licença(s) expirada(s).
              Escolha a nova duração:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={resetDuration === '30m' ? 'default' : 'outline'}
                className={resetDuration === '30m' ? 'bg-yellow-500 hover:bg-yellow-600' : ''}
                onClick={() => setResetDuration('30m')}
              >
                <Clock size={16} className="mr-2" />
                30 Minutos
              </Button>
              <Button
                variant={resetDuration === '7d' ? 'default' : 'outline'}
                className={resetDuration === '7d' ? 'bg-blue-500 hover:bg-blue-600' : ''}
                onClick={() => setResetDuration('7d')}
              >
                <Calendar size={16} className="mr-2" />
                7 Dias
              </Button>
              <Button
                variant={resetDuration === '30d' ? 'default' : 'outline'}
                className={resetDuration === '30d' ? 'bg-green-500 hover:bg-green-600' : ''}
                onClick={() => setResetDuration('30d')}
              >
                <Calendar size={16} className="mr-2" />
                30 Dias
              </Button>
              <Button
                variant={resetDuration === '1y' ? 'default' : 'outline'}
                className={resetDuration === '1y' ? 'bg-purple-500 hover:bg-purple-600' : ''}
                onClick={() => setResetDuration('1y')}
              >
                <Zap size={16} className="mr-2" />
                1 Ano
              </Button>
            </div>

            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <p className="text-sm text-center">
                Todas as <strong className="text-red-500">{stats.expired}</strong> licenças expiradas serão renovadas por{' '}
                <strong className="text-primary">
                  {resetDuration === '30m' ? '30 minutos (Demo)' : 
                   resetDuration === '7d' ? '7 dias (Trial)' : 
                   resetDuration === '30d' ? '30 dias (Full)' : '1 ano (Full)'}
                </strong>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetExpiredDialogOpen(false)} disabled={resettingExpired}>
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={resetAllExpiredLicenses}
              disabled={resettingExpired}
            >
              {resettingExpired ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Resetando...
                </>
              ) : (
                <>
                  <RefreshCw size={16} className="mr-2" />
                  Resetar {stats.expired} Licença(s)
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Pre-Gen Account Confirmation Dialog */}
      <AlertDialog open={!!deletePreGenConfirm} onOpenChange={(open) => !open && setDeletePreGenConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 size={20} />
              Excluir Conta Pré-Gerada
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a conta <strong>{deletePreGenConfirm?.username}</strong>?
              <br /><br />
              <strong>Atenção:</strong> Isso removerá também o perfil, licença e usuário vinculados (se houver).
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deletePreGenConfirm) {
                  deletePreGenAccount(deletePreGenConfirm.id);
                  setDeletePreGenConfirm(null);
                }
              }}
            >
              Sim, Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

export default MasterPanel;

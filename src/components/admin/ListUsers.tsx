import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Users, Search, Trash2, Key, Loader2, User, Dumbbell, Edit2, Shield, Eye, Unlink, RotateCcw, RefreshCw, CheckCircle, FileSpreadsheet, FileText, Download, X, AlertCircle, UserCheck, Link2Off } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAudio } from '@/contexts/AudioContext';
import { useAuth } from '@/contexts/AuthContext';
import { useEscapeBack } from '@/hooks/useEscapeBack';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { exportToExcel, exportToPDF } from '@/lib/exportUtils';

interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  cpf: string | null;
  city: string | null;
  cref: string | null;
  avatar_url: string | null;
  student_id: string | null;
  license_key?: string;
  license_type?: string;
  license_status?: string;
  license_id?: string;
  license_expires_at?: string | null;
  created_by_admin?: string | null;
  enrollment_status?: string | null;
}

const ListUsers: React.FC = () => {
  const navigate = useNavigate();
  const { playClickSound } = useAudio();
  const { role, profile: currentProfile } = useAuth();
  
  // ESC para voltar ao menu admin
  useEscapeBack({ to: '/admin' });
  const [clients, setClients] = useState<Profile[]>([]);
  const [instructors, setInstructors] = useState<Profile[]>([]);
  const [deletedUsers, setDeletedUsers] = useState<Profile[]>([]);
  const [expiredLicenses, setExpiredLicenses] = useState<Profile[]>([]);
  const [preGenAccounts, setPreGenAccounts] = useState<any[]>([]);
  const [preGenStats, setPreGenStats] = useState<{
    total: number;
    used: number;
    available: number;
    byType: { client: { used: number; available: number }; instructor: { used: number; available: number }; admin: { used: number; available: number } };
  }>({ total: 0, used: 0, available: 0, byType: { client: { used: 0, available: 0 }, instructor: { used: 0, available: 0 }, admin: { used: 0, available: 0 } } });
  const [preGenFilter, setPreGenFilter] = useState<'all' | 'client' | 'instructor' | 'admin'>('all');
  const [unlinkingPreGen, setUnlinkingPreGen] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showUnlinkDialog, setShowUnlinkDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showReactivateDialog, setShowReactivateDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ user: Profile; type: 'client' | 'instructor' } | null>(null);
  const [userToUnlink, setUserToUnlink] = useState<{ user: Profile; type: 'client' | 'instructor' } | null>(null);
  const [userToRestore, setUserToRestore] = useState<Profile | null>(null);
  const [userToReactivate, setUserToReactivate] = useState<Profile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  
  const isMaster = role === 'master';

  // Debounce mais rápido (100ms) para busca em tempo real
  useEffect(() => {
    setIsSearching(true);
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setIsSearching(false);
    }, 100);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    loadUsers();

    // Realtime subscription para atualização automática quando master deletar contas
    if (isMaster) {
      const channel = supabase
        .channel('profiles-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'profiles',
          },
          (payload) => {
            console.log('Profile change detected:', payload.eventType);
            // Recarrega a lista quando há mudanças
            loadUsers();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentProfile?.profile_id, isMaster]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select(`
          id, username, full_name, email, phone, cpf, city, cref, avatar_url, created_by_admin, enrollment_status, student_id,
          licenses:licenses!licenses_profile_id_fkey (id, license_key, license_type, status, expires_at)
        `)
        .order('full_name');

      // Se não for master, filtra apenas os cadastrados pelo gerente atual
      if (!isMaster && currentProfile?.profile_id) {
        query = query.eq('created_by_admin', currentProfile.profile_id);
      }

      const { data: profiles, error } = await query;

      if (error) throw error;

      const all = (profiles || []).map((p: any) => ({
        ...p,
        license_key: p.licenses?.[0]?.license_key,
        license_type: p.licenses?.[0]?.license_type,
        license_status: p.licenses?.[0]?.status,
        license_id: p.licenses?.[0]?.id,
        license_expires_at: p.licenses?.[0]?.expires_at,
      }));

      // Active users (not unlinked/deleted)
      const activeUsers = all.filter(p => p.enrollment_status !== 'unlinked' && p.enrollment_status !== 'deleted');
      
      // Deleted/unlinked users
      const inactive = all.filter(p => p.enrollment_status === 'unlinked' || p.enrollment_status === 'deleted');
      
      // Expired licenses (only masters see this)
      const expired = all.filter(p => p.license_status === 'expired' || p.license_status === 'blocked');

      // Clientes: sem CREF
      // Instrutores: com CREF
      setClients(activeUsers.filter(p => !p.cref));
      setInstructors(activeUsers.filter(p => p.cref));
      setDeletedUsers(inactive);
      setExpiredLicenses(expired);

      // Load pre-generated accounts for masters
      if (isMaster) {
        await loadPreGenAccounts();
      }
    } catch (err) {
      console.error('Error:', err);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const loadPreGenAccounts = async () => {
    try {
      // Load used accounts with profile info
      const { data: usedData, error: usedError } = await supabase
        .from('pre_generated_accounts')
        .select(`
          id, username, account_type, license_key, is_used, used_at, license_duration_days,
          used_by_profile:profiles!pre_generated_accounts_used_by_profile_id_fkey (id, username, full_name)
        `)
        .eq('is_used', true)
        .order('used_at', { ascending: false });

      if (usedError) throw usedError;
      setPreGenAccounts(usedData || []);

      // Load stats for all accounts
      const { data: allData, error: allError } = await supabase
        .from('pre_generated_accounts')
        .select('id, account_type, is_used');

      if (allError) throw allError;

      const stats = {
        total: allData?.length || 0,
        used: allData?.filter(a => a.is_used).length || 0,
        available: allData?.filter(a => !a.is_used).length || 0,
        byType: {
          client: {
            used: allData?.filter(a => a.account_type === 'client' && a.is_used).length || 0,
            available: allData?.filter(a => a.account_type === 'client' && !a.is_used).length || 0,
          },
          instructor: {
            used: allData?.filter(a => a.account_type === 'instructor' && a.is_used).length || 0,
            available: allData?.filter(a => a.account_type === 'instructor' && !a.is_used).length || 0,
          },
          admin: {
            used: allData?.filter(a => a.account_type === 'admin' && a.is_used).length || 0,
            available: allData?.filter(a => a.account_type === 'admin' && !a.is_used).length || 0,
          },
        },
      };
      setPreGenStats(stats);
    } catch (err) {
      console.error('Error loading pre-gen accounts:', err);
    }
  };

  const handleUnlinkPreGen = async (accountId: string) => {
    setUnlinkingPreGen(accountId);
    try {
      const { error } = await supabase
        .from('pre_generated_accounts')
        .update({ 
          is_used: false, 
          used_by_profile_id: null, 
          used_at: null 
        })
        .eq('id', accountId);

      if (error) throw error;
      
      toast.success('Conta desvinculada com sucesso! Agora pode ser usada novamente.');
      await loadPreGenAccounts();
    } catch (err: any) {
      toast.error(`Erro ao desvincular: ${err.message}`);
    } finally {
      setUnlinkingPreGen(null);
    }
  };

  const openDeleteDialog = (user: Profile, type: 'client' | 'instructor') => {
    playClickSound();
    setUserToDelete({ user, type });
    setShowDeleteDialog(true);
  };

  const openUnlinkDialog = (user: Profile, type: 'client' | 'instructor') => {
    playClickSound();
    setUserToUnlink({ user, type });
    setShowUnlinkDialog(true);
  };

  const openRestoreDialog = (user: Profile) => {
    playClickSound();
    setUserToRestore(user);
    setShowRestoreDialog(true);
  };

  const openReactivateDialog = (user: Profile) => {
    playClickSound();
    setUserToReactivate(user);
    setShowReactivateDialog(true);
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    
    setDeleting(true);
    try {
      // Use edge function for complete deletion (handles auth user too)
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('admin-cleanup-user', {
        body: {
          type: 'profile',
          id: userToDelete.user.id,
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.error) {
        // Preserve function error context so we can show the real backend message
        throw response.error;
      }

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Erro ao excluir usuário');
      }
      
      toast.success(`${userToDelete.type === 'client' ? 'Cliente' : 'Instrutor'} excluído com sucesso`);
      loadUsers();
    } catch (err: any) {
      console.error('Delete error:', err);

      let message: string = err?.message || 'Erro ao excluir usuário';

      // Supabase FunctionsHttpError includes the response in err.context.response
      const resp = err?.context?.response;
      if (resp && typeof resp.json === 'function') {
        try {
          const body = await resp.json();
          if (typeof body?.error === 'string' && body.error.trim()) {
            message = body.error;
          }
        } catch {
          // ignore
        }
      }

      toast.error(`Erro: ${message}`);
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
      setUserToDelete(null);
    }
  };

  const handleUnlink = async () => {
    if (!userToUnlink) return;
    
    setUnlinking(true);
    try {
      // Update enrollment status to 'unlinked' instead of deleting
      const { error } = await supabase
        .from('profiles')
        .update({ enrollment_status: 'unlinked' })
        .eq('id', userToUnlink.user.id);
      
      if (error) {
        toast.error(`Erro ao desvincular: ${error.message}`);
      } else {
        toast.success(`${userToUnlink.type === 'client' ? 'Cliente' : 'Instrutor'} desvinculado com sucesso`);
        loadUsers();
      }
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setUnlinking(false);
      setShowUnlinkDialog(false);
      setUserToUnlink(null);
    }
  };

  const handleRestore = async () => {
    if (!userToRestore) return;
    
    setRestoring(true);
    try {
      // Restore enrollment status to 'active'
      const { error } = await supabase
        .from('profiles')
        .update({ enrollment_status: 'active' })
        .eq('id', userToRestore.id);
      
      if (error) {
        toast.error(`Erro ao restaurar: ${error.message}`);
      } else {
        toast.success('Usuário restaurado com sucesso!');
        loadUsers();
      }
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setRestoring(false);
      setShowRestoreDialog(false);
      setUserToRestore(null);
    }
  };

  const handleReactivateLicense = async () => {
    if (!userToReactivate || !userToReactivate.license_id) return;
    
    setReactivating(true);
    try {
      // Reactivate license - set status to active and extend expiry by 30 days
      const newExpiryDate = new Date();
      newExpiryDate.setDate(newExpiryDate.getDate() + 30);
      
      const { error } = await supabase
        .from('licenses')
        .update({ 
          status: 'active',
          expires_at: newExpiryDate.toISOString(),
        })
        .eq('id', userToReactivate.license_id);
      
      if (error) {
        toast.error(`Erro ao reativar licença: ${error.message}`);
      } else {
        toast.success('Licença reativada por mais 30 dias!');
        loadUsers();
      }
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setReactivating(false);
      setShowReactivateDialog(false);
      setUserToReactivate(null);
    }
  };

  const showLicenseKey = (user: Profile) => {
    playClickSound();
    setSelectedUser(user);
    setShowKeyDialog(true);
  };

  const filterUsers = (users: Profile[]) => {
    if (!debouncedSearch.trim()) return users;
    const search = debouncedSearch.toLowerCase().trim();
    // Remove formatação do CPF para busca
    const searchClean = search.replace(/[.-]/g, '');
    
    return users.filter(u => {
      const nameMatch = u.full_name?.toLowerCase().includes(search);
      const usernameMatch = u.username.toLowerCase().includes(search);
      const emailMatch = u.email?.toLowerCase().includes(search);
      // CPF: compara sem formatação
      const cpfClean = u.cpf?.replace(/[.-]/g, '') || '';
      const cpfMatch = cpfClean.includes(searchClean);
      
      return nameMatch || usernameMatch || emailMatch || cpfMatch;
    });
  };

  const handleExportExcel = () => {
    playClickSound();
    const filteredClients = filterUsers(clients);
    const filteredInstructors = filterUsers(instructors);
    
    if (filteredClients.length === 0 && filteredInstructors.length === 0) {
      toast.error('Nenhum usuário para exportar');
      return;
    }

    exportToExcel(filteredClients, filteredInstructors, {
      title: isMaster ? 'Relatório Geral de Usuários' : 'Relatório de Meus Cadastros',
      filename: 'relatorio_usuarios',
    });
    toast.success('Relatório Excel gerado com sucesso!');
  };

  const handleExportPDF = () => {
    playClickSound();
    const filteredClients = filterUsers(clients);
    const filteredInstructors = filterUsers(instructors);
    
    if (filteredClients.length === 0 && filteredInstructors.length === 0) {
      toast.error('Nenhum usuário para exportar');
      return;
    }

    exportToPDF(filteredClients, filteredInstructors, {
      title: isMaster ? 'Relatório Geral de Usuários' : 'Relatório de Meus Cadastros',
      filename: 'relatorio_usuarios',
    });
    toast.success('Relatório PDF gerado com sucesso!');
  };

  const UserCard = ({ user, type, showRestore = false, showReactivate = false }: { user: Profile; type: 'client' | 'instructor'; showRestore?: boolean; showReactivate?: boolean }) => (
    <div
      className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50 hover:border-blue-500/30 transition-all"
    >
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center overflow-hidden ${type === 'instructor' ? 'bg-green-500/20 border border-green-500/30' : 'bg-blue-500/20 border border-blue-500/30'}`}>
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.full_name || user.username}
              className="w-full h-full object-cover"
            />
          ) : type === 'instructor' ? (
            <Dumbbell className="w-6 h-6 text-green-500" />
          ) : (
            <User className="w-6 h-6 text-blue-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold truncate">{user.full_name || user.username}</h3>
            {user.license_type && user.license_type !== 'full' && (
              <Badge variant="outline" className={
                user.license_type === 'demo' ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50 text-xs' :
                user.license_type === 'trial' ? 'bg-blue-500/20 text-blue-500 border-blue-500/50 text-xs' :
                'bg-primary/20 text-primary border-primary/50 text-xs'
              }>
                {user.license_type.toUpperCase()}
              </Badge>
            )}
            {user.enrollment_status === 'unlinked' && (
              <Badge variant="outline" className="bg-gray-500/20 text-gray-500 border-gray-500/50 text-xs">
                Desvinculado
              </Badge>
            )}
            {user.enrollment_status === 'deleted' && (
              <Badge variant="outline" className="bg-red-500/20 text-red-500 border-red-500/50 text-xs">
                Excluído
              </Badge>
            )}
            {(user.license_status === 'expired' || user.license_status === 'blocked') && (
              <Badge variant="outline" className="bg-red-500/20 text-red-500 border-red-500/50 text-xs">
                Licença {user.license_status === 'expired' ? 'Expirada' : 'Bloqueada'}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate">@{user.username}</p>
          {user.student_id && (
            <p className="text-xs text-primary font-mono">
              ID: {user.student_id}
            </p>
          )}
          {user.cpf && (
            <p className="text-xs text-muted-foreground">
              CPF: {debouncedSearch && user.cpf.includes(debouncedSearch.replace(/[.-]/g, '')) ? (
                <span className="bg-yellow-500/30 text-yellow-500 font-bold rounded px-0.5">{user.cpf}</span>
              ) : user.cpf}
            </p>
          )}
          {user.cref && <p className="text-xs text-green-500">CREF: {user.cref}</p>}
        </div>
        <div className="flex gap-1 sm:gap-2 flex-wrap">
          {showRestore && isMaster && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => openRestoreDialog(user)}
              className="h-8 w-8 text-green-500 hover:bg-green-500/10"
              title="Restaurar conta"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          )}
          {showReactivate && isMaster && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => openReactivateDialog(user)}
              className="h-8 w-8 text-cyan-500 hover:bg-cyan-500/10"
              title="Reativar licença (+30 dias)"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => { playClickSound(); navigate(`/admin/client/${user.id}`); }}
            className="h-8 w-8 text-purple-500 hover:bg-purple-500/10"
            title="Ver detalhes"
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => showLicenseKey(user)}
            className="h-8 w-8 text-yellow-500 hover:bg-yellow-500/10"
            title="Ver chave de acesso"
          >
            <Key className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => { playClickSound(); navigate(`/admin/edit-user/${user.id}`); }}
            className="h-8 w-8 text-blue-500 hover:bg-blue-500/10"
            title="Editar usuário"
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          
          {/* Master can delete, non-master can only unlink */}
          {!showRestore && !showReactivate && (
            isMaster ? (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => openDeleteDialog(user, type)}
                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                title="Excluir usuário permanentemente"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            ) : (
              user.created_by_admin === currentProfile?.profile_id && user.enrollment_status !== 'unlinked' && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => openUnlinkDialog(user, type)}
                  className="h-8 w-8 text-orange-500 hover:bg-orange-500/10"
                  title="Desvincular matrícula"
                >
                  <Unlink className="w-4 h-4" />
                </Button>
              )
            )
          )}
        </div>
      </div>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { playClickSound(); navigate('/admin'); }}
            className="text-sm text-muted-foreground hover:text-blue-500 transition-colors"
          >
            ← Voltar
          </button>
          <h2 className="text-xl sm:text-2xl font-bebas text-purple-500 flex items-center gap-2">
            <Users className="w-6 h-6" />
            {isMaster ? 'TODOS OS CADASTROS' : 'MEUS CADASTROS'}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            {isSearching ? (
              <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
            ) : (
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            )}
            <Input
              placeholder="Digite nome ou CPF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-background/50 w-full sm:w-64"
              autoComplete="off"
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0" title="Exportar relatório">
                <Download className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportExcel} className="cursor-pointer">
                <FileSpreadsheet className="w-4 h-4 mr-2 text-green-500" />
                Exportar Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF} className="cursor-pointer">
                <FileText className="w-4 h-4 mr-2 text-red-500" />
                Exportar PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {!isMaster && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 flex items-center gap-2 text-sm text-blue-400">
          <Shield className="w-4 h-4" />
          <span>Exibindo apenas usuários cadastrados por você. Acesse o Painel Master para ver todos.</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <Tabs defaultValue="clients" className="w-full">
          <TabsList className={`grid w-full mb-4 ${isMaster ? 'grid-cols-5' : 'grid-cols-2'}`}>
            <TabsTrigger value="clients">Clientes ({clients.length})</TabsTrigger>
            <TabsTrigger value="instructors">Instrutores ({instructors.length})</TabsTrigger>
            {isMaster && (
              <>
                <TabsTrigger value="pregen" className="text-yellow-500">
                  Pré-geradas ({preGenAccounts.length})
                </TabsTrigger>
                <TabsTrigger value="deleted" className="text-orange-500">
                  Inativos ({deletedUsers.length})
                </TabsTrigger>
                <TabsTrigger value="expired" className="text-red-500">
                  Expirados ({expiredLicenses.length})
                </TabsTrigger>
              </>
            )}
          </TabsList>
          
          <TabsContent value="clients" className="space-y-3">
            {filterUsers(clients).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {isMaster ? 'Nenhum cliente encontrado' : 'Você ainda não cadastrou nenhum cliente'}
              </div>
            ) : (
              filterUsers(clients).map(user => <UserCard key={user.id} user={user} type="client" />)
            )}
          </TabsContent>
          
          <TabsContent value="instructors" className="space-y-3">
            {filterUsers(instructors).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {isMaster ? 'Nenhum instrutor encontrado' : 'Você ainda não cadastrou nenhum instrutor'}
              </div>
            ) : (
              filterUsers(instructors).map(user => <UserCard key={user.id} user={user} type="instructor" />)
            )}
          </TabsContent>
          
          {isMaster && (
            <>
              <TabsContent value="pregen" className="space-y-3">
                {/* Estatísticas de Contas Pré-geradas */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  <div className="bg-card/80 backdrop-blur-md rounded-xl p-3 border border-border/50 text-center">
                    <p className="text-2xl font-bold text-foreground">{preGenStats.total}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-green-500">{preGenStats.available}</p>
                    <p className="text-xs text-green-400">Disponíveis</p>
                  </div>
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-yellow-500">{preGenStats.used}</p>
                    <p className="text-xs text-yellow-400">Em Uso</p>
                  </div>
                  <div className="bg-primary/10 border border-primary/30 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-primary">
                      {preGenStats.total > 0 ? Math.round((preGenStats.used / preGenStats.total) * 100) : 0}%
                    </p>
                    <p className="text-xs text-muted-foreground">Utilização</p>
                  </div>
                </div>

                {/* Estatísticas por Tipo */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-2 text-center">
                    <User className="w-4 h-4 mx-auto mb-1 text-blue-500" />
                    <p className="text-xs text-blue-400">Clientes</p>
                    <p className="text-sm font-semibold text-blue-500">
                      {preGenStats.byType.client.used}/{preGenStats.byType.client.used + preGenStats.byType.client.available}
                    </p>
                  </div>
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2 text-center">
                    <Dumbbell className="w-4 h-4 mx-auto mb-1 text-green-500" />
                    <p className="text-xs text-green-400">Instrutores</p>
                    <p className="text-sm font-semibold text-green-500">
                      {preGenStats.byType.instructor.used}/{preGenStats.byType.instructor.used + preGenStats.byType.instructor.available}
                    </p>
                  </div>
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-2 text-center">
                    <Shield className="w-4 h-4 mx-auto mb-1 text-purple-500" />
                    <p className="text-xs text-purple-400">Admins</p>
                    <p className="text-sm font-semibold text-purple-500">
                      {preGenStats.byType.admin.used}/{preGenStats.byType.admin.used + preGenStats.byType.admin.available}
                    </p>
                  </div>
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-sm text-yellow-400 mb-4">
                  <UserCheck className="w-4 h-4 inline mr-2" />
                  Contas pré-geradas que já foram utilizadas. Clique em desvincular para liberar a conta para reutilização.
                </div>
                
                {/* Filtro por tipo de conta */}
                <div className="flex gap-2 flex-wrap mb-4">
                  <Button
                    size="sm"
                    variant={preGenFilter === 'all' ? 'default' : 'outline'}
                    onClick={() => setPreGenFilter('all')}
                    className="text-xs"
                  >
                    Todos ({preGenAccounts.length})
                  </Button>
                  <Button
                    size="sm"
                    variant={preGenFilter === 'client' ? 'default' : 'outline'}
                    onClick={() => setPreGenFilter('client')}
                    className="text-xs"
                  >
                    <User className="w-3 h-3 mr-1" />
                    Clientes ({preGenAccounts.filter(a => a.account_type === 'client').length})
                  </Button>
                  <Button
                    size="sm"
                    variant={preGenFilter === 'instructor' ? 'default' : 'outline'}
                    onClick={() => setPreGenFilter('instructor')}
                    className="text-xs"
                  >
                    <Dumbbell className="w-3 h-3 mr-1" />
                    Instrutores ({preGenAccounts.filter(a => a.account_type === 'instructor').length})
                  </Button>
                  <Button
                    size="sm"
                    variant={preGenFilter === 'admin' ? 'default' : 'outline'}
                    onClick={() => setPreGenFilter('admin')}
                    className="text-xs"
                  >
                    <Shield className="w-3 h-3 mr-1" />
                    Admins ({preGenAccounts.filter(a => a.account_type === 'admin').length})
                  </Button>
                </div>

                {preGenAccounts.filter(a => preGenFilter === 'all' || a.account_type === preGenFilter).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500 opacity-50" />
                    <p>Nenhuma conta pré-gerada {preGenFilter !== 'all' ? `do tipo "${preGenFilter}"` : ''} em uso</p>
                  </div>
                ) : (
                  preGenAccounts.filter(a => preGenFilter === 'all' || a.account_type === preGenFilter).map(account => (
                    <motion.div
                      key={account.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-yellow-500/30 hover:border-yellow-500/50 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center bg-yellow-500/20">
                          <Key className="w-6 h-6 text-yellow-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold">@{account.username}</h3>
                            <Badge variant="outline" className={
                              account.account_type === 'client' ? 'bg-blue-500/20 text-blue-500 border-blue-500/50 text-xs' :
                              account.account_type === 'instructor' ? 'bg-green-500/20 text-green-500 border-green-500/50 text-xs' :
                              'bg-purple-500/20 text-purple-500 border-purple-500/50 text-xs'
                            }>
                              {account.account_type === 'client' ? 'Cliente' : 
                               account.account_type === 'instructor' ? 'Instrutor' : 'Admin'}
                            </Badge>
                            <Badge variant="outline" className="bg-yellow-500/20 text-yellow-500 border-yellow-500/50 text-xs">
                              {account.license_duration_days} dias
                            </Badge>
                          </div>
                          {account.used_by_profile && (
                            <p className="text-sm text-muted-foreground mt-1">
                              <span className="text-green-500">Vinculado a:</span>{' '}
                              {account.used_by_profile.full_name || account.used_by_profile.username}
                            </p>
                          )}
                          {account.used_at && (
                            <p className="text-xs text-muted-foreground">
                              Usado em: {new Date(account.used_at).toLocaleDateString('pt-BR')}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground font-mono mt-1">
                            Senha: {account.license_key}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {account.used_by_profile && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => { playClickSound(); navigate(`/admin/client/${account.used_by_profile.id}`); }}
                              className="h-8 w-8 text-purple-500 hover:bg-purple-500/10"
                              title="Ver usuário vinculado"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => { playClickSound(); handleUnlinkPreGen(account.id); }}
                            disabled={unlinkingPreGen === account.id}
                            className="h-8 w-8 text-orange-500 hover:bg-orange-500/10"
                            title="Desvincular conta para reutilização"
                          >
                            {unlinkingPreGen === account.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Link2Off className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </TabsContent>
              
              <TabsContent value="deleted" className="space-y-3">
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 text-sm text-orange-400 mb-4">
                  <RotateCcw className="w-4 h-4 inline mr-2" />
                  Usuários desvinculados ou excluídos. Clique no ícone de restaurar para reativar a conta.
                </div>
                {filterUsers(deletedUsers).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500 opacity-50" />
                    <p>Nenhum usuário inativo</p>
                  </div>
                ) : (
                  filterUsers(deletedUsers).map(user => (
                    <UserCard 
                      key={user.id} 
                      user={user} 
                      type={user.cref ? 'instructor' : 'client'} 
                      showRestore 
                    />
                  ))
                )}
              </TabsContent>
              
              <TabsContent value="expired" className="space-y-3">
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400 mb-4">
                  <RefreshCw className="w-4 h-4 inline mr-2" />
                  Usuários com licenças expiradas ou bloqueadas. Clique no ícone de reativar para renovar por +30 dias.
                </div>
                {filterUsers(expiredLicenses).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500 opacity-50" />
                    <p>Nenhuma licença expirada</p>
                  </div>
                ) : (
                  filterUsers(expiredLicenses).map(user => (
                    <UserCard 
                      key={user.id} 
                      user={user} 
                      type={user.cref ? 'instructor' : 'client'} 
                      showReactivate 
                    />
                  ))
                )}
              </TabsContent>
            </>
          )}
        </Tabs>
      )}

      {/* License Key Dialog */}
      <Dialog open={showKeyDialog} onOpenChange={setShowKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-bebas text-yellow-500">CHAVE DE ACESSO</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Usuário: <span className="text-foreground font-medium">{selectedUser?.full_name}</span>
            </p>
            <div className="p-4 bg-background rounded-lg border border-border">
              <p className="text-xs text-muted-foreground mb-1">Chave de Acesso (Senha)</p>
              <p className="font-mono text-lg text-yellow-500 break-all">
                {selectedUser?.license_key || 'Sem chave cadastrada'}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Confirmar Exclusão Permanente
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                {/* Visual confirmation card with user info */}
                <div className="bg-destructive/10 border-2 border-destructive/30 rounded-xl p-4 mt-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${userToDelete?.type === 'instructor' ? 'bg-green-500/20' : 'bg-blue-500/20'}`}>
                      {userToDelete?.type === 'instructor' ? (
                        <Dumbbell className="w-6 h-6 text-green-500" />
                      ) : (
                        <User className="w-6 h-6 text-blue-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-lg text-foreground">
                        {userToDelete?.user.full_name || userToDelete?.user.username}
                      </p>
                      <p className="text-sm text-muted-foreground">@{userToDelete?.user.username}</p>
                      {userToDelete?.user.cpf && (
                        <p className="text-xs text-muted-foreground">CPF: {userToDelete.user.cpf}</p>
                      )}
                    </div>
                    <Badge variant="outline" className={userToDelete?.type === 'instructor' ? 'bg-green-500/20 text-green-500 border-green-500/50' : 'bg-blue-500/20 text-blue-500 border-blue-500/50'}>
                      {userToDelete?.type === 'client' ? 'Cliente' : 'Instrutor'}
                    </Badge>
                  </div>
                </div>

                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-center">
                  <p className="text-red-500 font-bold text-sm flex items-center justify-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    ATENÇÃO: Esta ação é IRREVERSÍVEL!
                  </p>
                </div>
                
                <p className="text-sm text-muted-foreground text-center">
                  Todos os dados relacionados serão excluídos permanentemente:
                </p>
                <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1 bg-muted/30 rounded-lg p-3">
                  <li>Licenças e sessões ativas</li>
                  <li>Treinos e planos de exercícios</li>
                  <li>Pagamentos e planos financeiros</li>
                  <li>Registros de peso e hidratação</li>
                  <li>Notificações e preferências</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              {deleting ? 'Excluindo...' : 'Excluir permanentemente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unlink Confirmation Dialog */}
      <AlertDialog open={showUnlinkDialog} onOpenChange={setShowUnlinkDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-orange-500 flex items-center gap-2">
              <Unlink className="w-5 h-5" />
              Confirmar Desvinculação
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desvincular o {userToUnlink?.type === 'client' ? 'cliente' : 'instrutor'}{' '}
              <strong>{userToUnlink?.user.full_name || userToUnlink?.user.username}</strong>?
              <br /><br />
              <span className="text-muted-foreground text-xs">
                O usuário será marcado como desvinculado mas permanecerá no histórico do sistema.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unlinking}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnlink}
              disabled={unlinking}
              className="bg-orange-500 text-white hover:bg-orange-600"
            >
              {unlinking ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {unlinking ? 'Desvinculando...' : 'Sim, desvincular'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-green-500 flex items-center gap-2">
              <RotateCcw className="w-5 h-5" />
              Restaurar Conta
            </AlertDialogTitle>
            <AlertDialogDescription>
              Deseja restaurar a conta de{' '}
              <strong>{userToRestore?.full_name || userToRestore?.username}</strong>?
              <br /><br />
              <span className="text-muted-foreground text-xs">
                O usuário terá seu status alterado para ativo e poderá acessar o sistema novamente.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoring}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestore}
              disabled={restoring}
              className="bg-green-500 text-white hover:bg-green-600"
            >
              {restoring ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {restoring ? 'Restaurando...' : 'Sim, restaurar conta'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reactivate License Dialog */}
      <AlertDialog open={showReactivateDialog} onOpenChange={setShowReactivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-cyan-500 flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              Reativar Licença
            </AlertDialogTitle>
            <AlertDialogDescription>
              Deseja reativar a licença de{' '}
              <strong>{userToReactivate?.full_name || userToReactivate?.username}</strong>?
              <br /><br />
              <span className="text-cyan-400">
                A licença será renovada por mais <strong>30 dias</strong> a partir de hoje.
              </span>
              <br /><br />
              <span className="text-muted-foreground text-xs">
                Status atual: {userToReactivate?.license_status === 'expired' ? 'Expirada' : 'Bloqueada'}
                {userToReactivate?.license_expires_at && (
                  <> • Expirou em: {new Date(userToReactivate.license_expires_at).toLocaleDateString('pt-BR')}</>
                )}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reactivating}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReactivateLicense}
              disabled={reactivating}
              className="bg-cyan-500 text-white hover:bg-cyan-600"
            >
              {reactivating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {reactivating ? 'Reativando...' : 'Sim, reativar (+30 dias)'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

export default ListUsers;

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, User, Dumbbell, Loader2, AlertCircle, Eye, Key, Edit2, Type } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAudio } from '@/contexts/AudioContext';
import { useTheme, SportTheme } from '@/contexts/ThemeContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Estilos por tema para o painel de busca
const getSearchThemeStyles = (themeId: SportTheme) => {
  const styles: Record<SportTheme, {
    cardBg: string;
    cardBorder: string;
    titleColor: string;
    accentColor: string;
    tipBg: string;
    tipBorder: string;
    tipText: string;
    highlightBg: string;
    highlightText: string;
  }> = {
    fire: {
      cardBg: 'bg-black/70',
      cardBorder: 'border-orange-500/40',
      titleColor: 'text-orange-500',
      accentColor: 'text-orange-400',
      tipBg: 'bg-orange-500/10',
      tipBorder: 'border-orange-500/30',
      tipText: 'text-orange-400',
      highlightBg: 'bg-orange-500/30',
      highlightText: 'text-orange-400',
    },
    ocean: {
      cardBg: 'bg-slate-950/80',
      cardBorder: 'border-cyan-500/40',
      titleColor: 'text-cyan-400',
      accentColor: 'text-cyan-300',
      tipBg: 'bg-cyan-500/10',
      tipBorder: 'border-cyan-500/30',
      tipText: 'text-cyan-300',
      highlightBg: 'bg-cyan-500/30',
      highlightText: 'text-cyan-300',
    },
    forest: {
      cardBg: 'bg-emerald-950/80',
      cardBorder: 'border-green-500/40',
      titleColor: 'text-green-400',
      accentColor: 'text-green-300',
      tipBg: 'bg-green-500/10',
      tipBorder: 'border-green-500/30',
      tipText: 'text-green-300',
      highlightBg: 'bg-green-500/30',
      highlightText: 'text-green-300',
    },
    lightning: {
      cardBg: 'bg-black/80',
      cardBorder: 'border-amber-500/50',
      titleColor: 'text-amber-400',
      accentColor: 'text-amber-300',
      tipBg: 'bg-amber-500/15',
      tipBorder: 'border-amber-500/40',
      tipText: 'text-amber-300',
      highlightBg: 'bg-amber-500/30',
      highlightText: 'text-amber-300',
    },
    galaxy: {
      cardBg: 'bg-violet-950/80',
      cardBorder: 'border-purple-500/40',
      titleColor: 'text-purple-400',
      accentColor: 'text-purple-300',
      tipBg: 'bg-purple-500/10',
      tipBorder: 'border-purple-500/30',
      tipText: 'text-purple-300',
      highlightBg: 'bg-purple-500/30',
      highlightText: 'text-purple-300',
    },
    iron: {
      cardBg: 'bg-black/85',
      cardBorder: 'border-zinc-500/50',
      titleColor: 'text-white',
      accentColor: 'text-zinc-200',
      tipBg: 'bg-zinc-700/30',
      tipBorder: 'border-zinc-500/40',
      tipText: 'text-zinc-200',
      highlightBg: 'bg-zinc-500/30',
      highlightText: 'text-white',
    },
    blood: {
      cardBg: 'bg-black/80',
      cardBorder: 'border-red-500/50',
      titleColor: 'text-red-400',
      accentColor: 'text-red-300',
      tipBg: 'bg-red-500/15',
      tipBorder: 'border-red-500/40',
      tipText: 'text-red-300',
      highlightBg: 'bg-red-500/30',
      highlightText: 'text-red-300',
    },
    neon: {
      cardBg: 'bg-black/85',
      cardBorder: 'border-pink-500/50',
      titleColor: 'text-pink-400',
      accentColor: 'text-pink-300',
      tipBg: 'bg-pink-500/15',
      tipBorder: 'border-pink-500/40',
      tipText: 'text-pink-300',
      highlightBg: 'bg-pink-500/30',
      highlightText: 'text-pink-300',
    },
    gold: {
      cardBg: 'bg-black/85',
      cardBorder: 'border-amber-500/50',
      titleColor: 'text-amber-400',
      accentColor: 'text-amber-300',
      tipBg: 'bg-amber-500/15',
      tipBorder: 'border-amber-500/40',
      tipText: 'text-amber-300',
      highlightBg: 'bg-amber-500/30',
      highlightText: 'text-amber-300',
    },
    amoled: {
      cardBg: 'bg-black/95',
      cardBorder: 'border-white/30',
      titleColor: 'text-white',
      accentColor: 'text-white/80',
      tipBg: 'bg-white/10',
      tipBorder: 'border-white/20',
      tipText: 'text-white/80',
      highlightBg: 'bg-white/20',
      highlightText: 'text-white',
    },
  };
  return styles[themeId] || styles.fire;
};

interface UserResult {
  id: string;
  username: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  cpf: string | null;
  city: string | null;
  cref: string | null;
  birth_date: string | null;
  license_key?: string;
  license_type?: string;
  created_by_admin?: string | null;
}

const UserCPFSearch: React.FC = () => {
  const navigate = useNavigate();
  const { playClickSound } = useAudio();
  const { role, profile: currentProfile } = useAuth();
  const { currentTheme } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<UserResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null);
  const [showKeyDialog, setShowKeyDialog] = useState(false);

  const isMaster = role === 'master';
  const themeStyles = useMemo(() => getSearchThemeStyles(currentTheme), [currentTheme]);

  // Debounce de 150ms para busca em tempo real
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const formatCPF = (value: string) => {
    const nums = value.replace(/\D/g, '');
    if (nums.length <= 3) return nums;
    if (nums.length <= 6) return `${nums.slice(0, 3)}.${nums.slice(3)}`;
    if (nums.length <= 9) return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6)}`;
    return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6, 9)}-${nums.slice(9, 11)}`;
  };

  const handleSearch = useCallback(async (term: string) => {
    const cleanSearch = term.replace(/\D/g, '');
    const isLikelyCPF = cleanSearch.length >= 3 && /^\d+$/.test(cleanSearch);
    const isNameSearch = term.length >= 2 && !/^\d+$/.test(term.replace(/[.-]/g, ''));
    
    // Só busca se tiver pelo menos 3 dígitos (CPF) ou 2 caracteres (nome)
    if (!isLikelyCPF && !isNameSearch) {
      if (term.trim() === '') {
        setResults([]);
        setSearched(false);
      }
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      let query = supabase
        .from('profiles')
        .select(`
          id, username, full_name, email, phone, cpf, city, cref, birth_date, created_by_admin,
          licenses:licenses!licenses_profile_id_fkey (license_key, license_type)
        `)
        .limit(20);

      if (!isMaster && currentProfile?.profile_id) {
        query = query.eq('created_by_admin', currentProfile.profile_id);
      }

      if (isLikelyCPF) {
        query = query.ilike('cpf', `%${cleanSearch}%`);
      } else {
        query = query.or(`full_name.ilike.%${term}%,username.ilike.%${term}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      const mapped = (data || []).map((p: any) => ({
        ...p,
        license_key: p.licenses?.[0]?.license_key,
        license_type: p.licenses?.[0]?.license_type,
      }));

      setResults(mapped);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  }, [isMaster, currentProfile?.profile_id]);

  // Busca automática quando o debounce atualiza
  useEffect(() => {
    handleSearch(debouncedSearch);
  }, [debouncedSearch, handleSearch]);

  // Função para destacar o trecho que coincide no CPF
  const highlightCPF = (cpf: string, search: string) => {
    if (!cpf || !search) return formatCPF(cpf);
    const cleanSearch = search.replace(/\D/g, '');
    const cleanCPF = cpf.replace(/\D/g, '');
    const formattedCPF = formatCPF(cpf);
    
    if (cleanSearch.length < 3 || !cleanCPF.includes(cleanSearch)) {
      return formattedCPF;
    }
    
    // Encontra a posição no CPF formatado
    const startIndex = cleanCPF.indexOf(cleanSearch);
    if (startIndex === -1) return formattedCPF;
    
    // Mapeia posições do CPF limpo para o formatado
    let cleanPos = 0;
    let formattedStart = -1;
    let formattedEnd = -1;
    
    for (let i = 0; i < formattedCPF.length; i++) {
      if (/\d/.test(formattedCPF[i])) {
        if (cleanPos === startIndex) formattedStart = i;
        if (cleanPos === startIndex + cleanSearch.length - 1) {
          formattedEnd = i + 1;
          break;
        }
        cleanPos++;
      }
    }
    
    if (formattedStart === -1 || formattedEnd === -1) return formattedCPF;
    
    return (
      <>
        {formattedCPF.slice(0, formattedStart)}
        <span className={cn(themeStyles.highlightBg, themeStyles.highlightText, 'font-bold rounded px-0.5')}>
          {formattedCPF.slice(formattedStart, formattedEnd)}
        </span>
        {formattedCPF.slice(formattedEnd)}
      </>
    );
  };

  const showLicenseKey = (user: UserResult) => {
    playClickSound();
    setSelectedUser(user);
    setShowKeyDialog(true);
  };

  return (
    <Card className={cn('backdrop-blur-md border', themeStyles.cardBg, themeStyles.cardBorder)}>
      <CardHeader className="pb-3">
        <CardTitle className={cn('flex items-center gap-2 text-lg font-bebas', themeStyles.titleColor)}>
          <Search className="w-5 h-5" />
          BUSCAR USUÁRIO
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                placeholder="Digite CPF ou nome do usuário..."
                value={searchTerm}
                onChange={(e) => {
                  const value = e.target.value;
                  const numbersOnly = value.replace(/\D/g, '');
                  if (numbersOnly.length > 0 && numbersOnly.length <= 11 && value.match(/^[\d.-]*$/)) {
                    setSearchTerm(formatCPF(value));
                  } else {
                    setSearchTerm(value);
                  }
                }}
                className="pr-10"
              />
              {loading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>
          
          {/* Indicador de status da busca */}
          <AnimatePresence>
            {searchTerm && !loading && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute -bottom-5 left-0 text-xs"
              >
                {searchTerm.replace(/\D/g, '').length > 0 && searchTerm.replace(/\D/g, '').length < 3 ? (
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Type className="w-3 h-3" /> Digite mais {3 - searchTerm.replace(/\D/g, '').length} dígito(s)...
                  </span>
                ) : results.length > 0 ? (
                  <span className="text-green-500">{results.length} encontrado(s)</span>
                ) : searched ? (
                  <span className="text-muted-foreground">Nenhum resultado</span>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {!isMaster && (
          <div className={cn('rounded-lg p-2 flex items-center gap-2 text-xs border', themeStyles.tipBg, themeStyles.tipBorder, themeStyles.tipText)}>
            <AlertCircle className="w-4 h-4" />
            <span>Apenas usuários vinculados ao seu painel serão exibidos.</span>
          </div>
        )}

        <div className={cn('rounded-lg p-2 text-xs border', themeStyles.tipBg, themeStyles.tipBorder, themeStyles.tipText)}>
          <strong>Dica:</strong> Você pode buscar por CPF (ex: 123.456.789-00) ou por nome do usuário.
        </div>

        {searched && (
          <div className="space-y-3">
            {results.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum resultado encontrado</p>
                <p className="text-xs mt-1">Verifique se o usuário possui CPF cadastrado ou tente buscar pelo nome</p>
              </div>
            ) : (
              results.map((user) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-background/50 rounded-xl p-4 border border-border/50"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${user.cref ? 'bg-green-500/20' : 'bg-blue-500/20'}`}>
                      {user.cref ? (
                        <Dumbbell className="w-6 h-6 text-green-500" />
                      ) : (
                        <User className="w-6 h-6 text-blue-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{user.full_name || user.username}</h3>
                        <Badge variant="outline" className={user.cref ? 'border-green-500/50 text-green-500' : 'border-blue-500/50 text-blue-500'}>
                          {user.cref ? 'Instrutor' : 'Cliente'}
                        </Badge>
                        {user.license_type && (
                          <Badge variant="outline" className="text-xs">
                            {user.license_type.toUpperCase()}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        CPF: {user.cpf ? highlightCPF(user.cpf, searchTerm) : <span className="text-yellow-500">Não cadastrado</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {user.city && `${user.city} • `}
                        {user.phone || user.email || '@' + user.username}
                      </p>
                    </div>
                    <div className="flex gap-1">
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
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}
      </CardContent>

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
    </Card>
  );
};

export default UserCPFSearch;

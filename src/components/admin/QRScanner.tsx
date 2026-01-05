import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { QrCode, Search, CheckCircle, XCircle, User, Loader2, Camera, RefreshCw, DoorOpen, Link2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAudio } from '@/contexts/AudioContext';
import { useAuth } from '@/contexts/AuthContext';
import { useEscapeBack } from '@/hooks/useEscapeBack';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import QRCameraReader from '@/components/shared/QRCameraReader';

interface ProfileResult {
  id: string;
  username: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  licenseStatus: 'active' | 'expired' | 'blocked' | 'not_found';
  licenseType: string | null;
  expiresAt: string | null;
  role?: string;
  student_id?: string | null;
}

const QRScanner: React.FC = () => {
  const navigate = useNavigate();
  const { playClickSound } = useAudio();
  const { profile } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [registeringAccess, setRegisteringAccess] = useState(false);
  const [result, setResult] = useState<ProfileResult | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [recentScans, setRecentScans] = useState<ProfileResult[]>([]);

  // ESC para voltar ao menu admin
  useEscapeBack({ to: '/admin', disableWhen: [showCamera] });

  const handleSearch = async (searchCode?: string) => {
    const searchTerm = searchCode || code;
    
    if (!searchTerm.trim()) {
      toast.error('Digite um código ou usuário');
      return;
    }

    playClickSound();
    setLoading(true);
    setResult(null);

    try {
      // Search by profile ID, username, student_id, or license key
      let profileData = null;
      let licenseData = null;

      // Try to find by profile ID, username, or student_id first
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, full_name, email, phone, student_id')
        .or(`id.eq.${searchTerm.trim()},username.ilike.${searchTerm.trim()},student_id.ilike.${searchTerm.trim()}`)
        .maybeSingle();

      if (profile) {
        profileData = profile;
        
        // Get license info
        const { data: license } = await supabase
          .from('licenses')
          .select('status, license_type, expires_at')
          .eq('profile_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        licenseData = license;

        // Get user role
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', profile.id)
          .maybeSingle();

        const resultData: ProfileResult = {
          id: profile.id,
          username: profile.username,
          full_name: profile.full_name,
          email: profile.email,
          phone: profile.phone,
          student_id: profile.student_id,
          licenseStatus: licenseData?.status || 'not_found',
          licenseType: licenseData?.license_type || null,
          expiresAt: licenseData?.expires_at || null,
          role: roleData?.role
        };

        setResult(resultData);
        
        // Add to recent scans
        setRecentScans(prev => {
          const filtered = prev.filter(s => s.id !== resultData.id);
          return [resultData, ...filtered].slice(0, 5);
        });

        toast.success('Usuário encontrado!');
      } else {
        // Try to find by license key
        const { data: license } = await supabase
          .from('licenses')
          .select(`
            status, license_type, expires_at, profile_id,
            profiles!licenses_profile_id_fkey (id, username, full_name, email, phone, student_id)
          `)
          .eq('license_key', searchTerm.trim())
          .maybeSingle();

        if (license?.profiles) {
          const profileInfo = license.profiles as any;
          
          const resultData: ProfileResult = {
            id: profileInfo.id,
            username: profileInfo.username,
            full_name: profileInfo.full_name,
            email: profileInfo.email,
            phone: profileInfo.phone,
            student_id: profileInfo.student_id,
            licenseStatus: license.status as any,
            licenseType: license.license_type,
            expiresAt: license.expires_at
          };

          setResult(resultData);
          setRecentScans(prev => {
            const filtered = prev.filter(s => s.id !== resultData.id);
            return [resultData, ...filtered].slice(0, 5);
          });
          toast.success('Usuário encontrado!');
        } else {
          toast.error('Usuário não encontrado');
        }
      }
    } catch (err) {
      console.error('Error:', err);
      toast.error('Erro ao buscar');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterAccess = async () => {
    if (!result) return;
    
    setRegisteringAccess(true);
    try {
      const { error } = await supabase
        .from('access_logs')
        .insert({
          profile_id: result.id,
          access_method: 'qrcode',
          registered_by: profile?.profile_id || null,
          notes: `Entrada via QR Code`,
        });

      if (error) throw error;
      
      toast.success(`Entrada registrada para ${result.full_name || result.username}!`);
    } catch (err: any) {
      console.error('Error:', err);
      toast.error('Erro ao registrar entrada: ' + err.message);
    } finally {
      setRegisteringAccess(false);
    }
  };

  const handleCameraScan = (scannedCode: string) => {
    setShowCamera(false);
    setCode(scannedCode);
    handleSearch(scannedCode);
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'active':
        return { icon: CheckCircle, text: 'ATIVO', color: 'text-green-500', bg: 'bg-green-500/20', border: 'border-green-500/30' };
      case 'expired':
        return { icon: XCircle, text: 'EXPIRADO', color: 'text-yellow-500', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30' };
      case 'blocked':
        return { icon: XCircle, text: 'BLOQUEADO', color: 'text-destructive', bg: 'bg-destructive/20', border: 'border-destructive/30' };
      default:
        return { icon: XCircle, text: 'SEM LICENÇA', color: 'text-muted-foreground', bg: 'bg-muted/20', border: 'border-muted' };
    }
  };

  const getRoleBadge = (role?: string) => {
    const roles: Record<string, { label: string; color: string }> = {
      master: { label: 'MASTER', color: 'bg-purple-500/20 text-purple-500' },
      admin: { label: 'ADMIN', color: 'bg-blue-500/20 text-blue-500' },
      instructor: { label: 'INSTRUTOR', color: 'bg-orange-500/20 text-orange-500' },
      client: { label: 'CLIENTE', color: 'bg-green-500/20 text-green-500' }
    };
    
    const roleInfo = roles[role || 'client'] || roles.client;
    return <Badge className={roleInfo.color}>{roleInfo.label}</Badge>;
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
        <h2 className="text-xl sm:text-2xl font-bebas text-amber-500 flex items-center gap-2">
          <QrCode className="w-6 h-6" />
          LEITOR QR CODE
        </h2>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Manual Search */}
        <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-border/50 space-y-4">
          <h3 className="font-bebas text-lg flex items-center gap-2">
            <Search className="w-5 h-5 text-amber-500" />
            BUSCA MANUAL
          </h3>
          
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Username, matrícula, ID ou chave..."
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10 bg-background/50"
              />
            </div>
            <Button onClick={() => handleSearch()} disabled={loading} className="bg-amber-600 hover:bg-amber-700">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buscar'}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Digite o username, matrícula (ID do aluno), ID do perfil ou chave de licença
          </p>
        </div>

        {/* Camera Scanner */}
        {showCamera ? (
          <QRCameraReader
            onScan={handleCameraScan}
            onClose={() => setShowCamera(false)}
            title="SCANNER DE CÂMERA"
          />
        ) : (
          <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-border/50">
            <h3 className="font-bebas text-lg flex items-center gap-2 mb-4">
              <Camera className="w-5 h-5 text-amber-500" />
              SCANNER DE CÂMERA
            </h3>
            
            <div 
              onClick={() => setShowCamera(true)}
              className="aspect-video bg-background/50 rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:bg-background/70 hover:border-amber-500/50 transition-all"
            >
              <div className="text-center text-muted-foreground">
                <Camera className="w-16 h-16 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium">Clique para ativar a câmera</p>
                <p className="text-xs">Escaneie o QR Code do usuário</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Result */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl p-6 border ${getStatusDisplay(result.licenseStatus).bg} ${getStatusDisplay(result.licenseStatus).border}`}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bebas text-lg flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              USUÁRIO ENCONTRADO
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setResult(null); setCode(''); }}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Nova Busca
            </Button>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-card flex items-center justify-center flex-shrink-0">
              <span className="text-2xl font-bebas text-primary">
                {(result.full_name || result.username).charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bebas truncate">{result.full_name || result.username}</h3>
              <p className="text-muted-foreground">@{result.username}</p>
              {result.student_id && (
                <p className="text-sm text-primary font-medium">Matrícula: {result.student_id}</p>
              )}
              {result.email && <p className="text-sm text-muted-foreground truncate">{result.email}</p>}
              {result.phone && <p className="text-sm text-muted-foreground">{result.phone}</p>}
              
              <div className="flex flex-wrap gap-2 mt-3">
                {getRoleBadge(result.role)}
                <Badge className={`${getStatusDisplay(result.licenseStatus).bg} ${getStatusDisplay(result.licenseStatus).color}`}>
                  {result.licenseType?.toUpperCase() || 'N/A'} - {getStatusDisplay(result.licenseStatus).text}
                </Badge>
              </div>

              {result.expiresAt && (
                <p className="text-xs text-muted-foreground mt-2">
                  Expira em: {format(new Date(result.expiresAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              )}
            </div>
            <div className="text-center flex-shrink-0">
              {React.createElement(getStatusDisplay(result.licenseStatus).icon, {
                className: `w-12 h-12 ${getStatusDisplay(result.licenseStatus).color}`
              })}
            </div>
          </div>

          {/* Action Buttons */}
          {result.licenseStatus === 'active' && (
            <div className="flex gap-2 mt-4 pt-4 border-t border-border/50">
              <Button
                onClick={handleRegisterAccess}
                disabled={registeringAccess}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {registeringAccess ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <DoorOpen className="w-4 h-4 mr-2" />
                )}
                Registrar Entrada
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(`/admin/edit-user/${result.id}`)}
              >
                <Link2 className="w-4 h-4 mr-2" />
                Editar
              </Button>
            </div>
          )}
        </motion.div>
      )}

      {/* Recent Scans */}
      {recentScans.length > 0 && !result && (
        <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50">
          <h3 className="font-bebas text-lg mb-3">BUSCAS RECENTES</h3>
          <div className="space-y-2">
            {recentScans.map((user) => (
              <div
                key={user.id}
                onClick={() => { playClickSound(); setResult(user); }}
                className="flex items-center gap-3 p-3 bg-background/50 rounded-lg cursor-pointer hover:bg-background/70 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="font-bebas text-primary">
                    {(user.full_name || user.username).charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{user.full_name || user.username}</p>
                  <p className="text-xs text-muted-foreground">
                    @{user.username} {user.student_id && `• Mat: ${user.student_id}`}
                  </p>
                </div>
                <Badge className={`${getStatusDisplay(user.licenseStatus).bg} ${getStatusDisplay(user.licenseStatus).color} text-xs`}>
                  {getStatusDisplay(user.licenseStatus).text}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default QRScanner;

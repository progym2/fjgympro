import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  QrCode, Camera, CheckCircle, User, 
  Loader2, RefreshCw, Search, Link2, UserCheck, AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAudio } from '@/contexts/AudioContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import QRCameraReader from '@/components/shared/QRCameraReader';
import InstructorPageHeader from '@/components/instructor/InstructorPageHeader';

interface ScannedUser {
  id: string;
  username: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  license?: {
    type: string;
    status: string;
    expires_at: string | null;
  };
  isLinked?: boolean;
  linkStatus?: 'pending' | 'accepted' | 'none';
  linkedToOther?: boolean;
  otherInstructorName?: string | null;
}

const QRScanner: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { playClickSound } = useAudio();
  
  const [manualCode, setManualCode] = useState('');
  const [scannedUser, setScannedUser] = useState<ScannedUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [recentScans, setRecentScans] = useState<ScannedUser[]>([]);
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  const handleSearchWithCode = async (code: string, autoLink: boolean = false) => {
    if (!code.trim()) {
      toast.error('Digite um código');
      return;
    }

    playClickSound();
    setLoading(true);
    setLinkSent(false);

    try {
      // Try to parse as JSON QR data first
      let searchTerm = code.trim();
      let parsedData: any = null;
      
      try {
        parsedData = JSON.parse(code);
        // If it's a member QR code
        if (parsedData.type === 'member' && parsedData.profile_id) {
          searchTerm = parsedData.profile_id;
        } else if (parsedData.profile_id) {
          searchTerm = parsedData.profile_id;
        }
      } catch {
        // Not JSON, use as-is
      }
      
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, email, avatar_url')
        .or(`username.ilike.${searchTerm},id.eq.${searchTerm}`)
        .limit(1)
        .maybeSingle();

      if (error || !profileData) {
        toast.error('Usuário não encontrado');
        setScannedUser(null);
        return;
      }

      // Get license info
      const { data: licenseData } = await supabase
        .from('licenses')
        .select('license_type, status, expires_at')
        .eq('profile_id', profileData.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Check link status with this instructor
      let linkStatus: 'pending' | 'accepted' | 'none' = 'none';
      let isLinked = false;
      let linkedToOther = false;
      let otherInstructorName: string | null = null;
      
      if (profile?.profile_id) {
        const { data: linkData } = await supabase
          .from('instructor_clients')
          .select('id, link_status, is_active')
          .eq('instructor_id', profile.profile_id)
          .eq('client_id', profileData.id)
          .maybeSingle();
        
        if (linkData) {
          if (linkData.is_active && linkData.link_status === 'accepted') {
            linkStatus = 'accepted';
            isLinked = true;
          } else if (linkData.link_status === 'pending') {
            linkStatus = 'pending';
          }
        }

        // Check if linked to ANOTHER instructor
        const { data: otherLinkData } = await supabase
          .from('instructor_clients')
          .select(`
            id,
            instructor:profiles!instructor_clients_instructor_id_fkey(
              full_name,
              username
            )
          `)
          .eq('client_id', profileData.id)
          .eq('link_status', 'accepted')
          .eq('is_active', true)
          .neq('instructor_id', profile.profile_id)
          .maybeSingle();

        if (otherLinkData) {
          linkedToOther = true;
          otherInstructorName = (otherLinkData.instructor as any)?.full_name || 
                                (otherLinkData.instructor as any)?.username || 
                                'Outro instrutor';
        }
      }

      const user: ScannedUser = {
        ...profileData,
        license: licenseData ? {
          type: licenseData.license_type,
          status: licenseData.status,
          expires_at: licenseData.expires_at
        } : undefined,
        isLinked,
        linkStatus,
        linkedToOther,
        otherInstructorName
      };

      setScannedUser(user);
      
      // Add to recent scans
      setRecentScans(prev => {
        const filtered = prev.filter(s => s.id !== user.id);
        return [user, ...filtered].slice(0, 5);
      });

      // Auto-link if from camera scan and not already linked and not linked to other
      if (autoLink && !isLinked && linkStatus !== 'pending' && !linkedToOther && profile?.profile_id) {
        await autoSendInvite(user);
      } else if (linkedToOther) {
        toast.error(`⚠️ Este aluno já está vinculado a ${otherInstructorName}!`);
      } else if (isLinked) {
        toast.info('Este aluno já está vinculado a você!');
      } else if (linkStatus === 'pending') {
        toast.info('Já existe uma solicitação pendente para este aluno.');
      } else {
        toast.success('Usuário encontrado!', { duration: 2000 });
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Erro ao buscar usuário');
    } finally {
      setLoading(false);
    }
  };

  const autoSendInvite = async (user: ScannedUser) => {
    if (!profile?.profile_id) return;

    try {
      // Check if client is already linked to ANOTHER instructor
      const { data: existingWithOther } = await supabase
        .from('instructor_clients')
        .select('id, instructor_id, is_active, link_status')
        .eq('client_id', user.id)
        .eq('is_active', true)
        .eq('link_status', 'accepted')
        .neq('instructor_id', profile.profile_id)
        .maybeSingle();

      if (existingWithOther) {
        toast.error('⚠️ Este aluno já está vinculado a outro instrutor! Não é possível enviar solicitação.');
        return;
      }

      // Check if already linked or pending with this instructor
      const { data: existing } = await supabase
        .from('instructor_clients')
        .select('id, is_active, link_status')
        .eq('instructor_id', profile.profile_id)
        .eq('client_id', user.id)
        .maybeSingle();

      if (existing) {
        if (existing.is_active && existing.link_status === 'accepted') {
          toast.info('Este aluno já está vinculado a você');
          setScannedUser({ ...user, isLinked: true, linkStatus: 'accepted' });
          return;
        }
        
        if (existing.link_status === 'pending') {
          toast.info('Já existe uma solicitação pendente');
          setScannedUser({ ...user, linkStatus: 'pending' });
          return;
        }
        
        // Reactivate link as pending
        await supabase
          .from('instructor_clients')
          .update({ 
            is_active: true, 
            link_status: 'pending',
            unlinked_at: null,
            linked_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        // Create new link request
        await supabase
          .from('instructor_clients')
          .insert({
            instructor_id: profile.profile_id,
            client_id: user.id,
            is_active: true,
            link_status: 'pending'
          });
      }

      // Send notification to student
      await supabase
        .from('notifications')
        .insert({
          profile_id: user.id,
          title: 'Solicitação de Vínculo',
          message: `O instrutor ${profile.full_name || profile.username} deseja vincular você como aluno. Acesse seu painel para aceitar ou recusar.`,
          type: 'link_request'
        });

      setLinkSent(true);
      setScannedUser({ ...user, linkStatus: 'pending' });
      toast.success('Convite enviado automaticamente!');
      
      // Wait a bit then navigate to confirmation
      setTimeout(() => {
        navigate('/instructor/students');
      }, 2000);
      
    } catch (error) {
      console.error('Auto link error:', error);
      toast.error('Erro ao enviar convite');
    }
  };

  const handleManualSearch = async () => {
    handleSearchWithCode(manualCode, false);
  };

  const handleCameraScan = (scannedCode: string) => {
    setShowCameraScanner(false);
    setManualCode(scannedCode);
    // Auto-link when scanning from camera
    handleSearchWithCode(scannedCode, true);
  };

  const handleManualLink = async () => {
    if (!scannedUser || !profile?.profile_id) return;
    await autoSendInvite(scannedUser);
  };

  const getLicenseStatusBadge = (license?: ScannedUser['license']) => {
    if (!license) {
      return <Badge variant="secondary">Sem licença</Badge>;
    }

    const colors = {
      active: 'bg-green-500/20 text-green-500',
      expired: 'bg-red-500/20 text-red-500',
      blocked: 'bg-yellow-500/20 text-yellow-500'
    };

    const labels = {
      demo: 'DEMO',
      trial: 'TRIAL',
      full: 'LICENCIADO',
      master: 'MASTER'
    };

    return (
      <Badge className={colors[license.status as keyof typeof colors] || 'bg-muted'}>
        {labels[license.type as keyof typeof labels] || license.type} - {license.status.toUpperCase()}
      </Badge>
    );
  };

  const getLinkStatusBadge = (user: ScannedUser) => {
    if (user.linkedToOther) {
      return (
        <Badge className="bg-red-500/20 text-red-500 border border-red-500/30">
          <AlertCircle className="w-3 h-3 mr-1" />
          Vinculado a: {user.otherInstructorName}
        </Badge>
      );
    }
    if (user.linkStatus === 'accepted' || user.isLinked) {
      return (
        <Badge className="bg-blue-500/20 text-blue-500">
          <Link2 className="w-3 h-3 mr-1" />
          Vinculado a você
        </Badge>
      );
    }
    if (user.linkStatus === 'pending') {
      return (
        <Badge className="bg-yellow-500/20 text-yellow-500">
          <UserCheck className="w-3 h-3 mr-1" />
          Aguardando aceite
        </Badge>
      );
    }
    return <Badge variant="outline">Disponível para vincular</Badge>;
  };

  return (
    <div className="flex flex-col h-full">
      <InstructorPageHeader title="LEITOR QR CODE" icon={<QrCode className="w-6 h-6" />} iconColor="text-amber-500" />
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-1 overflow-auto space-y-4 p-1"
      >
        {/* Link Sent Confirmation */}
        {linkSent && scannedUser && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-green-500/20 border border-green-500/50 rounded-xl p-6 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
            >
              <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
            </motion.div>
            <h3 className="font-bebas text-2xl text-green-500 mb-2">CONVITE ENVIADO!</h3>
            <p className="text-muted-foreground mb-4">
              O aluno <strong>{scannedUser.full_name || scannedUser.username}</strong> receberá uma notificação para aceitar o vínculo.
            </p>
            <p className="text-sm text-muted-foreground">Redirecionando para seus alunos...</p>
          </motion.div>
        )}

        {!linkSent && (
          <>
            <div className="grid lg:grid-cols-2 gap-4">
              {/* Manual Search */}
              <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-border/50">
                <h3 className="font-bebas text-lg tracking-wider mb-4 flex items-center gap-2">
                  <Search className="w-5 h-5 text-amber-500" />
                  BUSCA MANUAL
                </h3>
                
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      placeholder="Username ou ID do aluno"
                      className="flex-1"
                      onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
                    />
                    <Button 
                      onClick={handleManualSearch} 
                      disabled={loading}
                      className="bg-amber-500 hover:bg-amber-600"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buscar'}
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Digite o username ou ID do perfil para buscar o aluno
                  </p>
                </div>
              </div>

              {/* Camera Scanner */}
              {showCameraScanner ? (
                <QRCameraReader
                  onScan={handleCameraScan}
                  onClose={() => setShowCameraScanner(false)}
                  title="SCANNER DE CÂMERA"
                />
              ) : (
                <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-border/50">
                  <h3 className="font-bebas text-lg tracking-wider mb-4 flex items-center gap-2">
                    <Camera className="w-5 h-5 text-amber-500" />
                    SCANNER DE CÂMERA
                  </h3>
                  
                  <div 
                    onClick={() => setShowCameraScanner(true)}
                    className="aspect-video bg-background/50 rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:bg-background/70 hover:border-amber-500/50 transition-all"
                  >
                    <div className="text-center text-muted-foreground">
                      <Camera className="w-16 h-16 mx-auto mb-3 opacity-50" />
                      <p className="text-sm font-medium">Clique para ativar a câmera</p>
                      <p className="text-xs">O convite será enviado automaticamente</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Scanned User Result */}
            {scannedUser && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card/80 backdrop-blur-md rounded-xl p-6 border border-green-500/30"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bebas text-lg tracking-wider flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    USUÁRIO ENCONTRADO
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { playClickSound(); setScannedUser(null); setManualCode(''); }}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Nova Busca
                  </Button>
                </div>

                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                    {scannedUser.avatar_url ? (
                      <img 
                        src={scannedUser.avatar_url} 
                        alt={scannedUser.full_name || scannedUser.username}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-bebas text-amber-500">
                        {(scannedUser.full_name || scannedUser.username).charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-lg font-semibold truncate">{scannedUser.full_name || scannedUser.username}</h4>
                    <p className="text-sm text-muted-foreground">@{scannedUser.username}</p>
                    {scannedUser.email && (
                      <p className="text-sm text-muted-foreground truncate">{scannedUser.email}</p>
                    )}
                    
                    <div className="flex flex-wrap gap-2 mt-3">
                      {getLicenseStatusBadge(scannedUser.license)}
                      {getLinkStatusBadge(scannedUser)}
                    </div>

                    {scannedUser.license?.expires_at && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Expira em: {format(new Date(scannedUser.license.expires_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {scannedUser.linkedToOther ? (
                      <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-center">
                        <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-1" />
                        <p className="text-xs text-red-500 font-medium">
                          Vinculado a outro instrutor
                        </p>
                      </div>
                    ) : !scannedUser.isLinked && scannedUser.linkStatus !== 'pending' ? (
                      <Button
                        onClick={handleManualLink}
                        disabled={loading}
                        className="bg-green-500 hover:bg-green-600"
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Link2 className="w-4 h-4 mr-2" />}
                        Enviar Convite
                      </Button>
                    ) : null}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Recent Scans */}
            {recentScans.length > 0 && !scannedUser && (
              <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50">
                <h3 className="font-bebas text-lg tracking-wider mb-3">BUSCAS RECENTES</h3>
                
                <div className="space-y-2">
                  {recentScans.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => { playClickSound(); setScannedUser(user); }}
                      className="flex items-center gap-3 p-3 bg-background/50 rounded-lg cursor-pointer hover:bg-background/70 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center">
                        <span className="font-bebas text-amber-500">
                          {(user.full_name || user.username).charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{user.full_name || user.username}</p>
                        <p className="text-xs text-muted-foreground">@{user.username}</p>
                      </div>
                      {user.isLinked && (
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      )}
                      {user.linkStatus === 'pending' && (
                        <UserCheck className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
};

export default QRScanner;

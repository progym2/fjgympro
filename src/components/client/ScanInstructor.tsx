import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  QrCode, Camera, CheckCircle, User, 
  Loader2, RefreshCw, Search, Link2, UserPlus
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAudio } from '@/contexts/AudioContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import QRCameraReader from '@/components/shared/QRCameraReader';
import ClientPageHeader from './ClientPageHeader';

interface ScannedInstructor {
  id: string;
  username: string;
  full_name: string | null;
  email: string | null;
  cref: string | null;
  avatar_url: string | null;
  isAlreadyLinked: boolean;
}

const ScanInstructor: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { playClickSound } = useAudio();
  
  const [manualCode, setManualCode] = useState('');
  const [scannedInstructor, setScannedInstructor] = useState<ScannedInstructor | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [linkingInProgress, setLinkingInProgress] = useState(false);

  const handleSearchWithCode = async (code: string) => {
    if (!code.trim()) {
      toast.error('Digite um código');
      return;
    }

    playClickSound();
    setLoading(true);

    try {
      const searchTerm = code.trim();
      
      // Search for instructor by username or profile ID
      const { data: instructorData, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, email, cref, avatar_url')
        .or(`username.ilike.${searchTerm},id.eq.${searchTerm}`)
        .limit(1)
        .maybeSingle();

      if (error || !instructorData) {
        toast.error('Instrutor não encontrado');
        setScannedInstructor(null);
        return;
      }

      // Verify this is actually an instructor
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', instructorData.id)
        .maybeSingle();

      if (!roleData || (roleData.role !== 'instructor' && roleData.role !== 'master' && roleData.role !== 'admin')) {
        toast.error('Este usuário não é um instrutor');
        setScannedInstructor(null);
        return;
      }

      // Check if already linked to this instructor
      let isAlreadyLinked = false;
      if (profile?.profile_id) {
        const { data: linkData } = await supabase
          .from('instructor_clients')
          .select('id')
          .eq('instructor_id', instructorData.id)
          .eq('client_id', profile.profile_id)
          .eq('is_active', true)
          .maybeSingle();
        
        isAlreadyLinked = !!linkData;
      }

      setScannedInstructor({
        ...instructorData,
        isAlreadyLinked
      });

      toast.success('Instrutor encontrado!', { duration: 2000 });
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Erro ao buscar instrutor');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSearch = async () => {
    handleSearchWithCode(manualCode);
  };

  const handleCameraScan = (scannedCode: string, parsedData?: any) => {
    setShowCameraScanner(false);
    
    // Check if it's an instructor QR code
    if (parsedData?.type === 'gym_instructor') {
      setManualCode(parsedData.profile_id || parsedData.username || scannedCode);
      handleSearchWithCode(parsedData.profile_id || parsedData.username || scannedCode);
    } else if (parsedData?.type === 'gym_member') {
      toast.error('Este é um QR Code de aluno, não de instrutor');
    } else {
      setManualCode(scannedCode);
      handleSearchWithCode(scannedCode);
    }
  };

  const handleLinkToInstructor = async () => {
    if (!scannedInstructor || !profile?.profile_id) return;

    playClickSound();
    setLinkingInProgress(true);

    try {
      // Check if client is already linked to ANY instructor
      const { data: existingLink } = await supabase
        .from('instructor_clients')
        .select('id, instructor_id, is_active, link_status')
        .eq('client_id', profile.profile_id)
        .eq('is_active', true)
        .eq('link_status', 'accepted')
        .maybeSingle();

      if (existingLink) {
        if (existingLink.instructor_id === scannedInstructor.id) {
          toast.info('Você já está vinculado a este instrutor');
          setScannedInstructor({ ...scannedInstructor, isAlreadyLinked: true });
        } else {
          toast.error('⚠️ Você já está vinculado a outro instrutor! Desvincule-se primeiro antes de vincular a outro.');
        }
        return;
      }

      // Check if already linked to this specific instructor
      const { data: existing } = await supabase
        .from('instructor_clients')
        .select('id, is_active')
        .eq('instructor_id', scannedInstructor.id)
        .eq('client_id', profile.profile_id)
        .maybeSingle();

      if (existing) {
        if (existing.is_active) {
          toast.info('Você já está vinculado a este instrutor');
          setScannedInstructor({ ...scannedInstructor, isAlreadyLinked: true });
          return;
        }
        
        // Reactivate link
        await supabase
          .from('instructor_clients')
          .update({ is_active: true, unlinked_at: null, linked_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        // Create new link
        await supabase
          .from('instructor_clients')
          .insert({
            instructor_id: scannedInstructor.id,
            client_id: profile.profile_id,
            is_active: true
          });
      }

      // Send notification to instructor
      await supabase
        .from('notifications')
        .insert({
          profile_id: scannedInstructor.id,
          title: 'Novo aluno vinculado!',
          message: `${profile.full_name || profile.username} se vinculou a você via QR Code.`,
          type: 'link'
        });

      toast.success('Vinculado ao instrutor com sucesso! 🎉');
      setScannedInstructor({ ...scannedInstructor, isAlreadyLinked: true });
    } catch (error) {
      console.error('Link error:', error);
      toast.error('Erro ao vincular ao instrutor');
    } finally {
      setLinkingInProgress(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col overflow-hidden"
    >
      <ClientPageHeader 
        title="ESCANEAR INSTRUTOR" 
        icon={<UserPlus className="w-5 h-5" />} 
        iconColor="text-primary" 
      />

      <div className="flex-1 overflow-auto space-y-4">
        {/* Info Banner */}
        <div className="bg-primary/10 border border-primary/30 rounded-xl p-4">
          <p className="text-sm text-primary">
            Escaneie o QR Code do seu instrutor para vincular-se automaticamente e receber treinos personalizados.
          </p>
        </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Manual Search */}
        <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-border/50">
          <h3 className="font-bebas text-lg tracking-wider mb-4 flex items-center gap-2">
            <Search className="w-5 h-5 text-primary" />
            BUSCA MANUAL
          </h3>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Username ou ID do instrutor"
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
              />
              <Button 
                onClick={handleManualSearch} 
                disabled={loading}
                className="bg-primary hover:bg-primary/90"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buscar'}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Digite o username ou ID do instrutor
            </p>
          </div>
        </div>

        {/* Camera Scanner */}
        {showCameraScanner ? (
          <QRCameraReader
            onScan={handleCameraScan}
            onClose={() => setShowCameraScanner(false)}
            title="ESCANEAR QR DO INSTRUTOR"
          />
        ) : (
          <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-border/50">
            <h3 className="font-bebas text-lg tracking-wider mb-4 flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary" />
              SCANNER DE CÂMERA
            </h3>
            
            <div 
              onClick={() => setShowCameraScanner(true)}
              className="aspect-video bg-background/50 rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:bg-background/70 hover:border-primary/50 transition-all"
            >
              <div className="text-center text-muted-foreground">
                <Camera className="w-16 h-16 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium">Clique para ativar a câmera</p>
                <p className="text-xs">Escaneie o QR Code do instrutor</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Scanned Instructor Result */}
      {scannedInstructor && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card/80 backdrop-blur-md rounded-xl p-6 border border-green-500/30"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bebas text-lg tracking-wider flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              INSTRUTOR ENCONTRADO
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { playClickSound(); setScannedInstructor(null); setManualCode(''); }}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Nova Busca
            </Button>
          </div>

          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-2 border-green-500/30 flex items-center justify-center flex-shrink-0">
              {scannedInstructor.avatar_url ? (
                <img 
                  src={scannedInstructor.avatar_url} 
                  alt={scannedInstructor.full_name || scannedInstructor.username}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-3xl font-bebas text-green-500">
                  {(scannedInstructor.full_name || scannedInstructor.username).charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h4 className="text-xl font-semibold truncate">{scannedInstructor.full_name || scannedInstructor.username}</h4>
              <p className="text-sm text-muted-foreground">@{scannedInstructor.username}</p>
              
              {scannedInstructor.cref && (
                <p className="text-sm text-green-500 font-medium mt-1">
                  CREF: {scannedInstructor.cref}
                </p>
              )}
              
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge className="bg-green-500/20 text-green-500">
                  INSTRUTOR
                </Badge>
                
                {scannedInstructor.isAlreadyLinked && (
                  <Badge className="bg-blue-500/20 text-blue-500">
                    <Link2 className="w-3 h-3 mr-1" />
                    Já vinculado
                  </Badge>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 flex-shrink-0">
              {!scannedInstructor.isAlreadyLinked ? (
                <Button
                  onClick={handleLinkToInstructor}
                  disabled={linkingInProgress}
                  size="lg"
                  className="bg-green-500 hover:bg-green-600"
                >
                  {linkingInProgress ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Link2 className="w-4 h-4 mr-2" />
                  )}
                  Vincular-me
                </Button>
              ) : (
                <div className="text-center p-4 bg-blue-500/10 rounded-lg">
                  <CheckCircle className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                  <p className="text-sm text-blue-500 font-medium">Você já está vinculado!</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
      </div>
    </motion.div>
  );
};

export default ScanInstructor;

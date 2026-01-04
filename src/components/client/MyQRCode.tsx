import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, ArrowLeft, Copy, Check, UserPlus, Bell, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAudio } from '@/contexts/AudioContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/integrations/supabase/client';

const MyQRCode: React.FC = () => {
  const navigate = useNavigate();
  const { profile, license } = useAuth();
  const { playClickSound } = useAudio();
  const [copied, setCopied] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [showNotification, setShowNotification] = useState(false);
  const [checkingPending, setCheckingPending] = useState(true);

  const qrData = JSON.stringify({
    type: 'gym_member',
    profile_id: profile?.profile_id,
    username: profile?.username,
    name: profile?.full_name
  });

  // Handle ESC key to go back
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        navigate(-1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  // Check for pending link requests
  const checkPendingRequests = async () => {
    if (!profile?.profile_id) return;

    try {
      const { data, error } = await supabase
        .from('instructor_clients')
        .select('id')
        .eq('client_id', profile.profile_id)
        .eq('link_status', 'pending')
        .eq('is_active', true);

      if (error) throw error;

      const count = data?.length || 0;
      setPendingCount(count);
      
      if (count > 0) {
        setShowNotification(true);
      }
    } catch (err) {
      console.error('Error checking pending requests:', err);
    } finally {
      setCheckingPending(false);
    }
  };

  // Subscribe to realtime updates for new link requests
  useEffect(() => {
    checkPendingRequests();

    if (!profile?.profile_id) return;

    const channel = supabase
      .channel('qrcode-pending-links')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'instructor_clients',
          filter: `client_id=eq.${profile.profile_id}`,
        },
        (payload) => {
          // New link request detected!
          console.log('New link request detected:', payload);
          toast.success('Novo convite de instrutor recebido!', {
            description: 'Clique para revisar e aceitar o vínculo.',
            action: {
              label: 'Ver Convite',
              onClick: () => navigate('/client/pending-links'),
            },
          });
          setPendingCount(prev => prev + 1);
          setShowNotification(true);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'instructor_clients',
          filter: `client_id=eq.${profile.profile_id}`,
        },
        () => {
          // Refresh count on any update
          checkPendingRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.profile_id, navigate]);

  const handleCopyKey = () => {
    if (license?.type) {
      navigator.clipboard.writeText(profile?.profile_id || '');
      setCopied(true);
      toast.success('ID copiado!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleGoToPending = () => {
    playClickSound();
    navigate('/client/pending-links');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col overflow-hidden"
    >
      {/* Header with back button on the right */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <QrCode className="w-5 h-5 text-pink-500" />
          <h2 className="text-xl font-bebas text-pink-500 tracking-wider">MEU QR CODE</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          Voltar <ArrowLeft size={16} className="ml-1" />
        </Button>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-auto">
        {/* Pending Link Request Alert */}
        <AnimatePresence>
          {showNotification && pendingCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center"
                  >
                    <UserPlus className="h-4 w-4 text-green-500" />
                  </motion.div>
                  <div>
                    <p className="font-medium text-green-500 text-sm">
                      {pendingCount === 1 
                        ? '1 convite pendente!' 
                        : `${pendingCount} convites pendentes!`
                      }
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Instrutor quer vincular-se
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleGoToPending}
                  size="sm"
                  className="bg-green-500 hover:bg-green-600 text-white"
                >
                  <Bell className="h-3 w-3 mr-1" />
                  Ver
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading state */}
        {checkingPending && (
          <div className="flex items-center justify-center gap-2 text-muted-foreground mb-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-xs">Verificando convites...</span>
          </div>
        )}

        <div className="max-w-xs mx-auto space-y-3">
          {/* QR Code Card */}
          <div className="bg-card/80 backdrop-blur-md rounded-lg p-4 border border-border/50 text-center">
            <div className="bg-white p-2 rounded-lg inline-block mb-2">
              <QRCodeSVG
                value={qrData}
                size={120}
                level="H"
                includeMargin={false}
              />
            </div>
            
            <h3 className="font-bebas text-base tracking-wider text-foreground">
              {profile?.full_name || profile?.username}
            </h3>
            
            <p className="text-xs text-muted-foreground mt-1">
              Apresente para o instrutor escanear
            </p>
          </div>

          {/* License + User Info Combined */}
          <div className="bg-card/80 backdrop-blur-md rounded-lg p-3 border border-border/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Status</span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                license?.status === 'active' 
                  ? 'bg-green-500/20 text-green-500' 
                  : 'bg-red-500/20 text-red-500'
              }`}>
                {license?.status === 'active' ? 'ATIVO' : 'INATIVO'}
              </span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Tipo</span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                license?.type === 'demo' ? 'bg-yellow-500/20 text-yellow-500' :
                license?.type === 'trial' ? 'bg-blue-500/20 text-blue-500' :
                'bg-green-500/20 text-green-500'
              }`}>
                {license?.type?.toUpperCase() || 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Usuário</span>
              <span className="text-xs">{profile?.username || '-'}</span>
            </div>
          </div>

          {/* ID Copy */}
          {profile?.profile_id && (
            <div className="bg-card/80 backdrop-blur-md rounded-lg p-3 border border-border/50">
              <p className="text-xs text-muted-foreground mb-2">ID do Usuário</p>
              <div className="flex gap-2">
                <code className="flex-1 bg-background/50 px-2 py-1.5 rounded text-xs font-mono truncate">
                  {profile.profile_id}
                </code>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-7 w-7 shrink-0"
                  onClick={handleCopyKey}
                >
                  {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default MyQRCode;

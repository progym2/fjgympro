import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Check, X, Loader2, AlertCircle, Clock, Bell, UserMinus, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAudio } from '@/contexts/AudioContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
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

interface PendingRequest {
  id: string;
  instructor_id: string;
  linked_at: string;
  instructor: {
    username: string;
    full_name: string | null;
    cref: string | null;
  };
}

interface CurrentInstructor {
  link_id: string;
  instructor_id: string;
  instructor: {
    username: string;
    full_name: string | null;
    cref: string | null;
  };
}

// Delay in milliseconds before showing the component (2 minutes = 120000ms)
const SHOW_DELAY_MS = 2 * 60 * 1000;
const FIRST_VISIT_KEY = 'pending_links_first_visit';

const PendingLinkRequests: React.FC = () => {
  const { profile } = useAuth();
  const { playClickSound } = useAudio();
  const { sendLinkRequestNotification, permission, requestPermission, isSupported } = usePushNotifications();
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [currentInstructor, setCurrentInstructor] = useState<CurrentInstructor | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [unlinking, setUnlinking] = useState(false);
  const [showComponent, setShowComponent] = useState(false);
  const [unlinkReason, setUnlinkReason] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: 'accept' | 'reject' | 'unlink';
    request: PendingRequest | null;
  }>({ open: false, action: 'accept', request: null });
  
  // Track known request IDs to detect new ones
  const knownRequestIds = useRef<Set<string>>(new Set());
  
  // Handle 2-minute delay for first-time users
  useEffect(() => {
    const firstVisit = localStorage.getItem(FIRST_VISIT_KEY);
    
    if (!firstVisit) {
      // First visit - set timestamp and start delay
      localStorage.setItem(FIRST_VISIT_KEY, Date.now().toString());
      const timer = setTimeout(() => {
        setShowComponent(true);
      }, SHOW_DELAY_MS);
      return () => clearTimeout(timer);
    } else {
      // Check if 2 minutes have passed since first visit
      const firstVisitTime = parseInt(firstVisit, 10);
      const elapsed = Date.now() - firstVisitTime;
      
      if (elapsed >= SHOW_DELAY_MS) {
        setShowComponent(true);
      } else {
        const remaining = SHOW_DELAY_MS - elapsed;
        const timer = setTimeout(() => {
          setShowComponent(true);
        }, remaining);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const fetchPendingRequests = async () => {
    if (!profile?.profile_id) return;

    try {
      // Fetch pending requests
      const { data, error } = await supabase
        .from('instructor_clients')
        .select(`
          id,
          instructor_id,
          linked_at,
          instructor:profiles!instructor_clients_instructor_id_fkey(
            username,
            full_name,
            cref
          )
        `)
        .eq('client_id', profile.profile_id)
        .eq('link_status', 'pending')
        .eq('is_active', true);

      if (error) throw error;

      // Fetch current instructor (if any)
      const { data: currentLink, error: currentError } = await supabase
        .from('instructor_clients')
        .select(`
          id,
          instructor_id,
          instructor:profiles!instructor_clients_instructor_id_fkey(
            username,
            full_name,
            cref
          )
        `)
        .eq('client_id', profile.profile_id)
        .eq('link_status', 'accepted')
        .eq('is_active', true)
        .maybeSingle();

      if (!currentError && currentLink && currentLink.instructor) {
        setCurrentInstructor({
          link_id: currentLink.id,
          instructor_id: currentLink.instructor_id,
          instructor: currentLink.instructor as any,
        });
      } else {
        setCurrentInstructor(null);
      }

      // Transform the data to match our interface, filtering out items with null instructor
      const transformedData = (data || [])
        .filter((item: any) => item.instructor !== null)
        .map((item: any) => ({
          id: item.id,
          instructor_id: item.instructor_id,
          linked_at: item.linked_at,
          instructor: item.instructor,
        }));

      // Check for new requests (for push notification)
      const newRequests = transformedData.filter(
        (req: PendingRequest) => !knownRequestIds.current.has(req.id)
      );
      
      // Send push notification for new requests (only after initial load)
      if (!loading && newRequests.length > 0) {
        newRequests.forEach((req: PendingRequest) => {
          const instructorName = req.instructor?.full_name || req.instructor?.username || 'Instrutor';
          sendLinkRequestNotification(instructorName);
        });
      }
      
      // Update known IDs
      transformedData.forEach((req: PendingRequest) => knownRequestIds.current.add(req.id));

      setRequests(transformedData);
    } catch (err) {
      console.error('Error fetching pending requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingRequests();

    // Subscribe to realtime updates
    if (profile?.profile_id) {
      const channel = supabase
        .channel('pending-links')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'instructor_clients',
            filter: `client_id=eq.${profile.profile_id}`,
          },
          () => {
            fetchPendingRequests();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [profile?.profile_id]);

  const handleAction = (request: PendingRequest, action: 'accept' | 'reject') => {
    playClickSound();
    setConfirmDialog({ open: true, action, request });
  };

  const handleUnlink = () => {
    playClickSound();
    setConfirmDialog({ open: true, action: 'unlink', request: null });
  };

  const confirmUnlink = async () => {
    if (!currentInstructor || !profile?.profile_id) return;

    setUnlinking(true);
    setConfirmDialog({ open: false, action: 'accept', request: null });

    try {
      const { error } = await supabase
        .from('instructor_clients')
        .update({
          is_active: false,
          link_status: 'unlinked',
          unlinked_at: new Date().toISOString(),
        })
        .eq('id', currentInstructor.link_id);

      if (error) throw error;

      // Build notification message with reason if provided
      const reasonText = unlinkReason.trim() 
        ? `\n\nMotivo informado: "${unlinkReason.trim()}"` 
        : '';

      // Notify instructor
      await supabase.from('notifications').insert({
        profile_id: currentInstructor.instructor_id,
        title: 'Aluno desvinculado',
        message: `O aluno ${profile?.full_name || profile?.username} se desvinculou de você.${reasonText}`,
        type: 'link_removed',
      });

      toast.success('Você foi desvinculado do instrutor com sucesso.');
      setCurrentInstructor(null);
      setUnlinkReason('');
      fetchPendingRequests(); // Refresh data
    } catch (err) {
      console.error('Error unlinking:', err);
      toast.error('Erro ao desvincular.');
    } finally {
      setUnlinking(false);
    }
  };

  const confirmAction = async () => {
    const { action, request } = confirmDialog;
    
    // Handle unlink action
    if (action === 'unlink') {
      await confirmUnlink();
      return;
    }

    if (!request || !profile?.profile_id) return;

    setProcessing(request.id);
    setConfirmDialog({ open: false, action: 'accept', request: null });

    try {
      // If accepting, check if user already has an instructor
      if (action === 'accept') {
        const { data: existingLink, error: checkError } = await supabase
          .from('instructor_clients')
          .select('id, instructor:profiles!instructor_clients_instructor_id_fkey(full_name, username)')
          .eq('client_id', profile.profile_id)
          .eq('link_status', 'accepted')
          .eq('is_active', true)
          .maybeSingle();

        if (checkError) throw checkError;

        if (existingLink) {
          const instructorName = (existingLink.instructor as any)?.full_name || (existingLink.instructor as any)?.username || 'outro instrutor';
          toast.error(`Você já está vinculado a ${instructorName}. Só é permitido um instrutor por aluno. Desvincule-se primeiro para aceitar um novo.`);
          setProcessing(null);
          return;
        }
      }

      const newStatus = action === 'accept' ? 'accepted' : 'rejected';
      
      const { error } = await supabase
        .from('instructor_clients')
        .update({
          link_status: newStatus,
          responded_at: new Date().toISOString(),
          is_active: action === 'accept', // Keep active only if accepted
        })
        .eq('id', request.id);

      if (error) throw error;

      // Send notification to instructor
      await supabase.from('notifications').insert({
        profile_id: request.instructor_id,
        title: action === 'accept' ? 'Vínculo Aceito!' : 'Vínculo Rejeitado',
        message: action === 'accept'
          ? `O cliente ${profile?.full_name || profile?.username} aceitou seu pedido de vínculo.`
          : `O cliente ${profile?.full_name || profile?.username} rejeitou seu pedido de vínculo.`,
        type: action === 'accept' ? 'link_accepted' : 'link_rejected',
      });

      toast.success(
        action === 'accept'
          ? 'Vínculo aceito! O instrutor agora pode criar treinos para você.'
          : 'Vínculo rejeitado.'
      );

      // Remove from list and refresh
      setRequests((prev) => prev.filter((r) => r.id !== request.id));
      if (action === 'accept') {
        fetchPendingRequests(); // Refresh to get new current instructor
      }
    } catch (err) {
      console.error('Error processing request:', err);
      toast.error('Erro ao processar solicitação.');
    } finally {
      setProcessing(null);
    }
  };

  // Don't show until delay has passed
  if (!showComponent) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  // Show if there are pending requests OR if there's a current instructor to display
  if (requests.length === 0 && !currentInstructor) {
    return null;
  }

  return (
    <>
      {/* Current Instructor Card */}
      {currentInstructor && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-green-500/20 border-2 border-green-500/50 flex items-center justify-center">
                  <User className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Seu Instrutor Atual</p>
                  <p className="font-semibold text-foreground">
                    {currentInstructor.instructor.full_name || currentInstructor.instructor.username}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    @{currentInstructor.instructor.username}
                    {currentInstructor.instructor.cref && ` • CREF: ${currentInstructor.instructor.cref}`}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleUnlink}
                disabled={unlinking}
                className="border-destructive/50 text-destructive hover:bg-destructive/10"
              >
                {unlinking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserMinus className="h-4 w-4" />
                )}
                <span className="ml-1">Desvincular</span>
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Pending Requests */}
      {requests.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                <h3 className="font-bebas text-lg text-yellow-500 tracking-wider">
                  SOLICITAÇÕES DE VÍNCULO PENDENTES
                </h3>
              </div>
              
              {/* Push notification prompt */}
              {isSupported && permission !== 'granted' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={requestPermission}
                  className="border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10 text-xs"
                >
                  <Bell className="h-3 w-3 mr-1" />
                  Ativar alertas
                </Button>
              )}
            </div>

            {/* Warning if already has instructor */}
            {currentInstructor && (
              <div className="mb-3 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                <div className="flex items-start gap-2 text-orange-500">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">Você já tem um instrutor vinculado</p>
                    <p className="text-xs opacity-80">
                      Para aceitar uma nova solicitação, você precisa primeiro se desvincular do instrutor atual ({currentInstructor.instructor.full_name || currentInstructor.instructor.username}).
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <AnimatePresence>
                {requests.map((request) => (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="bg-card/80 backdrop-blur-md rounded-lg p-4 border border-border/50"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                          <UserPlus className="h-5 w-5 text-green-500" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {request.instructor.full_name || request.instructor.username}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            @{request.instructor.username}
                            {request.instructor.cref && ` • CREF: ${request.instructor.cref}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAction(request, 'reject')}
                          disabled={processing === request.id}
                          className="border-destructive/50 text-destructive hover:bg-destructive/10"
                        >
                          {processing === request.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                          <span className="hidden sm:inline ml-1">Rejeitar</span>
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleAction(request, 'accept')}
                          disabled={processing === request.id || !!currentInstructor}
                          className="bg-green-500 hover:bg-green-600 disabled:opacity-50"
                        >
                          {processing === request.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                          <span className="hidden sm:inline ml-1">Aceitar</span>
                        </Button>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <AlertCircle className="h-3 w-3" />
                      <span>
                        Aceitar permitirá que este instrutor crie treinos e planos alimentares para você.
                      </span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog 
        open={confirmDialog.open} 
        onOpenChange={(open) => { 
          if (!open) {
            setConfirmDialog({ open: false, action: 'accept', request: null });
            setUnlinkReason('');
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {confirmDialog.action === 'accept' ? (
                <Check className="h-5 w-5 text-green-500" />
              ) : confirmDialog.action === 'unlink' ? (
                <UserMinus className="h-5 w-5 text-destructive" />
              ) : (
                <X className="h-5 w-5 text-destructive" />
              )}
              {confirmDialog.action === 'accept' 
                ? 'Aceitar Vínculo' 
                : confirmDialog.action === 'unlink' 
                  ? 'Desvincular Instrutor'
                  : 'Rejeitar Vínculo'}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                {confirmDialog.action === 'accept' ? (
                  <p>
                    Ao aceitar, o instrutor{' '}
                    <strong>{confirmDialog.request?.instructor.full_name || confirmDialog.request?.instructor.username}</strong>{' '}
                    poderá criar treinos e planos alimentares personalizados para você.
                  </p>
                ) : confirmDialog.action === 'unlink' ? (
                  <>
                    <p>
                      Tem certeza que deseja se desvincular do instrutor{' '}
                      <strong>{currentInstructor?.instructor.full_name || currentInstructor?.instructor.username}</strong>?
                      Você perderá acesso aos treinos criados por ele.
                    </p>
                    
                    <div className="space-y-2 pt-2">
                      <Label htmlFor="unlink-reason-pending" className="text-foreground">
                        Motivo da desvinculação (opcional)
                      </Label>
                      <Textarea
                        id="unlink-reason-pending"
                        placeholder="Informe o motivo para ajudar o instrutor a melhorar..."
                        value={unlinkReason}
                        onChange={(e) => setUnlinkReason(e.target.value)}
                        className="min-h-[80px]"
                        maxLength={500}
                      />
                      <p className="text-xs text-muted-foreground">
                        O instrutor será notificado{unlinkReason.trim() ? ' com o motivo informado' : ''}.
                      </p>
                    </div>
                  </>
                ) : (
                  <p>
                    Tem certeza que deseja rejeitar a solicitação do instrutor{' '}
                    <strong>{confirmDialog.request?.instructor.full_name || confirmDialog.request?.instructor.username}</strong>?
                    O instrutor será notificado.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              className={
                confirmDialog.action === 'accept'
                  ? 'bg-green-500 hover:bg-green-600'
                  : 'bg-destructive hover:bg-destructive/90'
              }
            >
              {confirmDialog.action === 'accept' 
                ? 'Sim, Aceitar' 
                : confirmDialog.action === 'unlink'
                  ? 'Sim, Desvincular'
                  : 'Sim, Rejeitar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PendingLinkRequests;

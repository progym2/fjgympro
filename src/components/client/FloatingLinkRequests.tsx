import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Check, X, Loader2, Bell, ChevronDown, ChevronUp, User, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAudio } from '@/contexts/AudioContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Button } from '@/components/ui/button';
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

const FloatingLinkRequests: React.FC = () => {
  const { profile } = useAuth();
  const { playClickSound } = useAudio();
  const { sendLinkRequestNotification } = usePushNotifications();
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [hasCurrentInstructor, setHasCurrentInstructor] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: 'accept' | 'reject';
    request: PendingRequest | null;
  }>({ open: false, action: 'accept', request: null });
  
  const knownRequestIds = useRef<Set<string>>(new Set());

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

      // Check if has current instructor
      const { data: currentLink, error: currentError } = await supabase
        .from('instructor_clients')
        .select('id')
        .eq('client_id', profile.profile_id)
        .eq('link_status', 'accepted')
        .eq('is_active', true)
        .maybeSingle();

      if (!currentError) {
        setHasCurrentInstructor(!!currentLink);
      }

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
      
      if (!loading && newRequests.length > 0) {
        newRequests.forEach((req: PendingRequest) => {
          const instructorName = req.instructor?.full_name || req.instructor?.username || 'Instrutor';
          sendLinkRequestNotification(instructorName);
        });
      }
      
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

    if (profile?.profile_id) {
      const channel = supabase
        .channel('floating-pending-links')
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

  const confirmAction = async () => {
    const { action, request } = confirmDialog;
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
          toast.error(`Você já está vinculado a ${instructorName}. Só é permitido um instrutor por aluno.`);
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
          is_active: action === 'accept',
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

      setRequests((prev) => prev.filter((r) => r.id !== request.id));
      if (action === 'accept') {
        fetchPendingRequests();
      }
    } catch (err) {
      console.error('Error processing request:', err);
      toast.error('Erro ao processar solicitação.');
    } finally {
      setProcessing(null);
    }
  };

  if (loading || requests.length === 0) {
    return null;
  }

  return (
    <>
      {/* Floating Banner */}
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed top-16 left-2 right-2 z-50 max-w-lg mx-auto"
      >
        <div className="bg-gradient-to-r from-yellow-500/95 to-orange-500/95 backdrop-blur-md rounded-xl shadow-2xl border border-yellow-400/50 overflow-hidden">
          {/* Header - always visible */}
          <button
            onClick={() => { playClickSound(); setExpanded(!expanded); }}
            className="w-full flex items-center justify-between p-3 hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center animate-pulse">
                <Bell className="w-4 h-4 text-white" />
              </div>
              <div className="text-left">
                <p className="text-white font-bold text-sm">
                  {requests.length} Solicitação{requests.length > 1 ? 'ões' : ''} de Vínculo
                </p>
                <p className="text-white/80 text-xs">
                  Instrutor{requests.length > 1 ? 'es' : ''} quer{requests.length > 1 ? 'em' : ''} vincular-se a você
                </p>
              </div>
            </div>
            {expanded ? (
              <ChevronUp className="w-5 h-5 text-white" />
            ) : (
              <ChevronDown className="w-5 h-5 text-white" />
            )}
          </button>

          {/* Expandable content */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-3 pb-3 space-y-2 max-h-[40vh] overflow-y-auto">
                  {/* Warning if already has instructor */}
                  {hasCurrentInstructor && (
                    <div className="p-2 bg-red-500/30 rounded-lg">
                      <div className="flex items-start gap-2 text-white">
                        <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        <p className="text-xs">
                          Você já tem um instrutor vinculado. Desvincule-se primeiro para aceitar outro.
                        </p>
                      </div>
                    </div>
                  )}

                  {requests.map((request) => (
                    <motion.div
                      key={request.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-white/20 backdrop-blur-sm rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-full bg-white/30 flex items-center justify-center">
                            <User className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-white font-semibold text-sm">
                              {request.instructor.full_name || request.instructor.username}
                            </p>
                            <p className="text-white/70 text-xs">
                              @{request.instructor.username}
                              {request.instructor.cref && ` • CREF: ${request.instructor.cref}`}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleAction(request, 'reject')}
                            disabled={processing === request.id}
                            className="h-8 w-8 p-0 bg-red-500/30 hover:bg-red-500/50 text-white"
                          >
                            {processing === request.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleAction(request, 'accept')}
                            disabled={processing === request.id || hasCurrentInstructor}
                            className="h-8 bg-green-500 hover:bg-green-600 text-white px-3"
                          >
                            {processing === request.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Check className="h-4 w-4 mr-1" />
                                Aceitar
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <UserPlus className={confirmDialog.action === 'accept' ? 'text-green-500' : 'text-red-500'} />
              {confirmDialog.action === 'accept' ? 'Aceitar Vínculo' : 'Rejeitar Vínculo'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.action === 'accept' ? (
                <>
                  Tem certeza que deseja aceitar o vínculo com{' '}
                  <strong>{confirmDialog.request?.instructor.full_name || confirmDialog.request?.instructor.username}</strong>?
                  <br /><br />
                  O instrutor poderá criar treinos personalizados e acompanhar seu progresso.
                </>
              ) : (
                <>
                  Tem certeza que deseja rejeitar o pedido de{' '}
                  <strong>{confirmDialog.request?.instructor.full_name || confirmDialog.request?.instructor.username}</strong>?
                  <br /><br />
                  O instrutor será notificado da rejeição.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              className={confirmDialog.action === 'accept' 
                ? 'bg-green-500 hover:bg-green-600' 
                : 'bg-destructive hover:bg-destructive/90'
              }
            >
              {confirmDialog.action === 'accept' ? 'Sim, Aceitar' : 'Sim, Rejeitar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default FloatingLinkRequests;

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Check, X, Loader2, AlertCircle, Clock, Bell } from 'lucide-react';
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

const PendingLinkRequests: React.FC = () => {
  const { profile } = useAuth();
  const { playClickSound } = useAudio();
  const { sendLinkRequestNotification, permission, requestPermission, isSupported } = usePushNotifications();
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: 'accept' | 'reject';
    request: PendingRequest | null;
  }>({ open: false, action: 'accept', request: null });
  
  // Track known request IDs to detect new ones
  const knownRequestIds = useRef<Set<string>>(new Set());

  const fetchPendingRequests = async () => {
    if (!profile?.profile_id) return;

    try {
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

  const confirmAction = async () => {
    const { action, request } = confirmDialog;
    if (!request) return;

    setProcessing(request.id);
    setConfirmDialog({ open: false, action: 'accept', request: null });

    try {
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

      // Remove from list
      setRequests((prev) => prev.filter((r) => r.id !== request.id));
    } catch (err) {
      console.error('Error processing request:', err);
      toast.error('Erro ao processar solicitação.');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (requests.length === 0) {
    return null;
  }

  return (
    <>
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
                        disabled={processing === request.id}
                        className="bg-green-500 hover:bg-green-600"
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

      {/* Confirmation Dialog */}
      <AlertDialog 
        open={confirmDialog.open} 
        onOpenChange={(open) => !open && setConfirmDialog({ open: false, action: 'accept', request: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {confirmDialog.action === 'accept' ? (
                <Check className="h-5 w-5 text-green-500" />
              ) : (
                <X className="h-5 w-5 text-destructive" />
              )}
              {confirmDialog.action === 'accept' ? 'Aceitar Vínculo' : 'Rejeitar Vínculo'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.action === 'accept' ? (
                <>
                  Ao aceitar, o instrutor{' '}
                  <strong>{confirmDialog.request?.instructor.full_name || confirmDialog.request?.instructor.username}</strong>{' '}
                  poderá criar treinos e planos alimentares personalizados para você.
                </>
              ) : (
                <>
                  Tem certeza que deseja rejeitar a solicitação do instrutor{' '}
                  <strong>{confirmDialog.request?.instructor.full_name || confirmDialog.request?.instructor.username}</strong>?
                  O instrutor será notificado.
                </>
              )}
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
              {confirmDialog.action === 'accept' ? 'Sim, Aceitar' : 'Sim, Rejeitar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PendingLinkRequests;

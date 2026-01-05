import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, UserX, Loader2, AlertCircle, Bell, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useInstructorContext } from '@/hooks/useInstructorContext';
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

interface PendingStudent {
  id: string;
  client_id: string;
  linked_at: string;
  client: {
    username: string;
    full_name: string | null;
    email: string | null;
  };
}

const PendingStudents: React.FC = () => {
  const { profile } = useAuth();
  const { effectiveInstructorId, needsInstructorSelection, isMaster, selectedInstructor } = useInstructorContext();
  const { playClickSound } = useAudio();
  const { sendLinkResponseNotification, permission, requestPermission, isSupported } = usePushNotifications();
  const [pendingStudents, setPendingStudents] = useState<PendingStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    student: PendingStudent | null;
  }>({ open: false, student: null });
  
  // Track known student IDs to detect responses
  const knownStudentIds = useRef<Set<string>>(new Set());

  const fetchPendingStudents = async () => {
    if (!effectiveInstructorId) return;

    try {
      const { data, error } = await supabase
        .from('instructor_clients')
        .select(`
          id,
          client_id,
          linked_at,
          client:profiles!instructor_clients_client_id_fkey(
            username,
            full_name,
            email
          )
        `)
        .eq('instructor_id', effectiveInstructorId)
        .eq('link_status', 'pending')
        .eq('is_active', true);

      if (error) throw error;

      const transformedData = (data || []).map((item: any) => ({
        id: item.id,
        client_id: item.client_id,
        linked_at: item.linked_at,
        client: item.client,
      }));

      setPendingStudents(transformedData);
    } catch (err) {
      console.error('Error fetching pending students:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingStudents();

    // Subscribe to realtime updates
    if (effectiveInstructorId) {
      const channel = supabase
        .channel('instructor-pending-links')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'instructor_clients',
            filter: `instructor_id=eq.${effectiveInstructorId}`,
          },
          async (payload) => {
            const newData = payload.new as any;
            
            // Check if status changed from pending to accepted/rejected
            if (newData.link_status === 'accepted' || newData.link_status === 'rejected') {
              // Remove immediately from local state
              setPendingStudents((prev) => prev.filter((s) => s.id !== newData.id));
              
              // Find the student info for notification
              const { data: clientData } = await supabase
                .from('profiles')
                .select('full_name, username')
                .eq('id', newData.client_id)
                .maybeSingle();
              
              if (clientData) {
                const clientName = clientData.full_name || clientData.username;
                sendLinkResponseNotification(clientName, newData.link_status === 'accepted');
                
                // Show toast notification
                if (newData.link_status === 'accepted') {
                  toast.success(`${clientName} aceitou seu pedido de vínculo!`, {
                    icon: <CheckCircle className="h-5 w-5 text-green-500" />,
                  });
                } else {
                  toast.info(`${clientName} rejeitou seu pedido de vínculo.`, {
                    icon: <XCircle className="h-5 w-5 text-red-500" />,
                  });
                }
              }
            } else {
              fetchPendingStudents();
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'instructor_clients',
            filter: `instructor_id=eq.${effectiveInstructorId}`,
          },
          () => {
            fetchPendingStudents();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'instructor_clients',
            filter: `instructor_id=eq.${effectiveInstructorId}`,
          },
          () => {
            fetchPendingStudents();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [effectiveInstructorId, sendLinkResponseNotification]);

  const handleCancelRequest = (student: PendingStudent) => {
    playClickSound();
    setConfirmDialog({ open: true, student });
  };

  const confirmCancel = async () => {
    const { student } = confirmDialog;
    if (!student) return;

    setCanceling(student.id);
    setConfirmDialog({ open: false, student: null });

    try {
      const { error } = await supabase
        .from('instructor_clients')
        .delete()
        .eq('id', student.id);

      if (error) throw error;

      // Send notification to client - use the selected instructor name for masters
      const instructorName = isMaster && selectedInstructor 
        ? (selectedInstructor.full_name || selectedInstructor.username)
        : (profile?.full_name || profile?.username);
        
      await supabase.from('notifications').insert({
        profile_id: student.client_id,
        title: 'Solicitação Cancelada',
        message: `O instrutor ${instructorName} cancelou a solicitação de vínculo.`,
        type: 'link_cancelled',
      });

      toast.success('Solicitação cancelada.');
      setPendingStudents((prev) => prev.filter((s) => s.id !== student.id));
    } catch (err) {
      console.error('Error canceling request:', err);
      toast.error('Erro ao cancelar solicitação.');
    } finally {
      setCanceling(null);
    }
  };

  if (loading) {
    return null;
  }

  if (pendingStudents.length === 0) {
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
                AGUARDANDO CONFIRMAÇÃO ({pendingStudents.length})
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
                Alertar respostas
              </Button>
            )}
          </div>

          <p className="text-sm text-muted-foreground mb-3">
            Estes alunos precisam aceitar seu pedido de vínculo antes de você poder criar treinos para eles.
          </p>

          <div className="space-y-2">
            <AnimatePresence>
              {pendingStudents.map((student) => (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center justify-between bg-card/80 backdrop-blur-md rounded-lg p-3 border border-border/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center">
                      <span className="text-sm font-bebas text-yellow-500">
                        {(student.client.full_name || student.client.username).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm">
                        {student.client.full_name || student.client.username}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        @{student.client.username}
                      </p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleCancelRequest(student)}
                    disabled={canceling === student.id}
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    {canceling === student.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserX className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline ml-1">Cancelar</span>
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* Confirmation Dialog */}
      <AlertDialog 
        open={confirmDialog.open} 
        onOpenChange={(open) => !open && setConfirmDialog({ open: false, student: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <UserX className="h-5 w-5 text-destructive" />
              Cancelar Solicitação
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar a solicitação de vínculo com{' '}
              <strong>{confirmDialog.student?.client.full_name || confirmDialog.student?.client.username}</strong>?
              O aluno será notificado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancel}
              className="bg-destructive hover:bg-destructive/90"
            >
              Sim, Cancelar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PendingStudents;

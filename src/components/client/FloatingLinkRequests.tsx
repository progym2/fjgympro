import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Check, X, Loader2, Bell, ChevronDown, ChevronUp, User, AlertCircle, Eye, Award, MapPin, Phone, Mail, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAudio } from '@/contexts/AudioContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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

interface InstructorProfile {
  id: string;
  username: string;
  full_name: string | null;
  cref: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  avatar_url: string | null;
  created_at: string | null;
  fitness_level: string | null;
  student_count?: number;
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
  
  // Profile view modal
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedInstructor, setSelectedInstructor] = useState<InstructorProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  
  const knownRequestIds = useRef<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio('/audio/notification.mp3');
        audioRef.current.volume = 0.5;
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((e) => console.log('Audio play error:', e));
    } catch (error) {
      console.log('Error playing notification sound:', error);
    }
  }, []);

  const fetchInstructorProfile = async (instructorId: string) => {
    setLoadingProfile(true);
    try {
      // Fetch instructor profile
      const { data: instructorData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', instructorId)
        .single();

      if (error) throw error;

      // Fetch student count
      const { count } = await supabase
        .from('instructor_clients')
        .select('*', { count: 'exact', head: true })
        .eq('instructor_id', instructorId)
        .eq('link_status', 'accepted')
        .eq('is_active', true);

      setSelectedInstructor({
        ...instructorData,
        student_count: count || 0,
      });
      setProfileModalOpen(true);
    } catch (err) {
      console.error('Error fetching instructor profile:', err);
      toast.error('Erro ao carregar perfil do instrutor');
    } finally {
      setLoadingProfile(false);
    }
  };

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

      // Check for new requests (for push notification and sound)
      const newRequests = transformedData.filter(
        (req: PendingRequest) => !knownRequestIds.current.has(req.id)
      );
      
      if (!loading && newRequests.length > 0) {
        // Play notification sound for new requests
        playNotificationSound();
        
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

  const handleViewProfile = (request: PendingRequest) => {
    playClickSound();
    fetchInstructorProfile(request.instructor_id);
  };

  const confirmAction = async () => {
    const { action, request } = confirmDialog;
    if (!request || !profile?.profile_id) return;

    setProcessing(request.id);
    setConfirmDialog({ open: false, action: 'accept', request: null });

    try {
      // If accepting, deactivate any existing links first
      if (action === 'accept') {
        // Deactivate all existing active links (accepted or pending from other instructors)
        const { data: existingLinks, error: fetchError } = await supabase
          .from('instructor_clients')
          .select('id, instructor_id, link_status, instructor:profiles!instructor_clients_instructor_id_fkey(full_name, username)')
          .eq('client_id', profile.profile_id)
          .eq('is_active', true)
          .neq('id', request.id);

        if (fetchError) throw fetchError;

        if (existingLinks && existingLinks.length > 0) {
          // Deactivate all existing links
          const { error: deactivateError } = await supabase
            .from('instructor_clients')
            .update({
              is_active: false,
              unlinked_at: new Date().toISOString(),
            })
            .eq('client_id', profile.profile_id)
            .eq('is_active', true)
            .neq('id', request.id);

          if (deactivateError) throw deactivateError;

          // Notify previous instructors about automatic deactivation
          const acceptedLinks = existingLinks.filter(link => link.link_status === 'accepted');
          for (const link of acceptedLinks) {
            const instructorName = (link.instructor as any)?.full_name || (link.instructor as any)?.username;
            await supabase.from('notifications').insert({
              profile_id: link.instructor_id,
              title: 'Vínculo Desativado',
              message: `O cliente ${profile?.full_name || profile?.username} aceitou outro instrutor e seu vínculo foi desativado automaticamente.`,
              type: 'link_deactivated',
            });

            if (instructorName) {
              console.log(`Vínculo com ${instructorName} desativado automaticamente`);
            }
          }
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

      // Remove immediately from local state
      setRequests((prev) => prev.filter((r) => r.id !== request.id));
      
      if (action === 'accept') {
        setHasCurrentInstructor(true);
        // Remove from known IDs so it won't trigger sound if re-fetched
        knownRequestIds.current.delete(request.id);
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
                  {/* Info if already has instructor */}
                  {hasCurrentInstructor && (
                    <div className="p-2 bg-blue-500/30 rounded-lg">
                      <div className="flex items-start gap-2 text-white">
                        <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        <p className="text-xs">
                          Ao aceitar um novo instrutor, o vínculo anterior será desativado automaticamente.
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
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-white/30 flex items-center justify-center flex-shrink-0">
                            <User className="w-5 h-5 text-white" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-white font-semibold text-sm truncate">
                              {request.instructor.full_name || request.instructor.username}
                            </p>
                            <p className="text-white/70 text-xs truncate">
                              @{request.instructor.username}
                              {request.instructor.cref && ` • CREF: ${request.instructor.cref}`}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          {/* View Profile Button */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleViewProfile(request)}
                            disabled={loadingProfile}
                            className="h-8 w-8 p-0 bg-blue-500/30 hover:bg-blue-500/50 text-white"
                            title="Ver Perfil"
                          >
                            {loadingProfile ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
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
                            disabled={processing === request.id}
                            className="h-8 bg-green-500 hover:bg-green-600 text-white px-2"
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

      {/* Instructor Profile Modal */}
      <Dialog open={profileModalOpen} onOpenChange={setProfileModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Perfil do Instrutor
            </DialogTitle>
          </DialogHeader>
          
          {selectedInstructor && (
            <div className="space-y-4">
              {/* Avatar and Basic Info */}
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white text-2xl font-bold">
                  {selectedInstructor.avatar_url ? (
                    <img 
                      src={selectedInstructor.avatar_url} 
                      alt="Avatar" 
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    (selectedInstructor.full_name || selectedInstructor.username).charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold">
                    {selectedInstructor.full_name || selectedInstructor.username}
                  </h3>
                  <p className="text-muted-foreground text-sm">@{selectedInstructor.username}</p>
                  {selectedInstructor.cref && (
                    <Badge variant="secondary" className="mt-1">
                      <Award className="h-3 w-3 mr-1" />
                      CREF: {selectedInstructor.cref}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-primary">{selectedInstructor.student_count || 0}</p>
                  <p className="text-xs text-muted-foreground">Alunos Ativos</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-primary">
                    {selectedInstructor.created_at 
                      ? Math.floor((Date.now() - new Date(selectedInstructor.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30))
                      : 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Meses na Plataforma</p>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-muted-foreground">Informações de Contato</h4>
                
                {selectedInstructor.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedInstructor.email}</span>
                  </div>
                )}
                
                {selectedInstructor.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedInstructor.phone}</span>
                  </div>
                )}
                
                {selectedInstructor.city && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedInstructor.city}</span>
                  </div>
                )}

                {selectedInstructor.created_at && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Membro desde {format(new Date(selectedInstructor.created_at), "MMMM 'de' yyyy", { locale: ptBR })}</span>
                  </div>
                )}
              </div>

              {/* Fitness Level */}
              {selectedInstructor.fitness_level && (
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground mb-1">Especialização</h4>
                  <Badge>{selectedInstructor.fitness_level}</Badge>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

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

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserMinus, ArrowLeft, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Instructor {
  link_id: string;
  id: string;
  full_name: string;
  username: string;
  phone: string | null;
  cref: string | null;
}

const UnlinkInstructor: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlinking, setUnlinking] = useState(false);
  const [selectedInstructor, setSelectedInstructor] = useState<Instructor | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [unlinkReason, setUnlinkReason] = useState('');

  useEffect(() => {
    if (profile) {
      fetchInstructors();
    }
  }, [profile]);

  const fetchInstructors = async () => {
    try {
      const { data, error } = await supabase
        .from('instructor_clients')
        .select(`
          id,
          instructor_id,
          profiles!instructor_clients_instructor_id_fkey (
            id,
            username,
            full_name,
            phone,
            cref
          )
        `)
        .eq('client_id', profile?.profile_id)
        .eq('is_active', true);

      if (error) throw error;

      const mapped = data?.map((item: any) => ({
        link_id: item.id,
        id: item.profiles?.id,
        full_name: item.profiles?.full_name || 'Sem nome',
        username: item.profiles?.username,
        phone: item.profiles?.phone,
        cref: item.profiles?.cref
      })) || [];

      setInstructors(mapped);
    } catch (error) {
      console.error('Error fetching instructors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlink = async () => {
    if (!selectedInstructor) return;

    setUnlinking(true);
    try {
      const { error } = await supabase
        .from('instructor_clients')
        .update({ 
          is_active: false,
          unlinked_at: new Date().toISOString()
        })
        .eq('id', selectedInstructor.link_id);

      if (error) throw error;

      // Build notification message with reason if provided
      const reasonText = unlinkReason.trim() 
        ? `\n\nMotivo informado: "${unlinkReason.trim()}"` 
        : '';

      // Notify the instructor about the unlink
      await supabase.from('notifications').insert({
        profile_id: selectedInstructor.id,
        title: 'Aluno Desvinculado',
        message: `O aluno ${profile?.full_name || profile?.username} se desvinculou da sua conta.${reasonText}`,
        type: 'unlink'
      });

      toast.success('Desvinculado com sucesso!');
      setInstructors(instructors.filter(i => i.link_id !== selectedInstructor.link_id));
      setShowConfirm(false);
      setSelectedInstructor(null);
      setUnlinkReason('');
    } catch (error) {
      console.error('Error unlinking:', error);
      toast.error('Erro ao desvincular');
    } finally {
      setUnlinking(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UserMinus className="w-6 h-6 text-red-500" />
          <h2 className="text-2xl font-bebas text-red-500 tracking-wider">DESVINCULAR INSTRUTOR</h2>
        </div>
        <Button variant="ghost" onClick={() => navigate('/client')}>
          <ArrowLeft size={18} className="mr-2" /> Voltar
        </Button>
      </div>

      {/* Warning */}
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-yellow-500 font-medium">Atenção</p>
          <p className="text-sm text-muted-foreground">
            Ao desvincular um instrutor, você perderá acesso aos planos de treino e alimentação 
            criados por ele. Esta ação não pode ser desfeita automaticamente.
          </p>
          <p className="text-sm text-yellow-500 font-medium mt-2">
            Importante: Você só pode estar vinculado a um instrutor por vez.
          </p>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : instructors.length === 0 ? (
        <div className="bg-card/80 backdrop-blur-md rounded-xl p-8 border border-border/50 text-center">
          <UserMinus className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Você não está vinculado a nenhum instrutor</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {instructors.map((instructor) => (
            <Card key={instructor.link_id} className="bg-card/80 backdrop-blur-md border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bebas tracking-wider flex items-center justify-between">
                  <span>{instructor.full_name}</span>
                  {instructor.cref && (
                    <span className="text-xs bg-green-500/20 text-green-500 px-2 py-1 rounded">
                      CREF: {instructor.cref}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    <p>@{instructor.username}</p>
                    {instructor.phone && <p>{instructor.phone}</p>}
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setSelectedInstructor(instructor);
                      setShowConfirm(true);
                    }}
                  >
                    <UserMinus size={18} className="mr-2" />
                    Desvincular
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={(open) => { setShowConfirm(open); if (!open) setUnlinkReason(''); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Desvinculação</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  Tem certeza que deseja desvincular o instrutor{' '}
                  <strong>{selectedInstructor?.full_name}</strong>?
                </p>
                <p>
                  Você perderá acesso aos planos de treino e alimentação criados por este instrutor.
                </p>
                
                <div className="space-y-2 pt-2">
                  <Label htmlFor="unlink-reason" className="text-foreground">
                    Motivo da desvinculação (opcional)
                  </Label>
                  <Textarea
                    id="unlink-reason"
                    placeholder="Informe o motivo para ajudar o instrutor a melhorar..."
                    value={unlinkReason}
                    onChange={(e) => setUnlinkReason(e.target.value)}
                    className="min-h-[80px]"
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground">
                    O instrutor será notificado sobre a desvinculação{unlinkReason.trim() ? ' com o motivo informado' : ''}.
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unlinking}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleUnlink();
              }}
              disabled={unlinking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {unlinking ? 'Desvinculando...' : 'Confirmar Desvinculação'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

export default UnlinkInstructor;

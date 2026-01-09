import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Share2, MessageCircle, Mail, Loader2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { sendPdfViaEmail } from '@/lib/nutritionPdfExport';

interface SharePdfDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pdfDoc: jsPDF | null;
  filename: string;
  messageType: 'meal_plan' | 'nutrition_report';
  senderName?: string;
  onWhatsAppShare: () => void;
}

const SharePdfDialog: React.FC<SharePdfDialogProps> = ({
  open,
  onOpenChange,
  pdfDoc,
  filename,
  messageType,
  senderName = '',
  onWhatsAppShare,
}) => {
  const [shareMethod, setShareMethod] = useState<'select' | 'whatsapp' | 'email'>('select');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleWhatsAppShare = () => {
    onWhatsAppShare();
    onOpenChange(false);
    toast.success('Abrindo WhatsApp...');
  };

  const handleEmailSend = async () => {
    if (!recipientEmail) {
      toast.error('Digite o email do destinatário');
      return;
    }

    if (!pdfDoc) {
      toast.error('PDF não disponível');
      return;
    }

    setSending(true);

    const result = await sendPdfViaEmail(
      pdfDoc,
      filename,
      recipientEmail,
      recipientName,
      senderName,
      messageType
    );

    setSending(false);

    if (result.success) {
      setSent(true);
      toast.success('Email enviado com sucesso!');
      setTimeout(() => {
        onOpenChange(false);
        setShareMethod('select');
        setRecipientEmail('');
        setRecipientName('');
        setSent(false);
      }, 2000);
    } else {
      toast.error(result.error || 'Erro ao enviar email');
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setShareMethod('select');
    setRecipientEmail('');
    setRecipientName('');
    setSent(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-bebas text-xl">
            <Share2 className="w-5 h-5 text-orange-500" />
            COMPARTILHAR {messageType === 'meal_plan' ? 'CARDÁPIO' : 'RELATÓRIO'}
          </DialogTitle>
          <DialogDescription>
            Escolha como deseja compartilhar o documento
          </DialogDescription>
        </DialogHeader>

        {shareMethod === 'select' && (
          <div className="grid grid-cols-2 gap-4 mt-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleWhatsAppShare}
              className="flex flex-col items-center gap-3 p-6 bg-gradient-to-br from-green-500/10 to-green-600/10 rounded-xl border border-green-500/30 hover:border-green-500/50 transition-all"
            >
              <div className="p-3 bg-green-500/20 rounded-full">
                <MessageCircle className="w-8 h-8 text-green-500" />
              </div>
              <div className="text-center">
                <p className="font-medium">WhatsApp</p>
                <p className="text-xs text-muted-foreground">Enviar resumo</p>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShareMethod('email')}
              className="flex flex-col items-center gap-3 p-6 bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-xl border border-blue-500/30 hover:border-blue-500/50 transition-all"
            >
              <div className="p-3 bg-blue-500/20 rounded-full">
                <Mail className="w-8 h-8 text-blue-500" />
              </div>
              <div className="text-center">
                <p className="font-medium">Email</p>
                <p className="text-xs text-muted-foreground">Enviar PDF completo</p>
              </div>
            </motion.button>
          </div>
        )}

        {shareMethod === 'email' && !sent && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 mt-4"
          >
            <div className="space-y-2">
              <Label htmlFor="recipientEmail">Email do Nutricionista *</Label>
              <Input
                id="recipientEmail"
                type="email"
                placeholder="nutricionista@email.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                disabled={sending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipientName">Nome do Destinatário (opcional)</Label>
              <Input
                id="recipientName"
                type="text"
                placeholder="Dr. João Silva"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                disabled={sending}
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShareMethod('select')}
                disabled={sending}
                className="flex-1"
              >
                <X className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <Button
                onClick={handleEmailSend}
                disabled={sending || !recipientEmail}
                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Enviar
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}

        {sent && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-8"
          >
            <div className="p-4 bg-green-500/20 rounded-full mb-4">
              <Check className="w-12 h-12 text-green-500" />
            </div>
            <p className="text-lg font-medium text-green-500">Email enviado!</p>
            <p className="text-sm text-muted-foreground">
              O PDF foi enviado para {recipientEmail}
            </p>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SharePdfDialog;

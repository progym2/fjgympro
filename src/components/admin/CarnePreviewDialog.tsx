import React from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, Printer, Save, X, CheckCircle, Clock,
  QrCode, Calendar, DollarSign, User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatCurrency } from '@/lib/printUtils';
import { format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CarnePreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: {
    clientName: string;
    studentId?: string;
    totalAmount: number;
    installments: number;
    installmentAmount: number;
    discount: number;
    startDate: string;
    description?: string;
    pixKey?: string;
  } | null;
  onSave: () => void;
  onPrint: () => void;
  saving?: boolean;
}

const CarnePreviewDialog: React.FC<CarnePreviewProps> = ({
  open,
  onOpenChange,
  data,
  onSave,
  onPrint,
  saving = false,
}) => {
  if (!data) return null;

  // Generate payment schedule
  const payments = Array.from({ length: data.installments }, (_, i) => ({
    number: i + 1,
    dueDate: format(addMonths(new Date(data.startDate), i), 'dd/MM/yyyy'),
    status: 'pending',
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="text-blue-500" /> Visualização do Carnê
          </DialogTitle>
          <DialogDescription>
            Revise os dados antes de salvar e imprimir
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            {/* Header Preview */}
            <div className="bg-gradient-to-r from-primary/20 to-orange-500/20 p-4 rounded-lg text-center border border-primary/30">
              <h3 className="text-2xl font-bebas text-primary">FRANCGYMPRO</h3>
              <p className="text-sm font-semibold">CARNÊ DE PAGAMENTO</p>
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(), "dd/MM/yyyy", { locale: ptBR })}
              </p>
            </div>

            {/* Client Info */}
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-primary" />
                <span className="font-semibold">{data.clientName}</span>
              </div>
              {data.studentId && (
                <p className="text-xs text-muted-foreground">
                  Matrícula: {data.studentId}
                </p>
              )}
              {data.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {data.description}
                </p>
              )}
            </div>

            {/* Summary */}
            <div className="bg-yellow-500/10 p-4 rounded-lg border border-yellow-500/30 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Valor Total:</span>
                <strong className="text-primary">{formatCurrency(data.totalAmount)}</strong>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Parcelas:</span>
                <span>{data.installments}x de {formatCurrency(data.installmentAmount)}</span>
              </div>
              {data.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Desconto:</span>
                  <span className="text-green-500">{data.discount}%</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Início:</span>
                <span>{format(new Date(data.startDate), 'dd/MM/yyyy')}</span>
              </div>
            </div>

            {/* PIX Info */}
            {data.pixKey && (
              <div className="bg-purple-500/10 p-4 rounded-lg border border-purple-500/30 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <QrCode className="w-4 h-4 text-purple-500" />
                  <span className="font-semibold text-sm">PAGUE COM PIX</span>
                </div>
                <div className="w-24 h-24 mx-auto bg-white rounded-lg flex items-center justify-center">
                  <QrCode className="w-16 h-16 text-gray-400" />
                </div>
                <p className="text-xs text-muted-foreground mt-2 break-all">
                  Chave: {data.pixKey}
                </p>
              </div>
            )}

            {/* Installments Preview */}
            <div>
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                PARCELAS ({data.installments})
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {payments.map((p) => (
                  <div
                    key={p.number}
                    className="p-2 bg-background/50 border border-border rounded-lg text-center"
                  >
                    <p className="text-xs font-semibold">Parcela {p.number}/{data.installments}</p>
                    <p className="text-sm font-bold text-primary">{formatCurrency(data.installmentAmount)}</p>
                    <p className="text-xs text-muted-foreground">Venc: {p.dueDate}</p>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <Clock size={10} className="text-yellow-500" />
                      <span className="text-[10px] text-yellow-500">Pendente</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-xs text-muted-foreground border-t border-border pt-4">
              <p>Mantenha suas parcelas em dia.</p>
              <p>Documento válido como comprovante.</p>
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X size={16} className="mr-1" /> Cancelar
          </Button>
          <Button
            onClick={() => onSave()}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {saving ? (
              <>Salvando...</>
            ) : (
              <>
                <Save size={16} className="mr-1" /> Salvar
              </>
            )}
          </Button>
          <Button
            onClick={() => onPrint()}
            disabled={saving}
            className="bg-green-600 hover:bg-green-700"
          >
            <Printer size={16} className="mr-1" /> Salvar e Imprimir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CarnePreviewDialog;

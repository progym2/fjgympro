import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Trash2, RotateCcw, Clock, RefreshCw, AlertTriangle, Database, User, Key, CreditCard, ArrowLeft } from "lucide-react";
import { formatDistanceToNow, format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAudio } from "@/contexts/AudioContext";
import { useEscapeBack } from "@/hooks/useEscapeBack";

interface TrashItem {
  id: string;
  original_table: string;
  original_id: string;
  item_data: any;
  deleted_by: string | null;
  deleted_at: string;
  auto_purge_at: string;
  permanently_deleted_at: string | null;
}

const TABLE_LABELS: Record<string, { label: string; icon: React.ComponentType<any> }> = {
  profiles: { label: "Perfil", icon: User },
  master_credentials: { label: "Credencial Master", icon: Key },
  licenses: { label: "Licença", icon: CreditCard },
  pre_generated_accounts: { label: "Conta Pré-Gerada", icon: Database },
};

export function TrashBin() {
  const navigate = useNavigate();
  const { playClickSound } = useAudio();
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoreConfirm, setRestoreConfirm] = useState<TrashItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<TrashItem | null>(null);
  const [purgeAllConfirm, setPurgeAllConfirm] = useState(false);

  // ESC para voltar ao menu admin (desabilitado quando há dialogs abertos)
  useEscapeBack({ 
    to: '/admin', 
    disableWhen: [restoreConfirm !== null, deleteConfirm !== null, purgeAllConfirm] 
  });

  const fetchTrashItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("deleted_items_trash")
        .select("*")
        .is("permanently_deleted_at", null)
        .order("deleted_at", { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar lixeira",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrashItems();
  }, []);

  const handleRestore = async (item: TrashItem) => {
    try {
      // Re-insert into original table
      const { error: insertError } = await supabase
        .from(item.original_table as any)
        .insert(item.item_data);

      if (insertError) throw insertError;

      // Mark as restored in trash
      const { error: updateError } = await supabase
        .from("deleted_items_trash")
        .update({ 
          restore_attempted_at: new Date().toISOString(),
          permanently_deleted_at: new Date().toISOString() 
        })
        .eq("id", item.id);

      if (updateError) throw updateError;

      toast({ title: "Item restaurado com sucesso!" });
      setRestoreConfirm(null);
      fetchTrashItems();
    } catch (error: any) {
      toast({
        title: "Erro ao restaurar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handlePermanentDelete = async (item: TrashItem) => {
    try {
      const { error } = await supabase
        .from("deleted_items_trash")
        .update({ permanently_deleted_at: new Date().toISOString() })
        .eq("id", item.id);

      if (error) throw error;

      toast({ title: "Item removido permanentemente!" });
      setDeleteConfirm(null);
      fetchTrashItems();
    } catch (error: any) {
      toast({
        title: "Erro ao remover",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handlePurgeAll = async () => {
    try {
      const { error } = await supabase
        .from("deleted_items_trash")
        .update({ permanently_deleted_at: new Date().toISOString() })
        .is("permanently_deleted_at", null);

      if (error) throw error;

      toast({ title: "Lixeira esvaziada!" });
      setPurgeAllConfirm(false);
      fetchTrashItems();
    } catch (error: any) {
      toast({
        title: "Erro ao esvaziar lixeira",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getItemName = (item: TrashItem): string => {
    const data = item.item_data;
    return data.username || data.full_name || data.license_key || data.id || "Item";
  };

  const getDaysRemaining = (purgeAt: string): number => {
    return differenceInDays(new Date(purgeAt), new Date());
  };

  const getTableInfo = (table: string) => {
    return TABLE_LABELS[table] || { label: table, icon: Database };
  };

  return (
    <Card className="border-orange-500/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => { playClickSound(); navigate('/admin'); }}
              className="mr-1"
            >
              <ArrowLeft size={18} />
            </Button>
            <Trash2 className="h-5 w-5 text-orange-500" />
            <CardTitle className="text-xl">Lixeira</CardTitle>
            <Badge variant="outline" className="ml-2">
              {items.length} {items.length === 1 ? "item" : "itens"}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchTrashItems} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            {items.length > 0 && (
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => setPurgeAllConfirm(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Esvaziar Lixeira
              </Button>
            )}
          </div>
        </div>
        <CardDescription>
          Itens excluídos são mantidos por 30 dias antes da remoção automática. Você pode restaurar ou excluir permanentemente.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Trash2 className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>A lixeira está vazia</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Excluído em</TableHead>
                <TableHead>Expira em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const tableInfo = getTableInfo(item.original_table);
                const IconComponent = tableInfo.icon;
                const daysRemaining = getDaysRemaining(item.auto_purge_at);
                
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <IconComponent className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{tableInfo.label}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {getItemName(item)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(item.deleted_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={daysRemaining <= 7 ? "destructive" : "secondary"}
                        className="flex items-center gap-1 w-fit"
                      >
                        <Clock className="h-3 w-3" />
                        {daysRemaining <= 0 ? "Hoje" : `${daysRemaining} dias`}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-green-600 hover:text-green-700 hover:bg-green-100"
                          onClick={() => setRestoreConfirm(item)}
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Restaurar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteConfirm(item)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Excluir
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {/* Restore Confirmation */}
        <AlertDialog open={!!restoreConfirm} onOpenChange={() => setRestoreConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Restaurar item</AlertDialogTitle>
              <AlertDialogDescription>
                Deseja restaurar "{restoreConfirm && getItemName(restoreConfirm)}"? 
                O item será reinserido na tabela original.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-green-600 hover:bg-green-700"
                onClick={() => restoreConfirm && handleRestore(restoreConfirm)}
              >
                Restaurar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Permanent Delete Confirmation */}
        <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Exclusão Permanente
              </AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir permanentemente "{deleteConfirm && getItemName(deleteConfirm)}"? 
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => deleteConfirm && handlePermanentDelete(deleteConfirm)}
              >
                Excluir Permanentemente
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Purge All Confirmation */}
        <AlertDialog open={purgeAllConfirm} onOpenChange={setPurgeAllConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Esvaziar Lixeira
              </AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir permanentemente todos os {items.length} itens da lixeira? 
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handlePurgeAll}
              >
                Esvaziar Lixeira
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

export default TrashBin;
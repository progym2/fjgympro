import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Key, User, Eye, EyeOff, RefreshCw, Shield, ArrowLeft } from "lucide-react";
import { useEscapeBack } from "@/hooks/useEscapeBack";
import { useAudio } from "@/contexts/AudioContext";

interface MasterCredential {
  id: string;
  username: string;
  full_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function MasterCredentials() {
  const navigate = useNavigate();
  const { playClickSound } = useAudio();
  const [credentials, setCredentials] = useState<MasterCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCredential, setEditingCredential] = useState<MasterCredential | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});

  // ESC para voltar ao menu admin (desabilitado quando há dialog aberto)
  useEscapeBack({ to: '/admin', disableWhen: [isDialogOpen, deleteConfirm !== null] });
  
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    full_name: "",
    is_active: true,
  });

  const fetchCredentials = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("master_credentials")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) throw error;
      setCredentials(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar credenciais",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCredentials();
  }, []);

  const resetForm = () => {
    setFormData({ username: "", password: "", full_name: "", is_active: true });
    setEditingCredential(null);
  };

  const openEditDialog = (credential: MasterCredential) => {
    setEditingCredential(credential);
    setFormData({
      username: credential.username,
      password: "", // Senha não é mais retornada do banco (hash)
      full_name: credential.full_name || "",
      is_active: credential.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.username.trim()) {
      toast({
        title: "Dados incompletos",
        description: "O nome de usuário é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    // Senha obrigatória apenas ao criar novo
    if (!editingCredential && !formData.password.trim()) {
      toast({
        title: "Dados incompletos",
        description: "A senha é obrigatória para novas credenciais.",
        variant: "destructive",
      });
      return;
    }

    const usernameNormalized = formData.username.toLowerCase().trim();

    try {
      // Check for duplicate username
      const existingUsername = credentials.find(
        (c) => c.username === usernameNormalized && c.id !== editingCredential?.id
      );
      
      if (existingUsername) {
        toast({
          title: "Usuário já existe",
          description: `O usuário "${usernameNormalized}" já está cadastrado. Escolha outro nome.`,
          variant: "destructive",
        });
        return;
      }

      if (editingCredential) {
        // Update existing - só atualiza senha se foi fornecida
        const updateData: Record<string, unknown> = {
          username: usernameNormalized,
          full_name: formData.full_name.trim() || null,
          is_active: formData.is_active,
        };
        
        // Se nova senha fornecida, usar RPC para atualizar com hash
        if (formData.password.trim()) {
          const { error: hashError } = await (supabase.rpc as any)('update_master_password', {
            p_credential_id: editingCredential.id,
            p_new_password: formData.password.trim()
          });
          
          if (hashError) {
            console.warn('Hash update failed:', hashError);
          }
        }
        
        const { error } = await supabase
          .from("master_credentials")
          .update(updateData)
          .eq("id", editingCredential.id);

        if (error) throw error;
        toast({ title: "Credencial atualizada com sucesso!" });
      } else {
        // Create new - usar RPC para criar com hash
        const { error } = await (supabase.rpc as any)('create_master_credential', {
          p_username: usernameNormalized,
          p_password: formData.password.trim(),
          p_full_name: formData.full_name.trim() || null,
          p_is_active: formData.is_active
        });

        if (error) {
          if (error.code === '23505') {
            toast({
              title: "Usuário já existe",
              description: `O usuário "${usernameNormalized}" já está cadastrado.`,
              variant: "destructive",
            });
            return;
          }
          throw error;
        }
        toast({ title: "Credencial criada com sucesso!" });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchCredentials();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    const credToDelete = credentials.find((c) => c.id === id);
    if (!credToDelete) return;

    try {
      // Get current session for auth
      const { data: { session } } = await supabase.auth.getSession();
      
      // Use edge function for complete cleanup
      const { data, error } = await supabase.functions.invoke("admin-cleanup-user", {
        body: {
          type: "master_credential",
          id,
          username: credToDelete.username,
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro desconhecido");

      toast({
        title: "Credencial removida com sucesso!",
        description: `Dados limpos: ${data.cleaned?.join(", ") || "credencial"}`,
      });
      setDeleteConfirm(null);
      fetchCredentials();
    } catch (error: any) {
      toast({
        title: "Erro ao remover",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleActive = async (credential: MasterCredential) => {
    try {
      const { error } = await supabase
        .from("master_credentials")
        .update({ is_active: !credential.is_active })
        .eq("id", credential.id);

      if (error) throw error;
      toast({ 
        title: credential.is_active ? "Credencial desativada" : "Credencial ativada" 
      });
      fetchCredentials();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const togglePasswordVisibility = (id: string) => {
    setShowPassword(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-xl">Credenciais Master</CardTitle>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchCredentials} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Credencial
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingCredential ? "Editar Credencial Master" : "Nova Credencial Master"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingCredential 
                      ? "Atualize os dados da credencial master."
                      : "Crie uma nova credencial para acesso ao painel master."
                    }
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">
                      <User className="h-4 w-4 inline mr-1" />
                      Usuário
                    </Label>
                    <Input
                      id="username"
                      placeholder="nome_usuario"
                      value={formData.username}
                      onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">
                      <Key className="h-4 w-4 inline mr-1" />
                      Senha
                    </Label>
                    <Input
                      id="password"
                      type="text"
                      placeholder="senha_segura"
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Nome Completo (opcional)</Label>
                    <Input
                      id="full_name"
                      placeholder="Nome do Administrador"
                      value={formData.full_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="is_active">Ativo</Label>
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSubmit}>
                    {editingCredential ? "Atualizar" : "Criar"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <CardDescription>
          Gerencie as credenciais de acesso ao painel Master. Estas credenciais têm acesso total a todos os painéis.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : credentials.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma credencial master cadastrada.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Atualizado</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {credentials.map((cred) => (
                <TableRow key={cred.id}>
                  <TableCell className="font-medium">{cred.username}</TableCell>
                  <TableCell>{cred.full_name || "-"}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={cred.is_active ? "default" : "secondary"}
                      className="cursor-pointer"
                      onClick={() => toggleActive(cred)}
                    >
                      {cred.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(cred.updated_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditDialog(cred)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteConfirm(cred.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja remover esta credencial master? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              >
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

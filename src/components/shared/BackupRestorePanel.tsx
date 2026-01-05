import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Download, Upload, Save, Cloud, RefreshCw, 
  HardDrive, Check, AlertCircle, Loader2, FileJson,
  CloudUpload, CloudDownload, LogOut
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  exportUserData,
  downloadBackup,
  readBackupFile,
  saveBackupLocally,
  loadLocalBackup,
  getLocalBackupInfo,
  restoreWeightRecords,
  restoreHydrationRecords,
} from '@/lib/backupUtils';
import {
  isGoogleDriveAvailable,
  initGoogleDrive,
  requestGoogleAuth,
  uploadBackupToDrive,
  listDriveBackups,
  downloadBackupFromDrive,
  isGoogleAuthenticated,
  signOutGoogle,
} from '@/lib/googleDriveIntegration';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const BackupRestorePanel: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isSavingLocal, setIsSavingLocal] = useState(false);
  const [localBackupInfo, setLocalBackupInfo] = useState<{ savedAt: string } | null>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [pendingBackup, setPendingBackup] = useState<any>(null);
  
  // Google Drive states
  const [googleDriveAvailable, setGoogleDriveAvailable] = useState(false);
  const [googleAuthenticated, setGoogleAuthenticated] = useState(false);
  const [driveBackups, setDriveBackups] = useState<{ id: string; name: string; modifiedTime: string }[]>([]);
  const [selectedDriveBackup, setSelectedDriveBackup] = useState<string>('');
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [isLoadingDriveBackups, setIsLoadingDriveBackups] = useState(false);

  // Load local backup info and check Google Drive on mount
  useEffect(() => {
    if (profile?.id) {
      getLocalBackupInfo(profile.id).then(setLocalBackupInfo).catch(console.error);
    }
    
    // Check Google Drive availability
    const checkGoogleDrive = async () => {
      if (isGoogleDriveAvailable()) {
        const initialized = await initGoogleDrive();
        setGoogleDriveAvailable(initialized);
        setGoogleAuthenticated(isGoogleAuthenticated());
      }
    };
    checkGoogleDrive();
  }, [profile?.id]);

  // Export and download backup
  const handleExport = async () => {
    if (!profile?.id) return;
    
    setIsExporting(true);
    try {
      const backup = await exportUserData(profile.id);
      if (backup) {
        downloadBackup(backup);
        toast({
          title: 'Backup exportado!',
          description: 'Arquivo de backup baixado com sucesso.',
        });
      } else {
        throw new Error('Falha ao exportar dados');
      }
    } catch (error) {
      toast({
        title: 'Erro ao exportar',
        description: 'Não foi possível exportar os dados.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Save backup locally (IndexedDB)
  const handleSaveLocal = async () => {
    if (!profile?.id) return;
    
    setIsSavingLocal(true);
    try {
      const backup = await exportUserData(profile.id);
      if (backup) {
        await saveBackupLocally(backup);
        const info = await getLocalBackupInfo(profile.id);
        setLocalBackupInfo(info);
        toast({
          title: 'Backup salvo!',
          description: 'Seus dados foram salvos localmente para acesso offline.',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar o backup local.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingLocal(false);
    }
  };

  // Handle file selection for import
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const backup = await readBackupFile(file);
      setPendingBackup(backup);
      setConfirmRestore(true);
    } catch (error: any) {
      toast({
        title: 'Erro ao ler arquivo',
        description: error.message || 'Arquivo de backup inválido.',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Confirm and execute restore
  const handleConfirmRestore = async () => {
    if (!profile?.id || !pendingBackup) return;
    
    setIsImporting(true);
    try {
      let restoredCount = 0;
      
      // Restore weight records
      if (pendingBackup.data.weightRecords?.length) {
        const count = await restoreWeightRecords(profile.id, pendingBackup.data.weightRecords);
        restoredCount += count;
      }
      
      // Restore hydration records
      if (pendingBackup.data.hydrationRecords?.length) {
        const count = await restoreHydrationRecords(profile.id, pendingBackup.data.hydrationRecords);
        restoredCount += count;
      }
      
      toast({
        title: 'Dados restaurados!',
        description: `${restoredCount} registros foram restaurados com sucesso.`,
      });
    } catch (error) {
      toast({
        title: 'Erro ao restaurar',
        description: 'Ocorreu um erro ao restaurar os dados.',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
      setConfirmRestore(false);
      setPendingBackup(null);
    }
  };

  // Restore from local backup
  const handleRestoreLocal = async () => {
    if (!profile?.id) return;
    
    try {
      const backup = await loadLocalBackup(profile.id);
      if (backup) {
        setPendingBackup(backup);
        setConfirmRestore(true);
      } else {
        toast({
          title: 'Nenhum backup local',
          description: 'Não há backup salvo localmente.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro ao carregar',
        description: 'Não foi possível carregar o backup local.',
        variant: 'destructive',
      });
    }
  };

  // Google Drive: Connect
  const handleConnectGoogleDrive = async () => {
    try {
      await requestGoogleAuth();
      setGoogleAuthenticated(true);
      await loadDriveBackups();
      toast({
        title: 'Conectado ao Google Drive!',
        description: 'Você pode agora sincronizar seus backups.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao conectar',
        description: 'Não foi possível conectar ao Google Drive.',
        variant: 'destructive',
      });
    }
  };

  // Google Drive: Disconnect
  const handleDisconnectGoogleDrive = () => {
    signOutGoogle();
    setGoogleAuthenticated(false);
    setDriveBackups([]);
    toast({
      title: 'Desconectado',
      description: 'Você foi desconectado do Google Drive.',
    });
  };

  // Google Drive: Load backups
  const loadDriveBackups = async () => {
    setIsLoadingDriveBackups(true);
    try {
      const backups = await listDriveBackups();
      setDriveBackups(backups);
    } catch (error) {
      console.error('Error loading drive backups:', error);
    } finally {
      setIsLoadingDriveBackups(false);
    }
  };

  // Google Drive: Upload backup
  const handleUploadToDrive = async () => {
    if (!profile?.id) return;
    
    setIsUploadingToDrive(true);
    try {
      const backup = await exportUserData(profile.id);
      if (backup) {
        await uploadBackupToDrive(backup);
        await loadDriveBackups();
        toast({
          title: 'Backup enviado!',
          description: 'Seu backup foi salvo no Google Drive.',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro ao enviar',
        description: 'Não foi possível enviar o backup.',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingToDrive(false);
    }
  };

  // Google Drive: Restore from backup
  const handleRestoreFromDrive = async () => {
    if (!selectedDriveBackup) return;
    
    try {
      const backup = await downloadBackupFromDrive(selectedDriveBackup);
      setPendingBackup(backup);
      setConfirmRestore(true);
    } catch (error) {
      toast({
        title: 'Erro ao baixar',
        description: 'Não foi possível baixar o backup.',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDrive className="h-5 w-5 text-primary" />
          Backup & Restauração
        </CardTitle>
        <CardDescription>
          Faça backup dos seus dados ou restaure de um backup anterior
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Local Backup Status */}
        {localBackupInfo && (
          <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
            <Check className="h-4 w-4 text-green-500" />
            <span className="text-sm text-green-400">
              Último backup local: {formatDate(localBackupInfo.savedAt)}
            </span>
          </div>
        )}

        {/* Backup Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Save Local Backup */}
          <Button
            variant="outline"
            onClick={handleSaveLocal}
            disabled={isSavingLocal}
            className="flex items-center gap-2"
          >
            {isSavingLocal ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvar Backup Local
          </Button>

          {/* Download Backup */}
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Baixar Arquivo JSON
          </Button>

          {/* Restore from Local */}
          <Button
            variant="outline"
            onClick={handleRestoreLocal}
            disabled={!localBackupInfo}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Restaurar Local
          </Button>

          {/* Import from File */}
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="flex items-center gap-2"
          >
            {isImporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Importar Arquivo
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Info */}
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          O backup local fica salvo no seu dispositivo para acesso offline.
        </p>

        {/* Google Drive Section */}
        {googleDriveAvailable && (
          <div className="pt-4 border-t border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <Cloud className="h-5 w-5 text-blue-500" />
              <span className="font-medium">Google Drive</span>
              {googleAuthenticated && (
                <span className="text-xs text-green-500 flex items-center gap-1">
                  <Check className="h-3 w-3" /> Conectado
                </span>
              )}
            </div>

            {!googleAuthenticated ? (
              <Button
                variant="outline"
                onClick={handleConnectGoogleDrive}
                className="w-full flex items-center gap-2"
              >
                <Cloud className="h-4 w-4" />
                Conectar ao Google Drive
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={handleUploadToDrive}
                    disabled={isUploadingToDrive}
                    className="flex items-center gap-2"
                  >
                    {isUploadingToDrive ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CloudUpload className="h-4 w-4" />
                    )}
                    Enviar para Drive
                  </Button>

                  <Button
                    variant="outline"
                    onClick={loadDriveBackups}
                    disabled={isLoadingDriveBackups}
                    className="flex items-center gap-2"
                  >
                    {isLoadingDriveBackups ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    Atualizar Lista
                  </Button>
                </div>

                {driveBackups.length > 0 && (
                  <div className="flex gap-2">
                    <Select value={selectedDriveBackup} onValueChange={setSelectedDriveBackup}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Selecione um backup" />
                      </SelectTrigger>
                      <SelectContent>
                        {driveBackups.map((backup) => (
                          <SelectItem key={backup.id} value={backup.id}>
                            {backup.name} ({formatDate(backup.modifiedTime)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      onClick={handleRestoreFromDrive}
                      disabled={!selectedDriveBackup}
                    >
                      <CloudDownload className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDisconnectGoogleDrive}
                  className="text-muted-foreground text-xs"
                >
                  <LogOut className="h-3 w-3 mr-1" />
                  Desconectar
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Confirm Restore Dialog */}
      <AlertDialog open={confirmRestore} onOpenChange={setConfirmRestore}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar Backup?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingBackup && (
                <>
                  Backup de {formatDate(pendingBackup.timestamp)}
                  <br />
                  Esta ação irá importar os dados do backup. Dados existentes podem ser substituídos.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRestore}>
              Restaurar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default BackupRestorePanel;

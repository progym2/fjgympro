import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Cloud, RefreshCw, Trash2, Wifi, WifiOff, 
  CheckCircle, AlertCircle, Database, HardDrive,
  ChevronDown, ChevronUp, Settings, BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEnhancedOfflineSync } from '@/hooks/useEnhancedOfflineSync';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ClientPageHeader from './ClientPageHeader';
import CacheStatsDetailed from '@/components/shared/CacheStatsDetailed';

interface PendingOp {
  id: string;
  table: string;
  operation: 'insert' | 'update' | 'delete';
  data: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
  priority: number;
}

const SyncSettings: React.FC = () => {
  const {
    isOnline,
    isSyncing,
    pendingCount,
    lastSyncTime,
    syncProgress,
    syncPendingOperations,
    clearPendingOperations,
    getPendingOperations,
    getCacheStatistics,
    triggerSync
  } = useEnhancedOfflineSync();

  const [pendingOps, setPendingOps] = useState<PendingOp[]>([]);
  const [cacheStats, setCacheStats] = useState<{ count: number; oldestTimestamp: number | null } | null>(null);
  const [showPendingDetails, setShowPendingDetails] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [activeTab, setActiveTab] = useState('sync');

  useEffect(() => {
    loadData();
  }, [pendingCount]);

  const loadData = async () => {
    setPendingOps(getPendingOperations());
    const stats = await getCacheStatistics();
    setCacheStats(stats);
  };

  const handleForceSync = async () => {
    if (!isOnline) {
      toast.error('Sem conexão com a internet');
      return;
    }
    
    toast.info('Iniciando sincronização...');
    await syncPendingOperations();
    loadData();
  };

  const handleClearPending = async () => {
    setIsClearing(true);
    try {
      clearPendingOperations();
      toast.success('Operações pendentes removidas');
      loadData();
    } finally {
      setIsClearing(false);
    }
  };

  const getTableLabel = (table: string) => {
    const labels: Record<string, string> = {
      'weight_records': 'Registro de peso',
      'hydration_records': 'Hidratação',
      'workout_logs': 'Treino',
      'workout_exercise_logs': 'Exercício',
      'profiles': 'Perfil',
      'notifications': 'Notificação',
    };
    return labels[table] || table;
  };

  const getOperationLabel = (op: 'insert' | 'update' | 'delete') => {
    const labels = { insert: 'Criar', update: 'Atualizar', delete: 'Excluir' };
    return labels[op];
  };

  const getPriorityBadge = (priority: number) => {
    if (priority === 1) return <Badge variant="destructive" className="text-[10px]">Alta</Badge>;
    if (priority === 2) return <Badge variant="default" className="text-[10px]">Média</Badge>;
    return <Badge variant="secondary" className="text-[10px]">Baixa</Badge>;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4 pb-20"
    >
      <ClientPageHeader title="SINCRONIZAÇÃO" icon={<Settings className="w-5 h-5" />} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sync" className="flex items-center gap-2">
            <Cloud className="w-4 h-4" />
            Sincronização
          </TabsTrigger>
          <TabsTrigger value="storage" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Armazenamento
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sync" className="mt-4 space-y-4">
          {/* Status Card */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                {isOnline ? (
                  <Wifi className="w-5 h-5 text-emerald-500" />
                ) : (
                  <WifiOff className="w-5 h-5 text-amber-500" />
                )}
                Status da Conexão
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Estado</span>
                <Badge variant={isOnline ? 'default' : 'secondary'} className={isOnline ? 'bg-emerald-500' : ''}>
                  {isOnline ? 'Online' : 'Offline'}
                </Badge>
              </div>
              
              {lastSyncTime && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Última sincronização</span>
                  <span className="text-sm">
                    {format(lastSyncTime, "dd/MM 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
              )}

              {isSyncing && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Sincronizando...</span>
                    <span className="font-mono">{syncProgress}%</span>
                  </div>
                  <Progress value={syncProgress} className="h-2" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Operations Card */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Cloud className="w-5 h-5 text-primary" />
                    Operações Pendentes
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    Alterações que serão sincronizadas
                  </CardDescription>
                </div>
                <Badge variant={pendingCount > 0 ? 'default' : 'secondary'}>
                  {pendingCount}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {pendingCount > 0 ? (
                <>
                  <Collapsible open={showPendingDetails} onOpenChange={setShowPendingDetails}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full justify-between">
                        <span className="text-sm">Ver detalhes</span>
                        {showPendingDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 space-y-2">
                      {pendingOps.slice(0, 10).map((op, index) => (
                        <div 
                          key={op.id}
                          className="flex items-center justify-between p-2 bg-muted/30 rounded-lg text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">{index + 1}.</span>
                            <span>{getTableLabel(op.table)}</span>
                            <Badge variant="outline" className="text-[10px]">
                              {getOperationLabel(op.operation)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            {getPriorityBadge(op.priority)}
                            {op.retryCount > 0 && (
                              <span className="text-amber-500 text-[10px]">
                                {op.retryCount}x tentativas
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                      {pendingOps.length > 10 && (
                        <p className="text-xs text-center text-muted-foreground">
                          +{pendingOps.length - 10} mais operações
                        </p>
                      )}
                    </CollapsibleContent>
                  </Collapsible>

                  <div className="flex gap-2">
                    <Button 
                      onClick={handleForceSync}
                      disabled={!isOnline || isSyncing}
                      className="flex-1"
                      size="sm"
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                      Sincronizar Agora
                    </Button>
                    <Button 
                      onClick={handleClearPending}
                      disabled={isClearing}
                      variant="destructive"
                      size="sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Tudo sincronizado!</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cache Stats Card */}
          {cacheStats && (
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Database className="w-5 h-5 text-primary" />
                  Cache Local
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Itens em cache</span>
                  </div>
                  <span className="text-sm font-medium">{cacheStats.count}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Info Card */}
          <Card className="border-border/50 bg-muted/20">
            <CardContent className="pt-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>As alterações feitas offline são salvas localmente e sincronizadas automaticamente quando você se reconectar à internet.</p>
                  <p>Operações de alta prioridade (pagamentos, perfil) são sincronizadas primeiro.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="storage" className="mt-4">
          <CacheStatsDetailed onClear={loadData} />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default SyncSettings;
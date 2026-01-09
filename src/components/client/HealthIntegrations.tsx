import React, { useState, useMemo, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, Smartphone, AlertCircle, Check,
  Download, RefreshCw, Activity, Footprints,
  Flame, Watch, Timer, TrendingUp, Gauge, Bluetooth
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import useHealthKit from '@/hooks/useHealthKit';
import ClientPageHeader from './ClientPageHeader';

const HealthIntegrations = forwardRef<HTMLDivElement>((_, ref) => {
  const navigate = useNavigate();
  const {
    isAvailable,
    isConnected,
    isLoading,
    isSyncing,
    healthData,
    workoutSessions,
    services,
    platform,
    requestPermissions,
    disconnect,
    syncData,
    getTodaySummary,
  } = useHealthKit();

  const [activeTab, setActiveTab] = useState('overview');
  const summary = useMemo(() => getTodaySummary(), [getTodaySummary]);

  const handleConnect = async (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (service?.connected) {
      await disconnect(serviceId);
    } else {
      await requestPermissions(serviceId);
    }
  };

  const handleSync = async () => {
    await syncData();
  };

  const dataCategories = [
    { 
      icon: <Footprints className="w-5 h-5" />, 
      label: 'Passos', 
      value: summary.steps.toLocaleString(),
      goal: `Meta: ${summary.stepsGoal.toLocaleString()}`,
      progress: summary.stepsProgress,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
    },
    { 
      icon: <Flame className="w-5 h-5" />, 
      label: 'Calorias', 
      value: `${summary.calories} kcal`,
      goal: `Meta: ${summary.caloriesGoal} kcal`,
      progress: summary.caloriesProgress,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/20',
    },
    { 
      icon: <Heart className="w-5 h-5" />, 
      label: 'Batimentos', 
      value: `${summary.heartRate} bpm`,
      goal: summary.heartRateStatus === 'normal' ? 'Normal' : summary.heartRateStatus === 'high' ? 'Alto' : 'Baixo',
      progress: Math.min((summary.heartRate / 200) * 100, 100),
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
    },
    { 
      icon: <Gauge className="w-5 h-5" />, 
      label: 'Velocidade', 
      value: `${summary.speed} km/h`,
      goal: 'Média atual',
      progress: Math.min((summary.speed / 15) * 100, 100),
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
    },
    { 
      icon: <TrendingUp className="w-5 h-5" />, 
      label: 'Distância', 
      value: `${summary.distanceKm} km`,
      goal: 'Percorrido hoje',
      progress: Math.min((healthData.distance / 5000) * 100, 100),
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
    },
    { 
      icon: <Timer className="w-5 h-5" />, 
      label: 'Minutos Ativos', 
      value: `${summary.activeMinutes} min`,
      goal: `Meta: ${summary.activeMinutesGoal} min`,
      progress: summary.activeMinutesProgress,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/20',
    },
  ];

  const serviceIcons: Record<string, React.ReactNode> = {
    apple_health: <Heart className="w-6 h-6" />,
    google_fit: <Activity className="w-6 h-6" />,
    samsung_health: <Watch className="w-6 h-6" />,
  };

  const serviceColors: Record<string, { color: string; bg: string; border: string }> = {
    apple_health: { color: 'text-red-400', bg: 'from-red-500/20 to-pink-500/20', border: 'border-red-500/30' },
    google_fit: { color: 'text-green-400', bg: 'from-green-500/20 to-emerald-500/20', border: 'border-green-500/30' },
    samsung_health: { color: 'text-blue-400', bg: 'from-blue-500/20 to-indigo-500/20', border: 'border-blue-500/30' },
  };

  return (
    <div ref={ref} className="space-y-4 pb-6">
      <ClientPageHeader
        title="Integrações de Saúde" 
        icon={<Heart />}
      />

      {/* Status Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-4 rounded-xl border flex items-start gap-3 ${
          isAvailable 
            ? 'bg-green-500/10 border-green-500/30' 
            : 'bg-yellow-500/10 border-yellow-500/30'
        }`}
      >
        {isAvailable ? (
          <>
            <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-400">App Nativo Detectado</p>
              <p className="text-xs text-muted-foreground">
                {platform === 'ios' ? 'iPhone' : 'Android'} - Você pode sincronizar dados com {platform === 'ios' ? 'Apple Health' : 'Google Fit/Samsung Health'}.
              </p>
            </div>
          </>
        ) : (
          <>
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-400">App Web Detectado</p>
              <p className="text-xs text-muted-foreground">
                Para coletar dados de batimentos cardíacos, calorias e passos do seu relógio ou celular, instale o app nativo.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/20"
                onClick={() => navigate('/install')}
              >
                <Download size={14} className="mr-1" />
                Instalar App Nativo
              </Button>
            </div>
          </>
        )}
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-background/50 border border-border">
          <TabsTrigger value="overview" className="text-xs">Visão Geral</TabsTrigger>
          <TabsTrigger value="services" className="text-xs">Serviços</TabsTrigger>
          <TabsTrigger value="devices" className="text-xs">Dispositivos</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {dataCategories.map((data, index) => (
              <motion.div
                key={data.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className={`p-3 rounded-xl ${data.bgColor} border border-border/30`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={data.color}>{data.icon}</div>
                  <p className="text-xs font-medium text-muted-foreground">{data.label}</p>
                </div>
                <p className="text-lg font-bold text-foreground">{data.value}</p>
                <Progress value={data.progress} className="h-1 mt-2" />
                <p className="text-[10px] text-muted-foreground mt-1">{data.goal}</p>
              </motion.div>
            ))}
          </div>

          {/* Last Sync Info */}
          {healthData.lastSyncAt && (
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RefreshCw size={14} className="text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Última sincronização: {healthData.lastSyncAt.toLocaleString('pt-BR')}
                  </span>
                </div>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={handleSync}
                  disabled={!isAvailable || isSyncing}
                >
                  <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Recent Workouts */}
          {workoutSessions.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Activity size={14} className="text-primary" />
                Treinos Recentes (Sincronizados)
              </h4>
              {workoutSessions.slice(0, 3).map((workout) => (
                <Card key={workout.id} className="bg-card/50 border-border/50">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{workout.type}</p>
                        <p className="text-xs text-muted-foreground">
                          {Math.floor(workout.duration / 60)} min • {workout.calories} kcal
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-red-400 flex items-center gap-1">
                          <Heart size={10} /> {workout.averageHeartRate} bpm
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Max: {workout.maxHeartRate} bpm
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Sync Button */}
          <Button
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
            disabled={!isAvailable || isSyncing || !isConnected}
            onClick={handleSync}
          >
            {isSyncing ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <RefreshCw size={16} className="mr-2" />
                </motion.div>
                Sincronizando...
              </>
            ) : (
              <>
                <RefreshCw size={16} className="mr-2" />
                Sincronizar Dados
              </>
            )}
          </Button>
          
          {!isConnected && isAvailable && (
            <p className="text-xs text-center text-muted-foreground">
              Conecte um serviço de saúde na aba "Serviços" para sincronizar
            </p>
          )}
        </TabsContent>

        {/* Services Tab */}
        <TabsContent value="services" className="mt-4 space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Smartphone size={16} className="text-primary" />
            Serviços de Saúde Disponíveis
          </h4>
          
          {services.map((service, index) => {
            const colors = serviceColors[service.id];
            const isPlatformMatch = 
              service.platform === 'both' || 
              (platform === 'ios' && service.id === 'apple_health') ||
              (platform === 'android' && (service.id === 'google_fit' || service.id === 'samsung_health'));

            return (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 rounded-xl bg-gradient-to-br ${colors.bg} border ${colors.border} ${
                  !isPlatformMatch && isAvailable ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-background/50 ${colors.color}`}>
                      {serviceIcons[service.id]}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{service.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          service.platform === 'ios' 
                            ? 'bg-slate-500/20 text-slate-400' 
                            : 'bg-green-500/20 text-green-400'
                        }`}>
                          {service.platform === 'ios' ? 'iOS' : 'Android'}
                        </span>
                        {service.connected && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                            Conectado
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <Switch
                    checked={service.connected}
                    onCheckedChange={() => handleConnect(service.id)}
                    disabled={!isAvailable || isLoading || (!isPlatformMatch && isAvailable)}
                  />
                </div>
                
                {/* Permissions/Data types */}
                <div className="mt-3 pt-3 border-t border-border/30">
                  <p className="text-xs text-muted-foreground mb-2">Dados coletados:</p>
                  <div className="flex flex-wrap gap-1">
                    {service.permissions.map((perm) => (
                      <span 
                        key={perm.type}
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          perm.granted 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-background/50 text-muted-foreground'
                        }`}
                      >
                        {perm.type === 'steps' && 'Passos'}
                        {perm.type === 'heartRate' && 'Batimentos'}
                        {perm.type === 'calories' && 'Calorias'}
                        {perm.type === 'distance' && 'Distância'}
                        {perm.type === 'workouts' && 'Treinos'}
                        {perm.type === 'sleep' && 'Sono'}
                        {perm.type === 'speed' && 'Velocidade'}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            );
          })}

          {!isAvailable && (
            <p className="text-xs text-center text-muted-foreground py-2">
              Instale o app nativo para conectar serviços de saúde
            </p>
          )}
        </TabsContent>

        {/* Devices Tab */}
        <TabsContent value="devices" className="mt-4 space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Bluetooth size={16} className="text-primary" />
            Dispositivos Compatíveis
          </h4>
          
          <div className="space-y-2">
            {[
              { name: 'Apple Watch', platform: 'iOS', sync: 'Apple Health', icon: '⌚' },
              { name: 'Galaxy Watch', platform: 'Android', sync: 'Samsung Health / Google Fit', icon: '⌚' },
              { name: 'Garmin', platform: 'Ambos', sync: 'Google Fit / Apple Health', icon: '⌚' },
              { name: 'Fitbit', platform: 'Ambos', sync: 'Google Fit / Apple Health', icon: '📟' },
              { name: 'Mi Band / Amazfit', platform: 'Android', sync: 'Google Fit', icon: '📟' },
              { name: 'Huawei Watch', platform: 'Android', sync: 'Google Fit', icon: '⌚' },
              { name: 'Polar', platform: 'Ambos', sync: 'Google Fit / Apple Health', icon: '💓' },
              { name: 'Whoop', platform: 'Ambos', sync: 'Apple Health', icon: '💪' },
            ].map((device, index) => (
              <motion.div
                key={device.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-3 rounded-xl bg-card/50 border border-border/30 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{device.icon}</span>
                  <div>
                    <p className="font-medium text-sm">{device.name}</p>
                    <p className="text-xs text-muted-foreground">{device.platform}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Sincroniza via</p>
                  <p className="text-xs text-primary">{device.sync}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* How it works */}
          <Card className="bg-cyan-500/10 border-cyan-500/30 mt-4">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-muted-foreground space-y-2">
                  <p className="font-medium text-cyan-400">Como funciona?</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Configure seu relógio/pulseira para sincronizar com Apple Health (iOS) ou Google Fit (Android)</li>
                    <li>Instale o app nativo do FrancGymPro</li>
                    <li>Conecte o serviço de saúde na aba "Serviços"</li>
                    <li>Seus dados de batimentos, calorias, passos e velocidade serão sincronizados automaticamente</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
});

HealthIntegrations.displayName = 'HealthIntegrations';

export default HealthIntegrations;

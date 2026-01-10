import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, Smartphone, AlertCircle, Check, ExternalLink, 
  Download, RefreshCw, Activity, Droplets, Footprints, Moon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface HealthService {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  available: boolean;
  connected: boolean;
  dataTypes: string[];
  platform: 'ios' | 'android' | 'both';
}

const HealthIntegrations: React.FC = () => {
  const [syncing, setSyncing] = useState(false);
  const [services, setServices] = useState<HealthService[]>([
    {
      id: 'apple_health',
      name: 'Apple Health',
      icon: <Heart className="w-6 h-6" />,
      color: 'text-red-400',
      bgColor: 'from-red-500/20 to-pink-500/20',
      borderColor: 'border-red-500/30',
      available: false,
      connected: false,
      dataTypes: ['Hidratação', 'Passos', 'Sono', 'Exercícios'],
      platform: 'ios'
    },
    {
      id: 'google_fit',
      name: 'Google Fit',
      icon: <Activity className="w-6 h-6" />,
      color: 'text-green-400',
      bgColor: 'from-green-500/20 to-emerald-500/20',
      borderColor: 'border-green-500/30',
      available: false,
      connected: false,
      dataTypes: ['Hidratação', 'Passos', 'Calorias', 'Exercícios'],
      platform: 'android'
    },
    {
      id: 'samsung_health',
      name: 'Samsung Health',
      icon: <Heart className="w-6 h-6" />,
      color: 'text-blue-400',
      bgColor: 'from-blue-500/20 to-indigo-500/20',
      borderColor: 'border-blue-500/30',
      available: false,
      connected: false,
      dataTypes: ['Hidratação', 'Passos', 'Sono', 'Frequência Cardíaca'],
      platform: 'android'
    }
  ]);

  const isNativeApp = typeof window !== 'undefined' && 
    (window.hasOwnProperty('Capacitor') || window.navigator.userAgent.includes('Capacitor'));

  const handleConnect = (serviceId: string) => {
    if (!isNativeApp) {
      toast.info('Esta funcionalidade requer o app nativo instalado no seu dispositivo.');
      return;
    }
    
    // In a real implementation, this would trigger native health permissions
    toast.info('Conectando ao serviço de saúde...');
    setSyncing(true);
    
    setTimeout(() => {
      setServices(prev => prev.map(s => 
        s.id === serviceId ? { ...s, connected: true, available: true } : s
      ));
      setSyncing(false);
      toast.success('Conectado com sucesso!');
    }, 2000);
  };

  const handleSync = async () => {
    if (!isNativeApp) {
      toast.info('Sincronização disponível apenas no app nativo.');
      return;
    }
    
    setSyncing(true);
    toast.loading('Sincronizando dados...', { id: 'sync' });
    
    // Simulate sync
    setTimeout(() => {
      setSyncing(false);
      toast.success('Dados sincronizados com sucesso!', { id: 'sync' });
    }, 3000);
  };

  const dataTypes = [
    { icon: <Droplets className="w-5 h-5" />, label: 'Hidratação', description: 'Água consumida' },
    { icon: <Footprints className="w-5 h-5" />, label: 'Passos', description: 'Contagem diária' },
    { icon: <Moon className="w-5 h-5" />, label: 'Sono', description: 'Qualidade do sono' },
    { icon: <Activity className="w-5 h-5" />, label: 'Exercícios', description: 'Treinos registrados' }
  ];

  return (
    <div className="space-y-4">
      {/* Status Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-4 rounded-xl border flex items-start gap-3 ${
          isNativeApp 
            ? 'bg-green-500/10 border-green-500/30' 
            : 'bg-yellow-500/10 border-yellow-500/30'
        }`}
      >
        {isNativeApp ? (
          <>
            <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-400">App Nativo Detectado</p>
              <p className="text-xs text-muted-foreground">
                Você pode sincronizar dados com Apple Health e Google Fit.
              </p>
            </div>
          </>
        ) : (
          <>
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-400">App Web Detectado</p>
              <p className="text-xs text-muted-foreground">
                Integrações de saúde requerem o app nativo. Instale o app no seu dispositivo para sincronizar com Apple Health ou Google Fit.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/20"
                onClick={() => window.location.href = '/install'}
              >
                <Download size={14} className="mr-1" />
                Instalar App
              </Button>
            </div>
          </>
        )}
      </motion.div>

      {/* Health Services */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
          <Smartphone size={16} className="text-cyan-400" />
          Serviços de Saúde
        </h4>
        
        {services.map((service, index) => (
          <motion.div
            key={service.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`p-4 rounded-xl bg-gradient-to-br ${service.bgColor} border ${service.borderColor}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-background/50 ${service.color}`}>
                  {service.icon}
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
                disabled={!isNativeApp || syncing}
              />
            </div>
            
            {/* Data types */}
            <div className="mt-3 pt-3 border-t border-border/30">
              <p className="text-xs text-muted-foreground mb-2">Dados disponíveis:</p>
              <div className="flex flex-wrap gap-1">
                {service.dataTypes.map((type) => (
                  <span 
                    key={type}
                    className="text-xs px-2 py-0.5 rounded-full bg-background/50 text-muted-foreground"
                  >
                    {type}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Data Types Info */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
          <Activity size={16} className="text-cyan-400" />
          Tipos de Dados Sincronizados
        </h4>
        
        <div className="grid grid-cols-2 gap-2">
          {dataTypes.map((data, index) => (
            <motion.div
              key={data.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + index * 0.05 }}
              className="p-3 rounded-lg bg-card/50 border border-border/30 flex items-center gap-2"
            >
              <div className="text-cyan-400">{data.icon}</div>
              <div>
                <p className="text-sm font-medium">{data.label}</p>
                <p className="text-xs text-muted-foreground">{data.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Sync Button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <Button
          className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
          disabled={!isNativeApp || syncing}
          onClick={handleSync}
        >
          {syncing ? (
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
              Sincronizar Agora
            </>
          )}
        </Button>
        
        {!isNativeApp && (
          <p className="text-xs text-center text-muted-foreground mt-2">
            Instale o app nativo para habilitar a sincronização
          </p>
        )}
      </motion.div>

      {/* Info Card */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30"
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground">
            <p className="font-medium text-cyan-400 mb-1">Como funciona a sincronização?</p>
            <p>
              Quando você conectar ao Apple Health ou Google Fit, seus dados de hidratação 
              serão automaticamente sincronizados. Isso permite que você acompanhe sua 
              hidratação junto com outros dados de saúde em um só lugar.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default HealthIntegrations;

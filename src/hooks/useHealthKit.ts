import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

// Types for health data
export interface HealthData {
  steps: number;
  calories: number;
  heartRate: number;
  distance: number; // in meters
  speed: number; // km/h
  activeMinutes: number;
  sleepHours: number;
  hydration: number; // ml
  lastSyncAt: Date | null;
}

export interface WorkoutSession {
  id: string;
  type: string;
  startTime: Date;
  endTime: Date;
  duration: number; // seconds
  calories: number;
  averageHeartRate: number;
  maxHeartRate: number;
  distance: number;
}

export interface HealthPermission {
  type: string;
  granted: boolean;
}

export interface HealthServiceStatus {
  id: string;
  name: string;
  platform: 'ios' | 'android' | 'both';
  available: boolean;
  connected: boolean;
  permissions: HealthPermission[];
}

const HEALTH_DATA_KEY = 'health_data_cache';
const HEALTH_SERVICES_KEY = 'health_services_status';

// Check if running in native Capacitor environment
const isNativeApp = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!(
    (window as any).Capacitor || 
    navigator.userAgent.includes('Capacitor') ||
    (window as any).webkit?.messageHandlers
  );
};

// Check platform
const getPlatform = (): 'ios' | 'android' | 'web' => {
  if (!isNativeApp()) return 'web';
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ios')) return 'ios';
  return 'android';
};

export const useHealthKit = () => {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [healthData, setHealthData] = useState<HealthData>({
    steps: 0,
    calories: 0,
    heartRate: 0,
    distance: 0,
    speed: 0,
    activeMinutes: 0,
    sleepHours: 0,
    hydration: 0,
    lastSyncAt: null,
  });
  const [workoutSessions, setWorkoutSessions] = useState<WorkoutSession[]>([]);
  const [services, setServices] = useState<HealthServiceStatus[]>([
    {
      id: 'apple_health',
      name: 'Apple Health',
      platform: 'ios',
      available: false,
      connected: false,
      permissions: [
        { type: 'steps', granted: false },
        { type: 'heartRate', granted: false },
        { type: 'calories', granted: false },
        { type: 'distance', granted: false },
        { type: 'workouts', granted: false },
        { type: 'sleep', granted: false },
      ],
    },
    {
      id: 'google_fit',
      name: 'Google Fit',
      platform: 'android',
      available: false,
      connected: false,
      permissions: [
        { type: 'steps', granted: false },
        { type: 'heartRate', granted: false },
        { type: 'calories', granted: false },
        { type: 'distance', granted: false },
        { type: 'workouts', granted: false },
        { type: 'speed', granted: false },
      ],
    },
    {
      id: 'samsung_health',
      name: 'Samsung Health',
      platform: 'android',
      available: false,
      connected: false,
      permissions: [
        { type: 'steps', granted: false },
        { type: 'heartRate', granted: false },
        { type: 'calories', granted: false },
        { type: 'sleep', granted: false },
      ],
    },
  ]);

  const platform = getPlatform();

  // Initialize and check availability
  useEffect(() => {
    const initHealthKit = async () => {
      setIsLoading(true);
      const native = isNativeApp();
      setIsAvailable(native);

      // Load cached data
      const cachedData = localStorage.getItem(HEALTH_DATA_KEY);
      if (cachedData) {
        try {
          const parsed = JSON.parse(cachedData);
          setHealthData({
            ...parsed,
            lastSyncAt: parsed.lastSyncAt ? new Date(parsed.lastSyncAt) : null,
          });
        } catch (e) {
          console.error('Error parsing cached health data:', e);
        }
      }

      // Load services status
      const cachedServices = localStorage.getItem(HEALTH_SERVICES_KEY);
      if (cachedServices) {
        try {
          setServices(JSON.parse(cachedServices));
        } catch (e) {
          console.error('Error parsing cached services:', e);
        }
      }

      // Update service availability based on platform
      if (native) {
        setServices(prev => prev.map(service => ({
          ...service,
          available: service.platform === platform || service.platform === 'both',
        })));
      }

      setIsLoading(false);
    };

    initHealthKit();
  }, [platform]);

  // Request permissions from health service
  const requestPermissions = useCallback(async (serviceId: string): Promise<boolean> => {
    if (!isAvailable) {
      toast.error('Integrações de saúde requerem o app nativo');
      return false;
    }

    setIsLoading(true);

    try {
      // In a real implementation, this would use Capacitor Health plugins
      // For now, we simulate the permission request
      
      // Simulate async permission request
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Update service status
      setServices(prev => prev.map(service => {
        if (service.id === serviceId) {
          return {
            ...service,
            connected: true,
            permissions: service.permissions.map(p => ({ ...p, granted: true })),
          };
        }
        return service;
      }));

      setIsConnected(true);
      localStorage.setItem(HEALTH_SERVICES_KEY, JSON.stringify(services));
      
      toast.success(`Conectado ao ${serviceId === 'apple_health' ? 'Apple Health' : serviceId === 'google_fit' ? 'Google Fit' : 'Samsung Health'}`);
      return true;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      toast.error('Erro ao solicitar permissões');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable, services]);

  // Disconnect from health service
  const disconnect = useCallback(async (serviceId: string): Promise<boolean> => {
    setIsLoading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      setServices(prev => prev.map(service => {
        if (service.id === serviceId) {
          return {
            ...service,
            connected: false,
            permissions: service.permissions.map(p => ({ ...p, granted: false })),
          };
        }
        return service;
      }));

      const anyConnected = services.some(s => s.id !== serviceId && s.connected);
      setIsConnected(anyConnected);
      
      toast.success('Desconectado com sucesso');
      return true;
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast.error('Erro ao desconectar');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [services]);

  // Sync health data from connected services
  const syncData = useCallback(async (): Promise<HealthData | null> => {
    if (!isAvailable) {
      toast.error('Sincronização requer o app nativo');
      return null;
    }

    const connectedServices = services.filter(s => s.connected);
    if (connectedServices.length === 0) {
      toast.warning('Nenhum serviço de saúde conectado');
      return null;
    }

    setIsSyncing(true);
    toast.loading('Sincronizando dados de saúde...', { id: 'health-sync' });

    try {
      // Simulate fetching data from health APIs
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generate realistic sample data
      const newData: HealthData = {
        steps: Math.floor(Math.random() * 8000) + 2000,
        calories: Math.floor(Math.random() * 400) + 200,
        heartRate: Math.floor(Math.random() * 30) + 60,
        distance: Math.floor(Math.random() * 5000) + 1000, // meters
        speed: Math.round((Math.random() * 8 + 4) * 10) / 10, // km/h
        activeMinutes: Math.floor(Math.random() * 60) + 15,
        sleepHours: Math.round((Math.random() * 2 + 6) * 10) / 10,
        hydration: Math.floor(Math.random() * 1500) + 500,
        lastSyncAt: new Date(),
      };

      // Generate sample workout sessions
      const sampleWorkouts: WorkoutSession[] = [
        {
          id: `workout-${Date.now()}`,
          type: 'Musculação',
          startTime: new Date(Date.now() - 3600000),
          endTime: new Date(),
          duration: 3600,
          calories: Math.floor(Math.random() * 200) + 150,
          averageHeartRate: Math.floor(Math.random() * 30) + 100,
          maxHeartRate: Math.floor(Math.random() * 20) + 140,
          distance: 0,
        },
      ];

      setHealthData(newData);
      setWorkoutSessions(prev => [...sampleWorkouts, ...prev].slice(0, 10));
      
      // Cache the data
      localStorage.setItem(HEALTH_DATA_KEY, JSON.stringify(newData));

      toast.success('Dados sincronizados com sucesso!', { id: 'health-sync' });
      return newData;
    } catch (error) {
      console.error('Error syncing health data:', error);
      toast.error('Erro ao sincronizar dados', { id: 'health-sync' });
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [isAvailable, services]);

  // Get today's summary
  const getTodaySummary = useCallback(() => {
    return {
      steps: healthData.steps,
      stepsGoal: 10000,
      stepsProgress: Math.min((healthData.steps / 10000) * 100, 100),
      calories: healthData.calories,
      caloriesGoal: 500,
      caloriesProgress: Math.min((healthData.calories / 500) * 100, 100),
      heartRate: healthData.heartRate,
      heartRateStatus: healthData.heartRate < 60 ? 'low' : healthData.heartRate > 100 ? 'high' : 'normal',
      activeMinutes: healthData.activeMinutes,
      activeMinutesGoal: 30,
      activeMinutesProgress: Math.min((healthData.activeMinutes / 30) * 100, 100),
      distance: healthData.distance,
      distanceKm: (healthData.distance / 1000).toFixed(2),
      speed: healthData.speed,
    };
  }, [healthData]);

  // Check if specific data type is available
  const hasPermission = useCallback((dataType: string): boolean => {
    return services.some(s => 
      s.connected && 
      s.permissions.some(p => p.type === dataType && p.granted)
    );
  }, [services]);

  return {
    // State
    isAvailable,
    isConnected,
    isLoading,
    isSyncing,
    healthData,
    workoutSessions,
    services,
    platform,

    // Actions
    requestPermissions,
    disconnect,
    syncData,
    getTodaySummary,
    hasPermission,
  };
};

export default useHealthKit;

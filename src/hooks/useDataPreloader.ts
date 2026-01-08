import { useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { setCacheItem, getCacheItem, batchSetCacheItems } from '@/lib/indexedDB';
import type { UserRole } from '@/contexts/AuthContext';

interface PreloadedData {
  workoutPlans?: any[];
  notifications?: any[];
  linkedInstructor?: any;
  linkedStudents?: any[];
  payments?: any[];
  hydrationSettings?: any;
}

// Cache keys for IndexedDB
const CACHE_KEYS = {
  WORKOUT_PLANS: 'preload_workout_plans',
  NOTIFICATIONS: 'preload_notifications',
  LINKED_INSTRUCTOR: 'preload_linked_instructor',
  LINKED_STUDENTS: 'preload_linked_students',
  PAYMENTS: 'preload_payments',
  HYDRATION: 'preload_hydration',
  PRELOAD_META: 'preload_meta',
} as const;

const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Simple in-memory cache with TTL (for immediate access)
const cache: { data: PreloadedData; timestamp: number; profileId: string } | null = null;

let preloadedDataCache: typeof cache = null;
let isPreloadingGlobal = false;

export const useDataPreloader = () => {
  const isPreloading = useRef(false);
  const [preloadStatus, setPreloadStatus] = useState<'idle' | 'loading' | 'done'>('idle');

  const preloadClientData = async (profileId: string) => {
    const [workoutPlans, notifications, linkedInstructor, hydrationSettings] = await Promise.all([
      supabase
        .from('workout_plans')
        .select('id, name, description, is_active, created_at')
        .eq('assigned_to', profileId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(10),
      
      supabase
        .from('notifications')
        .select('id, title, message, type, is_read, created_at')
        .eq('profile_id', profileId)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(20),
      
      supabase
        .from('instructor_clients')
        .select(`
          instructor_id,
          linked_at,
          instructor:profiles!instructor_clients_instructor_id_fkey(
            id, full_name, avatar_url
          )
        `)
        .eq('client_id', profileId)
        .eq('is_active', true)
        .eq('link_status', 'accepted')
        .limit(1)
        .maybeSingle(),
      
      supabase
        .from('hydration_settings')
        .select('*')
        .eq('profile_id', profileId)
        .maybeSingle(),
    ]);

    return {
      workoutPlans: workoutPlans.data ?? [],
      notifications: notifications.data ?? [],
      linkedInstructor: linkedInstructor.data,
      hydrationSettings: hydrationSettings.data,
    };
  };

  const preloadInstructorData = async (profileId: string) => {
    const [linkedStudents, notifications, workoutPlans] = await Promise.all([
      supabase
        .from('instructor_clients')
        .select(`
          client_id,
          linked_at,
          client:profiles!instructor_clients_client_id_fkey(
            id, full_name, avatar_url, student_id
          )
        `)
        .eq('instructor_id', profileId)
        .eq('is_active', true)
        .eq('link_status', 'accepted')
        .limit(50),
      
      supabase
        .from('notifications')
        .select('id, title, message, type, is_read, created_at')
        .eq('profile_id', profileId)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(20),
      
      supabase
        .from('workout_plans')
        .select('id, name, description, assigned_to, is_active, created_at')
        .eq('created_by', profileId)
        .eq('is_instructor_plan', true)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    return {
      linkedStudents: linkedStudents.data ?? [],
      notifications: notifications.data ?? [],
      workoutPlans: workoutPlans.data ?? [],
    };
  };

  const preloadAdminData = async (profileId: string) => {
    const [notifications, payments] = await Promise.all([
      supabase
        .from('notifications')
        .select('id, title, message, type, is_read, created_at')
        .eq('profile_id', profileId)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(20),
      
      supabase
        .from('payments')
        .select('id, amount, status, due_date, client_id')
        .eq('status', 'pending')
        .order('due_date', { ascending: true })
        .limit(50),
    ]);

    return {
      notifications: notifications.data ?? [],
      payments: payments.data ?? [],
    };
  };

  const preloadData = useCallback(async (profileId: string, role: UserRole) => {
    // Skip if already preloading globally
    if (isPreloading.current || isPreloadingGlobal) {
      return preloadedDataCache?.data;
    }
    
    // Check memory cache first
    if (
      preloadedDataCache &&
      preloadedDataCache.profileId === profileId &&
      Date.now() - preloadedDataCache.timestamp < CACHE_TTL
    ) {
      setPreloadStatus('done');
      return preloadedDataCache.data;
    }

    // Try IndexedDB cache
    try {
      const cachedMeta = await getCacheItem<{ profileId: string; timestamp: number }>(CACHE_KEYS.PRELOAD_META);
      if (cachedMeta && cachedMeta.profileId === profileId && Date.now() - cachedMeta.timestamp < CACHE_TTL) {
        // Load from IndexedDB
        const [workoutPlans, notifications, linkedInstructor, hydrationSettings] = await Promise.all([
          getCacheItem(CACHE_KEYS.WORKOUT_PLANS),
          getCacheItem(CACHE_KEYS.NOTIFICATIONS),
          getCacheItem(CACHE_KEYS.LINKED_INSTRUCTOR),
          getCacheItem(CACHE_KEYS.HYDRATION),
        ]);
        
        const data: PreloadedData = {
          workoutPlans: workoutPlans as any[] || [],
          notifications: notifications as any[] || [],
          linkedInstructor,
          hydrationSettings,
        };
        
        preloadedDataCache = { data, timestamp: cachedMeta.timestamp, profileId };
        setPreloadStatus('done');
        return data;
      }
    } catch {
      // IndexedDB failed, continue with fresh fetch
    }

    isPreloading.current = true;
    isPreloadingGlobal = true;
    setPreloadStatus('loading');

    try {
      let data: PreloadedData = {};

      switch (role) {
        case 'client':
          data = await preloadClientData(profileId);
          break;
        case 'instructor':
          data = await preloadInstructorData(profileId);
          break;
        case 'admin':
          data = await preloadAdminData(profileId);
          break;
        case 'master':
          break;
      }

      // Store in memory cache
      preloadedDataCache = {
        data,
        timestamp: Date.now(),
        profileId,
      };

      // Store in IndexedDB for offline access
      try {
        await batchSetCacheItems([
          { key: CACHE_KEYS.WORKOUT_PLANS, data: data.workoutPlans || [], ttlMs: CACHE_TTL },
          { key: CACHE_KEYS.NOTIFICATIONS, data: data.notifications || [], ttlMs: CACHE_TTL },
          { key: CACHE_KEYS.LINKED_INSTRUCTOR, data: data.linkedInstructor, ttlMs: CACHE_TTL },
          { key: CACHE_KEYS.HYDRATION, data: data.hydrationSettings, ttlMs: CACHE_TTL },
          { key: CACHE_KEYS.PRELOAD_META, data: { profileId, timestamp: Date.now() }, ttlMs: CACHE_TTL },
        ]);
      } catch {
        // IndexedDB storage failed - not critical
      }

      setPreloadStatus('done');
      return data;
    } catch (error) {
      console.error('Error preloading data:', error);
      setPreloadStatus('idle');
      return {};
    } finally {
      isPreloading.current = false;
      isPreloadingGlobal = false;
    }
  }, []);

  const getCachedData = useCallback(async (profileId: string): Promise<PreloadedData | null> => {
    // Check memory first
    if (
      preloadedDataCache &&
      preloadedDataCache.profileId === profileId &&
      Date.now() - preloadedDataCache.timestamp < CACHE_TTL
    ) {
      return preloadedDataCache.data;
    }
    
    // Try IndexedDB
    try {
      const cachedMeta = await getCacheItem<{ profileId: string; timestamp: number }>(CACHE_KEYS.PRELOAD_META);
      if (cachedMeta && cachedMeta.profileId === profileId && Date.now() - cachedMeta.timestamp < CACHE_TTL) {
        const [workoutPlans, notifications] = await Promise.all([
          getCacheItem(CACHE_KEYS.WORKOUT_PLANS),
          getCacheItem(CACHE_KEYS.NOTIFICATIONS),
        ]);
        return {
          workoutPlans: workoutPlans as any[] || [],
          notifications: notifications as any[] || [],
        };
      }
    } catch {
      // IndexedDB failed
    }
    
    return null;
  }, []);

  const clearCache = useCallback(() => {
    preloadedDataCache = null;
  }, []);

  // Export status for UI
  const isLoading = preloadStatus === 'loading';

  return { preloadData, getCachedData, clearCache, preloadStatus, isLoading };
};

// Export function to trigger preload from outside hook context
export const triggerDataPreload = async (profileId: string, role: UserRole) => {
  // This can be called immediately after login
  const preloader = {
    preloadClientData: async (profileId: string) => {
      const [workoutPlans, notifications] = await Promise.all([
        supabase
          .from('workout_plans')
          .select('id, name, is_active')
          .eq('assigned_to', profileId)
          .eq('is_active', true)
          .limit(5),
        
        supabase
          .from('notifications')
          .select('id, title, is_read')
          .eq('profile_id', profileId)
          .eq('is_read', false)
          .limit(10),
      ]);
      
      return { workoutPlans: workoutPlans.data, notifications: notifications.data };
    }
  };

  try {
    if (role === 'client') {
      const data = await preloader.preloadClientData(profileId);
      preloadedDataCache = {
        data,
        timestamp: Date.now(),
        profileId,
      };
    }
  } catch (e) {
    // Ignore preload errors
  }
};

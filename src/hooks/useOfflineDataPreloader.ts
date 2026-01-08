import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { setCacheItem, getCacheItem } from '@/lib/indexedDB';

const CACHE_KEYS = {
  PROFILE: 'offline_profile',
  WORKOUTS: 'offline_workouts',
  EXERCISES: 'offline_exercises',
  MEAL_PLANS: 'offline_meal_plans',
  WEIGHT_RECORDS: 'offline_weight_records',
  NOTIFICATIONS: 'offline_notifications',
  HYDRATION: 'offline_hydration',
} as const;

// Cache TTL in milliseconds
const CACHE_TTL = {
  SHORT: 5 * 60 * 1000, // 5 minutes
  MEDIUM: 30 * 60 * 1000, // 30 minutes
  LONG: 24 * 60 * 60 * 1000, // 24 hours
  WEEK: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export function useOfflineDataPreloader() {
  const { profile } = useAuth();
  const isPreloadingRef = useRef(false);
  const hasPreloadedRef = useRef(false);

  const preloadProfile = useCallback(async () => {
    if (!profile?.id) return null;
    
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profile.id)
        .single();
      
      if (data) {
        await setCacheItem(CACHE_KEYS.PROFILE, data, CACHE_TTL.MEDIUM);
      }
      return data;
    } catch (error) {
      console.warn('[Preloader] Failed to preload profile:', error);
      return null;
    }
  }, [profile?.id]);

  const preloadWorkouts = useCallback(async () => {
    if (!profile?.id) return [];
    
    try {
      const { data } = await supabase
        .from('workout_plans')
        .select(`
          *,
          workout_plan_exercises(
            *,
            exercises(*)
          )
        `)
        .or(`created_by.eq.${profile.id},assigned_to.eq.${profile.id}`)
        .eq('is_active', true)
        .limit(20);
      
      if (data) {
        await setCacheItem(CACHE_KEYS.WORKOUTS, data, CACHE_TTL.LONG);
      }
      return data || [];
    } catch (error) {
      console.warn('[Preloader] Failed to preload workouts:', error);
      return [];
    }
  }, [profile?.id]);

  const preloadExercises = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('exercises')
        .select('*')
        .order('name')
        .limit(200);
      
      if (data) {
        await setCacheItem(CACHE_KEYS.EXERCISES, data, CACHE_TTL.WEEK);
      }
      return data || [];
    } catch (error) {
      console.warn('[Preloader] Failed to preload exercises:', error);
      return [];
    }
  }, []);

  const preloadMealPlans = useCallback(async () => {
    if (!profile?.id) return [];
    
    try {
      const { data } = await supabase
        .from('meal_plans')
        .select('*')
        .or(`created_by.eq.${profile.id},assigned_to.eq.${profile.id}`)
        .eq('is_active', true)
        .limit(10);
      
      if (data) {
        await setCacheItem(CACHE_KEYS.MEAL_PLANS, data, CACHE_TTL.LONG);
      }
      return data || [];
    } catch (error) {
      console.warn('[Preloader] Failed to preload meal plans:', error);
      return [];
    }
  }, [profile?.id]);

  const preloadWeightRecords = useCallback(async () => {
    if (!profile?.id) return [];
    
    try {
      const { data } = await supabase
        .from('weight_records')
        .select('*')
        .eq('profile_id', profile.id)
        .order('recorded_at', { ascending: false })
        .limit(30);
      
      if (data) {
        await setCacheItem(CACHE_KEYS.WEIGHT_RECORDS, data, CACHE_TTL.MEDIUM);
      }
      return data || [];
    } catch (error) {
      console.warn('[Preloader] Failed to preload weight records:', error);
      return [];
    }
  }, [profile?.id]);

  const preloadNotifications = useCallback(async () => {
    if (!profile?.id) return [];
    
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('profile_id', profile.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (data) {
        await setCacheItem(CACHE_KEYS.NOTIFICATIONS, data, CACHE_TTL.SHORT);
      }
      return data || [];
    } catch (error) {
      console.warn('[Preloader] Failed to preload notifications:', error);
      return [];
    }
  }, [profile?.id]);

  const preloadHydration = useCallback(async () => {
    if (!profile?.id) return [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    try {
      const { data } = await supabase
        .from('hydration_records')
        .select('*')
        .eq('profile_id', profile.id)
        .gte('recorded_at', today.toISOString())
        .order('recorded_at', { ascending: false });
      
      if (data) {
        await setCacheItem(CACHE_KEYS.HYDRATION, data, CACHE_TTL.SHORT);
      }
      return data || [];
    } catch (error) {
      console.warn('[Preloader] Failed to preload hydration:', error);
      return [];
    }
  }, [profile?.id]);

  // Preload all data for offline use
  const preloadAllData = useCallback(async () => {
    if (!profile?.id || isPreloadingRef.current || !navigator.onLine) return;
    
    isPreloadingRef.current = true;
    console.log('[Preloader] Starting data preload...');
    
    try {
      // Preload in parallel but prioritize critical data
      await Promise.allSettled([
        preloadProfile(),
        preloadWorkouts(),
        preloadExercises(),
      ]);
      
      // Secondary data
      await Promise.allSettled([
        preloadMealPlans(),
        preloadWeightRecords(),
        preloadNotifications(),
        preloadHydration(),
      ]);
      
      hasPreloadedRef.current = true;
      console.log('[Preloader] Data preload complete');
    } catch (error) {
      console.warn('[Preloader] Preload failed:', error);
    } finally {
      isPreloadingRef.current = false;
    }
  }, [
    profile?.id,
    preloadProfile,
    preloadWorkouts,
    preloadExercises,
    preloadMealPlans,
    preloadWeightRecords,
    preloadNotifications,
    preloadHydration,
  ]);

  // Get cached data
  const getCachedProfile = useCallback(async () => {
    return getCacheItem(CACHE_KEYS.PROFILE);
  }, []);

  const getCachedWorkouts = useCallback(async () => {
    return getCacheItem(CACHE_KEYS.WORKOUTS);
  }, []);

  const getCachedExercises = useCallback(async () => {
    return getCacheItem(CACHE_KEYS.EXERCISES);
  }, []);

  const getCachedMealPlans = useCallback(async () => {
    return getCacheItem(CACHE_KEYS.MEAL_PLANS);
  }, []);

  const getCachedWeightRecords = useCallback(async () => {
    return getCacheItem(CACHE_KEYS.WEIGHT_RECORDS);
  }, []);

  const getCachedNotifications = useCallback(async () => {
    return getCacheItem(CACHE_KEYS.NOTIFICATIONS);
  }, []);

  const getCachedHydration = useCallback(async () => {
    return getCacheItem(CACHE_KEYS.HYDRATION);
  }, []);

  // Auto-preload on mount when online
  useEffect(() => {
    if (profile?.id && navigator.onLine && !hasPreloadedRef.current) {
      // Delay preload to not block initial render
      const timer = setTimeout(preloadAllData, 2000);
      return () => clearTimeout(timer);
    }
  }, [profile?.id, preloadAllData]);

  // Preload when coming back online
  useEffect(() => {
    const handleOnline = () => {
      if (profile?.id) {
        setTimeout(preloadAllData, 1000);
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [profile?.id, preloadAllData]);

  return {
    preloadAllData,
    getCachedProfile,
    getCachedWorkouts,
    getCachedExercises,
    getCachedMealPlans,
    getCachedWeightRecords,
    getCachedNotifications,
    getCachedHydration,
    hasPreloaded: hasPreloadedRef.current,
  };
}

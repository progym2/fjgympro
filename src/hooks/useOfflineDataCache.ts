import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEnhancedOfflineSync } from './useEnhancedOfflineSync';
import { useAuth } from '@/contexts/AuthContext';

// Cache keys
const CACHE_KEYS = {
  WORKOUTS: 'cached_workouts',
  MEAL_PLANS: 'cached_meal_plans',
  PROFILE: 'cached_profile',
  WEIGHT_RECORDS: 'cached_weight_records',
  HYDRATION_SETTINGS: 'cached_hydration_settings',
};

// Cache TTL in milliseconds (24 hours)
const CACHE_TTL = 24 * 60 * 60 * 1000;

export function useOfflineDataCache() {
  const { profile } = useAuth();
  const { fetchWithCache, cacheData, isOnline } = useEnhancedOfflineSync();

  // Cache workouts
  const cacheWorkouts = useCallback(async () => {
    if (!profile?.profile_id) return null;

    const result = await fetchWithCache(
      CACHE_KEYS.WORKOUTS,
      async () => {
        const { data: plans } = await supabase
          .from('workout_plans')
          .select(`
            *,
            workout_plan_exercises (
              *,
              exercises (*)
            )
          `)
          .or(`assigned_to.eq.${profile.profile_id},and(created_by.eq.${profile.profile_id},is_instructor_plan.eq.false)`)
          .eq('is_active', true);

        return plans || [];
      },
      { ttlMs: CACHE_TTL, staleWhileRevalidate: true }
    );

    return result.data;
  }, [profile?.profile_id, fetchWithCache]);

  // Cache meal plans
  const cacheMealPlans = useCallback(async () => {
    if (!profile?.profile_id) return null;

    const result = await fetchWithCache(
      CACHE_KEYS.MEAL_PLANS,
      async () => {
        const { data: plans } = await supabase
          .from('meal_plans')
          .select('*')
          .or(`assigned_to.eq.${profile.profile_id},created_by.eq.${profile.profile_id}`)
          .eq('is_active', true);

        return plans || [];
      },
      { ttlMs: CACHE_TTL, staleWhileRevalidate: true }
    );

    return result.data;
  }, [profile?.profile_id, fetchWithCache]);

  // Cache weight records
  const cacheWeightRecords = useCallback(async () => {
    if (!profile?.profile_id) return null;

    const result = await fetchWithCache(
      CACHE_KEYS.WEIGHT_RECORDS,
      async () => {
        const { data: records } = await supabase
          .from('weight_records')
          .select('*')
          .eq('profile_id', profile.profile_id)
          .order('recorded_at', { ascending: false })
          .limit(100);

        return records || [];
      },
      { ttlMs: CACHE_TTL / 2, staleWhileRevalidate: true }
    );

    return result.data;
  }, [profile?.profile_id, fetchWithCache]);

  // Get workouts from cache (offline-first)
  const getWorkouts = useCallback(async () => {
    return cacheWorkouts();
  }, [cacheWorkouts]);

  // Get meal plans from cache (offline-first)
  const getMealPlans = useCallback(async () => {
    return cacheMealPlans();
  }, [cacheMealPlans]);

  // Get weight records from cache (offline-first)
  const getWeightRecords = useCallback(async () => {
    return cacheWeightRecords();
  }, [cacheWeightRecords]);

  // Pre-cache all data when online
  const preCacheAllData = useCallback(async () => {
    if (!isOnline || !profile?.profile_id) return;

    console.log('[OfflineCache] Pre-caching data for offline use...');
    
    await Promise.all([
      cacheWorkouts(),
      cacheMealPlans(),
      cacheWeightRecords(),
    ]);

    console.log('[OfflineCache] Pre-caching complete');
  }, [isOnline, profile?.profile_id, cacheWorkouts, cacheMealPlans, cacheWeightRecords]);

  // Auto pre-cache on mount if online
  useEffect(() => {
    if (isOnline && profile?.profile_id) {
      // Delay initial cache to not block initial render
      const timer = setTimeout(() => {
        preCacheAllData();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, profile?.profile_id, preCacheAllData]);

  return {
    getWorkouts,
    getMealPlans,
    getWeightRecords,
    preCacheAllData,
    isOnline,
  };
}
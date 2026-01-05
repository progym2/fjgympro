import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { UserRole } from '@/contexts/AuthContext';

interface PreloadedData {
  workoutPlans?: any[];
  notifications?: any[];
  linkedInstructor?: any;
  linkedStudents?: any[];
  payments?: any[];
  hydrationSettings?: any;
}

// Simple in-memory cache with TTL
const cache: { data: PreloadedData; timestamp: number; profileId: string } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

let preloadedDataCache: typeof cache = null;

export const useDataPreloader = () => {
  const isPreloading = useRef(false);

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
    // Skip if already preloading
    if (isPreloading.current) return;
    
    // Check cache
    if (
      preloadedDataCache &&
      preloadedDataCache.profileId === profileId &&
      Date.now() - preloadedDataCache.timestamp < CACHE_TTL
    ) {
      return preloadedDataCache.data;
    }

    isPreloading.current = true;

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
          // Master doesn't need preloading
          break;
      }

      // Store in cache
      preloadedDataCache = {
        data,
        timestamp: Date.now(),
        profileId,
      };

      return data;
    } catch (error) {
      console.error('Error preloading data:', error);
      return {};
    } finally {
      isPreloading.current = false;
    }
  }, []);

  const getCachedData = useCallback((profileId: string): PreloadedData | null => {
    if (
      preloadedDataCache &&
      preloadedDataCache.profileId === profileId &&
      Date.now() - preloadedDataCache.timestamp < CACHE_TTL
    ) {
      return preloadedDataCache.data;
    }
    return null;
  }, []);

  const clearCache = useCallback(() => {
    preloadedDataCache = null;
  }, []);

  return { preloadData, getCachedData, clearCache };
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

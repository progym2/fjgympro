import React, { createContext, useCallback, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session, User } from '@supabase/supabase-js';

export type UserRole = 'master' | 'admin' | 'instructor' | 'client';
export type LicenseType = 'demo' | 'trial' | 'full' | 'master';
export type LicenseStatus = 'active' | 'expired' | 'blocked';

interface License {
  type: LicenseType;
  status: LicenseStatus;
  expires_at: string | null;
  time_remaining_ms: number | null;
}

interface UserProfile {
  id: string; // auth user id
  profile_id: string; // public.profiles.id
  username: string;
  full_name: string | null;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  role: UserRole | null;
  license: License | null;
  isLoading: boolean;
  isLicenseValid: boolean;
  licenseTimeRemaining: number | null;
  licenseExpired: boolean;
  signIn: (
    username: string,
    password: string,
    panelType?: 'client' | 'instructor' | 'admin'
  ) => Promise<{ error: string | null; licenseExpired?: boolean; role?: UserRole }>;
  signOut: () => Promise<void>;
  clearDeviceSession: () => Promise<void>;
  checkLicenseStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [license, setLicense] = useState<License | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLicenseValid, setIsLicenseValid] = useState(false);
  const [licenseTimeRemaining, setLicenseTimeRemaining] = useState<number | null>(null);
  const [licenseExpired, setLicenseExpired] = useState(false);

  const clearAuthState = useCallback(() => {
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
    setLicense(null);
    setIsLicenseValid(false);
    setLicenseTimeRemaining(null);
    setLicenseExpired(false);
  }, []);

  const LAST_LOGOUT_STORAGE_KEY = 'francgym_last_logout';

  const writeLastLogout = useCallback((reason: string) => {
    try {
      localStorage.setItem(
        LAST_LOGOUT_STORAGE_KEY,
        JSON.stringify({ at: new Date().toISOString(), reason })
      );
    } catch {
      // ignore storage errors
    }
  }, []);

  const clearSupabaseAuthStorage = useCallback(() => {
    try {
      for (const key of Object.keys(localStorage)) {
        // Supabase v2 stores auth sessions like: sb-<project-ref>-auth-token
        if (key.startsWith('sb-') && key.includes('-auth-token')) {
          localStorage.removeItem(key);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const forceSignOut = useCallback(
    async (reason: string = 'Sessão encerrada') => {
      writeLastLogout(reason);
      try {
        // "local" avoids network dependency and clears client storage even if the server session is gone.
        await supabase.auth.signOut({ scope: 'local' as any });
      } catch {
        // If the session is already invalid, Supabase may throw; we still clear local storage below.
      } finally {
        clearSupabaseAuthStorage();
        clearAuthState();
      }
    },
    [clearAuthState, clearSupabaseAuthStorage, writeLastLogout]
  );

  const clearDeviceSession = useCallback(async () => {
    await forceSignOut('Sessão limpa neste dispositivo');
  }, [forceSignOut]);

  const applyLicenseState = useCallback(
    (licenseRow: any | null) => {
      if (!licenseRow) {
        setLicense(null);
        setIsLicenseValid(false);
        setLicenseExpired(true);
        setLicenseTimeRemaining(null);
        return;
      }

      let timeRemaining: number | null = null;
      if (licenseRow.expires_at) {
        timeRemaining = new Date(licenseRow.expires_at).getTime() - Date.now();
        if (timeRemaining < 0) timeRemaining = 0;
      }

      setLicense({
        type: licenseRow.license_type as LicenseType,
        status: licenseRow.status as LicenseStatus,
        expires_at: licenseRow.expires_at,
        time_remaining_ms: timeRemaining,
      });
      setLicenseTimeRemaining(timeRemaining);

      const isExpiredByTime = licenseRow.expires_at ? new Date(licenseRow.expires_at) < new Date() : false;
      const isValid = licenseRow.status === 'active' && !isExpiredByTime && (timeRemaining === null || timeRemaining > 0);

      setIsLicenseValid(isValid);
      setLicenseExpired(!isValid);
    },
    []
  );

  const checkLicenseStatusForProfile = useCallback(
    async (profileId: string) => {
      try {
        const { data: licenseRow, error } = await supabase
          .from('licenses')
          .select('*')
          .eq('profile_id', profileId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('Error checking license:', error);
          return;
        }

        // No license => block access completely
        if (!licenseRow) {
          await forceSignOut();
          return;
        }

        // Blocked/expired => block access completely
        const expiredByTime = licenseRow.expires_at ? new Date(licenseRow.expires_at) < new Date() : false;
        if (licenseRow.status === 'blocked' || licenseRow.status === 'expired' || expiredByTime) {
          applyLicenseState({ ...licenseRow, status: licenseRow.status === 'blocked' ? 'blocked' : 'expired' });
          await forceSignOut();
          return;
        }

        applyLicenseState(licenseRow);
      } catch (err) {
        console.error('Error in checkLicenseStatusForProfile:', err);
      }
    },
    [applyLicenseState, forceSignOut]
  );

  const checkLicenseStatus = useCallback(async () => {
    if (!profile?.profile_id) return;
    if (role === 'master') return;
    await checkLicenseStatusForProfile(profile.profile_id);
  }, [checkLicenseStatusForProfile, profile?.profile_id, role]);

  const hydrateUserContext = useCallback(
    async (activeSession: Session) => {
      try {
        const userId = activeSession.user.id;

        // Hydrate via backend to avoid RLS dead-ends when profile isn't linked yet.
        // IMPORTANT: send the access token explicitly to avoid races where the client still uses the anon token.
        const { data, error } = await supabase.functions.invoke('auth-hydrate', {
          headers: { Authorization: `Bearer ${activeSession.access_token}` },
        });

        if (error) {
          console.error('Error hydrating user (auth-hydrate):', error);
          await forceSignOut();
          return;
        }

        if (!data?.success || !data?.user) {
          console.error('Hydrate failed:', data?.error);
          await forceSignOut();
          return;
        }

        const resolvedRole = (data.user.role as UserRole | undefined) ?? 'client';

        setProfile({
          id: userId,
          profile_id: data.user.profile_id,
          username: data.user.username,
          full_name: data.user.full_name,
          email: data.user.email,
          role: resolvedRole,
        });
        setRole(resolvedRole);

        // Masters bypass license checks
        if (resolvedRole === 'master') {
          setIsLicenseValid(true);
          setLicenseExpired(false);
          setLicense({ type: 'master', status: 'active', expires_at: null, time_remaining_ms: null });
          setLicenseTimeRemaining(null);
          return;
        }

        applyLicenseState(
          data.license
            ? {
                license_type: data.license.type,
                status: data.license.status,
                expires_at: data.license.expires_at,
              }
            : null
        );

        // No license => block access
        if (!data.license) {
          await forceSignOut();
          return;
        }

        // Keep strict license validation (blocked/expired)
        if (data.license.status === 'blocked' || data.license.status === 'expired') {
          await forceSignOut();
          return;
        }

        // Final fallback check (ensures timers/expiration stay consistent)
        await checkLicenseStatusForProfile(data.user.profile_id);
      } finally {
        setIsLoading(false);
      }
    },
    [applyLicenseState, checkLicenseStatusForProfile, forceSignOut]
  );

  // Keep license status in sync while user is logged in
  useEffect(() => {
    if (!profile?.profile_id) return;
    if (role === 'master') return;

    // Check immediately
    checkLicenseStatusForProfile(profile.profile_id);

    // Subscribe to realtime changes on the licenses table
    const channel = supabase
      .channel('license-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'licenses',
          filter: `profile_id=eq.${profile.profile_id}`,
        },
        async (payload) => {
          console.log('License change detected:', payload.eventType);
          
          if (payload.eventType === 'DELETE') {
            // License was deleted - force logout immediately
            console.log('License deleted - forcing logout');
            await forceSignOut();
            return;
          }
          
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const newLicense = payload.new as any;
            
            if (newLicense.status === 'blocked' || newLicense.status === 'expired') {
              console.log('License blocked/expired - forcing logout');
              await forceSignOut();
              return;
            }
            
            // License was renewed/updated positively
            applyLicenseState(newLicense);
          }
        }
      )
      .subscribe();

    // Also check every 30 seconds as fallback
    const interval = setInterval(() => {
      checkLicenseStatusForProfile(profile.profile_id);
    }, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [applyLicenseState, checkLicenseStatusForProfile, forceSignOut, profile?.profile_id, role]);

  // Local countdown tick (UX) for demo/trial/full timers
  useEffect(() => {
    if (!license?.expires_at) return;
    if (license.type === 'master') return;

    const interval = setInterval(() => {
      setLicenseTimeRemaining((prev) => {
        if (prev === null) return prev;
        const next = prev - 1000;
        if (next <= 0) {
          setIsLicenseValid(false);
          setLicenseExpired(true);
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [license?.expires_at, license?.type]);

  // Session bootstrap + updates
  // Track if signIn already populated context (skip duplicate hydrate)
  const signInPopulatedRef = useRef(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (!newSession) {
        clearAuthState();
        setIsLoading(false);
        signInPopulatedRef.current = false;
        return;
      }

      // Skip hydrate if signIn already populated context
      if (signInPopulatedRef.current) {
        signInPopulatedRef.current = false;
        setIsLoading(false);
        return;
      }

      // Avoid calling Supabase APIs inside callback directly
      setTimeout(() => {
        hydrateUserContext(newSession);
      }, 0);
    });

    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);

      if (existingSession) {
        hydrateUserContext(existingSession);
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [clearAuthState, hydrateUserContext]);

  const parseAuthLoginInvokeError = useCallback(
    async (err: unknown): Promise<{ message: string; licenseExpired?: boolean }> => {
      const fallback = 'Erro ao conectar com o servidor';

      const anyErr = err as any;
      const response = anyErr?.context?.response;

      // supabase-js FunctionsHttpError includes a Response in `context.response`
      if (response && typeof response.json === 'function') {
        try {
          const body = await response.json();
          const status = body?.license?.status;

          if (status === 'expired' || status === 'blocked') {
            return { message: body?.error ?? fallback, licenseExpired: true };
          }

          if (typeof body?.error === 'string' && body.error.trim()) {
            return { message: body.error };
          }
        } catch {
          // ignore parsing errors
        }
      }

      if (typeof anyErr?.message === 'string' && anyErr.message.trim()) {
        return { message: anyErr.message };
      }

      return { message: fallback };
    },
    []
  );

  const signIn = useCallback(
    async (
      username: string,
      password: string,
      panelType?: 'client' | 'instructor' | 'admin'
    ): Promise<{ error: string | null; licenseExpired?: boolean; role?: UserRole }> => {
      try {
        setIsLoading(true);

        const { data, error } = await supabase.functions.invoke('auth-login', {
          body: {
            username: (username ?? '').trim(),
            password: (password ?? '').trim(),
            panelType: panelType || 'client',
          },
        });

        if (error) {
          console.error('Login function error:', error);
          const parsed = await parseAuthLoginInvokeError(error);
          return { error: parsed.message, licenseExpired: parsed.licenseExpired };
        }

        if (!data?.success) {
          if (data?.license?.status === 'expired' || data?.license?.status === 'blocked') {
            setLicenseExpired(true);
            return { error: data?.error ?? 'Licença expirada', licenseExpired: true };
          }
          return { error: data?.error ?? 'Erro ao fazer login' };
        }

        if (data.session) {
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });

          if (sessionError) {
            console.error('Session error:', sessionError);
            return { error: 'Erro ao estabelecer sessão' };
          }

          setSession(sessionData.session);
          setUser(sessionData.user);
          // Mark that signIn populated context - skip hydrate in onAuthStateChange
          signInPopulatedRef.current = true;
        }

        const userRole = data.user.role as UserRole;
        setProfile({
          id: data.user.id,
          profile_id: data.user.profile_id,
          username: data.user.username,
          full_name: data.user.full_name,
          email: data.user.email,
          role: userRole,
        });
        setRole(userRole);

        if (userRole === 'master') {
          setIsLicenseValid(true);
          setLicenseExpired(false);
          setLicense({ type: 'master', status: 'active', expires_at: null, time_remaining_ms: null });
          setLicenseTimeRemaining(null);
          return { error: null, role: userRole };
        }

        applyLicenseState(
          data.license
            ? {
                license_type: data.license.type,
                status: data.license.status,
                expires_at: data.license.expires_at,
              }
            : null
        );

        // If backend did not send a license, block access (safety)
        if (!data.license) {
          await forceSignOut('Licença não encontrada no login');
          return { error: 'Licença não encontrada. Procure o Master para ativar.' };
        }

        return { error: null, role: userRole };
      } catch (error) {
        console.error('Sign in error:', error);
        return { error: 'Erro ao fazer login' };
      } finally {
        setIsLoading(false);
      }
    },
    [applyLicenseState, forceSignOut, parseAuthLoginInvokeError]
  );

  const signOut = useCallback(async () => {
    await forceSignOut('Logout manual');
  }, [forceSignOut]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        license,
        isLoading,
        isLicenseValid,
        licenseTimeRemaining,
        licenseExpired,
        signIn,
        signOut,
        clearDeviceSession,
        checkLicenseStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LoginRequest {
  username: string;
  password: string;
  deviceInfo?: string;
  panelType?: 'client' | 'instructor' | 'admin';
}

interface LoginResponse {
  success: boolean;
  error?: string;
  user?: {
    id: string;
    email: string;
    profile_id: string;
    username: string;
    full_name: string | null;
    role: string;
  };
  license?: {
    type: string;
    status: string;
    expires_at: string | null;
    time_remaining_ms: number | null;
  };
  session?: {
    access_token: string;
    refresh_token: string;
  };
}

// Generate a unique session token
function generateSessionToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 64; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { username, password, deviceInfo, panelType }: LoginRequest = await req.json();

    const inputUsername = (username ?? "").trim();
    const inputPassword = (password ?? "").trim();
    const requestedPanel = panelType || 'client';

    console.log(`Login attempt for username: ${inputUsername} on panel: ${requestedPanel}`);

    // Check for demo account first (hardcoded)
    const demoAccount = inputUsername.toLowerCase() === "teste" && inputPassword === "2026";
    
    // Check for master credentials from database using secure function
    let masterCredential: { username: string; full_name: string | null } | null = null;
    
    // Use the secure validate_master_credentials function (password hash comparison)
    const { data: validationResult } = await supabaseAdmin.rpc('validate_master_credentials', {
      p_username: inputUsername.toLowerCase(),
      p_password: inputPassword
    });
    
    if (validationResult && validationResult.length > 0 && validationResult[0].is_valid) {
      masterCredential = {
        username: validationResult[0].username,
        full_name: validationResult[0].full_name
      };
    }

    // Build special account info
    type SpecialAccountInfo = { type: "demo" | "trial" | "master"; role: "client" | "admin" | "master"; fullName?: string };
    let specialAccount: SpecialAccountInfo | null = null;

    if (demoAccount) {
      specialAccount = { type: "demo", role: "client" };
    } else if (masterCredential) {
      specialAccount = { 
        type: "master", 
        role: "master",
        fullName: masterCredential.full_name || undefined
      };
    }

    if (specialAccount) {
      // Password already validated above for master credentials
      if (!demoAccount && !masterCredential) {
        console.log(`Invalid password for special account: ${inputUsername}`);
        return new Response(
          JSON.stringify({ success: false, error: "Senha incorreta. Verifique e tente novamente." } as LoginResponse),
          { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const normalizedUsername = inputUsername.toLowerCase();
      const email = `${normalizedUsername}@francgympro.local`;

      // Create anon client for session creation
      const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");
      const supabaseClient = createClient(supabaseUrl, anonKey!, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      // 1) Try to sign in first (covers the case where the auth user already exists)
      let { data: sessionData, error: sessionError } = await supabaseClient.auth.signInWithPassword({
        email,
        password: inputPassword,
      });

      // 2) If sign-in failed, create the auth user (or recover if already exists)
      if (sessionError) {
        const { error: authError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: inputPassword,
          email_confirm: true,
        });

        // If the user already exists, ensure the password matches what we're using (password rotation).
        if (authError?.code === "email_exists") {
          try {
            const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
              page: 1,
              perPage: 1000,
            });

            if (listError) {
              console.error("Error listing users:", listError);
            } else {
              const existingUser = usersData?.users?.find(
                (u: any) => (u.email ?? "").toLowerCase() === email.toLowerCase()
              );

              if (existingUser?.id) {
                const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
                  password: inputPassword,
                });

                if (updateError) {
                  console.error("Error updating user password:", updateError);
                }
              }
            }
          } catch (e) {
            console.error("Error recovering existing user:", e);
          }
        } else if (authError) {
          console.error("Error creating auth user:", authError);
          return new Response(
            JSON.stringify({ success: false, error: "Erro ao criar conta" } as LoginResponse),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        ({ data: sessionData, error: sessionError } = await supabaseClient.auth.signInWithPassword({
          email,
          password: inputPassword,
        }));

        if (sessionError) {
          console.error("Session error:", sessionError);
          return new Response(
            JSON.stringify({ success: false, error: "Erro ao autenticar" } as LoginResponse),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
      }

      const userId = sessionData.user?.id;
      if (!userId || !sessionData.session) {
        return new Response(
          JSON.stringify({ success: false, error: "Erro ao criar sessão" } as LoginResponse),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Fetch existing profile (prefer user_id, fallback to username - case-insensitive)
      let existingProfile: any = null;

      const { data: profileByUserId } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      existingProfile = profileByUserId;

      if (!existingProfile) {
        const { data: profileByUsername } = await supabaseAdmin
          .from("profiles")
          .select("*")
          .ilike("username", inputUsername);

        // ilike can return multiple only if there are duplicates by case; take first safely
        existingProfile = Array.isArray(profileByUsername) ? profileByUsername[0] : profileByUsername;
      }

      // If profile exists but user_id is missing OR points to a different auth user, attach it to this auth user.
      // This avoids logout loops where session is valid but RLS can't find the user's profile.
      if (existingProfile && existingProfile.user_id !== userId) {
        await supabaseAdmin
          .from("profiles")
          .update({ user_id: userId, email })
          .eq("id", existingProfile.id);

        existingProfile = { ...existingProfile, user_id: userId, email };
      }

      // Ensure profile exists
      if (!existingProfile) {
        const storedUsername = inputUsername.toUpperCase();
        const fullName = specialAccount.fullName 
          || (specialAccount.type === "master" 
            ? "Administrador Master"
            : specialAccount.type === "demo"
              ? "Usuário Demonstração"
              : "Usuário Trial");

        const { data: newProfile, error: profileError } = await supabaseAdmin
          .from("profiles")
          .insert({
            user_id: userId,
            username: storedUsername,
            email,
            full_name: fullName,
          })
          .select()
          .single();

        if (profileError) {
          console.error("Error creating profile:", profileError);
          return new Response(
            JSON.stringify({ success: false, error: "Erro ao criar perfil" } as LoginResponse),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        existingProfile = newProfile;
      }

      const profileId = existingProfile.id as string;

      // Ensure role exists
      await supabaseAdmin.from("user_roles").upsert(
        { user_id: userId, role: specialAccount.role },
        { onConflict: "user_id,role", ignoreDuplicates: true }
      );

      // Ensure license exists - NEVER reset demo/trial timers
      const { data: existingLicense } = await supabaseAdmin
        .from("licenses")
        .select("*")
        .eq("profile_id", profileId)
        .maybeSingle();

      const now = new Date();

      if (!existingLicense) {
        // Only create license if it doesn't exist (first login ever)
        const licenseData: Record<string, unknown> = {
          profile_id: profileId,
          license_key: `${specialAccount.type.toUpperCase()}-${Date.now()}`,
          license_type: specialAccount.type === "master" ? "master" : specialAccount.type,
          status: "active",
        };

        if (specialAccount.type === "demo") {
          licenseData.demo_started_at = now.toISOString();
          licenseData.expires_at = new Date(now.getTime() + 30 * 60 * 1000).toISOString(); // 30 min
        } else if (specialAccount.type === "trial") {
          licenseData.trial_started_at = now.toISOString();
          licenseData.expires_at = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
        }

        await supabaseAdmin.from("licenses").insert(licenseData);
      } else if (existingLicense.status === "expired") {
        // If license already expired, do NOT reset - keep expired
        console.log(`License already expired for ${inputUsername}, not resetting`);
      }
      // DO NOT reset demo/trial timer on subsequent logins - let it continue until expiration

      // Get (updated) license info
      const { data: licenseInfo } = await supabaseAdmin
        .from("licenses")
        .select("*")
        .eq("profile_id", profileId)
        .maybeSingle();

      let timeRemaining: number | null = null;
      if (licenseInfo?.expires_at) {
        timeRemaining = new Date(licenseInfo.expires_at).getTime() - Date.now();
        if (timeRemaining < 0) timeRemaining = 0;
      }

      // Check if demo/trial license has expired
      if (
        licenseInfo &&
        (specialAccount.type === "demo" || specialAccount.type === "trial") &&
        licenseInfo.expires_at &&
        new Date(licenseInfo.expires_at) < now
      ) {
        // Mark as expired
        await supabaseAdmin.from("licenses").update({ status: "expired" }).eq("id", licenseInfo.id);

        console.log(`License expired for special account: ${inputUsername}`);
        return new Response(
          JSON.stringify({
            success: false,
            error: specialAccount.type === "demo"
              ? "Período de demonstração expirado. Entre em contato para adquirir uma licença."
              : "Período de teste expirado. Entre em contato para adquirir uma licença.",
            license: {
              type: licenseInfo.license_type,
              status: "expired",
              expires_at: licenseInfo.expires_at,
              time_remaining_ms: 0,
            },
          } as LoginResponse),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // VALIDATE PANEL ACCESS - Only master can access all panels
      // For demo account (role: client), only allow client panel
      if (specialAccount.role !== 'master') {
        const allowedPanel = specialAccount.role === 'admin' ? 'admin' : specialAccount.role;
        if (requestedPanel !== allowedPanel) {
          const panelLabels: Record<string, string> = {
            client: 'Cliente',
            instructor: 'Instrutor', 
            admin: 'Gerente'
          };
          console.log(`Panel access denied for ${inputUsername}: has ${specialAccount.role}, tried ${requestedPanel}`);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: `Acesso negado. Suas credenciais são válidas apenas para o painel de ${panelLabels[allowedPanel]}. Cada credencial só pode acessar seu próprio painel.`
            } as LoginResponse),
            { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
      }

      const response: LoginResponse = {
        success: true,
        user: {
          id: userId,
          email,
          profile_id: profileId,
          username: existingProfile.username,
          full_name: existingProfile.full_name,
          role: specialAccount.role,
        },
        license: licenseInfo
          ? {
              type: licenseInfo.license_type,
              status: licenseInfo.status,
              expires_at: licenseInfo.expires_at,
              time_remaining_ms: timeRemaining,
            }
          : undefined,
        session: {
          access_token: sessionData.session.access_token,
          refresh_token: sessionData.session.refresh_token,
        },
      };

      console.log(`Login successful for special account: ${inputUsername}`);
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check pre-generated accounts first
    const { data: preGenAccount } = await supabaseAdmin
      .from("pre_generated_accounts")
      .select("*")
      .ilike("username", inputUsername)
      .eq("license_key", inputPassword)
      .maybeSingle();

    if (preGenAccount) {
      // Use pre-generated account
      console.log(`Using pre-generated account: ${inputUsername}`);
      
      const email = `${inputUsername.toLowerCase()}@francgympro.local`;
      const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");
      const supabaseClient = createClient(supabaseUrl, anonKey!, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      // Try to sign in or create user
      let { data: sessionData, error: sessionError } = await supabaseClient.auth.signInWithPassword({
        email,
        password: inputPassword,
      });

      if (sessionError) {
        const { error: authError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: inputPassword,
          email_confirm: true,
        });

        if (authError && authError.code !== "email_exists") {
          console.error("Error creating auth user:", authError);
          return new Response(
            JSON.stringify({ success: false, error: "Erro ao criar conta" } as LoginResponse),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        ({ data: sessionData, error: sessionError } = await supabaseClient.auth.signInWithPassword({
          email,
          password: inputPassword,
        }));

        if (sessionError) {
          console.error("Session error:", sessionError);
          return new Response(
            JSON.stringify({ success: false, error: "Erro ao autenticar" } as LoginResponse),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
      }

      const userId = sessionData?.user?.id;
      if (!userId || !sessionData.session) {
        return new Response(
          JSON.stringify({ success: false, error: "Erro ao criar sessão" } as LoginResponse),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Check/create profile
      let { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (!profile) {
        const fullName = preGenAccount.account_type === 'client' 
          ? `Cliente ${preGenAccount.username}`
          : preGenAccount.account_type === 'instructor'
            ? `Instrutor ${preGenAccount.username}`
            : preGenAccount.account_type === 'admin'
              ? `Gerente ${preGenAccount.username}`
              : `Trial ${preGenAccount.username}`;

        const { data: newProfile, error: profileError } = await supabaseAdmin
          .from("profiles")
          .insert({
            user_id: userId,
            username: preGenAccount.username.toUpperCase(),
            email,
            full_name: fullName,
          })
          .select()
          .single();

        if (profileError) {
          console.error("Error creating profile:", profileError);
          return new Response(
            JSON.stringify({ success: false, error: "Erro ao criar perfil" } as LoginResponse),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        profile = newProfile;
      }

      const profileId = profile.id as string;

      // Determine role based on account type
      let role: "client" | "instructor" | "admin" = "client";
      if (preGenAccount.account_type === "instructor") role = "instructor";
      else if (preGenAccount.account_type === "admin") role = "admin";

      await supabaseAdmin.from("user_roles").upsert(
        { user_id: userId, role },
        { onConflict: "user_id,role", ignoreDuplicates: true }
      );

      // Create/check license
      let { data: license } = await supabaseAdmin
        .from("licenses")
        .select("*")
        .eq("profile_id", profileId)
        .maybeSingle();

      const now = new Date();

      if (!license) {
        // If this pre-generated account was already used before and the license was removed,
        // DO NOT recreate it automatically. Only Master can renew.
        if (preGenAccount.is_used) {
          console.log(`Pre-generated account used but license missing: ${inputUsername}`);
          return new Response(
            JSON.stringify({
              success: false,
              error: "Sua licença foi removida. Procure o Master para renovar/reativar.",
            } as LoginResponse),
            { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        // Check if this is a DEMO or ADMIN demo account (30-minute duration)
        const isDemoAccount = preGenAccount.username.toUpperCase().startsWith('DEMO');
        const isAdminDemoAccount = preGenAccount.username.toUpperCase().startsWith('ADMIN') && preGenAccount.account_type === 'admin';
        const is30MinAccount = isDemoAccount || isAdminDemoAccount;
        
        const licenseType = is30MinAccount ? "demo" : (preGenAccount.account_type === "trial" ? "trial" : "full");
        
        // Calculate duration:
        // - Negative values = minutes (e.g., -30 = 30 minutes)
        // - Positive values = days (e.g., 7 = 7 days)
        // - DEMO and ADMIN demo accounts always get 30 minutes
        let durationMs: number;
        if (is30MinAccount) {
          durationMs = 30 * 60 * 1000; // 30 minutes
        } else if (preGenAccount.license_duration_days < 0) {
          // Negative value = minutes
          durationMs = Math.abs(preGenAccount.license_duration_days) * 60 * 1000;
        } else {
          // Positive value = days
          durationMs = preGenAccount.license_duration_days * 24 * 60 * 60 * 1000;
        }
        const expiresAt = new Date(now.getTime() + durationMs);

        const { data: newLicense } = await supabaseAdmin
          .from("licenses")
          .insert({
            profile_id: profileId,
            license_key: preGenAccount.license_key,
            license_type: licenseType,
            status: "active",
            started_at: now.toISOString(),
            expires_at: expiresAt.toISOString(),
            demo_started_at: is30MinAccount ? now.toISOString() : null,
            trial_started_at: preGenAccount.account_type === "trial" && !is30MinAccount ? now.toISOString() : null,
          })
          .select()
          .single();

        license = newLicense;

        // Mark pre-generated account as used
        await supabaseAdmin
          .from("pre_generated_accounts")
          .update({ is_used: true, used_by_profile_id: profileId, used_at: now.toISOString() })
          .eq("id", preGenAccount.id);
      }

      // Block if license status is not active
      if (license && license.status === "blocked") {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Sua licença está bloqueada. Procure o Master para reativar.",
            license: {
              type: license.license_type,
              status: "blocked",
              expires_at: license.expires_at,
              time_remaining_ms: 0,
            },
          } as LoginResponse),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      if (license && license.status === "expired") {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Sua licença expirou. Procure o Master para renovar.",
            license: {
              type: license.license_type,
              status: "expired",
              expires_at: license.expires_at,
              time_remaining_ms: 0,
            },
          } as LoginResponse),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Check if license expired by date
      if (license && license.expires_at && new Date(license.expires_at) < now) {
        await supabaseAdmin.from("licenses").update({ status: "expired" }).eq("id", license.id);

        return new Response(
          JSON.stringify({
            success: false,
            error: "Sua licença expirou. Entre em contato para renovar.",
            license: {
              type: license.license_type,
              status: "expired",
              expires_at: license.expires_at,
              time_remaining_ms: 0,
            },
          } as LoginResponse),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Handle single session control
      const sessionToken = generateSessionToken();

      // Invalidate existing sessions for this profile
      await supabaseAdmin
        .from("active_sessions")
        .delete()
        .eq("profile_id", profileId);

      // Create new session record
      await supabaseAdmin
        .from("active_sessions")
        .insert({
          profile_id: profileId,
          session_token: sessionToken,
          device_info: deviceInfo || "Unknown",
          is_valid: true,
        });

      let timeRemaining: number | null = null;
      if (license?.expires_at) {
        timeRemaining = new Date(license.expires_at).getTime() - Date.now();
        if (timeRemaining < 0) timeRemaining = 0;
      }

      // VALIDATE PANEL ACCESS for pre-generated accounts
      // Each credential type can only access its own panel
      // Trial accounts are treated as clients
      const effectiveRole = role === 'client' ? 'client' : role;
      if (requestedPanel !== effectiveRole) {
        const panelLabels: Record<string, string> = {
          client: 'Cliente',
          instructor: 'Instrutor', 
          admin: 'Gerente'
        };
        console.log(`Panel access denied for pre-gen ${inputUsername}: has ${role}, tried ${requestedPanel}`);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Acesso negado. Suas credenciais são válidas apenas para o painel de ${panelLabels[effectiveRole]}. Cada credencial só pode acessar seu próprio painel.`
          } as LoginResponse),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const response: LoginResponse = {
        success: true,
        user: {
          id: userId,
          email,
          profile_id: profileId,
          username: profile.username,
          full_name: profile.full_name,
          role,
        },
        license: license
          ? {
              type: license.license_type,
              status: license.status,
              expires_at: license.expires_at,
              time_remaining_ms: timeRemaining,
            }
          : undefined,
        session: {
          access_token: sessionData.session.access_token,
          refresh_token: sessionData.session.refresh_token,
        },
      };

      console.log(`Login successful for pre-generated account: ${inputUsername}`);
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Regular user login - verify using license_key as password
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .ilike("username", inputUsername)
      .maybeSingle();

    if (!profile) {
      console.log(`User not found: ${inputUsername}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Usuário não cadastrado no sistema. Você precisa de uma licença válida para acessar. Entre em contato com a administração da academia." 
        } as LoginResponse),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get license and verify license_key as password
    const { data: licenseCheck } = await supabaseAdmin
      .from("licenses")
      .select("*")
      .eq("profile_id", profile.id)
      .eq("license_key", inputPassword)
      .maybeSingle();

    if (!licenseCheck) {
      console.log(`Invalid license_key for: ${inputUsername}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Chave de licença inválida. Verifique se digitou corretamente ou entre em contato com a administração." 
        } as LoginResponse),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create email for auth system
    const email = profile.email || `${inputUsername.toLowerCase()}@francgympro.local`;

    // Try to sign in with auth
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseClient = createClient(supabaseUrl, anonKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let { data: sessionData, error: sessionError } = await supabaseClient.auth.signInWithPassword({
      email,
      password: inputPassword,
    });

    // If sign-in failed, create the auth user
    if (sessionError) {
      const { error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: inputPassword,
        email_confirm: true,
      });

      if (authError && authError.code !== "email_exists") {
        console.error("Error creating auth user:", authError);
        return new Response(
          JSON.stringify({ success: false, error: "Erro ao criar conta" } as LoginResponse),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      ({ data: sessionData, error: sessionError } = await supabaseClient.auth.signInWithPassword({
        email,
        password: inputPassword,
      }));

      if (sessionError) {
        console.error("Session error:", sessionError);
        return new Response(
          JSON.stringify({ success: false, error: "Erro ao autenticar" } as LoginResponse),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    const userId = sessionData?.user?.id;
    if (!userId || !sessionData.session) {
      return new Response(
        JSON.stringify({ success: false, error: "Erro ao criar sessão" } as LoginResponse),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Update profile with user_id/email if not set
    if (!profile.user_id || profile.user_id !== userId || profile.email !== email) {
      await supabaseAdmin
        .from("profiles")
        .update({ user_id: userId, email })
        .eq("id", profile.id);
    }

    // Determine role: admin/gerente = admin, cref = instructor, else = client
    let roleToAssign: "admin" | "instructor" | "client" = "client";
    const lower = inputUsername.toLowerCase();
    if (lower.startsWith("gerente") || lower.startsWith("admin")) {
      roleToAssign = "admin";
    } else if (profile.cref) {
      roleToAssign = "instructor";
    }

    await supabaseAdmin.from("user_roles").upsert(
      { user_id: userId, role: roleToAssign },
      { onConflict: "user_id,role", ignoreDuplicates: true }
    );

    const licenseInfo = licenseCheck;

    // Check license validity
    const now = new Date();
    if (licenseInfo) {
      if (licenseInfo.expires_at && new Date(licenseInfo.expires_at) < now) {
        await supabaseAdmin.from("licenses").update({ status: "expired" }).eq("id", licenseInfo.id);

        return new Response(
          JSON.stringify({
            success: false,
            error: "Sua licença expirou. Entre em contato para adquirir uma licença válida.",
            license: {
              type: licenseInfo.license_type,
              status: "expired",
              expires_at: licenseInfo.expires_at,
              time_remaining_ms: 0,
            },
          } as LoginResponse),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Handle single session control for commercial licenses
    const sessionToken = generateSessionToken();

    // Invalidate existing sessions for this profile
    await supabaseAdmin
      .from("active_sessions")
      .delete()
      .eq("profile_id", profile.id);

    // Create new session record
    await supabaseAdmin
      .from("active_sessions")
      .insert({
        profile_id: profile.id,
        session_token: sessionToken,
        device_info: deviceInfo || "Unknown",
        is_valid: true,
      });

    let timeRemaining: number | null = null;
    if (licenseInfo?.expires_at) {
      timeRemaining = new Date(licenseInfo.expires_at).getTime() - Date.now();
      if (timeRemaining < 0) timeRemaining = 0;
    }

    // VALIDATE PANEL ACCESS for regular users
    // Each credential type can only access its own panel
    if (requestedPanel !== roleToAssign) {
      const panelLabels: Record<string, string> = {
        client: 'Cliente',
        instructor: 'Instrutor', 
        admin: 'Gerente'
      };
      console.log(`Panel access denied for ${inputUsername}: has ${roleToAssign}, tried ${requestedPanel}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Acesso negado. Suas credenciais são válidas apenas para o painel de ${panelLabels[roleToAssign]}. Cada credencial só pode acessar seu próprio painel.`
        } as LoginResponse),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const response: LoginResponse = {
      success: true,
      user: {
        id: userId,
        email,
        profile_id: profile.id,
        username: profile.username,
        full_name: profile.full_name,
        role: roleToAssign,
      },
      license: licenseInfo
        ? {
            type: licenseInfo.license_type,
            status: licenseInfo.status,
            expires_at: licenseInfo.expires_at,
            time_remaining_ms: timeRemaining,
          }
        : undefined,
      session: {
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
      },
    };

    console.log(`Login successful for: ${inputUsername}`);
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error) {
    console.error('Login error:', error);
    return new Response(
      JSON.stringify({ success: false, error: "Erro interno do servidor" } as LoginResponse),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

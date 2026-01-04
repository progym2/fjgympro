import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type AppRole = "master" | "admin" | "instructor" | "client";

type HydrateResponse =
  | {
      success: true;
      user: {
        id: string;
        email: string;
        profile_id: string;
        username: string;
        full_name: string | null;
        role: AppRole;
      };
      license?: {
        type: string;
        status: string;
        expires_at: string | null;
        time_remaining_ms: number | null;
      };
    }
  | { success: false; error: string };

function guessUsernameFromEmail(email: string | null | undefined) {
  if (!email) return null;
  const at = email.indexOf("@");
  if (at <= 0) return null;
  return email.slice(0, at);
}

function deriveRoleFromProfile(profile: any): Exclude<AppRole, "master"> {
  const username = String(profile?.username ?? "").toLowerCase();
  if (username.startsWith("gerente") || username.startsWith("admin")) return "admin";
  if (profile?.cref) return "instructor";
  return "client";
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");

    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";

    const authed = createClient(supabaseUrl, anonKey!, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: userData, error: userError } = await authed.auth.getUser();

    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ success: false, error: "Não autenticado" } satisfies HydrateResponse), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const user = userData.user;

    // Service role client: can safely repair/profile-linking server-side.
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1) Find profile linked to this auth user
    let { data: profile } = await admin.from("profiles").select("*").eq("user_id", user.id).maybeSingle();

    // 2) If missing, try to attach by email-derived username or email
    if (!profile) {
      const email = user.email ?? null;
      const usernameGuess = guessUsernameFromEmail(email);

      if (usernameGuess) {
        const { data: byUsername } = await admin
          .from("profiles")
          .select("*")
          .ilike("username", usernameGuess)
          .maybeSingle();

        if (byUsername) {
          await admin.from("profiles").update({ user_id: user.id, email: byUsername.email ?? email }).eq("id", byUsername.id);
          profile = byUsername;
        }
      }

      if (!profile && email) {
        const { data: byEmail } = await admin.from("profiles").select("*").eq("email", email).maybeSingle();
        if (byEmail) {
          await admin.from("profiles").update({ user_id: user.id }).eq("id", byEmail.id);
          profile = byEmail;
        }
      }
    }

    if (!profile) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Seu perfil não está vinculado a este login. Procure o Master/administrador para vincular sua conta.",
        } satisfies HydrateResponse),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 3) Resolve role
    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();

    let resolvedRole: AppRole;
    if (roleRow?.role) {
      resolvedRole = roleRow.role as AppRole;
    } else {
      // Never auto-promote to master here.
      const derived = deriveRoleFromProfile(profile);
      resolvedRole = derived;
      await admin.from("user_roles").upsert({ user_id: user.id, role: derived }, { onConflict: "user_id,role", ignoreDuplicates: true });
    }

    // 4) License (latest)
    const { data: licenseRow } = await admin
      .from("licenses")
      .select("*")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let license: HydrateResponse extends infer _T ? any : never;
    if (licenseRow) {
      let timeRemaining: number | null = null;
      if (licenseRow.expires_at) {
        timeRemaining = new Date(licenseRow.expires_at).getTime() - Date.now();
        if (timeRemaining < 0) timeRemaining = 0;
      }

      license = {
        type: licenseRow.license_type,
        status: licenseRow.status,
        expires_at: licenseRow.expires_at,
        time_remaining_ms: timeRemaining,
      };
    }

    const res: HydrateResponse = {
      success: true,
      user: {
        id: user.id,
        email: user.email ?? (profile.email || `${String(profile.username).toLowerCase()}@francgympro.local`),
        profile_id: profile.id,
        username: profile.username,
        full_name: profile.full_name,
        role: resolvedRole,
      },
      license,
    };

    return new Response(JSON.stringify(res), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e) {
    console.error("auth-hydrate error:", e);
    return new Response(JSON.stringify({ success: false, error: "Erro interno do servidor" } satisfies HydrateResponse), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});

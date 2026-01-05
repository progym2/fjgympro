import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CleanupRequest {
  type: "master_credential" | "pre_generated_account" | "profile" | "license";
  id: string;
  username?: string; // For master_credential type
  skipTrash?: boolean; // If true, don't save to trash
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");

    // Verify caller is master
    const authHeader = req.headers.get("authorization") || "";
    const authed = createClient(supabaseUrl, anonKey!, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: userData, error: userError } = await authed.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ success: false, error: "Não autenticado" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check if caller is master
    const { data: roleData } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "master")
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ success: false, error: "Acesso negado. Somente Master pode executar esta ação." }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { type, id, username, skipTrash }: CleanupRequest = await req.json();

    console.log(`Cleanup request: type=${type}, id=${id}, username=${username}, skipTrash=${skipTrash}`);

    const cleanupResults: string[] = [];

    // Get the caller's profile_id for deleted_by
    const { data: callerProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    const callerProfileId = callerProfile?.id || null;

    // Helper to save item to trash before deleting
    const saveToTrash = async (table: string, originalId: string, itemData: any) => {
      if (skipTrash) {
        console.log(`Skipping trash for ${table}/${originalId} (skipTrash=true)`);
        return;
      }
      try {
        console.log(`Saving ${table}/${originalId} to trash...`);
        const { data, error } = await admin.from("deleted_items_trash").insert({
          original_table: table,
          original_id: originalId,
          item_data: itemData,
          deleted_by: callerProfileId,
        }).select();
        
        if (error) {
          console.error(`Failed to save ${table}/${originalId} to trash:`, error);
        } else {
          console.log(`Saved ${table}/${originalId} to trash successfully:`, data);
        }
      } catch (e) {
        console.error(`Exception saving ${table}/${originalId} to trash:`, e);
      }
    };

    if (type === "master_credential") {
      // Get the master credential before deleting
      const { data: masterCred } = await admin
        .from("master_credentials")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      
      if (masterCred) {
        await saveToTrash("master_credentials", id, masterCred);
      }

      // Find the email pattern for this master credential
      const normalizedUsername = (username || "").toLowerCase();
      const email = `${normalizedUsername}@francgympro.local`;

      // Find auth user by email
      const { data: usersData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const authUser = usersData?.users?.find(
        (u: any) => (u.email ?? "").toLowerCase() === email.toLowerCase()
      );

      if (authUser) {
        // Delete profile linked to this auth user
        const { data: profile } = await admin
          .from("profiles")
          .select("id")
          .eq("user_id", authUser.id)
          .maybeSingle();

        if (profile) {
          // Delete license
          await admin.from("licenses").delete().eq("profile_id", profile.id);
          cleanupResults.push("licenses");

          // Delete sessions
          await admin.from("active_sessions").delete().eq("profile_id", profile.id);
          cleanupResults.push("active_sessions");

          // Delete notifications
          await admin.from("notifications").delete().eq("profile_id", profile.id);
          cleanupResults.push("notifications");

          // Delete profile
          await admin.from("profiles").delete().eq("id", profile.id);
          cleanupResults.push("profile");
        }

        // Delete user_roles
        await admin.from("user_roles").delete().eq("user_id", authUser.id);
        cleanupResults.push("user_roles");

        // Delete auth user
        await admin.auth.admin.deleteUser(authUser.id);
        cleanupResults.push("auth_user");
      }

      // Finally delete the master_credential itself
      await admin.from("master_credentials").delete().eq("id", id);
      cleanupResults.push("master_credential");

    } else if (type === "pre_generated_account") {
      // Get the pre-generated account details
      const { data: preGen } = await admin
        .from("pre_generated_accounts")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (preGen) {
        await saveToTrash("pre_generated_accounts", id, preGen);
        const email = `${preGen.username.toLowerCase()}@francgympro.local`;

        // Find auth user
        const { data: usersData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const authUser = usersData?.users?.find(
          (u: any) => (u.email ?? "").toLowerCase() === email.toLowerCase()
        );

        if (authUser) {
          // Find profile
          const { data: profile } = await admin
            .from("profiles")
            .select("id")
            .eq("user_id", authUser.id)
            .maybeSingle();

          if (profile) {
            // Cleanup profile-related data
            await admin.from("licenses").delete().eq("profile_id", profile.id);
            cleanupResults.push("licenses");

            await admin.from("active_sessions").delete().eq("profile_id", profile.id);
            cleanupResults.push("active_sessions");

            await admin.from("notifications").delete().eq("profile_id", profile.id);
            cleanupResults.push("notifications");

            await admin.from("workout_logs").delete().eq("profile_id", profile.id);
            cleanupResults.push("workout_logs");

            await admin.from("weight_records").delete().eq("profile_id", profile.id);
            cleanupResults.push("weight_records");

            await admin.from("hydration_records").delete().eq("profile_id", profile.id);
            cleanupResults.push("hydration_records");

            await admin.from("personal_records").delete().eq("profile_id", profile.id);
            cleanupResults.push("personal_records");

            // Delete instructor_clients where this profile is client or instructor
            await admin.from("instructor_clients").delete().eq("client_id", profile.id);
            await admin.from("instructor_clients").delete().eq("instructor_id", profile.id);
            cleanupResults.push("instructor_clients");

            await admin.from("profiles").delete().eq("id", profile.id);
            cleanupResults.push("profile");
          }

          await admin.from("user_roles").delete().eq("user_id", authUser.id);
          cleanupResults.push("user_roles");

          await admin.auth.admin.deleteUser(authUser.id);
          cleanupResults.push("auth_user");
        }

        // Delete the pre-generated account
        await admin.from("pre_generated_accounts").delete().eq("id", id);
        cleanupResults.push("pre_generated_account");
      }

    } else if (type === "profile") {
      // Delete profile and all related data
      const { data: profile } = await admin
        .from("profiles")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (profile) {
        await saveToTrash("profiles", id, profile);
        console.log(`Deleting profile ${profile.id} with user_id ${profile.user_id}`);
        
        // Delete workout_exercise_logs first (depends on workout_logs)
        const { data: workoutLogs } = await admin
          .from("workout_logs")
          .select("id")
          .eq("profile_id", profile.id);
        
        if (workoutLogs && workoutLogs.length > 0) {
          const logIds = workoutLogs.map(l => l.id);
          await admin.from("workout_exercise_logs").delete().in("workout_log_id", logIds);
          cleanupResults.push("workout_exercise_logs");
        }
        
        // Delete personal_records (depends on workout_logs)
        await admin.from("personal_records").delete().eq("profile_id", profile.id);
        cleanupResults.push("personal_records");
        
        // Delete workout_logs
        await admin.from("workout_logs").delete().eq("profile_id", profile.id);
        cleanupResults.push("workout_logs");
        
        // Delete workout_plan_exercises first (depends on workout_plans)
        const { data: workoutPlans } = await admin
          .from("workout_plans")
          .select("id")
          .or(`assigned_to.eq.${profile.id},created_by.eq.${profile.id}`);
        
        if (workoutPlans && workoutPlans.length > 0) {
          const planIds = workoutPlans.map(p => p.id);
          await admin.from("workout_plan_exercises").delete().in("workout_plan_id", planIds);
          cleanupResults.push("workout_plan_exercises");
        }
        
        // Delete workout_plans
        await admin.from("workout_plans").delete().eq("assigned_to", profile.id);
        await admin.from("workout_plans").delete().eq("created_by", profile.id);
        cleanupResults.push("workout_plans");
        
        // Delete meal_plans
        await admin.from("meal_plans").delete().eq("assigned_to", profile.id);
        await admin.from("meal_plans").delete().eq("created_by", profile.id);
        cleanupResults.push("meal_plans");
        
        // Delete payments (depends on payment_plans)
        await admin.from("payments").delete().eq("client_id", profile.id);
        await admin.from("payments").delete().eq("instructor_id", profile.id);
        cleanupResults.push("payments");
        
        // Delete payment_plans
        await admin.from("payment_plans").delete().eq("client_id", profile.id);
        await admin.from("payment_plans").delete().eq("instructor_id", profile.id);
        await admin.from("payment_plans").delete().eq("created_by", profile.id);
        cleanupResults.push("payment_plans");
        
        // Delete exercise_favorites
        await admin.from("exercise_favorites").delete().eq("profile_id", profile.id);
        cleanupResults.push("exercise_favorites");
        
        // Delete hydration_settings
        await admin.from("hydration_settings").delete().eq("profile_id", profile.id);
        cleanupResults.push("hydration_settings");
        
        // Delete user_theme_preferences
        await admin.from("user_theme_preferences").delete().eq("profile_id", profile.id);
        cleanupResults.push("user_theme_preferences");
        
        // Delete access_logs
        await admin.from("access_logs").delete().eq("profile_id", profile.id);
        await admin.from("access_logs").delete().eq("registered_by", profile.id);
        cleanupResults.push("access_logs");
        
        // Delete licenses
        await admin.from("licenses").delete().eq("profile_id", profile.id);
        await admin.from("licenses").delete().eq("created_by", profile.id);
        cleanupResults.push("licenses");
        
        // Delete active_sessions
        await admin.from("active_sessions").delete().eq("profile_id", profile.id);
        cleanupResults.push("active_sessions");
        
        // Delete notifications
        await admin.from("notifications").delete().eq("profile_id", profile.id);
        cleanupResults.push("notifications");
        
        // Delete hydration_records
        await admin.from("hydration_records").delete().eq("profile_id", profile.id);
        cleanupResults.push("hydration_records");
        
        // Delete weight_records
        await admin.from("weight_records").delete().eq("profile_id", profile.id);
        cleanupResults.push("weight_records");
        
        // Delete instructor_clients
        await admin.from("instructor_clients").delete().eq("client_id", profile.id);
        await admin.from("instructor_clients").delete().eq("instructor_id", profile.id);
        cleanupResults.push("instructor_clients");
        
        // Delete exercises created by this user
        await admin.from("exercises").delete().eq("created_by", profile.id);
        cleanupResults.push("exercises");
        
        // Update profiles that were created by this admin (set to null)
        await admin.from("profiles").update({ created_by_admin: null }).eq("created_by_admin", profile.id);
        cleanupResults.push("updated_created_by_admin");

        // Clear references from pre_generated_accounts (FKs)
        await admin
          .from("pre_generated_accounts")
          .update({ used_by_profile_id: null, used_at: null, is_used: false })
          .eq("used_by_profile_id", profile.id);
        await admin.from("pre_generated_accounts").update({ created_by: null }).eq("created_by", profile.id);
        cleanupResults.push("pre_generated_accounts_refs_cleared");

        // Delete the profile (must happen before deleting auth user to avoid leaving orphaned records)
        const { error: profileError } = await admin.from("profiles").delete().eq("id", profile.id);
        if (profileError) {
          console.error("Error deleting profile:", profileError);
          throw new Error(`Erro ao excluir perfil: ${profileError.message}`);
        }
        cleanupResults.push("profile");

        // Delete auth user last (best-effort)
        if (profile.user_id) {
          await admin.from("user_roles").delete().eq("user_id", profile.user_id);
          cleanupResults.push("user_roles");

          const { error: authError } = await admin.auth.admin.deleteUser(profile.user_id);
          if (authError) {
            console.error("Error deleting auth user:", authError);
          } else {
            cleanupResults.push("auth_user");
          }
        }
      } else {
        console.log(`Profile ${id} not found`);
      }

    } else if (type === "license") {
      // Get the license before deleting
      const { data: license } = await admin
        .from("licenses")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      
      if (license) {
        await saveToTrash("licenses", id, license);
      }
      
      // Delete the license
      await admin.from("licenses").delete().eq("id", id);
      cleanupResults.push("license");
    }

    console.log(`Cleanup completed: ${cleanupResults.join(", ")}`);

    return new Response(
      JSON.stringify({
        success: true,
        cleaned: cleanupResults,
        message: `Limpeza concluída: ${cleanupResults.join(", ")}`,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Erro ao limpar dados";
    console.error("Cleanup error:", error);
    return new Response(
      JSON.stringify({ success: false, error: errMsg }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

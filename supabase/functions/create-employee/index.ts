import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the caller is an admin
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    
    const { data: { user: callerUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !callerUser) {
      return new Response(
        JSON.stringify({ error: "No autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if caller is admin
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerUser.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Solo administradores pueden crear empleados" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get caller's workshop_id
    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("workshop_id")
      .eq("user_id", callerUser.id)
      .maybeSingle();

    const callerWorkshopId = callerProfile?.workshop_id;

    if (!callerWorkshopId) {
      return new Response(
        JSON.stringify({ error: "No se encontró el taller del administrador" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check employee limit based on plan
    const { data: workshopData } = await supabaseAdmin
      .from("workshops")
      .select("plan_id")
      .eq("id", callerWorkshopId)
      .maybeSingle();

    if (workshopData?.plan_id) {
      const { data: planData } = await supabaseAdmin
        .from("plans")
        .select("max_employees")
        .eq("id", workshopData.plan_id)
        .maybeSingle();

      if (planData?.max_employees) {
        const { count } = await supabaseAdmin
          .from("employees")
          .select("id", { count: "exact", head: true })
          .eq("workshop_id", callerWorkshopId)
          .eq("is_active", true);

        if (count !== null && count >= planData.max_employees) {
          return new Response(
            JSON.stringify({ error: `Has alcanzado el límite de ${planData.max_employees} empleados para tu plan. Actualiza tu plan para agregar más.` }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Get request body
    const { email, password, fullName, commissionRate, baseSalary } = await req.json();

    if (!email || !password || !fullName || commissionRate === undefined) {
      return new Response(
        JSON.stringify({ error: "Faltan campos requeridos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if there's an existing user with this email
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);
    
    if (existingUser) {
      // Check if there's an inactive employee for this user
      const { data: existingEmployee } = await supabaseAdmin
        .from("employees")
        .select("*")
        .eq("user_id", existingUser.id)
        .maybeSingle();
      
      if (existingEmployee) {
        if (!existingEmployee.is_active) {
          // Reactivate the employee and assign workshop
          const { data: reactivatedEmployee, error: reactivateError } = await supabaseAdmin
            .from("employees")
            .update({
              is_active: true,
              monthly_commission_rate: commissionRate,
              base_salary: baseSalary || 0,
              workshop_id: callerWorkshopId,
            })
            .eq("id", existingEmployee.id)
            .select()
            .single();

          // Link profile to workshop
          if (!reactivateError) {
            await supabaseAdmin
              .from("profiles")
              .update({ workshop_id: callerWorkshopId })
              .eq("user_id", existingUser.id);
          }
          
          if (reactivateError) {
            return new Response(
              JSON.stringify({ error: reactivateError.message }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          
          // Update password if provided
          await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
            password,
          });
          
          return new Response(
            JSON.stringify({ 
              success: true, 
              employee: reactivatedEmployee,
              user_id: existingUser.id,
              reactivated: true,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          return new Response(
            JSON.stringify({ error: "Ya existe un empleado activo con este correo electrónico" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // 1. Create the auth user using admin client
    const { data: authData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm the email
      user_metadata: { full_name: fullName },
    });

    if (createUserError) {
      console.error("Error creating user:", createUserError);
      return new Response(
        JSON.stringify({ error: createUserError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newUserId = authData.user.id;

    // 2. Wait a bit for the trigger to create the profile
    await new Promise(resolve => setTimeout(resolve, 500));

    // 3. Get the profile and link to workshop
    const { data: profileData } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("user_id", newUserId)
      .maybeSingle();

    // Link profile to workshop
    await supabaseAdmin
      .from("profiles")
      .update({ workshop_id: callerWorkshopId })
      .eq("user_id", newUserId);

    // 4. Add technician role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: newUserId, role: "technician" });

    if (roleError) {
      console.error("Error creating role:", roleError);
    }

    // 5. Create employee record with workshop_id
    const { data: employeeData, error: employeeError } = await supabaseAdmin
      .from("employees")
      .insert({
        user_id: newUserId,
        profile_id: profileData?.id,
        monthly_commission_rate: commissionRate,
        base_salary: baseSalary || 0,
        workshop_id: callerWorkshopId,
      })
      .select()
      .single();

    if (employeeError) {
      console.error("Error creating employee:", employeeError);
      return new Response(
        JSON.stringify({ error: employeeError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        employee: employeeData,
        user_id: newUserId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
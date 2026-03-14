import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { item_id, body, fit_rating, quality_rating } = await req.json();

  if (!item_id || !body || !fit_rating || !quality_rating) {
    return new Response(JSON.stringify({ error: "missing_fields" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Gate check 1: user owns the item
  const { data: ownershipCheck } = await supabase
    .from("closet_entries")
    .select("id")
    .eq("user_id", user.id)
    .eq("item_id", item_id)
    .eq("entry_type", "owned")
    .maybeSingle();

  if (!ownershipCheck) {
    return new Response(JSON.stringify({ error: "not_owner" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Gate check 2: user owns ≥3 active items total
  const { data: activeCount } = await supabase.rpc("count_owned_active_items", {
    p_user_id: user.id,
  });

  if (!activeCount || activeCount < 3) {
    return new Response(JSON.stringify({ error: "insufficient_items" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Both gates pass — insert the review
  const { data: review, error: insertError } = await supabase
    .from("reviews")
    .insert({
      user_id: user.id,
      item_id,
      body,
      fit_rating,
      quality_rating,
    })
    .select()
    .single();

  if (insertError) {
    const code = insertError.code === "23505" ? "already_reviewed" : "insert_failed";
    return new Response(JSON.stringify({ error: code }), {
      status: 409,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ data: review }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

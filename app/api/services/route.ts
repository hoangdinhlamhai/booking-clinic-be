import { supabaseAdmin } from "@/app/lib/supabase/admin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("services")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data ?? []);
}

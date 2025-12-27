export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const phone = searchParams.get("phone");
  const status = searchParams.get("status");
  const clinicId = searchParams.get("clinicId");

  const page = Number(searchParams.get("page") ?? 1);
  const limit = Number(searchParams.get("limit") ?? 20);

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabaseAdmin
    .from("admin_booking_overview")
    .select("*", { count: "exact" })
    .order("booking_time", { ascending: false })
    .range(from, to);

  if (clinicId) query = query.eq("clinic_id", clinicId);
  if (phone) query = query.ilike("patient_phone", `%${phone}%`);
  if (status && status !== "all")
    query = query.eq("booking_status", status);

  const { data, count, error } = await query;

  if (error) {
    console.error("ADMIN BOOKINGS ERROR:", error);
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({
    data: data ?? [],
    total: count ?? 0,
    page,
    limit,
  });
}

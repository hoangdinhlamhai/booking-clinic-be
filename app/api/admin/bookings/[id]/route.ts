
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase/admin";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: bookingId } = await context.params;

  const { data: booking, error } = await supabaseAdmin
    .from("admin_booking_overview")
    .select("*")
    .eq("booking_id", bookingId)
    .single();

  if (error || !booking) {
    return NextResponse.json(
      { error: "Booking not found" },
      { status: 404 }
    );
  }
  const { data: history } = await supabaseAdmin
    .from("admin_booking_overview")
    .select("*")
    .eq("patient_phone", booking.patient_phone)
    .order("booking_time", { ascending: false });

  return NextResponse.json({
    booking,
    history: history ?? [],
  });
}

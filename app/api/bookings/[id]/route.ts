import { supabaseAdmin } from "@/app/lib/supabase/admin";

function isExpired(createdAt: string, minutes = 5) {
  const created = new Date(createdAt + "Z").getTime();
  return Date.now() - created > minutes * 60 * 1000;
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: bookingId } = await context.params;

  if (!bookingId) {
    return Response.json({ message: "MISSING_ID" }, { status: 400 });
  }

  const { data: booking, error } = await supabaseAdmin
    .from("bookings")
    .select(`
      id,
      status,
      created_at,
      payments (
        amount,
        status
      )
    `)
    .eq("id", bookingId)
    .single();

  if (error || !booking) {
    return Response.json({ message: "NOT_FOUND" }, { status: 404 });
  }
 const amount = 2000;
  if (
    booking.status === "pending" &&
    booking.created_at &&
    isExpired(booking.created_at, 5)
  ) {
    await supabaseAdmin
      .from("bookings")
      .update({ status: "expired" })
      .eq("id", bookingId);

    return Response.json({
      id: booking.id,
      status: "expired",
      amount,
      created_at: booking.created_at,
    });
  }

  return Response.json({
    id: booking.id,
    status: booking.status,
    amount,
    created_at: booking.created_at,
  });
}

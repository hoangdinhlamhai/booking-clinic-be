import { supabaseAdmin } from "@/app/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    console.log("🔔 SEPAY WEBHOOK PAYLOAD:", payload);

    if (payload?.transferType !== "in") {
      return Response.json({ ok: true });
    }

    const rawContent =
      payload?.content ??
      payload?.description ??
      "";

    if (!rawContent.includes("DATLICH")) {
      console.error("❌ NO DATLICH TAG:", rawContent);
      return Response.json({ ok: true });
    }

    let bookingId = rawContent.replace("BankAPINotify", "").trim();

    if (bookingId.startsWith("DATLICH_")) {
      bookingId = bookingId.replace("DATLICH_", "");
    } else if (bookingId.startsWith("DATLICH")) {
      bookingId = bookingId.replace("DATLICH", "");
    }

    bookingId = bookingId.trim();

    if (!bookingId) {
      console.error("❌ EMPTY BOOKING ID");
      return Response.json({ ok: true });
    }

    const paidAmount = Number(payload?.transferAmount ?? 0);

    const { data: booking, error: bookingErr } = await supabaseAdmin
      .from("bookings")
      .select("id, status")
      .eq("id", bookingId)
      .single();

    if (bookingErr || !booking) {
      console.error("❌ BOOKING NOT FOUND:", bookingId);
      return Response.json({ ok: true });
    }

    if (booking.status === "paid") {
      return Response.json({ ok: true, alreadyPaid: true });
    }

    const { data: payment, error: payErr } = await supabaseAdmin
      .from("payments")
      .select("id, amount, status")
      .eq("booking_id", booking.id)
      .eq("status", "pending")
      .single();

    if (payErr || !payment) {
      console.error("❌ PAYMENT NOT FOUND:", bookingId);
      return Response.json({ ok: true });
    }

    if (paidAmount < Number(payment.amount)) {
      console.error(
        "❌ AMOUNT NOT ENOUGH:",
        paidAmount,
        "EXPECTED:",
        payment.amount
      );
      return Response.json({ ok: true });
    }

    await supabaseAdmin
      .from("payments")
      .update({
        status: "paid",
        method: "sepay",
        transaction_code: payload?.referenceCode ?? null,
        payment_date: new Date().toISOString(),
      })
      .eq("id", payment.id)

    await supabaseAdmin
      .from("bookings")
      .update({ status: "paid" })
      .eq("id", booking.id);

    console.log("✅ BOOKING PAID:", bookingId);

    return Response.json({ success: true });
  } catch (err) {
    console.error("🔥 SEPAY WEBHOOK ERROR:", err);
    return Response.json({ error: "WEBHOOK_ERROR" }, { status: 500 });
  }
}

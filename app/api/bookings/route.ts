import { supabaseAdmin } from "@/app/lib/supabase/admin";
import { getServerSession } from "next-auth";
import { decode } from "next-auth/jwt";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  let userId = session?.user?.id;
  let userEmail = session?.user?.email;

  if (!userEmail) {
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        const decoded = await decode({
          token,
          secret: process.env.NEXTAUTH_SECRET || "secret",
        });

        if (decoded?.email) {
          userId = decoded.userId as string;
          userEmail = decoded.email as string;
        }
      } catch (error) {
        console.error("Error decoding token:", error);
      }
    }
  }

  if (!userEmail) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const { data: booking, error: bookingError } = await supabaseAdmin
    .from("bookings")
    .insert({
      user_id: userId ?? null,
      clinic_id: body.clinic,
      service_id: body.service,
      patient_name: body.name,
      patient_phone: body.phone,
      gender: body.gender ?? null,
      age: body.age ?? null,
      symptoms: body.symptoms ?? null,
      booking_time: body.booking_time,
      status: "pending",
    })
    .select("id")
    .single();

  if (bookingError || !booking) {
    return Response.json(
      { error: bookingError?.message ?? "Create booking failed" },
      { status: 500 }
    );
  }

  const { error: paymentError } = await supabaseAdmin
    .from("payments")
    .insert({
      booking_id: booking.id,
      amount: body.amount,
      method: "banking",
      status: "pending",
    });

  if (paymentError) {
    return Response.json(
      { error: paymentError.message },
      { status: 500 }
    );
  }

  return Response.json({
    bookingId: booking.id,
  });
}

import { supabaseAdmin } from "@/app/lib/supabase/admin";

type SlotStat = {
  time: string;
  capacity: number;
  booked: number;
  available: number;
};

function timeToMinutes(t: string) {
  const [hh, mm] = t.split(":");
  return Number(hh) * 60 + Number(mm);
}

function minutesToHHMM(mins: number) {
  const hh = String(Math.floor(mins / 60)).padStart(2, "0");
  const mm = String(mins % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const clinic_id = searchParams.get("clinic_id");
    const service_id = searchParams.get("service_id");
    const date = searchParams.get("date");

    if (!clinic_id || !service_id || !date) {
      return Response.json({ error: "Missing query params" }, { status: 400 });
    }

    const { data: service, error: serviceErr } = await supabaseAdmin
      .from("services")
      .select("duration_minutes")
      .eq("id", service_id)
      .single();

    if (serviceErr || !service) {
      return Response.json({ error: "Service not found" }, { status: 404 });
    }
    const duration = service.duration_minutes ?? 30;

    const { data: doctors, error: docErr } = await supabaseAdmin
      .from("doctors")
      .select("id, doctor_services!inner(service_id)")
      .eq("clinic_id", clinic_id)
      .eq("is_available", true)
      .eq("doctor_services.service_id", service_id);

    if (docErr) {
      return Response.json({ error: docErr.message }, { status: 500 });
    }
    if (!doctors?.length) return Response.json([]);

    const doctorIds = doctors.map((d) => d.id);

    const { data: schedules, error: schErr } = await supabaseAdmin
      .from("doctor_schedules")
      .select("doctor_id, start_time, end_time, max_patients")
      .eq("date", date)
      .eq("is_available", true)
      .in("doctor_id", doctorIds);

    if (schErr) {
      return Response.json({ error: schErr.message }, { status: 500 });
    }
    if (!schedules?.length) return Response.json([]);

    const { data: bookings, error: bookErr } = await supabaseAdmin
      .from("bookings")
      .select("booking_time")
      .eq("clinic_id", clinic_id)
      .eq("service_id", service_id)
      .in("status", ["pending", "paid"])
      .gte("booking_time", `${date} 00:00:00`)
      .lte("booking_time", `${date} 23:59:59`);

    if (bookErr) {
      return Response.json({ error: bookErr.message }, { status: 500 });
    }

    const bookedByTime = new Map<string, number>();
    for (const b of bookings ?? []) {
      const hhmm = String(b.booking_time).slice(11, 16);
      bookedByTime.set(hhmm, (bookedByTime.get(hhmm) ?? 0) + 1);
    }

    const capacityByTime = new Map<string, number>();

    for (const s of schedules) {
      const start = timeToMinutes(String(s.start_time));
      const end = timeToMinutes(String(s.end_time));
      const capPerSlot = s.max_patients ?? 0;

      for (let t = start; t + duration <= end; t += duration) {
        const hhmm = minutesToHHMM(t);
        capacityByTime.set(hhmm, (capacityByTime.get(hhmm) ?? 0) + capPerSlot);
      }
    }

    const result: SlotStat[] = Array.from(capacityByTime.entries())
      .map(([time, capacity]) => {
        const booked = bookedByTime.get(time) ?? 0;
        const available = Math.max(capacity - booked, 0);
        return { time, capacity, booked, available };
      })
      .filter((s) => s.available > 0)
      .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

    return Response.json(result);
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

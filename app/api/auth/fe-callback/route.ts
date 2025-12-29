import { NextResponse } from "next/server";

export async function GET(request: Request) {
    // Logic: Backend nhận callback từ NextAuth (đã có session cookie)
    // Nhiệm vụ: Redirect về Frontend kèm theo cookie session

    // NOTE: Trong thực tế FE/BE tách rời, Cookie của BE (booking-clinic-be.vercel.app) 
    // sẽ được set trên domain của BE. 
    // FE (localhost:3000) cần gọi API BE với `credentials: include` để gửi cookie này.

    const frontendUrl = "http://localhost:3000"; // Hoặc lấy từ ENV
    return NextResponse.redirect(`${frontendUrl}/`);
}

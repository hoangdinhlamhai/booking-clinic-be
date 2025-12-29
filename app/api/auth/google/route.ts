import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const callbackUrl = searchParams.get("callbackUrl"); // Optional: support dynamic return

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const backendUrl = process.env.NEXTAUTH_URL || "https://booking-clinic-be.vercel.app";
    // Ensure this matches exactly what is in Google Cloud Console
    const redirectUri = `${backendUrl}/api/auth/google/callback`;

    if (!clientId) {
        return NextResponse.json({ error: "Missing GOOGLE_CLIENT_ID" }, { status: 500 });
    }

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile",
        access_type: "offline",
        prompt: "consent",
        state: callbackUrl || "", // Pass frontend callback via state if needed
    });

    return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}

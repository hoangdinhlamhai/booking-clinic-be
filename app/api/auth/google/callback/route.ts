import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase/admin";
import { encode } from "next-auth/jwt";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // Optional frontend URL
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

    if (!code) {
        return NextResponse.redirect(`${frontendUrl}/login?error=NoCode`);
    }

    try {
        const rawBackendUrl = process.env.NEXTAUTH_URL || "https://booking-clinic-be.vercel.app";
        const backendUrl = rawBackendUrl.replace(/\/$/, "");
        const redirectUri = `${backendUrl}/api/auth/google/callback`;

        // 1. Exchange Code for Tokens
        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code,
                client_id: process.env.GOOGLE_CLIENT_ID!,
                client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                redirect_uri: redirectUri,
                grant_type: "authorization_code",
            }),
        });

        const tokenData = await tokenResponse.json();
        if (!tokenResponse.ok) {
            console.error("Google Token Error:", tokenData);
            return NextResponse.redirect(`${frontendUrl}/login?error=TokenExchangeFailed`);
        }

        const { id_token } = tokenData;

        // 2. Verify / Get User Info
        const userRes = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${tokenData.access_token}`);
        const googleUser = await userRes.json();

        if (!googleUser.email) {
            return NextResponse.redirect(`${frontendUrl}/login?error=NoEmail`);
        }

        // 3. Upsert User in DB
        const providerId = googleUser.sub;
        const email = googleUser.email;
        const name = googleUser.name;
        const picture = googleUser.picture;

        const { error: upsertError } = await supabaseAdmin.from("users").upsert(
            {
                email,
                name,
                provider: "google",
                provider_id: providerId,
                avatar_url: picture,
                is_active: true,
                // role: "patient" // DB default
            },
            { onConflict: "email" }
        );

        if (upsertError) {
            console.error("DB Upsert Error:", upsertError);
            // Continue anyway if user exists logic?
        }

        // 4. Get User Role (for Token)
        const { data: dbUser } = await supabaseAdmin
            .from("users")
            .select("id, role")
            .eq("email", email)
            .single();

        // 5. Generate Application JWT (Same format as Credentials)
        const token = await encode({
            token: {
                userId: dbUser?.id || providerId,
                role: dbUser?.role || "patient",
                email: email,
                name: name,
                picture: picture,
            },
            secret: process.env.NEXTAUTH_SECRET || "secret",
        });

        // 6. Redirect to Frontend with Token
        // Passing token in URL fragment # to avoid server logging it in query params
        // Frontend will parse window.location.hash or query
        // NOTE: User requested "token in auth state".

        // Using query param for simplicity as per common detached patterns, 
        // but typically # is safer. Let's use Query `accessToken` to match existing FE logic expectation?
        // Existing FE expects `accessToken` in localStorage.

        return NextResponse.redirect(`${frontendUrl}/login?accessToken=${token}`);

    } catch (error) {
        console.error("Callback Exception:", error);
        return NextResponse.redirect(`${frontendUrl}/login?error=CallbackException`);
    }
}

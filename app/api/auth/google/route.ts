import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase/admin";
import { encode } from "next-auth/jwt";

export async function POST(req: Request) {
    try {
        const { accessToken } = await req.json();

        if (!accessToken) {
            return NextResponse.json(
                { error: "Access token is required" },
                { status: 400 }
            );
        }

        // 1. Verify token with Supabase
        const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);

        if (authError || !authUser || !authUser.email) {
            return NextResponse.json(
                { error: "Invalid token" },
                { status: 401 }
            );
        }

        const email = authUser.email;
        const name = authUser.user_metadata?.full_name || authUser.user_metadata?.name || email;
        const image = authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture;
        const provider_id = authUser.id;

        // 2. Check if user exists to handle role correctly
        const { data: existingUser } = await supabaseAdmin
            .from("users")
            .select("*")
            .eq("email", email)
            .single();

        let role = "patient";
        if (existingUser?.role) {
            role = existingUser.role;
        }

        // 3. Upsert user
        const { data: user, error: upsertError } = await supabaseAdmin
            .from("users")
            .upsert(
                {
                    email,
                    name,
                    avatar_url: image,
                    provider: "google",
                    provider_id: provider_id,
                    is_active: true,
                    role: role, // Preserve existing role or default to patient
                    updated_at: new Date().toISOString(),
                },
                { onConflict: "email" }
            )
            .select()
            .single();

        if (upsertError || !user) {
            console.error("Supabase upsert error:", upsertError);
            return NextResponse.json(
                { error: "Failed to create/update user" },
                { status: 500 }
            );
        }

        // 4. Generate Token
        const token = await encode({
            token: {
                userId: user.id,
                role: user.role,
                name: user.name,
                email: user.email,
                picture: user.avatar_url,
            },
            secret: process.env.NEXTAUTH_SECRET || "secret",
        });

        // 5. Return success
        return NextResponse.json({
            message: "Login success",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                image: user.avatar_url,
            },
        });
    } catch (error) {
        console.error("Google login error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase/admin";
import { encode } from "next-auth/jwt";

export async function POST(req: Request) {
    try {
        const { email, name, image, provider_id } = await req.json();

        if (!email) {
            return NextResponse.json(
                { error: "Email is required" },
                { status: 400 }
            );
        }

        // 1. Upsert user
        const { data, error } = await supabaseAdmin.from("users").upsert(
            {
                email,
                name,
                avatar_url: image, // Match schema
                provider: "google",
                provider_id: provider_id || email, // Use email as fallback ID if not provided, though not ideal
                is_active: true,
                // role: "patient" // DB should default to patient, or we set it? 
                // Existing logic in authOptions set fields but role might be defaulted in DB or we should set it if new.
                // Let's check if we can select return data to see role.
            },
            { onConflict: "email" } // Assume email is unique
        ).select().single();

        if (error && error.code !== 'PGRST116') { // Ignore "no rows" if select fails?? Upsert should return data.
            // Actually .select() after upsert returns data.
            console.error("Supabase upsert error:", error);
            // Try finding if upsert failed?
        }

        // If upsert didn't return data (maybe it did), let's fetch.
        const { data: user, error: fetchError } = await supabaseAdmin
            .from("users")
            .select("*")
            .eq("email", email)
            .single();

        if (fetchError || !user) {
            return NextResponse.json(
                { error: "Failed to create/fetch user" },
                { status: 500 }
            );
        }

        // 3. Generate Token
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

        // 4. Return success
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

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase/admin";
import { encode } from "next-auth/jwt";

// Zalo Graph API response type
interface ZaloUserInfo {
    id: string;
    name: string;
    picture?: {
        data?: {
            url?: string;
        };
    };
    error?: {
        code: number;
        message: string;
    };
}

// Request body type
interface ZaloLoginRequest {
    accessToken: string;
}

export async function POST(request: NextRequest) {
    try {
        // 1. Parse and validate request body
        const body: ZaloLoginRequest = await request.json();

        if (!body.accessToken) {
            return NextResponse.json(
                { error: "Missing accessToken" },
                { status: 400 }
            );
        }

        // 2. Verify Zalo access token by calling Zalo Graph API
        const zaloResponse = await fetch(
            `https://graph.zalo.me/v2.0/me?fields=id,name,picture&access_token=${body.accessToken}`,
            { method: "GET" }
        );

        if (!zaloResponse.ok) {
            console.error("[ZaloAuth] Token verification failed:", zaloResponse.status);
            return NextResponse.json(
                { error: "Invalid Zalo access token" },
                { status: 401 }
            );
        }

        const zaloUser: ZaloUserInfo = await zaloResponse.json();

        // Check for Zalo API error response
        if (zaloUser.error) {
            console.error("[ZaloAuth] Zalo API error:", zaloUser.error);
            return NextResponse.json(
                { error: zaloUser.error.message || "Invalid Zalo access token" },
                { status: 401 }
            );
        }

        // Validate required fields
        if (!zaloUser.id) {
            console.error("[ZaloAuth] Missing Zalo user ID");
            return NextResponse.json(
                { error: "Invalid Zalo user data" },
                { status: 401 }
            );
        }

        // 3. Extract user info from Zalo response
        const providerId = zaloUser.id;
        const name = zaloUser.name || "Zalo User";
        const avatarUrl = zaloUser.picture?.data?.url || null;

        console.log("[ZaloAuth] User verified:", { providerId, name });

        // 4. Check if user already exists by provider_id
        const { data: existingUser, error: selectError } = await supabaseAdmin
            .from("users")
            .select("id, role, name, avatar_url")
            .eq("provider", "zalo")
            .eq("provider_id", providerId)
            .single();

        let userId: string;
        let userRole: string;

        if (existingUser) {
            // User exists - update their info
            userId = existingUser.id;
            userRole = existingUser.role || "patient";

            const { error: updateError } = await supabaseAdmin
                .from("users")
                .update({
                    name,
                    avatar_url: avatarUrl,
                    is_active: true,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", userId);

            if (updateError) {
                console.error("[ZaloAuth] DB Update Error:", updateError);
                // Continue anyway - user can still login
            }
        } else {
            // New user - insert
            const { data: newUser, error: insertError } = await supabaseAdmin
                .from("users")
                .insert({
                    provider: "zalo",
                    provider_id: providerId,
                    name,
                    avatar_url: avatarUrl,
                    is_active: true,
                    // email is nullable, not provided by Zalo
                    // role defaults to "patient" in DB
                })
                .select("id, role")
                .single();

            if (insertError || !newUser) {
                console.error("[ZaloAuth] DB Insert Error:", insertError);
                return NextResponse.json(
                    { error: "Failed to create user" },
                    { status: 500 }
                );
            }

            userId = newUser.id;
            userRole = newUser.role || "patient";
        }

        // 5. Generate JWT with SAME structure as Google login
        const token = await encode({
            token: {
                userId,
                role: "patient",
                name,
                picture: avatarUrl,
                provider: "zalo",
            },
            secret: process.env.NEXTAUTH_SECRET || "secret",
        });

        console.log("[ZaloAuth] JWT issued for user:", userId);

        // 6. Return access token
        return NextResponse.json({ accessToken: token });

    } catch (error) {
        console.error("[ZaloAuth] Exception:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase/admin";
import bcrypt from "bcryptjs";
import { encode } from "next-auth/jwt";

export async function POST(req: Request) {
    try {
        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json(
                { error: "Vui lòng nhập email và mật khẩu" },
                { status: 400 }
            );
        }

        // 1. Find user
        const { data: user, error } = await supabaseAdmin
            .from("users")
            .select("*")
            .eq("email", email)
            .single();

        if (error || !user) {
            return NextResponse.json(
                { error: "Tài khoản không tồn tại" },
                { status: 401 }
            );
        }

        if (!user.password) {
            return NextResponse.json(
                { error: "Tài khoản này dùng đăng nhập Google" },
                { status: 401 }
            );
        }

        // 2. Check password
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return NextResponse.json(
                { error: "Mật khẩu không đúng" },
                { status: 401 }
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
        console.error("Login error:", error);
        return NextResponse.json(
            { error: "Đã có lỗi xảy ra" },
            { status: 500 }
        );
    }
}

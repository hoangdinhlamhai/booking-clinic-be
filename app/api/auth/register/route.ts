import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase/admin";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
    try {
        const { name, email, password } = await req.json();

        if (!email || !password || !name) {
            return NextResponse.json(
                { error: "Vui lòng điền đầy đủ thông tin" },
                { status: 400 }
            );
        }

        const { data: existingUser } = await supabaseAdmin
            .from("users")
            .select("id")
            .eq("email", email)
            .single();

        if (existingUser) {
            return NextResponse.json(
                { error: "Email này đã được đăng ký" },
                { status: 400 }
            );
        }
        const hashedPassword = await bcrypt.hash(password, 10);

        const { error } = await supabaseAdmin.from("users").insert({
            email,
            name,
            password: hashedPassword,
            provider: "credentials",
            is_active: true,
            role: "patient",
        });

        if (error) {
            console.error("Registration error:", error);
            return NextResponse.json(
                { error: "Đã có lỗi xảy ra khi đăng ký" },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { message: "Đăng ký thành công" },
            { status: 201 }
        );
    } catch (error) {
        console.error("Registration error:", error);
        return NextResponse.json(
            { error: "Đã có lỗi xảy ra" },
            { status: 500 }
        );
    }
}

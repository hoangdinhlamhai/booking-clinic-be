import { NextResponse } from "next/server";
import { decode } from "next-auth/jwt";

export async function GET(req: Request) {
    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.split(" ")[1];

        const decoded = await decode({
            token,
            secret: process.env.NEXTAUTH_SECRET || "secret",
        });

        if (!decoded) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        return NextResponse.json({
            user: {
                id: decoded.userId,
                name: decoded.name,
                email: decoded.email,
                role: decoded.role,
                image: decoded.picture,
            },
        });
    } catch (error) {
        console.error("Me error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

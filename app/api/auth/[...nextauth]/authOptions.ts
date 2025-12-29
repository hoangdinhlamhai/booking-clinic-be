import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthOptions } from "next-auth";
import { supabaseAdmin } from "@/app/lib/supabase/admin";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  // Backend has no UI, so we do NOT define pages here.
  // Redirects are handled by the Frontend using callbackUrl.

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log("Missing credentials");
          return null;
        }

        console.log("Attempting login for:", credentials.email);

        const { data: user, error } = await supabaseAdmin
          .from("users")
          .select("*")
          .eq("email", credentials.email)
          .single();

        if (error) {
          console.error("Supabase user fetch error:", error);
          return null;
        }

        if (!user) {
          console.log("User not found");
          return null;
        }

        if (!user.password) {
          console.log("User has no password set (likely Google account)");
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        console.log("Password valid:", isValid);

        if (!isValid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.avatar_url,
          role: user.role,
        };
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      // 1. Credentials pass through
      if (account?.provider === "credentials") return true;

      // 2. Validate Google logic
      if (account?.provider === "google") {
        try {
          // Fallback strategies for Provider ID
          const providerId =
            profile?.sub ||
            account?.providerAccountId ||
            user.id ||
            user.email ||
            "unknown_google_id"; // Ultimate fallback

          // Upsert using 'email' as conflict key
          if (user.email) {
            const { error } = await supabaseAdmin.from("users").upsert(
              {
                email: user.email,
                name: user.name,
                provider: "google",
                provider_id: providerId,
                avatar_url: user.image,
                is_active: true,
              },
              { onConflict: "email" }
            );

            if (error) {
              console.error("Supabase upsert warning:", error);
            }
          }

          // ALWAYS return true for Google if we got this far
          return true;
        } catch (e) {
          console.error("SignIn callback exception:", e);
          return true; // Still allow login, even if DB sync crashes
        }
      }

      return false; // Block other providers if any
    },
    async jwt({ token, user, trigger }) {
      // Chỉ chạy logic fallback/enrich khi mới đăng nhập (có user)
      if (user) {
        // 1. Gán giá trị Fallback NGAY LẬP TỨC (đảm bảo luôn có data)
        token.userId = user.id || token.sub; // Dùng Google ID tạm nếu DB lỗi
        token.role = "patient"; // Role mặc định

        // 2. Thử lấy data từ DB (Non-blocking)
        if (user.email) {
          try {
            const { data, error } = await supabaseAdmin
              .from("users")
              .select("id, role")
              .eq("email", user.email)
              .single();

            if (data) {
              token.userId = data.id; // Nếu có DB -> Update thành UUID xịn
              token.role = data.role;
            } else {
              console.warn("⚠️ JWT: Không tìm thấy user trong DB, dùng fallback.");
              if (error) console.warn("Chi tiết lỗi DB:", error.message);
            }
          } catch (e) {
            console.error("❌ JWT: Lỗi exception khi gọi DB (vẫn cho login):", e);
          }
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        // Luôn map từ token (đã được xử lý an toàn ở bước jwt)
        session.user.id = (token.userId as string) || "unknown";
        session.user.role = (token.role as any) || "patient";
      }
      return session;
    },
  },
};


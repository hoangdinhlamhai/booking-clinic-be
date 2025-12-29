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
      console.log("👉 [SignIn] Provider:", account?.provider);

      // 1. Credentials pass through
      if (account?.provider === "credentials") return true;

      // 2. Validate Google logic
      if (account?.provider === "google") {
        try {
          const providerId =
            profile?.sub ||
            account?.providerAccountId ||
            user.id ||
            user.email ||
            "unknown_google_id";

          console.log("👉 [SignIn] Processing Google User:", user.email, "ID:", providerId);

          // Upsert DB (Fire and Forget / Safe await)
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
              console.warn("⚠️ [SignIn] DB Upsert Warning (Not Critical):", error.message);
            } else {
              console.log("✅ [SignIn] DB Upsert Success");
            }
          }

          return true; // ALWAYS return true for Google
        } catch (e) {
          console.error("❌ [SignIn] Exception (Ignored):", e);
          return true; // Fail safe
        }
      }

      return false;
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        console.log("👉 [JWT] Initial Signin for:", user.email);

        // 1. Fallback Immediate
        token.userId = user.id || token.sub;
        token.role = "patient";

        // 2. DB Enrich
        if (user.email) {
          try {
            const { data, error } = await supabaseAdmin
              .from("users")
              .select("id, role")
              .eq("email", user.email)
              .single();

            if (data) {
              console.log("✅ [JWT] Enriched from DB. Role:", data.role);
              token.userId = data.id;
              token.role = data.role;
            } else {
              console.warn("⚠️ [JWT] User not found in DB during enrich.");
            }
            if (error) console.warn("⚠️ [JWT] DB Error:", error.message);
          } catch (e) {
            console.error("❌ [JWT] DB Exception:", e);
          }
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.userId as string) || "unknown";
        session.user.role = (token.role as any) || "patient";
      }
      return session;
    },
  },
};

import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthOptions } from "next-auth";
import { supabaseAdmin } from "@/app/lib/supabase/admin";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login", // Redirect to login page on error too
  },

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
        if (!user.email) return false;

        // 3. Fallback strategies for Provider ID
        const providerId =
          profile?.sub ||
          account?.providerAccountId ||
          user.id ||
          user.email;

        // 4. Upsert using 'email' as conflict key
        const { error } = await supabaseAdmin.from("users").upsert(
          {
            email: user.email,
            name: user.name,
            provider: "google", // Update provider info
            provider_id: providerId,
            avatar_url: user.image,
            is_active: true,
          },
          { onConflict: "email" }
        );

        if (error) {
          console.error("Supabase upsert warning:", error);
          // Rule: Ensure Google login never returns false because of DB errors.
          // We return true to allow session creation even if DB sync warns.
          return true;
        }

        return true;
      }

      return false;
    },
    async jwt({ token, user }) {
      if (user?.email && !token.userId) {
        const { data, error } = await supabaseAdmin
          .from("users")
          .select("id, role")
          .eq("email", user.email)
          .single();

        if (error || !data) {
          console.error("JWT callback error:", error);
          return token;
        }

        token.userId = data.id;
        token.role = data.role;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.role = token.role as
          | "admin"
          | "clinic_admin"
          | "staff"
          | "patient";
      }
      return session;
    },
  },
};


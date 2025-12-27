// import NextAuth from "next-auth";

// declare module "next-auth" {
//   interface Session {
//     user: {
//       id: string;
//       name?: string | null;
//       email?: string | null;
//       image?: string | null;
//     };
//   }
// }

// declare module "next-auth/jwt" {
//   interface JWT {
//     userId?: string;
//   }
// }


import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "admin" | "clinic_admin" | "staff" | "patient";
      clinic_id?: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: "admin" | "clinic_admin" | "staff" | "patient";
    clinic_id?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    role?: "admin" | "clinic_admin" | "staff" | "patient";
    clinic_id?: string;
  }
}

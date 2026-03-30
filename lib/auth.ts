import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db, generateId } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    newUser: "/dashboard",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log("[AUTH] Missing email or password");
          return null;
        }

        try {
          const { data: user, error } = await db
            .from("User")
            .select("id, email, name, image, passwordHash")
            .eq("email", credentials.email as string)
            .single();

          if (error || !user) {
            console.log("[AUTH] User not found:", credentials.email, error?.message);
            return null;
          }

          if (!user.passwordHash) {
            console.log("[AUTH] No password hash for:", credentials.email);
            return null;
          }

          const isValid = await bcrypt.compare(
            credentials.password as string,
            user.passwordHash
          );

          if (!isValid) {
            console.log("[AUTH] Password mismatch for:", credentials.email);
            return null;
          }

          console.log("[AUTH] Login success for:", credentials.email);
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          };
        } catch (err: any) {
          console.error("[AUTH] authorize error:", err.message);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      try {
        // Handle Google OAuth - create user if not exists
        if (account?.provider === "google" && user.email) {
          const { data: existing } = await db
            .from("User")
            .select("id")
            .eq("email", user.email)
            .single();

          if (!existing) {
            const userId = generateId();
            await db.from("User").insert({
              id: userId,
              email: user.email,
              name: user.name || null,
              image: user.image || null,
              credits: 3,
              referralCode: generateId(),
              role: "USER",
              plan: "FREE",
              updatedAt: new Date().toISOString(),
            });
            await db.from("CreditLog").insert({
              id: generateId(),
              userId,
              amount: 3,
              reason: "signup_bonus",
            });
          }
        }
      } catch (err: any) {
        console.error("[AUTH] signIn callback error:", err.message);
      }
      // Always return true to allow sign-in
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      try {
        if (user) {
          const { data: dbUser } = await db
            .from("User")
            .select("id, role, credits, plan, referralCode")
            .eq("email", user.email!)
            .single();

          if (dbUser) {
            token.id = dbUser.id;
            token.role = dbUser.role;
            token.credits = dbUser.credits;
            token.plan = dbUser.plan;
            token.referralCode = dbUser.referralCode;
          }
        }
        if (trigger === "update" && session) {
          if (session.credits !== undefined) token.credits = session.credits;
          if (session.plan !== undefined) token.plan = session.plan;
        }
      } catch (err: any) {
        console.error("[AUTH] jwt callback error:", err.message);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as any;
        session.user.credits = token.credits as number;
        session.user.plan = token.plan as any;
        session.user.referralCode = token.referralCode as string;
      }
      return session;
    },
  },
  trustHost: true,
});

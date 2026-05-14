import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db, generateId } from "@/lib/db";

// Sur Vercel, VERCEL_URL est toujours l'URL réelle du déploiement.
// On la priorise pour éviter que NEXTAUTH_URL=http://localhost:3000
// (défini en local ou par erreur dans les env Vercel) redirige vers localhost.
const inferredAppUrl =
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
  process.env.NEXTAUTH_URL ||
  process.env.AUTH_URL;

const resolvedSecret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
const isHttpsApp =
  !!process.env.VERCEL_URL ||
  inferredAppUrl?.startsWith("https://") ||
  process.env.NODE_ENV === "production";

// Synchronise les deux variables pour NextAuth
if (inferredAppUrl) {
  process.env.NEXTAUTH_URL = inferredAppUrl;
  process.env.AUTH_URL = inferredAppUrl;
}
if (resolvedSecret) {
  process.env.NEXTAUTH_SECRET = resolvedSecret;
  process.env.AUTH_SECRET = resolvedSecret;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  secret: resolvedSecret,
  trustHost: true,
  useSecureCookies: isHttpsApp,
  pages: {
    signIn: "/login",
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
        try {
          console.log("[AUTH][CREDENTIALS][1] authorize called", {
            hasEmail: !!credentials?.email,
            hasPassword: !!credentials?.password,
          });

          if (!credentials?.email || !credentials?.password) return null;

          console.log("[AUTH][CREDENTIALS][2] querying user in DB", {
            email: credentials.email,
          });

          const { data: user, error } = await db
            .from("User")
            .select("id, email, name, image, passwordHash")
            .eq("email", credentials.email as string)
            .single();

          console.log("[AUTH][CREDENTIALS][2] DB query result", {
            foundUser: !!user,
            hasPasswordHash: !!user?.passwordHash,
            dbError: error?.message || null,
          });

          if (error || !user || !user.passwordHash) {
            console.log("[AUTH] User not found or no password");
            console.log("[AUTH][CREDENTIALS][4] returning null", {
              reason: "missing_user_or_password_hash",
            });
            return null;
          }

          console.log("[AUTH][CREDENTIALS][3] verifying password", {
            userId: user.id,
          });

          const isValid = await bcrypt.compare(
            credentials.password as string,
            user.passwordHash
          );

          console.log("[AUTH][CREDENTIALS][3] password check result", {
            isValid,
            userId: user.id,
          });

          if (!isValid) {
            console.log("[AUTH] Password mismatch");
            console.log("[AUTH][CREDENTIALS][4] returning null", {
              reason: "password_mismatch",
              userId: user.id,
            });
            return null;
          }

          console.log("[AUTH] Success, returning user:", user.id);
          const authUser = {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          };
          console.log("[AUTH][CREDENTIALS][4] returning user", {
            userId: authUser.id,
            email: authUser.email,
          });
          return authUser;
        } catch (err: any) {
          console.error("[AUTH] authorize error:", err.message);
          console.error("[AUTH][CREDENTIALS][4] returning null due to exception", {
            error: err?.message || "unknown_error",
          });
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      console.log("[AUTH-JWT] called, user present:", !!user);
      if (user) {
        try {
          const { data: dbUser, error } = await db
            .from("User")
            .select("id, role, credits, plan, referralCode")
            .eq("email", user.email!)
            .single();

          console.log("[AUTH-JWT] db query result:", !!dbUser, error?.message);

          if (dbUser) {
            token.id = dbUser.id;
            token.role = dbUser.role;
            token.credits = dbUser.credits;
            token.plan = dbUser.plan;
            token.referralCode = dbUser.referralCode;
          } else {
            // Set defaults if DB query fails
            token.id = user.id || "";
            token.role = "USER";
            token.credits = 0;
            token.plan = "FREE";
            token.referralCode = "";
          }
        } catch (err: any) {
          console.error("[AUTH-JWT] error:", err.message);
          token.id = user.id || "";
          token.role = "USER";
          token.credits = 0;
          token.plan = "FREE";
          token.referralCode = "";
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) || "";
        session.user.role = (token.role as any) || "USER";
        session.user.credits = (token.credits as number) || 0;
        session.user.plan = (token.plan as any) || "FREE";
        session.user.referralCode = (token.referralCode as string) || "";
      }
      return session;
    },
    async signIn({ user, account }) {
      // Handle Google OAuth — create user in DB if not exists
      if (account?.provider === "google" && user.email) {
        try {
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
        } catch (err: any) {
          console.error("[AUTH] Google signIn error:", err.message);
        }
      }
      return true;
    },
  },
});

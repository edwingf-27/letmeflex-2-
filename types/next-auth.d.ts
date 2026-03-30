import type { Plan, Role } from "@prisma/client";
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: Role;
      credits: number;
      plan: Plan;
      referralCode: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    credits: number;
    plan: Plan;
    referralCode: string;
  }
}

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    console.log("[LOGIN][1] tentative de connexion", { email });

    const { data: user, error: dbError } = await db
      .from("User")
      .select("id, email, passwordHash")
      .eq("email", email)
      .single();

    // Log précis pour diagnostiquer
    console.log("[LOGIN][2] résultat DB", {
      userFound: !!user,
      hasPasswordHash: !!user?.passwordHash,
      hashPrefix: user?.passwordHash?.substring(0, 7) ?? "NULL",
      dbError: dbError?.message ?? null,
      dbErrorCode: dbError?.code ?? null,
    });

    if (dbError) {
      console.error("[LOGIN][2] erreur DB →", dbError.message, dbError.code);
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    if (!user) {
      console.log("[LOGIN][2] utilisateur introuvable pour", email);
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    if (!user.passwordHash) {
      console.log("[LOGIN][2] passwordHash null — compte Google OAuth ou hash manquant");
      return NextResponse.json(
        { error: "Ce compte utilise Google. Connecte-toi avec Google." },
        { status: 401 }
      );
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    console.log("[LOGIN][3] vérification mot de passe", { isValid, userId: user.id });

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    console.log("[LOGIN][4] connexion OK", { userId: user.id });
    return NextResponse.json({ ok: true });

  } catch (err: any) {
    console.error("[LOGIN_API_ERROR]", err.message);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

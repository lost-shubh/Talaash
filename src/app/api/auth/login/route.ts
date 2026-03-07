import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { comparePassword, signToken, sanitize } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const email = sanitize(String(body.email || "")).toLowerCase().trim();
    const password = String(body.password || "").trim();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }

    const db = getDb();

    const user = db
      .prepare(
        `SELECT id, name, email, role, password_hash, is_active
         FROM users
         WHERE email = ? AND is_active = 1`
      )
      .get(email) as {
      id: string;
      name: string;
      email: string;
      role: "admin" | "user";
      password_hash: string;
      is_active: number;
    } | null;

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const valid = await comparePassword(password, user.password_hash);

    if (!valid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const token = await signToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

    response.cookies.set({
      name: "talaash_token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (err) {
    console.error("Login error:", err);

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
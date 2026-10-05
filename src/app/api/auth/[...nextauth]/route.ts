import { consumeRateLimit, handlers } from "@/lib/auth";
import { Role } from "@/generated/prisma/client";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/auth";

export const runtime = "nodejs";

const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(200),
});

function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}


async function register(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ success: false, data: null, error: { message: "درخواست نامعتبر است." } }, { status: 403 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!(await consumeRateLimit("register-ip", ip, 8, 15 * 60 * 1000))) return NextResponse.json({ success: false, data: null, error: { message: "تعداد درخواست‌ها زیاد است؛ کمی بعد دوباره تلاش کنید." } }, { status: 429 });
  const body: unknown = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, data: null, error: { message: "اطلاعات ثبت‌نام معتبر نیست.", details: parsed.error.flatten() } }, { status: 400 });
  const email = parsed.data.email.toLowerCase();
  if (!(await consumeRateLimit("register-email", email, 5, 60 * 60 * 1000))) return NextResponse.json({ success: false, data: null, error: { message: "تعداد درخواست‌ها زیاد است؛ کمی بعد دوباره تلاش کنید." } }, { status: 429 });
  try {
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const user = await prisma.user.create({ data: { name: parsed.data.name, email, passwordHash, role: Role.VIEWER } });
    await prisma.auditLog.create({ data: { userId: user.id, action: "REGISTER", entity: "User", entityId: user.id } });
    return NextResponse.json({ success: true, data: { id: user.id, name: user.name, email: user.email }, error: null }, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json({ success: false, data: null, error: { message: "این ایمیل قبلاً ثبت شده است." } }, { status: 409 });
    }
    return NextResponse.json({ success: false, data: null, error: { message: "ثبت‌نام انجام نشد." } }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handlers.GET(request);
}

export async function POST(request: NextRequest, context: { params: Promise<{ nextauth: string[] }> }) {
  const path = (await context.params).nextauth ?? [];
  if (path.length === 1 && path[0] === "register") return register(request);
  return handlers.POST(request);
}

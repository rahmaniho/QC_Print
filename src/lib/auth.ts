import { createHash } from "node:crypto";
import NextAuth, { type DefaultSession, type User } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaClient, type Role } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { z } from "zod";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const databasePoolMax = Math.max(1, Math.min(10, Number.parseInt(process.env.DB_POOL_MAX ?? "2", 10) || 2));
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "postgresql://qc:qc@localhost:5432/qc", max: databasePoolMax }), log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"] });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

function rateLimitKey(scope: string, identity: string) {
  const fingerprint = createHash("sha256").update(identity).digest("hex").slice(0, 40);
  return `${scope}:${fingerprint}`;
}

export async function consumeRateLimit(scope: string, identity: string, limit: number, windowMs: number): Promise<boolean> {
  const key = rateLimitKey(scope, identity);
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);
  return prisma.$transaction(async (tx) => {
    const current = await tx.rateLimit.findUnique({ where: { key } });
    if (!current || current.resetAt <= now) {
      await tx.rateLimit.upsert({ where: { key }, create: { key, count: 1, resetAt }, update: { count: 1, resetAt } });
      return true;
    }
    if (current.count >= limit) return false;
    await tx.rateLimit.update({ where: { key }, data: { count: { increment: 1 } } });
    return true;
  });
}

export async function clearRateLimit(scope: string, identity: string): Promise<void> {
  await prisma.rateLimit.deleteMany({ where: { key: rateLimitKey(scope, identity) } });
}

const credentialsSchema = z.object({ email: z.string().email().max(254), password: z.string().min(1).max(200) });

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  providers: [
    Credentials({
      name: "ایمیل و رمز عبور",
      credentials: {
        email: { label: "ایمیل", type: "email" },
        password: { label: "رمز عبور", type: "password" },
      },
      async authorize(credentials, request) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const email = parsed.data.email.toLowerCase();
        const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
        const windowMs = 15 * 60 * 1000;
        if (!(await consumeRateLimit("login-ip", ip, 30, windowMs))) return null;
        if (!(await consumeRateLimit("login-email", email, 8, windowMs))) return null;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.isActive) return null;
        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;
        await clearRateLimit("login-email", email);
        return { id: user.id, email: user.email, name: user.name, role: user.role, authVersion: user.authVersion };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      const appToken = token as typeof token & { role?: Role; authVersion?: number };
      if (user) {
        appToken.sub = user.id;
        appToken.role = (user as User & { role: Role }).role;
        appToken.authVersion = (user as User & { authVersion: number }).authVersion;
      }
      return appToken;
    },
    session({ session, token }) {
      if (session.user) {
        const appToken = token as typeof token & { role?: Role; authVersion?: number };
        session.user.id = appToken.sub ?? "";
        session.user.role = appToken.role ?? "VIEWER";
        session.user.authVersion = typeof appToken.authVersion === "number" ? appToken.authVersion : 0;
      }
      return session;
    },
  },
});

declare module "next-auth" {
  interface Session {
    user: { id: string; role: Role; authVersion: number } & DefaultSession["user"];
  }
  interface User {
    role: Role;
    authVersion: number;
  }
}

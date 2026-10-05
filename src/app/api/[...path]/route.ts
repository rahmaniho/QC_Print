import { createHash, randomBytes } from "node:crypto";
import { put } from "@vercel/blob";
import { Prisma, type Role } from "@/generated/prisma/client";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z, type ZodTypeAny } from "zod";
import * as XLSX from "xlsx";
import { auth, consumeRateLimit, prisma } from "@/lib/auth";
import {
  capaSchema,
  customerSchema,
  deltaE00,
  deltaE76,
  inspectionSchema,
  jobSchema,
  materialSchema,
  scoreInspection,
  type InspectionInput,
  userSchema,
} from "@/lib/domain";
import { buildInspectionPdf } from "@/lib/report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ path: string[] }> };
type ApiUser = { id: string; role: Role; authVersion: number; name?: string | null; email?: string | null };
const ok = (data: unknown, status = 200) => NextResponse.json({ success: true, data, error: null }, { status });
const fail = (message: string, status: number, details?: unknown) =>
  NextResponse.json({ success: false, data: null, error: { message, ...(details ? { details } : {}) } }, { status });
const idSchema = (id: string) => /^[a-zA-Z0-9_-]{3,80}$/.test(id);

function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

function canAccess(role: Role, resource: string, method: string): boolean {
  if (resource === "users") return role === "ADMIN";
  if (method === "GET" || method === "HEAD") return true;
  if (role === "ADMIN") return true;
  if (resource === "jobs") return role === "MANAGER";
  if (resource === "inspections" || resource === "defects" || resource === "capa" || resource === "upload") {
    return role === "MANAGER" || role === "INSPECTOR";
  }
  if (resource === "customers" || resource === "materials") return role === "MANAGER";
  if (resource === "standards") return false;
  return false;
}

async function requireUser(resource: string, method: string): Promise<ApiUser | NextResponse> {
  const session = await auth();
  if (!session?.user?.id) return fail("برای انجام این عملیات وارد سامانه شوید.", 401);
  const current = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, name: true, email: true, role: true, isActive: true, authVersion: true } });
  if (!current?.isActive || current.authVersion !== session.user.authVersion) {
    return fail("نشست شما منقضی یا دسترسی حساب غیرفعال شده است؛ دوباره وارد شوید.", 401);
  }
  if (!canAccess(current.role, resource, method)) {
    return fail("نقش کاربری شما مجوز این عملیات را ندارد.", 403);
  }
  return { id: current.id, role: current.role, authVersion: current.authVersion, name: current.name, email: current.email };
}

function isResponse(value: ApiUser | NextResponse): value is NextResponse {
  return value instanceof NextResponse;
}

async function audit(userId: string, action: string, entity: string, entityId?: string) {
  await prisma.auditLog.create({
    data: { userId, action, entity, ...(entityId ? { entityId } : {}) },
  });
}

async function parseBody<T extends ZodTypeAny>(
  request: NextRequest,
  schema: T,
): Promise<z.SafeParseReturnType<z.input<T>, z.output<T>>> {
  const body: unknown = await request.json().catch(() => null);
  return schema.safeParse(body);
}

async function recalculateInspectionScore(tx: Prisma.TransactionClient, inspectionId: string) {
  const inspection = await tx.inspection.findUnique({
    where: { id: inspectionId },
    include: { colorMeasurements: true, densityMeasurements: true, registerMeasurement: true, adhesionTest: true, barcodeTest: true, defects: true },
  });
  if (!inspection) return null;

  const outcome = scoreInspection({
    legalCompliance: inspection.legalCompliance,
    colorMeasurements: inspection.colorMeasurements.map((item) => ({
      patchName: item.patchName,
      patchType: item.patchType as InspectionInput["colorMeasurements"][number]["patchType"],
      targetL: item.targetL,
      targetA: item.targetA,
      targetB: item.targetB,
      measuredL: item.measuredL,
      measuredA: item.measuredA,
      measuredB: item.measuredB,
      tolerance: item.tolerance,
    })),
    densityMeasurements: inspection.densityMeasurements.map((item) => ({
      colorChannel: item.colorChannel,
      targetDensity: item.targetDensity,
      measuredDensity: item.measuredDensity,
      tvi: item.tvi,
    })),
    registerMeasurement: inspection.registerMeasurement
      ? { targetOffset: inspection.registerMeasurement.targetOffset, measuredOffset: inspection.registerMeasurement.measuredOffset, tolerance: inspection.registerMeasurement.tolerance }
      : undefined,
    adhesionTest: inspection.adhesionTest
      ? { rating: inspection.adhesionTest.rating as InspectionInput["adhesionTest"]["rating"] }
      : undefined,
    barcodeTest: inspection.barcodeTest
      ? { symbology: inspection.barcodeTest.symbology, grade: inspection.barcodeTest.grade as InspectionInput["barcodeTest"]["grade"] }
      : undefined,
    defects: inspection.defects.map((item) => ({ type: item.type, category: item.category, description: item.description, location: item.location, imageUrl: item.imageUrl })),
  });
  await tx.inspection.update({ where: { id: inspectionId }, data: { score: outcome.score, status: outcome.status } });
  return outcome;
}

async function route(request: NextRequest, context: Context) {
  const path = (await context.params).path ?? [];
  const [resource, id] = path;
  const method = request.method.toUpperCase();
  if (!resource) return fail("مسیر API شناخته نشد.", 404);
  if (id && !idSchema(id)) return fail("شناسه نامعتبر است.", 400);
  if (!sameOrigin(request) && !["GET", "HEAD", "OPTIONS"].includes(method)) {
    return fail("درخواست cross-origin مجاز نیست.", 403);
  }

  if (resource === "password" && id === "forgot" && method === "POST") return forgotPassword(request);
  if (resource === "password" && id === "reset" && method === "POST") return resetPassword(request);

  const permissionResource = resource === "reports" ? "inspections" : resource;
  const user = await requireUser(permissionResource, method);
  if (isResponse(user)) return user;

  try {
    if (resource === "stats" && method === "GET") return await getStats();
    if (resource === "upload" && method === "POST") return await upload(request, user);
    if (resource === "reports" && method === "GET") return await exportReport(request, id);

    if (resource === "jobs") return await jobs(request, user, id);
    if (resource === "inspections") return await inspections(request, user, id);
    if (resource === "defects") return await defects(request, user, id);
    if (resource === "capa") return await capas(request, user, id);
    if (resource === "customers") return await customers(request, user, id);
    if (resource === "materials") return await materials(request, user, id);
    if (resource === "users") return await users(request, user, id);
    if (resource === "standards") return await standards(request, user, id);
    return fail("مسیر API شناخته نشد.", 404);
  } catch (error) {
    console.error(`[api:${resource}]`, error);
    if (error && typeof error === "object" && "code" in error) {
      const code = error.code;
      if (code === "P2025") return fail("رکورد موردنظر پیدا نشد.", 404);
      if (code === "P2002") return fail("رکورد تکراری است و ذخیره نشد.", 409);
      if (code === "P2003") return fail("ارتباط رکوردها معتبر نیست.", 400);
    }
    return fail("خطای داخلی رخ داد. شناسه رکورد و داده‌های حساس نمایش داده نمی‌شوند.", 500);
  }
}

async function jobs(request: NextRequest, user: ApiUser, id?: string) {
  if (!id) {
    if (request.method === "GET") {
      const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") || 1));
      const pageSize = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get("pageSize") || 20)));
      const printType = request.nextUrl.searchParams.get("printType");
      const status = request.nextUrl.searchParams.get("status");
      const query = request.nextUrl.searchParams.get("q")?.trim();
      const where: Prisma.JobWhereInput = {};
      if (printType && ["OFFSET", "FLEXO", "GRAVURE", "DIGITAL", "SCREEN", "HYBRID"].includes(printType)) {
        where.printType = printType as Prisma.EnumPrintTypeFilter["equals"];
      }
      if (status && ["DRAFT", "IN_PROGRESS", "COMPLETED", "CANCELLED"].includes(status)) {
        where.status = status as Prisma.EnumJobStatusFilter["equals"];
      }
      if (query) where.OR = [{ jobNumber: { contains: query, mode: "insensitive" } }, { productName: { contains: query, mode: "insensitive" } }];
      const [items, total] = await Promise.all([
        prisma.job.findMany({ where, include: { customer: true, _count: { select: { inspections: true } } }, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
        prisma.job.count({ where }),
      ]);
      return ok({ items, total, page, pageSize, pages: Math.ceil(total / pageSize) });
    }
    if (request.method === "POST") {
      const parsed = await parseBody(request, jobSchema);
      if (!parsed.success) return fail("اطلاعات سفارش معتبر نیست.", 400, parsed.error.flatten());
      const data = parsed.data;
      const created = await prisma.job.create({
        data: {
          ...data,
          createdById: user.id,
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          ink: data.ink || null,
          targetStandard: data.targetStandard || null,
          referenceFileUrl: data.referenceFileUrl || null,
          notes: data.notes || null,
        },
        include: { customer: true },
      });
      await audit(user.id, "CREATE", "Job", created.id);
      return ok(created, 201);
    }
    return fail("متد برای سفارش‌ها پشتیبانی نمی‌شود.", 405);
  }
  if (!idSchema(id)) return fail("شناسه نامعتبر است.", 400);
  if (request.method === "GET") {
    const job = await prisma.job.findUnique({ where: { id }, include: { customer: true, createdBy: { select: { id: true, name: true } }, inspections: { include: { inspector: { select: { name: true } }, _count: { select: { defects: true } } }, orderBy: { inspectionDate: "desc" } } } });
    return job ? ok(job) : fail("سفارش پیدا نشد.", 404);
  }
  if (request.method === "PUT" || request.method === "PATCH") {
    const parsed = await parseBody(request, jobSchema.partial());
    if (!parsed.success) return fail("اطلاعات ویرایش سفارش معتبر نیست.", 400, parsed.error.flatten());
    const data = parsed.data;
    const updated = await prisma.job.update({
      where: { id },
      data: {
        ...data,
        ...(data.dueDate !== undefined ? { dueDate: data.dueDate ? new Date(data.dueDate) : null } : {}),
        ...(data.ink !== undefined ? { ink: data.ink || null } : {}),
        ...(data.targetStandard !== undefined ? { targetStandard: data.targetStandard || null } : {}),
        ...(data.referenceFileUrl !== undefined ? { referenceFileUrl: data.referenceFileUrl || null } : {}),
        ...(data.notes !== undefined ? { notes: data.notes || null } : {}),
      },
    });
    await audit(user.id, "UPDATE", "Job", id);
    return ok(updated);
  }
  if (request.method === "DELETE") {
    const counts = await prisma.inspection.count({ where: { jobId: id } });
    if (counts) return fail("سفارشی که سابقه بازرسی دارد قابل حذف نیست؛ وضعیت آن را لغو کنید.", 409);
    await prisma.job.delete({ where: { id } });
    await audit(user.id, "DELETE", "Job", id);
    return ok({ id });
  }
  return fail("متد برای سفارش پشتیبانی نمی‌شود.", 405);
}

async function inspections(request: NextRequest, user: ApiUser, id?: string) {
  if (!id) {
    if (request.method === "GET") {
      const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") || 1));
      const pageSize = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get("pageSize") || 20)));
      const status = request.nextUrl.searchParams.get("status");
      const where: Prisma.InspectionWhereInput = {};
      if (status && ["PASS", "CONDITIONAL", "FAIL"].includes(status)) where.status = status as Prisma.EnumInspectionStatusFilter["equals"];
      const [items, total] = await Promise.all([
        prisma.inspection.findMany({ where, include: { job: { include: { customer: true } }, inspector: { select: { name: true } }, _count: { select: { defects: true } } }, orderBy: { inspectionDate: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
        prisma.inspection.count({ where }),
      ]);
      return ok({ items, total, page, pageSize, pages: Math.ceil(total / pageSize) });
    }
    if (request.method === "POST") {
      const parsed = await parseBody(request, inspectionSchema);
      if (!parsed.success) return fail("اطلاعات بازرسی معتبر نیست.", 400, parsed.error.flatten());
      const data = parsed.data;
      const colors = data.colorMeasurements.map((color) => {
        const target = { L: color.targetL, a: color.targetA, b: color.targetB };
        const measured = { L: color.measuredL, a: color.measuredA, b: color.measuredB };
        const de00 = deltaE00(target, measured);
        return { ...color, deltaE00: de00, deltaE76: deltaE76(target, measured), isPass: de00 <= color.tolerance };
      });
      const densities = data.densityMeasurements.map((item) => ({
        ...item,
        isPass: Math.abs(item.targetDensity - item.measuredDensity) <= 0.05 && (item.tvi == null || Math.abs(item.tvi) <= 3),
      }));
      const registerDifference = Math.abs(data.registerMeasurement.measuredOffset - data.registerMeasurement.targetOffset);
      const registerMeasurement = { ...data.registerMeasurement, isPass: registerDifference <= data.registerMeasurement.tolerance };
      const adhesionTest = { ...data.adhesionTest, method: "ASTM_D3359" as const, isPass: Number.parseInt(data.adhesionTest.rating, 10) >= 4 };
      const barcodeTest = { ...data.barcodeTest, isPass: data.barcodeTest.grade === "A" || data.barcodeTest.grade === "B" };
      const outcome = scoreInspection(data);
      const inspection = await prisma.inspection.create({
        data: {
          jobId: data.jobId,
          inspectorId: user.id,
          stage: data.stage,
          sampleSize: data.sampleSize,
          aqlLevel: data.aqlLevel || null,
          environmentalTemp: data.environmentalTemp ?? null,
          environmentalHumidity: data.environmentalHumidity ?? null,
          legalCompliance: data.legalCompliance,
          notes: data.notes || null,
          status: outcome.status,
          score: outcome.score,
          colorMeasurements: { create: colors },
          densityMeasurements: { create: densities },
          registerMeasurement: { create: registerMeasurement },
          adhesionTest: { create: adhesionTest },
          barcodeTest: { create: barcodeTest },
          defects: { create: data.defects.map((defect) => ({ ...defect, location: defect.location || null, imageUrl: defect.imageUrl || null })) },
        },
        include: { job: true, colorMeasurements: true, densityMeasurements: true, registerMeasurement: true, adhesionTest: true, barcodeTest: true, defects: true },
      });
      await audit(user.id, "CREATE", "Inspection", inspection.id);
      if (data.defects.some((item) => item.type === "CRITICAL")) await audit(user.id, "CRITICAL_DEFECT", "Inspection", inspection.id);
      return ok({ ...inspection, scoreCoverage: outcome.coverage, decisionReasons: outcome.reasons }, 201);
    }
    return fail("متد برای بازرسی‌ها پشتیبانی نمی‌شود.", 405);
  }
  if (!idSchema(id)) return fail("شناسه نامعتبر است.", 400);
  if (request.method === "GET") {
    const inspection = await prisma.inspection.findUnique({ where: { id }, include: { job: { include: { customer: true } }, inspector: { select: { id: true, name: true, email: true } }, colorMeasurements: true, densityMeasurements: true, registerMeasurement: true, adhesionTest: true, barcodeTest: true, defects: { include: { capa: true } }, capas: { include: { responsibleUser: { select: { name: true } }, defect: true } } } });
    return inspection ? ok(inspection) : fail("گزارش بازرسی پیدا نشد.", 404);
  }
  if (request.method === "PUT" || request.method === "PATCH") {
    const body: unknown = await request.json().catch(() => null);
    const parsed = z.object({ notes: z.string().max(3000).nullable().optional() }).safeParse(body);
    if (!parsed.success) return fail("اطلاعات ویرایش معتبر نیست.", 400, parsed.error.flatten());
    const updated = await prisma.inspection.update({ where: { id }, data: { notes: parsed.data.notes } });
    await audit(user.id, "UPDATE", "Inspection", id);
    return ok(updated);
  }
  if (request.method === "DELETE") {
    await prisma.inspection.delete({ where: { id } });
    await audit(user.id, "DELETE", "Inspection", id);
    return ok({ id });
  }
  return fail("متد برای بازرسی پشتیبانی نمی‌شود.", 405);
}

async function defects(request: NextRequest, user: ApiUser, id?: string) {
  if (!id) {
    if (request.method === "GET") {
      const type = request.nextUrl.searchParams.get("type");
      const where: Prisma.DefectWhereInput = {};
      if (type && ["CRITICAL", "MAJOR", "MINOR"].includes(type)) where.type = type as Prisma.EnumDefectSeverityFilter["equals"];
      const items = await prisma.defect.findMany({ where, include: { inspection: { include: { job: { select: { jobNumber: true, productName: true } } } }, capa: true }, orderBy: { createdAt: "desc" }, take: 200 });
      return ok(items);
    }
    if (request.method === "POST") {
      const body: unknown = await request.json().catch(() => null);
      const parsed = z.object({ inspectionId: z.string().min(1), type: z.enum(["CRITICAL", "MAJOR", "MINOR"]), category: z.string().trim().min(2).max(100), description: z.string().trim().min(3).max(1000), location: z.string().max(240).optional().nullable(), imageUrl: z.string().url().optional().nullable() }).safeParse(body);
      if (!parsed.success) return fail("اطلاعات عیب معتبر نیست.", 400, parsed.error.flatten());
      const result = await prisma.$transaction(async (tx) => {
        const item = await tx.defect.create({ data: { ...parsed.data, location: parsed.data.location || null, imageUrl: parsed.data.imageUrl || null } });
        const outcome = await recalculateInspectionScore(tx, item.inspectionId);
        await tx.auditLog.create({ data: { userId: user.id, action: "CREATE", entity: "Defect", entityId: item.id } });
        if (item.type === "CRITICAL") await tx.auditLog.create({ data: { userId: user.id, action: "CRITICAL_DEFECT", entity: "Defect", entityId: item.id } });
        return { item, outcome };
      });
      return ok({ ...result.item, inspectionOutcome: result.outcome }, 201);
    }
    return fail("متد برای عیوب پشتیبانی نمی‌شود.", 405);
  }
  if (request.method === "PUT" || request.method === "PATCH") {
    const body: unknown = await request.json().catch(() => null);
    const parsed = z.object({ type: z.enum(["CRITICAL", "MAJOR", "MINOR"]).optional(), category: z.string().trim().min(2).max(100).optional(), description: z.string().trim().min(3).max(1000).optional(), location: z.string().max(240).nullable().optional() }).safeParse(body);
    if (!parsed.success) return fail("ویرایش عیب معتبر نیست.", 400, parsed.error.flatten());
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.defect.findUnique({ where: { id } });
      if (!existing) return null;
      const item = await tx.defect.update({ where: { id }, data: parsed.data });
      const outcome = await recalculateInspectionScore(tx, item.inspectionId);
      await tx.auditLog.create({ data: { userId: user.id, action: "UPDATE", entity: "Defect", entityId: id } });
      if (item.type === "CRITICAL" && existing.type !== "CRITICAL") {
        await tx.auditLog.create({ data: { userId: user.id, action: "CRITICAL_DEFECT", entity: "Defect", entityId: id } });
      }
      return { item, outcome };
    });
    return result ? ok({ ...result.item, inspectionOutcome: result.outcome }) : fail("عیب پیدا نشد.", 404);
  }
  if (request.method === "DELETE") {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.defect.findUnique({ where: { id } });
      if (!existing) return null;
      await tx.defect.delete({ where: { id } });
      const outcome = await recalculateInspectionScore(tx, existing.inspectionId);
      await tx.auditLog.create({ data: { userId: user.id, action: "DELETE", entity: "Defect", entityId: id } });
      return outcome;
    });
    return result === null ? fail("عیب پیدا نشد.", 404) : ok({ id, inspectionOutcome: result });
  }
  return fail("متد برای عیب پشتیبانی نمی‌شود.", 405);
}

async function capas(request: NextRequest, user: ApiUser, id?: string) {
  if (!id) {
    if (request.method === "GET") {
      const items = await prisma.capa.findMany({ include: { inspection: { include: { job: { select: { jobNumber: true, productName: true } } } }, defect: true, responsibleUser: { select: { id: true, name: true } } }, orderBy: [{ status: "asc" }, { dueDate: "asc" }], take: 300 });
      return ok(items);
    }
    if (request.method === "POST") {
      const parsed = await parseBody(request, capaSchema);
      if (!parsed.success) return fail("اطلاعات CAPA معتبر نیست.", 400, parsed.error.flatten());
      const data = parsed.data;
      const item = await prisma.capa.create({ data: { ...data, defectId: data.defectId || null, responsibleUserId: data.responsibleUserId || null, dueDate: data.dueDate ? new Date(data.dueDate) : null, closedAt: data.status === "CLOSED" ? new Date() : null } });
      await audit(user.id, "CREATE", "Capa", item.id);
      return ok(item, 201);
    }
    return fail("متد برای CAPA پشتیبانی نمی‌شود.", 405);
  }
  if (!idSchema(id)) return fail("شناسه نامعتبر است.", 400);
  if (request.method === "PUT" || request.method === "PATCH") {
    const body: unknown = await request.json().catch(() => null);
    const schema = capaSchema.partial().omit({ inspectionId: true });
    const parsed = schema.safeParse(body);
    if (!parsed.success) return fail("ویرایش CAPA معتبر نیست.", 400, parsed.error.flatten());
    const data = parsed.data;
    const item = await prisma.capa.update({
      where: { id },
      data: {
        ...data,
        ...(data.dueDate !== undefined ? { dueDate: data.dueDate ? new Date(data.dueDate) : null } : {}),
        ...(data.status ? { closedAt: data.status === "CLOSED" ? new Date() : null } : {}),
      },
    });
    await audit(user.id, "UPDATE", "Capa", id);
    return ok(item);
  }
  if (request.method === "DELETE") {
    await prisma.capa.delete({ where: { id } });
    await audit(user.id, "DELETE", "Capa", id);
    return ok({ id });
  }
  return fail("متد برای CAPA پشتیبانی نمی‌شود.", 405);
}

async function customers(request: NextRequest, user: ApiUser, id?: string) {
  if (!id && request.method === "GET") return ok(await prisma.customer.findMany({ include: { _count: { select: { jobs: true } } }, orderBy: { name: "asc" }, take: 300 }));
  if (!id && request.method === "POST") {
    const parsed = await parseBody(request, customerSchema);
    if (!parsed.success) return fail("اطلاعات مشتری معتبر نیست.", 400, parsed.error.flatten());
    const item = await prisma.customer.create({ data: { ...parsed.data, email: parsed.data.email || null } });
    await audit(user.id, "CREATE", "Customer", item.id);
    return ok(item, 201);
  }
  if (id && request.method === "GET") {
    const item = await prisma.customer.findUnique({ where: { id }, include: { jobs: { orderBy: { createdAt: "desc" }, take: 50 } } });
    return item ? ok(item) : fail("مشتری پیدا نشد.", 404);
  }
  if (id && ["PUT", "PATCH"].includes(request.method)) {
    const parsed = await parseBody(request, customerSchema.partial());
    if (!parsed.success) return fail("اطلاعات ویرایش مشتری معتبر نیست.", 400, parsed.error.flatten());
    const item = await prisma.customer.update({ where: { id }, data: { ...parsed.data, ...(parsed.data.email !== undefined ? { email: parsed.data.email || null } : {}) } });
    await audit(user.id, "UPDATE", "Customer", id);
    return ok(item);
  }
  if (id && request.method === "DELETE") {
    if (await prisma.job.count({ where: { customerId: id } })) return fail("مشتری دارای سفارش است و قابل حذف نیست.", 409);
    await prisma.customer.delete({ where: { id } });
    await audit(user.id, "DELETE", "Customer", id);
    return ok({ id });
  }
  return fail("متد برای مشتریان پشتیبانی نمی‌شود.", 405);
}

async function materials(request: NextRequest, user: ApiUser, id?: string) {
  if (!id && request.method === "GET") return ok(await prisma.material.findMany({ orderBy: [{ type: "asc" }, { name: "asc" }], take: 300 }));
  if (!id && request.method === "POST") {
    const parsed = await parseBody(request, materialSchema);
    if (!parsed.success) return fail("اطلاعات ماده اولیه معتبر نیست.", 400, parsed.error.flatten());
    const item = await prisma.material.create({ data: parsed.data });
    await audit(user.id, "CREATE", "Material", item.id);
    return ok(item, 201);
  }
  if (id && request.method === "GET") {
    const item = await prisma.material.findUnique({ where: { id } });
    return item ? ok(item) : fail("ماده اولیه پیدا نشد.", 404);
  }
  if (id && ["PUT", "PATCH"].includes(request.method)) {
    const parsed = await parseBody(request, materialSchema.partial());
    if (!parsed.success) return fail("ویرایش ماده اولیه معتبر نیست.", 400, parsed.error.flatten());
    const item = await prisma.material.update({ where: { id }, data: parsed.data });
    await audit(user.id, "UPDATE", "Material", id);
    return ok(item);
  }
  if (id && request.method === "DELETE") {
    await prisma.material.delete({ where: { id } });
    await audit(user.id, "DELETE", "Material", id);
    return ok({ id });
  }
  return fail("متد برای مواد اولیه پشتیبانی نمی‌شود.", 405);
}

async function users(request: NextRequest, user: ApiUser, id?: string) {
  if (!id && request.method === "GET") return ok(await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 300 }));
  if (!id && request.method === "POST") {
    const parsed = await parseBody(request, userSchema);
    if (!parsed.success) return fail("اطلاعات کاربر معتبر نیست.", 400, parsed.error.flatten());
    const { password, ...data } = parsed.data;
    const item = await prisma.user.create({ data: { ...data, email: data.email.toLowerCase(), passwordHash: await bcrypt.hash(password, 12) }, select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true } });
    await audit(user.id, "CREATE", "User", item.id);
    return ok(item, 201);
  }
  if (id && (request.method === "PATCH" || request.method === "PUT")) {
    const body: unknown = await request.json().catch(() => null);
    const parsed = z.object({ name: z.string().trim().min(2).max(120).optional(), role: z.enum(["ADMIN", "MANAGER", "INSPECTOR", "VIEWER"]).optional(), isActive: z.boolean().optional() }).safeParse(body);
    if (!parsed.success) return fail("تغییرات کاربر معتبر نیست.", 400, parsed.error.flatten());
    if (id === user.id && parsed.data.isActive === false) return fail("مدیر واردشده نمی‌تواند حساب خودش را غیرفعال کند.", 409);
    const item = await prisma.user.update({ where: { id }, data: { ...parsed.data, authVersion: { increment: 1 } }, select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true } });
    await audit(user.id, "UPDATE", "User", id);
    return ok(item);
  }
  if (id && request.method === "DELETE") {
    if (id === user.id) return fail("نمی‌توانید حساب خود را حذف کنید.", 409);
    await prisma.user.update({ where: { id }, data: { isActive: false, authVersion: { increment: 1 } } });
    await audit(user.id, "DEACTIVATE", "User", id);
    return ok({ id, isActive: false });
  }
  return fail("متد برای کاربران پشتیبانی نمی‌شود.", 405);
}

async function standards(request: NextRequest, user: ApiUser, id?: string) {
  if (!id && request.method === "GET") return ok(await prisma.standard.findMany({ orderBy: { code: "asc" } }));
  if (!id && request.method === "POST") {
    const body: unknown = await request.json().catch(() => null);
    const parsed = z.object({ code: z.string().trim().min(2).max(80), name: z.string().trim().min(2).max(160), description: z.string().trim().min(2).max(1000), parameters: z.record(z.unknown()).default({}) }).safeParse(body);
    if (!parsed.success) return fail("اطلاعات استاندارد معتبر نیست.", 400, parsed.error.flatten());
    const item = await prisma.standard.create({ data: { ...parsed.data, parameters: parsed.data.parameters as Prisma.InputJsonValue } });
    await audit(user.id, "CREATE", "Standard", item.id);
    return ok(item, 201);
  }
  if (id && request.method === "GET") {
    const item = await prisma.standard.findUnique({ where: { id } });
    return item ? ok(item) : fail("استاندارد پیدا نشد.", 404);
  }
  return fail("متد برای استانداردها پشتیبانی نمی‌شود.", 405);
}

async function getStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [todayCount, total30, pass30, criticalCount, recent, defectGroups, colors, critical, latestInspections] = await Promise.all([
    prisma.inspection.count({ where: { inspectionDate: { gte: today } } }),
    prisma.inspection.count({ where: { inspectionDate: { gte: thirtyDaysAgo } } }),
    prisma.inspection.count({ where: { inspectionDate: { gte: thirtyDaysAgo }, status: "PASS" } }),
    prisma.defect.count({ where: { type: "CRITICAL", inspection: { inspectionDate: { gte: thirtyDaysAgo } } } }),
    prisma.inspection.findMany({ where: { inspectionDate: { gte: thirtyDaysAgo } }, select: { inspectionDate: true, score: true, status: true, colorMeasurements: { select: { deltaE00: true } } }, orderBy: { inspectionDate: "asc" }, take: 1000 }),
    prisma.defect.groupBy({ by: ["category"], _count: { _all: true }, orderBy: { _count: { category: "desc" } }, take: 8 }),
    prisma.colorMeasurement.aggregate({ where: { inspection: { inspectionDate: { gte: thirtyDaysAgo } } }, _avg: { deltaE00: true } }),
    prisma.defect.findMany({ where: { type: "CRITICAL" }, include: { inspection: { include: { job: { select: { jobNumber: true, productName: true } } } } }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.inspection.findMany({ include: { job: { select: { id: true, jobNumber: true, productName: true } }, inspector: { select: { name: true } } }, orderBy: { inspectionDate: "desc" }, take: 8 }),
  ]);
  const grouped = new Map<string, { count: number; delta: number; score: number }>();
  for (const row of recent) {
    const key = row.inspectionDate.toISOString().slice(0, 10);
    const bucket = grouped.get(key) ?? { count: 0, delta: 0, score: 0 };
    const means = row.colorMeasurements.length ? row.colorMeasurements.reduce((sum, color) => sum + color.deltaE00, 0) / row.colorMeasurements.length : 0;
    bucket.count += 1;
    bucket.delta += means;
    bucket.score += row.score;
    grouped.set(key, bucket);
  }
  const trend = Array.from(grouped, ([date, value]) => ({ date, deltaE: Number((value.delta / value.count).toFixed(2)), score: Number((value.score / value.count).toFixed(1)) }));
  return ok({
    todayInspections: todayCount,
    passRate: total30 ? Math.round((pass30 / total30) * 100) : 0,
    avgDeltaE00: colors._avg.deltaE00 ? Number(colors._avg.deltaE00.toFixed(2)) : 0,
    criticalDefects: criticalCount,
    total30,
    trend,
    defectsByCategory: defectGroups.map((item) => ({ name: item.category, value: item._count._all })),
    criticalAlerts: critical,
    latestInspections,
  });
}

async function upload(request: NextRequest, user: ApiUser) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return fail("Vercel Blob تنظیم نشده است.", 503);
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return fail("فایل ارسال‌شده معتبر نیست.", 400);
  const allowed: Record<string, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
  if (!allowed[file.type] || file.size > 4 * 1024 * 1024) return fail("فقط PDF/تصویر تا ۴ مگابایت مجاز است.", 413);
  const signature = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const starts = (...bytes: number[]) => bytes.every((byte, index) => signature[index] === byte);
  const validSignature = file.type === "application/pdf"
    ? starts(0x25, 0x50, 0x44, 0x46, 0x2d)
    : file.type === "image/png"
      ? starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)
      : file.type === "image/jpeg"
        ? starts(0xff, 0xd8, 0xff)
        : signature[0] === 0x52 && signature[1] === 0x49 && signature[2] === 0x46 && signature[3] === 0x46 && signature[8] === 0x57 && signature[9] === 0x45 && signature[10] === 0x42 && signature[11] === 0x50;
  if (!validSignature) return fail("محتوای واقعی فایل با نوع اعلام‌شده تطبیق ندارد.", 415);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80) || `upload.${allowed[file.type]}`;
  const blob = await put(`${user.id}/${Date.now()}-${safeName}`, file, { access: "public", addRandomSuffix: true, contentType: file.type });
  await audit(user.id, "UPLOAD", "Blob");
  return ok({ url: blob.url, pathname: blob.pathname }, 201);
}

async function exportReport(request: NextRequest, format?: string) {
  const inspectionId = request.nextUrl.searchParams.get("id");
  const selectedFormat = format || request.nextUrl.searchParams.get("format") || "pdf";
  if (!inspectionId || !idSchema(inspectionId)) return fail("شناسه بازرسی معتبر نیست.", 400);
  const inspection = await prisma.inspection.findUnique({ where: { id: inspectionId }, include: { job: { include: { customer: true } }, inspector: { select: { name: true } }, colorMeasurements: true, densityMeasurements: true, registerMeasurement: true, adhesionTest: true, barcodeTest: true, defects: true, capas: true } });
  if (!inspection) return fail("بازرسی پیدا نشد.", 404);
  const filename = `qc-inspection-${inspection.job.jobNumber}-${inspection.id.slice(-6)}`;
  if (selectedFormat === "pdf") {
    const pdf = await buildInspectionPdf(inspection);
    return new NextResponse(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}.pdf"`, "Cache-Control": "no-store" } });
  }
  if (selectedFormat === "excel" || selectedFormat === "xlsx") {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{ "شماره سفارش": inspection.job.jobNumber, "محصول": inspection.job.productName, "مشتری": inspection.job.customer.name, "نوع چاپ": inspection.job.printType, "مرحله": inspection.stage, "بازرس": inspection.inspector.name, "تاریخ": inspection.inspectionDate.toISOString(), "امتیاز": inspection.score, "وضعیت": inspection.status, "نمونه": inspection.sampleSize, "انطباق قانونی": inspection.legalCompliance, "یادداشت": inspection.notes || "" }]), "Summary");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(inspection.colorMeasurements.map((row) => ({ "پچ": row.patchName, "نوع": row.patchType, "هدف L": row.targetL, "هدف a": row.targetA, "هدف b": row.targetB, "اندازه L": row.measuredL, "اندازه a": row.measuredA, "اندازه b": row.measuredB, "ΔE00": row.deltaE00, "ΔE76": row.deltaE76, "تلورانس": row.tolerance, "قبول": row.isPass }))), "Color Measurements");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(inspection.densityMeasurements.map((row) => ({ "کانال": row.colorChannel, "دانسیته هدف": row.targetDensity, "دانسیته اندازه‌گیری": row.measuredDensity, TVI: row.tvi, "قبول": row.isPass }))), "Density");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(inspection.defects.map((row) => ({ نوع: row.type, دسته: row.category, شرح: row.description, محل: row.location, تاریخ: row.createdAt.toISOString() }))), "Defects");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(inspection.capas.map((row) => ({ "علت ریشه‌ای": row.rootCause, روش: row.method, "اقدام اصلاحی": row.correctiveAction, "اقدام پیشگیرانه": row.preventiveAction, وضعیت: row.status, "سررسید": row.dueDate?.toISOString() || "" }))), "CAPA");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{ "شناسه بازرسی": inspection.id, "بازرس": inspection.inspector.name, "زمان ثبت": inspection.createdAt.toISOString(), "دمای محیط": inspection.environmentalTemp, "رطوبت": inspection.environmentalHumidity, "AQL": inspection.aqlLevel || "", "استاندارد هدف": inspection.job.targetStandard || "" }]), "Metadata");
    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" }) as Buffer;
    return new NextResponse(new Uint8Array(buffer), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${filename}.xlsx"`, "Cache-Control": "no-store" } });
  }
  return fail("قالب گزارش باید pdf یا excel باشد.", 400);
}

async function forgotPassword(request: NextRequest) {
  if (!sameOrigin(request)) return fail("درخواست نامعتبر است.", 403);
  const body: unknown = await request.json().catch(() => null);
  const parsed = z.object({ email: z.string().email().max(254) }).safeParse(body);
  if (!parsed.success) return fail("ایمیل معتبر وارد کنید.", 400, parsed.error.flatten());

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!(await consumeRateLimit("forgot-ip", ip, 5, 15 * 60 * 1000))) return fail("تعداد درخواست‌ها زیاد است؛ کمی بعد دوباره تلاش کنید.", 429);

  const genericMessage = "اگر ایمیل در سامانه ثبت شده باشد، لینک بازیابی ارسال خواهد شد.";
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    console.error("Password recovery email is not configured.");
    return fail("سرویس بازیابی رمز موقتاً در دسترس نیست.", 503);
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (!user || !user.isActive) return ok({ message: genericMessage });

  const token = cryptoRandomToken();
  const tokenHash = createHash("sha256").update(token).digest("hex");
  try {
    await prisma.passwordReset.create({ data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 30 * 60 * 1000) } });
    const { Resend } = await import("resend");
    const result = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: process.env.EMAIL_FROM,
      to: user.email,
      subject: "بازیابی رمز QC Print Inspector",
      html: `<div dir="rtl"><p>این لینک یک‌بارمصرف و تا ۳۰ دقیقه معتبر است:</p><p><a href="${(process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin)}/reset-password?token=${encodeURIComponent(token)}">تغییر رمز عبور</a></p></div>`,
    });
    if (result.error) {
      console.error("Password recovery email delivery failed.", result.error);
      await prisma.passwordReset.deleteMany({ where: { tokenHash } });
    }
  } catch (error) {
    console.error("Password recovery could not be completed.", error);
    try {
      await prisma.passwordReset.deleteMany({ where: { tokenHash } });
    } catch (cleanupError) {
      console.error("Failed to remove an unsent password-recovery token.", cleanupError);
    }
  }
  // The response is identical for known and unknown email addresses, including email-provider failures.
  return ok({ message: genericMessage });
}

function cryptoRandomToken() {
  // Kept behind a function so the raw token is never stored in PostgreSQL.
  return randomBytes(32).toString("base64url");
}

async function resetPassword(request: NextRequest) {
  if (!sameOrigin(request)) return fail("درخواست نامعتبر است.", 403);
  const body: unknown = await request.json().catch(() => null);
  const parsed = z.object({ token: z.string().min(20).max(100), password: z.string().min(12).max(200) }).safeParse(body);
  if (!parsed.success) return fail("توکن یا رمز عبور معتبر نیست.", 400, parsed.error.flatten());

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!(await consumeRateLimit("reset-ip", ip, 8, 15 * 60 * 1000))) return fail("تعداد درخواست‌ها زیاد است؛ کمی بعد دوباره تلاش کنید.", 429);

  const now = new Date();
  const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");
  const token = await prisma.passwordReset.findUnique({ where: { tokenHash } });
  if (!token || token.usedAt || token.expiresAt <= now) return fail("لینک بازیابی منقضی یا مصرف شده است.", 400);
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const consumed = await prisma.$transaction(async (tx) => {
    const claim = await tx.passwordReset.updateMany({
      where: { id: token.id, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (claim.count !== 1) return false;
    await tx.user.update({ where: { id: token.userId }, data: { passwordHash, authVersion: { increment: 1 } } });
    await tx.auditLog.create({ data: { userId: token.userId, action: "PASSWORD_RESET", entity: "User", entityId: token.userId } });
    return true;
  });
  if (!consumed) return fail("لینک بازیابی منقضی یا مصرف شده است.", 400);
  return ok({ message: "رمز عبور تغییر کرد؛ اکنون وارد شوید." });
}

export const GET = route;
export const POST = route;
export const PUT = route;
export const PATCH = route;
export const DELETE = route;

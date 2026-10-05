import { PrismaClient, type PrintType } from "../src/generated/prisma/client";
import { deltaE00, deltaE76 } from "../src/lib/domain";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required to seed the database.");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString, max: 2 }) });

const standards = [
  { code: "ISO_12647_1", name: "ISO 12647-1", description: "پارامترها و روش‌های کنترل فرایند چاپ", parameters: { note: "برای انتخاب شرایط اندازه‌گیری و هدف‌های فرایندی، بخش مرتبط با فرایند را نیز مشخص کنید." } },
  { code: "ISO_12647_2", name: "ISO 12647-2", description: "کنترل فرایند چاپ افست لیتوگرافی", parameters: { measurement: "ISO 13655 / شرایط مورد توافق", note: "اهداف رنگ و دانسیته وابسته به کاغذ، شرایط چاپ و نسخه استاندارد است." } },
  { code: "ISO_12647_4", name: "ISO 12647-4", description: "کنترل فرایند چاپ گراور", parameters: { note: "تلورانس‌ها باید از شرایط قراردادی و مشخصات substrate استخراج شوند." } },
  { code: "ISO_12647_6", name: "ISO 12647-6", description: "کنترل فرایند چاپ فلکسوگرافی", parameters: { note: "اهداف وابسته به کاربرد، بستر و سیستم مرکب هستند." } },
  { code: "ISO_12647_7", name: "ISO 12647-7", description: "فرایندهای پروف دیجیتال — الزامات و ارزیابی", parameters: { note: "برای پذیرش تولید دیجیتال، بخش و نسخه قابل‌اعمال را با مشتری تعیین کنید." } },
  { code: "ISO_12647_8", name: "ISO 12647-8", description: "فرایندهای چاپ دیجیتال — اعتبارسنجی خروجی", parameters: { note: "دامنه کاربرد با بخش ۷ یکسان نیست؛ مرجع قراردادی را دقیق ثبت کنید." } },
  { code: "G7", name: "G7 / NPDC", description: "کالیبراسیون مبتنی بر ظاهر خاکستری و منحنی NPDC", parameters: { note: "G7 روش کالیبراسیون است؛ مقادیر هدف باید برای شرایط چاپ مشخص شوند." } },
  { code: "GRACOL_7", name: "GRACoL 7", description: "شرایط چاپ مرجع افست روی کاغذ پوشش‌دار", parameters: { note: "برای انطباق عددی باید نسخه، شرط چاپ و هدف رنگ مورد توافق مشخص باشد." } },
  { code: "ISO_2859_1", name: "ISO 2859-1", description: "نمونه‌برداری پذیرشی بر مبنای AQL برای بازرسی صفتی", parameters: { note: "AQL معیار کیفیت متوسط فرایند نیست؛ طرح نمونه‌برداری توافق‌شده را ثبت کنید." } },
  { code: "ASTM_D3359", name: "ASTM D3359", description: "آزمون چسبندگی پوشش با نوار چسب", parameters: { note: "رتبه‌بندی روش A و B و حدود کاربرد نمونه متفاوت است؛ آزمون را طبق نسخه جاری انجام دهید." } },
  { code: "ISO_IEC_15416", name: "ISO/IEC 15416", description: "ارزیابی کیفیت چاپ بارکد خطی", parameters: { note: "گرید پذیرش را از مشخصات مشتری و کاربرد زنجیره تأمین بگیرید." } },
  { code: "ISO_IEC_29158", name: "ISO/IEC 29158", description: "ارزیابی کیفیت چاپ بارکد دوبعدی", parameters: { note: "برای Data Matrix؛ با ISO/IEC 15415 اشتباه نشود." } },
];

const customers = [
  { name: "آریا بسته‌بندی", contact: "سارا محمدی", email: "quality@arya.example", phone: "+33 1 42 00 10 10", address: "پاریس، فرانسه", notes: "مشتری نمونه؛ پیش از استفاده، اطلاعات واقعی را جایگزین کنید." },
  { name: "پارس دارو", contact: "امیر رضایی", email: "qa@parspharma.example", phone: "+33 1 42 00 20 20", address: "لیون، فرانسه", notes: "کنترل خوانایی و ردیابی برای بسته‌بندی دارویی." },
  { name: "سبزینه مواد غذایی", contact: "نرگس کریمی", email: "print@sabzineh.example", phone: "+33 1 42 00 30 30", address: "لیل، فرانسه", notes: "اطلاعات انطباق تماس غذایی باید جداگانه مستند شود." },
];

const materials = [
  { name: "کاغذ گلاسه ۳۰۰ گرم", type: "PAPER" as const, supplier: "نمونه تأمین‌کننده", spec: "ISO 12647-2 / مشخصات سفارش", notes: "داده نمونه" },
  { name: "فیلم PET شفاف", type: "FILM" as const, supplier: "نمونه تأمین‌کننده", spec: "ضخامت طبق سفارش", notes: "داده نمونه" },
  { name: "مرکب CMYK پایه آب", type: "INK" as const, supplier: "نمونه تأمین‌کننده", spec: "دیتاشیت فنی لازم است", notes: "برای تماس غذایی به‌تنهایی تأیید محسوب نمی‌شود." },
  { name: "وارنیش UV براق", type: "COATING" as const, supplier: "نمونه تأمین‌کننده", spec: "پخت طبق دیتاشیت", notes: "آزمون چسبندگی قبل از تولید" },
  { name: "چسب لمینیت دو جزئی", type: "ADHESIVE" as const, supplier: "نمونه تأمین‌کننده", spec: "نسبت اختلاط طبق دیتاشیت", notes: "کنترل زمان عمل‌آوری" },
];

const jobSamples: Array<{
  jobNumber: string;
  productName: string;
  printType: PrintType;
  substrate: string;
  status: "IN_PROGRESS" | "COMPLETED" | "DRAFT";
  standard: string;
  customerIndex: number;
}> = [
  { jobNumber: "SAMPLE-2026-001", productName: "جعبه دارویی نمونه", printType: "OFFSET", substrate: "کاغذ گلاسه ۳۰۰ گرم", status: "IN_PROGRESS", standard: "ISO 12647-2 / پروف تأییدشده", customerIndex: 1 },
  { jobNumber: "SAMPLE-2026-002", productName: "لیبل فیلمی نمونه", printType: "FLEXO", substrate: "فیلم PET", status: "COMPLETED", standard: "ISO 12647-6 / هدف قراردادی", customerIndex: 0 },
  { jobNumber: "SAMPLE-2026-003", productName: "پاکت مواد غذایی نمونه", printType: "DIGITAL", substrate: "فیلم چندلایه", status: "DRAFT", standard: "پروف مشتری / شرایط چاپ ثبت‌شده", customerIndex: 2 },
];

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 12) {
    throw new Error("Set ADMIN_EMAIL and a unique ADMIN_PASSWORD of at least 12 characters before seeding.");
  }
  const name = process.env.ADMIN_NAME?.trim() || "مدیر سیستم";
  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await prisma.user.upsert({
    where: { email },
    create: { email, name, passwordHash, role: "ADMIN", isActive: true },
    update: { name, isActive: true, authVersion: { increment: 1 } },
  });

  for (const standard of standards) {
    await prisma.standard.upsert({
      where: { code: standard.code },
      create: standard,
      update: { name: standard.name, description: standard.description, parameters: standard.parameters },
    });
  }

  const customerRows = [];
  for (const customer of customers) {
    const existing = await prisma.customer.findFirst({ where: { name: customer.name } });
    customerRows.push(existing ?? (await prisma.customer.create({ data: customer })));
  }

  for (const material of materials) {
    const existing = await prisma.material.findFirst({ where: { name: material.name, type: material.type } });
    if (!existing) await prisma.material.create({ data: material });
  }

  for (const [index, sample] of jobSamples.entries()) {
    const job = await prisma.job.upsert({
      where: { jobNumber: sample.jobNumber },
      create: {
        jobNumber: sample.jobNumber,
        customerId: customerRows[sample.customerIndex]!.id,
        createdById: admin.id,
        printType: sample.printType,
        productName: sample.productName,
        dimensions: index === 1 ? "۹۰ × ۴۰ میلی‌متر" : "۱۲۰ × ۸۰ × ۳۰ میلی‌متر",
        colorsCount: index === 0 ? 4 : 6,
        substrate: sample.substrate,
        ink: index === 1 ? "مرکب پایه آب" : "CMYK + رنگ اسپات",
        targetStandard: sample.standard,
        quantity: [25000, 50000, 12000][index]!,
        status: sample.status,
        notes: "سفارش نمونه برای آشنایی با داشبورد؛ داده‌ها معیار پذیرش واقعی نیستند.",
      },
      update: { status: sample.status },
    });

    const hasInspection = await prisma.inspection.findFirst({ where: { jobId: job.id } });
    if (!hasInspection && index < 2) {
      const inspection = await prisma.inspection.create({
        data: {
          jobId: job.id,
          inspectorId: admin.id,
          stage: index === 0 ? "ON_PRESS" : "POST_PRESS",
          sampleSize: 8,
          aqlLevel: "سطح II / AQL طبق قرارداد",
          environmentalTemp: 23.2,
          environmentalHumidity: 49,
          legalCompliance: "PENDING",
          status: "CONDITIONAL",
          score: index === 0 ? 90 : 89.7,
          notes: "داده نمایشی است؛ برای تصمیم تولیدی از اندازه‌گیری واقعی استفاده کنید.",
          colorMeasurements: {
            create: [
              { patchName: "Cyan solid", patchType: "SOLID", targetL: 55, targetA: -37, targetB: -50, measuredL: 55.4, measuredA: -36.6, measuredB: -49.7, deltaE00: deltaE00({ L: 55, a: -37, b: -50 }, { L: 55.4, a: -36.6, b: -49.7 }), deltaE76: deltaE76({ L: 55, a: -37, b: -50 }, { L: 55.4, a: -36.6, b: -49.7 }), tolerance: 2, isPass: true },
              { patchName: "Magenta 50%", patchType: "TINT", targetL: 60, targetA: 48, targetB: -3, measuredL: 60.5, measuredA: 48.3, measuredB: -2.7, deltaE00: deltaE00({ L: 60, a: 48, b: -3 }, { L: 60.5, a: 48.3, b: -2.7 }), deltaE76: deltaE76({ L: 60, a: 48, b: -3 }, { L: 60.5, a: 48.3, b: -2.7 }), tolerance: 2.5, isPass: true },
            ],
          },
          densityMeasurements: {
            create: [
              { colorChannel: "C", targetDensity: 1.4, measuredDensity: 1.42, tvi: 1.2, isPass: true },
              { colorChannel: "M", targetDensity: 1.45, measuredDensity: 1.44, tvi: -0.7, isPass: true },
              { colorChannel: "Y", targetDensity: 1.05, measuredDensity: 1.06, tvi: 1.4, isPass: true },
              { colorChannel: "K", targetDensity: 1.65, measuredDensity: 1.63, tvi: 1.8, isPass: true },
            ],
          },
          registerMeasurement: { create: { targetOffset: 0, measuredOffset: 0.06, tolerance: 0.1, isPass: true } },
          adhesionTest: { create: { method: "ASTM_D3359", rating: "5B", isPass: true } },
          barcodeTest: { create: { symbology: "Code 128", grade: "A", isPass: true } },
        },
      });
      if (index === 1) {
        await prisma.defect.create({
          data: {
            inspectionId: inspection.id,
            type: "MINOR",
            category: "ظاهر سطح",
            description: "یک لکه بسیار کوچک خارج از ناحیه عملکردی مشاهده شد.",
            location: "لبه چپ نمونه ۳",
          },
        });
      }
    }
  }
  console.info(`Seed complete. Administrator: ${email}. Demo jobs are labelled SAMPLE-*.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());

import { z } from "zod";

export type Lab = { L: number; a: number; b: number };
export type AppRole = "ADMIN" | "MANAGER" | "INSPECTOR" | "VIEWER";
const rad = (degrees: number) => (degrees * Math.PI) / 180;
const deg = (radians: number) => (radians * 180) / Math.PI;
const hue = (a: number, b: number) => {
  const angle = deg(Math.atan2(b, a));
  return angle < 0 ? angle + 360 : angle;
};
const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

/** CIEDE2000 (kL=kC=kH=1). Input Lab values must use the same illuminant/observer. */
export function deltaE00(first: Lab, second: Lab): number {
  const { L: L1, a: a1, b: b1 } = first;
  const { L: L2, a: a2, b: b2 } = second;
  const C1 = Math.hypot(a1, b1);
  const C2 = Math.hypot(a2, b2);
  const meanC = (C1 + C2) / 2;
  const meanC7 = meanC ** 7;
  const twentyFive7 = 25 ** 7;
  const G = 0.5 * (1 - Math.sqrt(meanC7 / (meanC7 + twentyFive7)));
  const a1p = (1 + G) * a1;
  const a2p = (1 + G) * a2;
  const C1p = Math.hypot(a1p, b1);
  const C2p = Math.hypot(a2p, b2);
  const h1p = C1p === 0 ? 0 : hue(a1p, b1);
  const h2p = C2p === 0 ? 0 : hue(a2p, b2);
  const dLp = L2 - L1;
  const dCp = C2p - C1p;

  let dhp = 0;
  if (C1p * C2p !== 0) {
    const diff = h2p - h1p;
    if (Math.abs(diff) <= 180) dhp = diff;
    else if (diff > 180) dhp = diff - 360;
    else dhp = diff + 360;
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(rad(dhp / 2));
  const meanL = (L1 + L2) / 2;
  const meanCp = (C1p + C2p) / 2;

  let meanHp = h1p + h2p;
  if (C1p * C2p === 0) {
    meanHp = h1p + h2p;
  } else if (Math.abs(h1p - h2p) <= 180) {
    meanHp = (h1p + h2p) / 2;
  } else if (h1p + h2p < 360) {
    meanHp = (h1p + h2p + 360) / 2;
  } else {
    meanHp = (h1p + h2p - 360) / 2;
  }

  const T =
    1 -
    0.17 * Math.cos(rad(meanHp - 30)) +
    0.24 * Math.cos(rad(2 * meanHp)) +
    0.32 * Math.cos(rad(3 * meanHp + 6)) -
    0.20 * Math.cos(rad(4 * meanHp - 63));
  const deltaTheta = 30 * Math.exp(-(((meanHp - 275) / 25) ** 2));
  const meanCp7 = meanCp ** 7;
  const RC = 2 * Math.sqrt(meanCp7 / (meanCp7 + twentyFive7));
  const SL = 1 + (0.015 * (meanL - 50) ** 2) / Math.sqrt(20 + (meanL - 50) ** 2);
  const SC = 1 + 0.045 * meanCp;
  const SH = 1 + 0.015 * meanCp * T;
  const RT = -Math.sin(rad(2 * deltaTheta)) * RC;
  const lTerm = dLp / SL;
  const cTerm = dCp / SC;
  const hTerm = dHp / SH;
  return Math.sqrt(Math.max(0, lTerm ** 2 + cTerm ** 2 + hTerm ** 2 + RT * cTerm * hTerm));
}

export function deltaE76(first: Lab, second: Lab): number {
  return Math.hypot(first.L - second.L, first.a - second.a, first.b - second.b);
}

function linearizeSrgb(value: number): number {
  const normalized = value / 255;
  return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

/** Approximate sRGB/D65 -> CIELAB. It is not an ICC conversion or press-proof substitute. */
export function rgbToLab(red: number, green: number, blue: number): Lab {
  const r = linearizeSrgb(clamp(red, 0, 255));
  const g = linearizeSrgb(clamp(green, 0, 255));
  const b = linearizeSrgb(clamp(blue, 0, 255));
  const x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047;
  const y = r * 0.2126729 + g * 0.7151522 + b * 0.072175;
  const z = (r * 0.0193339 + g * 0.119192 + b * 0.9503041) / 1.08883;
  const f = (value: number) => (value > 0.008856451679 ? Math.cbrt(value) : 7.787037 * value + 16 / 116);
  const fx = f(x);
  const fy = f(y);
  const fz = f(z);
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

/** Simple CMYK-to-RGB arithmetic only; real production conversions require an ICC profile. */
export function cmykToRgb(cyan: number, magenta: number, yellow: number, black: number) {
  const c = clamp(cyan, 0, 100) / 100;
  const m = clamp(magenta, 0, 100) / 100;
  const y = clamp(yellow, 0, 100) / 100;
  const k = clamp(black, 0, 100) / 100;
  return {
    r: Math.round(255 * (1 - c) * (1 - k)),
    g: Math.round(255 * (1 - m) * (1 - k)),
    b: Math.round(255 * (1 - y) * (1 - k)),
  };
}

export const jobSchema = z.object({
  jobNumber: z.string().trim().min(2).max(50),
  customerId: z.string().min(1),
  printType: z.enum(["OFFSET", "FLEXO", "GRAVURE", "DIGITAL", "SCREEN", "HYBRID"]),
  productName: z.string().trim().min(2).max(160),
  dimensions: z.string().trim().min(2).max(120),
  colorsCount: z.number().int().min(1).max(20),
  substrate: z.string().trim().min(2).max(160),
  ink: z.string().trim().max(160).optional().nullable(),
  targetStandard: z.string().trim().max(240).optional().nullable(),
  quantity: z.number().int().min(1).max(1_000_000_000),
  dueDate: z.string().max(50).refine((value) => !Number.isNaN(Date.parse(value)), "تاریخ معتبر نیست.").optional().nullable().or(z.literal("")),
  status: z.enum(["DRAFT", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).default("DRAFT"),
  referenceFileUrl: z.string().url().optional().nullable(),
  notes: z.string().max(3000).optional().nullable(),
});

const labNumber = z.number().finite().min(-200).max(300);
const colorInputSchema = z.object({
  patchName: z.string().trim().min(1).max(100),
  patchType: z.enum(["SOLID", "TINT", "SPOT"]).default("SOLID"),
  targetL: labNumber,
  targetA: labNumber,
  targetB: labNumber,
  measuredL: labNumber,
  measuredA: labNumber,
  measuredB: labNumber,
  tolerance: z.number().positive().max(50),
});
const densityInputSchema = z.object({
  colorChannel: z.enum(["C", "M", "Y", "K"]),
  targetDensity: z.number().min(0).max(5),
  measuredDensity: z.number().min(0).max(5),
  tvi: z.number().min(-100).max(100).optional().nullable(),
});
const defectInputSchema = z.object({
  type: z.enum(["CRITICAL", "MAJOR", "MINOR"]),
  category: z.string().trim().min(2).max(100),
  description: z.string().trim().min(3).max(1000),
  location: z.string().trim().max(240).optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
});

export const inspectionSchema = z.object({
  jobId: z.string().min(1),
  stage: z.enum(["PRE_PRESS", "ON_PRESS", "POST_PRESS"]),
  sampleSize: z.number().int().min(1).max(100_000),
  aqlLevel: z.string().trim().max(100).optional().nullable(),
  environmentalTemp: z.number().min(-20).max(80).optional().nullable(),
  environmentalHumidity: z.number().min(0).max(100).optional().nullable(),
  legalCompliance: z.enum(["VERIFIED", "NON_COMPLIANT", "NOT_APPLICABLE", "PENDING"]),
  notes: z.string().max(3000).optional().nullable(),
  colorMeasurements: z.array(colorInputSchema).min(1).max(100),
  densityMeasurements: z.array(densityInputSchema).max(4),
  registerMeasurement: z.object({
    targetOffset: z.number().min(-5).max(5).default(0),
    measuredOffset: z.number().min(0).max(20),
    tolerance: z.number().positive().max(5),
  }),
  adhesionTest: z.object({ rating: z.enum(["NOT_TESTED", "0B", "1B", "2B", "3B", "4B", "5B"]) }),
  barcodeTest: z.object({
    symbology: z.string().trim().min(2).max(80),
    grade: z.enum(["A", "B", "C", "D", "F", "NOT_TESTED"]),
  }),
  defects: z.array(defectInputSchema).max(200).default([]),
});

export const customerSchema = z.object({
  name: z.string().trim().min(2).max(160),
  contact: z.string().trim().max(120).optional().nullable(),
  email: z.string().email().max(254).optional().nullable().or(z.literal("")),
  phone: z.string().trim().max(50).optional().nullable(),
  address: z.string().trim().max(300).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const materialSchema = z.object({
  name: z.string().trim().min(2).max(160),
  type: z.enum(["PAPER", "FILM", "INK", "COATING", "ADHESIVE"]),
  supplier: z.string().trim().max(160).optional().nullable(),
  spec: z.string().trim().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const userSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(200),
  role: z.enum(["ADMIN", "MANAGER", "INSPECTOR", "VIEWER"]),
});

export const capaSchema = z.object({
  inspectionId: z.string().min(1),
  defectId: z.string().min(1).optional().nullable(),
  rootCause: z.string().trim().min(4).max(2000),
  method: z.enum(["FIVE_WHY", "ISHIKAWA"]),
  correctiveAction: z.string().trim().min(4).max(2000),
  preventiveAction: z.string().trim().min(4).max(2000),
  responsibleUserId: z.string().optional().nullable(),
  dueDate: z.string().max(50).refine((value) => !Number.isNaN(Date.parse(value)), "تاریخ معتبر نیست.").optional().nullable().or(z.literal("")),
  status: z.enum(["OPEN", "IN_PROGRESS", "CLOSED"]).default("OPEN"),
});

export type InspectionInput = z.infer<typeof inspectionSchema>;
export type InspectionOutcome = {
  score: number;
  status: "PASS" | "CONDITIONAL" | "FAIL";
  coverage: number;
  reasons: string[];
};

type ScoringInput = Pick<
  InspectionInput,
  "legalCompliance" | "colorMeasurements" | "densityMeasurements" | "defects"
> & Partial<Pick<InspectionInput, "registerMeasurement" | "adhesionTest" | "barcodeTest">>;

function toleranceScore(value: number, tolerance: number): number {
  if (value <= tolerance) return 100;
  return clamp(100 * (2 - value / tolerance));
}

/** Weighted project score; missing criteria are excluded and coverage is returned explicitly. */
export function scoreInspection(input: ScoringInput): InspectionOutcome {
  const buckets: Array<{ weight: number; score: number }> = [];
  const reasons: string[] = [];
  let failedMetric = false;
  let missingRequiredTest = false;
  let majorDefect = false;
  const criticalDefect = input.defects.some((defect) => defect.type === "CRITICAL");

  if (input.colorMeasurements.length) {
    const values = input.colorMeasurements.map((color) => {
      const value = deltaE00(
        { L: color.targetL, a: color.targetA, b: color.targetB },
        { L: color.measuredL, a: color.measuredA, b: color.measuredB },
      );
      if (value > color.tolerance) failedMetric = true;
      return toleranceScore(value, color.tolerance);
    });
    buckets.push({ weight: 30, score: values.reduce((sum, item) => sum + item, 0) / values.length });
  }

  const density = input.densityMeasurements;
  if (density.length) {
    const values = density.map((item) => {
      const densityScore = toleranceScore(Math.abs(item.targetDensity - item.measuredDensity), 0.05);
      const tviScore = item.tvi === null || item.tvi === undefined ? 100 : toleranceScore(Math.abs(item.tvi), 3);
      if (densityScore < 100 || tviScore < 100) failedMetric = true;
      return (densityScore + tviScore) / 2;
    });
    buckets.push({ weight: 15, score: values.reduce((sum, item) => sum + item, 0) / values.length });
  }

  if (input.registerMeasurement) {
    const registerDifference = Math.abs(input.registerMeasurement.measuredOffset - input.registerMeasurement.targetOffset);
    const registerScore = toleranceScore(registerDifference, input.registerMeasurement.tolerance);
    if (registerDifference > input.registerMeasurement.tolerance) failedMetric = true;
    buckets.push({ weight: 15, score: registerScore });
  } else {
    missingRequiredTest = true;
    reasons.push("اندازه‌گیری رجیستر ثبت نشده است.");
  }

  if (input.adhesionTest && input.adhesionTest.rating !== "NOT_TESTED") {
    const adhesionIndex = Number.parseInt(input.adhesionTest.rating.slice(0, 1), 10);
    const adhesionScore = adhesionIndex >= 4 ? 100 : clamp(adhesionIndex * 20);
    if (adhesionIndex < 4) failedMetric = true;
    buckets.push({ weight: 10, score: adhesionScore });
  } else {
    missingRequiredTest = true;
    reasons.push("آزمون چسبندگی انجام نشده است.");
  }

  if (input.barcodeTest && input.barcodeTest.grade !== "NOT_TESTED") {
    const barcodeScores: Record<string, number> = { A: 100, B: 90, C: 60, D: 25, F: 0 };
    const barcodeScore = barcodeScores[input.barcodeTest.grade] ?? 0;
    if (barcodeScore < 90) failedMetric = true;
    buckets.push({ weight: 10, score: barcodeScore });
  } else {
    missingRequiredTest = true;
    reasons.push("آزمون بارکد انجام نشده است.");
  }

  const visualPenalty = input.defects.reduce((sum, defect) => {
    if (defect.type === "CRITICAL") return sum + 100;
    if (defect.type === "MAJOR") return sum + 25;
    return sum + 3;
  }, 0);
  buckets.push({ weight: 10, score: clamp(100 - visualPenalty) });
  majorDefect = input.defects.some((defect) => defect.type === "MAJOR");

  if (input.legalCompliance === "VERIFIED") buckets.push({ weight: 10, score: 100 });
  if (input.legalCompliance === "NON_COMPLIANT") {
    buckets.push({ weight: 10, score: 0 });
    reasons.push("عدم انطباق قانونی ثبت شده است.");
  }
  if (input.legalCompliance === "PENDING") {
    buckets.push({ weight: 10, score: 0 });
    reasons.push("مدارک انطباق قانونی هنوز تأیید نشده‌اند.");
  }
  if (input.legalCompliance === "NOT_APPLICABLE") buckets.push({ weight: 10, score: 100 });

  const possibleWeight = 100;
  const measuredWeight = buckets.reduce((sum, item) => sum + item.weight, 0);
  const weighted = buckets.reduce((sum, item) => sum + item.score * item.weight, 0);
  const score = measuredWeight ? Math.round((weighted / measuredWeight) * 10) / 10 : 0;
  const coverage = Math.round((measuredWeight / possibleWeight) * 100);
  if (coverage < 100) {
    missingRequiredTest = true;
    reasons.push(`پوشش معیارهای وزن‌دار ${coverage}٪ است؛ برای تأیید، همه معیارهای قابل‌اعمال باید تعیین تکلیف شوند.`);
  }

  if (criticalDefect) reasons.push("عیب بحرانی: توقف و قرنطینه محصول تا تعیین تکلیف.");
  if (failedMetric) reasons.push("یک یا چند معیار اندازه‌گیری خارج از حد پذیرش است.");
  if (majorDefect) reasons.push("عیب اصلی نیازمند اقدام اصلاحی/تأیید سرپرست است.");

  let status: InspectionOutcome["status"];
  if (criticalDefect || input.legalCompliance === "NON_COMPLIANT" || score < 60) {
    status = "FAIL";
  } else if (
    input.legalCompliance === "PENDING" ||
    failedMetric ||
    missingRequiredTest ||
    majorDefect ||
    score < 75
  ) {
    status = "CONDITIONAL";
  } else {
    status = "PASS";
  }
  return { score, status, coverage, reasons };
}

export const PRINT_TYPE_LABEL: Record<string, string> = {
  OFFSET: "افست",
  FLEXO: "فلکسو",
  GRAVURE: "گراور",
  DIGITAL: "دیجیتال",
  SCREEN: "اسکرین",
  HYBRID: "هیبرید",
};
export const JOB_STATUS_LABEL: Record<string, string> = {
  DRAFT: "پیش‌نویس",
  IN_PROGRESS: "در حال تولید",
  COMPLETED: "تکمیل‌شده",
  CANCELLED: "لغوشده",
};
export const INSPECTION_STATUS_LABEL: Record<string, string> = {
  PASS: "تأیید",
  CONDITIONAL: "مشروط",
  FAIL: "رد شده",
};
export const ROLE_LABEL: Record<string, string> = {
  ADMIN: "مدیر سیستم",
  MANAGER: "سرپرست کیفیت",
  INSPECTOR: "بازرس",
  VIEWER: "مشاهده‌گر",
};
export const fmt = (value: number, maximumFractionDigits = 1) =>
  new Intl.NumberFormat("fa-IR", { maximumFractionDigits }).format(value);
export const fmtDate = (value: string | Date) =>
  new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(new Date(value));

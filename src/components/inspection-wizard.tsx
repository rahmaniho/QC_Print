"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm, type FieldPath, type UseFormRegister } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, ClipboardCheck, Plus, Save, Trash2 } from "lucide-react";
import { Badge, Button, Card, Input, Select } from "@/components/ui";
import { deltaE00, inspectionSchema, scoreInspection, type InspectionInput, type Lab } from "@/lib/domain";

type InspectionFormInput = z.input<typeof inspectionSchema>;

const blankNumber = Number.NaN;
function newColor(): InspectionInput["colorMeasurements"][number] {
  return { patchName: "", patchType: "SOLID", targetL: blankNumber, targetA: blankNumber, targetB: blankNumber, measuredL: blankNumber, measuredA: blankNumber, measuredB: blankNumber, tolerance: 2 };
}
function newDensity(channel: "C" | "M" | "Y" | "K"): InspectionInput["densityMeasurements"][number] {
  return { colorChannel: channel, targetDensity: blankNumber, measuredDensity: blankNumber, tvi: blankNumber };
}
const stepLabels = ["اطلاعات کلی", "اندازه‌گیری رنگ", "دانسیته و TVI", "رجیستر", "چسبندگی", "بارکد", "عیوب", "نتیجه"];

function LabNumberField({ label, name, register, step = "0.1" }: { label: string; name: `colorMeasurements.${number}.${"targetL" | "targetA" | "targetB" | "measuredL" | "measuredA" | "measuredB"}`; register: UseFormRegister<InspectionFormInput>; step?: string }) {
  return <label><span className="field-label">{label}</span><Input type="number" step={step} {...register(name, { valueAsNumber: true })} /></label>;
}

export function InspectionWizard({ jobId }: { jobId: string }) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const storageKey = `qc-print-inspection-draft:${jobId}`;
  const form = useForm<InspectionFormInput, undefined, InspectionInput>({
    resolver: zodResolver(inspectionSchema),
    defaultValues: {
      jobId,
      stage: "ON_PRESS",
      sampleSize: blankNumber,
      aqlLevel: "",
      environmentalTemp: null,
      environmentalHumidity: null,
      legalCompliance: "PENDING",
      notes: "",
      colorMeasurements: [newColor()],
      densityMeasurements: ["C", "M", "Y", "K"].map((channel) => newDensity(channel as "C" | "M" | "Y" | "K")),
      registerMeasurement: { targetOffset: 0, measuredOffset: blankNumber, tolerance: 0.2 },
      adhesionTest: { rating: "NOT_TESTED" },
      barcodeTest: { symbology: "Code 128", grade: "NOT_TESTED" },
      defects: [],
    },
    mode: "onBlur",
  });
  const colors = useFieldArray({ control: form.control, name: "colorMeasurements" });
  const densities = useFieldArray({ control: form.control, name: "densityMeasurements" });
  const defects = useFieldArray({ control: form.control, name: "defects" });
  const watched = form.watch();
  const preview = useMemo(() => {
    const parsed = inspectionSchema.safeParse(watched);
    return parsed.success ? scoreInspection(parsed.data) : null;
  }, [watched]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const value: unknown = JSON.parse(saved);
        if (typeof value === "object" && value !== null && "jobId" in value && value.jobId === jobId) form.reset(value as InspectionFormInput);
      }
    } catch {
      localStorage.removeItem(storageKey);
    }
    const subscription = form.watch((value) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(value));
      } catch {
        // A storage quota issue must not interrupt the inspection form.
      }
    });
    return () => subscription.unsubscribe();
  }, [form, jobId, storageKey]);

  function saveDraft() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(form.getValues()));
      toast.success("پیش‌نویس در همین مرورگر ذخیره شد.");
    } catch {
      toast.error("ذخیره پیش‌نویس مرورگر ممکن نشد.");
    }
  }

  async function goNext() {
    const stepFields: FieldPath<InspectionFormInput>[][] = [
      ["stage", "sampleSize", "legalCompliance"],
      ["colorMeasurements"],
      ["densityMeasurements"],
      ["registerMeasurement"],
      ["adhesionTest"],
      ["barcodeTest"],
      ["defects"],
      [],
    ];
    const fields = stepFields[step] ?? [];
    const valid = fields.length ? await form.trigger(fields) : true;
    if (!valid) {
      toast.error("فیلدهای الزامی این مرحله را کامل و مقادیر اندازه‌گیری را بازبینی کنید.");
      return;
    }
    setStep((value) => Math.min(7, value + 1));
  }

  async function submit(values: InspectionInput) {
    setSubmitting(true);
    try {
      const response = await fetch("/api/inspections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const payload = (await response.json()) as { success: boolean; data?: { id: string; status: string }; error?: { message?: string; details?: unknown } };
      if (!response.ok || !payload.success || !payload.data) throw new Error(payload.error?.message || "ثبت بازرسی انجام نشد.");
      localStorage.removeItem(storageKey);
      toast.success("بازرسی ثبت شد و گزارش آن آماده است.");
      window.location.assign(`/inspections/${payload.data.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "خطا در ثبت بازرسی");
    } finally {
      setSubmitting(false);
    }
  }

  const { errors } = form.formState;
  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs font-semibold text-slate-400">سفارش {jobId.slice(-8).toUpperCase()}</p><h1 className="mt-1 text-2xl font-extrabold">ثبت بازرسی جدید</h1><p className="mt-1 text-sm text-slate-500">داده‌های اندازه‌گیری واقعی را وارد کنید؛ مقادیر خالی به‌صورت فرضی تکمیل نمی‌شوند.</p></div>
        <Button variant="secondary" onClick={saveDraft}><Save size={16}/> ذخیره پیش‌نویس</Button>
      </div>

      <Card className="mb-5 p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between"><span className="text-xs font-bold text-slate-600 dark:text-slate-300">مرحله {step + 1} از ۸ · {stepLabels[step]}</span><span className="text-xs text-slate-400">{Math.round(((step + 1) / 8) * 100)}٪</span></div>
        <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-blue-700 transition-all duration-300" style={{ width: `${((step + 1) / 8) * 100}%` }} /></div>
        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">{stepLabels.map((label, index) => <button type="button" key={label} onClick={() => index <= step && setStep(index)} className={`truncate rounded-lg px-1 py-1.5 text-[9px] font-semibold transition sm:text-[10px] ${step === index ? "bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200" : index < step ? "text-emerald-700 dark:text-emerald-300" : "text-slate-400"}`} aria-current={step === index ? "step" : undefined}>{index < step ? <Check size={12} className="mx-auto mb-0.5"/> : null}{label}</button>)}</div>
      </Card>

      <form onSubmit={form.handleSubmit(submit)}>
        {step === 0 ? <Card className="p-5 sm:p-7"><div className="mb-5 flex items-start gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"><ClipboardCheck size={19}/></div><div><h2 className="font-bold">اطلاعات عمومی بازرسی</h2><p className="mt-1 text-xs text-slate-500">شرایط نمونه‌برداری و محیط اندازه‌گیری را ثبت کنید.</p></div></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label><span className="field-label">مرحله بازرسی</span><Select {...form.register("stage")}><option value="PRE_PRESS">پیش از چاپ</option><option value="ON_PRESS">حین چاپ</option><option value="POST_PRESS">پس از چاپ</option></Select></label>
          <label><span className="field-label">تعداد نمونه</span><Input type="number" min="1" max="100000" {...form.register("sampleSize", { valueAsNumber: true })}/>{errors.sampleSize ? <span className="mt-1 block text-xs text-red-600">عدد نمونه معتبر وارد کنید.</span> : null}</label>
          <label><span className="field-label">سطح بازرسی / AQL مورد توافق</span><Input {...form.register("aqlLevel")} placeholder="مثلاً سطح II / AQL 0.65"/></label>
          <label><span className="field-label">دما (°C)</span><Input type="number" step="0.1" placeholder="اندازه‌گیری واقعی" value={watched.environmentalTemp ?? ""} onChange={(event) => form.setValue("environmentalTemp", event.target.value === "" ? null : Number(event.target.value))}/></label>
          <label><span className="field-label">رطوبت نسبی (%)</span><Input type="number" step="0.1" placeholder="اندازه‌گیری واقعی" value={watched.environmentalHumidity ?? ""} onChange={(event) => form.setValue("environmentalHumidity", event.target.value === "" ? null : Number(event.target.value))}/></label>
          <label><span className="field-label">وضعیت مستندات قانونی</span><Select {...form.register("legalCompliance")}><option value="PENDING">در انتظار مدارک / تأیید</option><option value="VERIFIED">تأیید مستندات آزمون</option><option value="NOT_APPLICABLE">برای این کاربرد مصداق ندارد</option><option value="NON_COMPLIANT">عدم انطباق تأییدشده</option></Select></label>
        </div><label className="mt-4 block"><span className="field-label">یادداشت بازرسی</span><textarea className="field min-h-24 resize-y" {...form.register("notes")} placeholder="مرجع پروف، شرایط نور، ابزار و توضیحات مرتبط را وارد کنید…"/></label><div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"><AlertTriangle size={15} className="ml-2 inline"/>وضعیت «تأیید مستندات» را فقط با مدارک معتبر انتخاب کنید؛ نتیجه بصری به‌تنهایی انطباق تماس غذایی یا مهاجرت را ثابت نمی‌کند.</div></Card> : null}

        {step === 1 ? <Card className="p-5 sm:p-7"><div className="mb-5"><h2 className="font-bold">اندازه‌گیری رنگ</h2><p className="mt-1 text-xs leading-5 text-slate-500">Lab هدف و اندازه‌گیری‌شده باید بر اساس مرجع، شرایط ISO 13655 و ابزار کالیبره وارد شود.</p></div><div className="space-y-4">{colors.fields.map((field, index) => { const target: Lab = { L: Number(watched.colorMeasurements?.[index]?.targetL), a: Number(watched.colorMeasurements?.[index]?.targetA), b: Number(watched.colorMeasurements?.[index]?.targetB) }; const measured: Lab = { L: Number(watched.colorMeasurements?.[index]?.measuredL), a: Number(watched.colorMeasurements?.[index]?.measuredA), b: Number(watched.colorMeasurements?.[index]?.measuredB) }; const result = [...Object.values(target), ...Object.values(measured)].every(Number.isFinite) ? deltaE00(target, measured) : null; const tolerance = Number(watched.colorMeasurements?.[index]?.tolerance ?? 2); return <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700" key={field.id}><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-bold text-slate-500">پچ {index + 1}</span>{result !== null ? <Badge tone={result <= tolerance ? "green" : "red"}>ΔE00 {result.toFixed(2)} · {result <= tolerance ? "داخل تلورانس" : "خارج از تلورانس"}</Badge> : <Badge tone="slate">تکمیل اندازه‌گیری</Badge>}{colors.fields.length > 1 ? <button type="button" aria-label="حذف پچ" onClick={() => colors.remove(index)} className="text-slate-400 hover:text-red-600"><Trash2 size={16}/></button> : null}</div><div className="mb-3 grid gap-3 sm:grid-cols-[1.2fr_1fr_.7fr]"><label><span className="field-label">نام پچ</span><Input {...form.register(`colorMeasurements.${index}.patchName` as const)} placeholder="Cyan solid / قرمز اسپات"/></label><label><span className="field-label">نوع پچ</span><Select {...form.register(`colorMeasurements.${index}.patchType` as const)}><option value="SOLID">جامد</option><option value="TINT">نیم‌سایه</option><option value="SPOT">اسپات</option></Select></label><label><span className="field-label">تلورانس ΔE00</span><Input type="number" step="0.1" min="0.1" {...form.register(`colorMeasurements.${index}.tolerance` as const,{valueAsNumber:true})}/></label></div><div className="grid gap-3 sm:grid-cols-2"><div><p className="mb-2 text-[11px] font-bold text-slate-500">Lab هدف</p><div className="grid grid-cols-3 gap-2"><LabNumberField label="L*" name={`colorMeasurements.${index}.targetL`} register={form.register}/><LabNumberField label="a*" name={`colorMeasurements.${index}.targetA`} register={form.register}/><LabNumberField label="b*" name={`colorMeasurements.${index}.targetB`} register={form.register}/></div></div><div><p className="mb-2 text-[11px] font-bold text-slate-500">Lab اندازه‌گیری‌شده</p><div className="grid grid-cols-3 gap-2"><LabNumberField label="L*" name={`colorMeasurements.${index}.measuredL`} register={form.register}/><LabNumberField label="a*" name={`colorMeasurements.${index}.measuredA`} register={form.register}/><LabNumberField label="b*" name={`colorMeasurements.${index}.measuredB`} register={form.register}/></div></div></div></div>; })}</div><Button type="button" variant="secondary" className="mt-4" onClick={() => colors.append(newColor())}><Plus size={15}/> افزودن پچ رنگ</Button></Card> : null}

        {step === 2 ? <Card className="p-5 sm:p-7"><h2 className="font-bold">دانسیته جامد و TVI</h2><p className="mb-5 mt-1 text-xs leading-5 text-slate-500">مقادیر هدف را از job ticket یا استاندارد قراردادی وارد کنید. حد نمونه اولیه در محاسبه فقط ±0.05 دانسیته و ±3 واحد TVI است و باید تأیید شود.</p><div className="space-y-3">{densities.fields.map((field,index)=><div key={field.id} className="grid items-end gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700 sm:grid-cols-[.65fr_1fr_1fr_1fr]"><label><span className="field-label">کانال</span><Select {...form.register(`densityMeasurements.${index}.colorChannel` as const)}><option value="C">Cyan</option><option value="M">Magenta</option><option value="Y">Yellow</option><option value="K">Black</option></Select></label><label><span className="field-label">دانسیته هدف</span><Input type="number" step="0.01" {...form.register(`densityMeasurements.${index}.targetDensity` as const,{valueAsNumber:true})}/></label><label><span className="field-label">اندازه‌گیری</span><Input type="number" step="0.01" {...form.register(`densityMeasurements.${index}.measuredDensity` as const,{valueAsNumber:true})}/></label><div className="flex gap-2"><label className="min-w-0 flex-1"><span className="field-label">انحراف TVI از هدف (pp)</span><Input type="number" step="0.1" {...form.register(`densityMeasurements.${index}.tvi` as const,{valueAsNumber:true})}/></label><button type="button" className="mb-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600" onClick={() => densities.remove(index)} aria-label="حذف کانال"><Trash2 size={16}/></button></div></div>)}</div><div className="mt-4 flex flex-wrap gap-2">{(["C","M","Y","K"] as const).filter((channel) => !watched.densityMeasurements?.some((item) => item.colorChannel === channel)).map((channel) => <Button key={channel} type="button" variant="secondary" onClick={() => densities.append(newDensity(channel))}><Plus size={14}/>{channel}</Button>)}</div></Card> : null}

        {step === 3 ? <Card className="p-5 sm:p-7"><h2 className="font-bold">کنترل رجیستر</h2><p className="mb-5 mt-1 text-xs leading-5 text-slate-500">جابجایی را بر حسب میلی‌متر ثبت کنید. مقدار تلورانس باید با نوع محصول و توافق مشتری منطبق باشد.</p><div className="grid gap-4 sm:grid-cols-3"><label><span className="field-label">هدف offset (mm)</span><Input type="number" step="0.01" {...form.register("registerMeasurement.targetOffset",{valueAsNumber:true})}/></label><label><span className="field-label">جابجایی اندازه‌گیری‌شده (mm)</span><Input type="number" step="0.01" {...form.register("registerMeasurement.measuredOffset",{valueAsNumber:true})}/></label><label><span className="field-label">تلورانس (mm)</span><Input type="number" step="0.01" min="0.01" {...form.register("registerMeasurement.tolerance",{valueAsNumber:true})}/></label></div><div className="mt-5 rounded-xl bg-blue-50 p-4 text-xs leading-6 text-blue-800 dark:bg-blue-950/60 dark:text-blue-200">تلورانس نمایشی شروع کار: ۰٫۲ میلی‌متر برای بسته‌بندی. مقدار واقعی را بر اساس سفارش تنظیم کنید؛ برای برچسب دقیق ممکن است حد سخت‌گیرانه‌تری توافق شده باشد.</div></Card> : null}

        {step === 4 ? <Card className="p-5 sm:p-7"><h2 className="font-bold">آزمون چسبندگی مرکب</h2><p className="mb-5 mt-1 text-xs leading-5 text-slate-500">روش آزمون، بستر، نوع نوار و آماده‌سازی نمونه را با نسخه جاری استاندارد و روش مصوب آزمایشگاه تطبیق دهید.</p><div className="max-w-sm"><label><span className="field-label">رتبه Cross-hatch (ASTM D3359)</span><Select {...form.register("adhesionTest.rating")}><option value="NOT_TESTED">آزمون نشده</option><option value="0B">0B — شکست کامل</option><option value="1B">1B</option><option value="2B">2B</option><option value="3B">3B</option><option value="4B">4B — حد نمونه برنامه</option><option value="5B">5B — بدون جداشدگی قابل مشاهده</option></Select></label><Badge tone={Number.parseInt(watched.adhesionTest?.rating || "0",10) >= 4 ? "green" : "amber"}>{Number.parseInt(watched.adhesionTest?.rating || "0",10) >= 4 ? "حداقل 4B برقرار است" : "پایین‌تر از حد نمونه"}</Badge></div></Card> : null}

        {step === 5 ? <Card className="p-5 sm:p-7"><h2 className="font-bold">کنترل بارکد</h2><p className="mb-5 mt-1 text-xs leading-5 text-slate-500">گرید نهایی به دستگاه verifier، نماد، طول موج، دهانه و فاصله اندازه‌گیری وابسته است. نتیجه اسکن معمولی گواهی ISO نیست.</p><div className="grid gap-4 sm:grid-cols-2"><label><span className="field-label">نوع نماد</span><Select {...form.register("barcodeTest.symbology")}><option>Code 128</option><option>EAN-13</option><option>UPC-A</option><option>Data Matrix</option><option>QR Code</option><option>GS1-128</option><option>سایر</option></Select></label><label><span className="field-label">گرید verifier</span><Select {...form.register("barcodeTest.grade")}><option value="NOT_TESTED">آزمون نشده</option><option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option><option value="F">F</option></Select></label></div>{watched.barcodeTest?.grade === "NOT_TESTED" ? <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">گرید ثبت نشده است؛ ارزیابی بارکد در امتیاز نهایی پوشش داده نمی‌شود و نتیجه می‌تواند مشروط باشد.</p> : null}</Card> : null}

        {step === 6 ? <Card className="p-5 sm:p-7"><div className="mb-5 flex items-center justify-between gap-2"><div><h2 className="font-bold">ثبت عیوب مشاهده‌شده</h2><p className="mt-1 text-xs text-slate-500">عیب بحرانی باید موجب توقف/قرنطینه و اطلاع فوری شود.</p></div><Button type="button" variant="secondary" onClick={() => defects.append({type:"MINOR",category:"",description:"",location:"",imageUrl:null})}><Plus size={15}/> افزودن عیب</Button></div>{defects.fields.length ? <div className="space-y-3">{defects.fields.map((field,index)=><div key={field.id} className="grid gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700 sm:grid-cols-2"><label><span className="field-label">شدت</span><Select {...form.register(`defects.${index}.type` as const)}><option value="CRITICAL">بحرانی</option><option value="MAJOR">اصلی</option><option value="MINOR">جزئی</option></Select></label><label><span className="field-label">دسته عیب</span><Input {...form.register(`defects.${index}.category` as const)} placeholder="رجیستر، لکه، چسبندگی…"/></label><label className="sm:col-span-2"><span className="field-label">شرح عیب</span><Input {...form.register(`defects.${index}.description` as const)} placeholder="شرح قابل پیگیری و عینی"/></label><label><span className="field-label">محل مشاهده</span><Input {...form.register(`defects.${index}.location` as const)} placeholder="نوار / شماره نمونه / نقطه"/></label><div className="flex items-end justify-between"><p className="text-[10px] text-slate-400">در صورت نیاز، تصویر را بعداً از صفحه سفارش بارگذاری کنید.</p><button type="button" onClick={() => defects.remove(index)} className="grid h-10 w-10 place-items-center rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="حذف عیب"><Trash2 size={16}/></button></div></div>)}</div> : <div className="rounded-2xl border border-dashed border-slate-300 py-12 text-center text-sm text-slate-500 dark:border-slate-700">عیبی ثبت نشده است.</div>}</Card> : null}

        {step === 7 ? <div className="space-y-5"><Card className="p-5 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold">بازبینی و نتیجه</h2><p className="mt-1 text-xs leading-5 text-slate-500">تصمیم بازرسی بر اساس معیارهای ثبت‌شده محاسبه می‌شود؛ پیش از ذخیره، تمام اندازه‌گیری‌ها را بازبینی کنید.</p></div>{preview ? <Badge tone={preview.status === "PASS" ? "green" : preview.status === "FAIL" ? "red" : "amber"}>{preview.status === "PASS" ? "تأیید" : preview.status === "FAIL" ? "رد" : "مشروط"}</Badge> : <Badge tone="amber">اطلاعات ناقص است</Badge>}</div><div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-blue-50 p-4 dark:bg-blue-950/50"><p className="text-xs text-blue-700 dark:text-blue-300">امتیاز وزنی</p><p className="mt-2 text-3xl font-extrabold text-blue-900 dark:text-white">{preview ? preview.score.toFixed(1) : "—"}<span className="text-sm font-medium"> / 100</span></p></div><div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800"><p className="text-xs text-slate-500">پوشش معیارها</p><p className="mt-2 text-3xl font-extrabold">{preview ? `${preview.coverage}%` : "—"}</p></div><div className={`rounded-2xl p-4 ${preview?.status === "FAIL" ? "bg-red-50 dark:bg-red-950/40" : preview?.status === "PASS" ? "bg-emerald-50 dark:bg-emerald-950/40" : "bg-amber-50 dark:bg-amber-950/40"}`}><p className="text-xs text-slate-500">وضعیت مدارک قانونی</p><p className="mt-2 text-sm font-bold">{watched.legalCompliance === "VERIFIED" ? "تأییدشده بر اساس مدارک ثبت‌شده" : watched.legalCompliance === "NOT_APPLICABLE" ? "غیرقابل‌اعمال طبق دامنه سفارش" : watched.legalCompliance === "NON_COMPLIANT" ? "عدم انطباق — توقف" : "در انتظار تأیید — تصمیم مشروط"}</p></div></div>{preview?.reasons.length ? <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100"><p className="mb-1 font-bold">موارد اثرگذار بر تصمیم</p><ul className="list-inside list-disc">{preview.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></div> : null}<p className="mt-4 text-[11px] leading-5 text-slate-400">وزن‌های امتیازدهی: رنگ ۳۰٪، رجیستر ۱۵٪، دانسیته/TVI ۱۵٪، چسبندگی ۱۰٪، بارکد ۱۰٪، ظاهر ۱۰٪ و انطباق قانونی ۱۰٪. معیارهای ثبت‌نشده در درصد پوشش منعکس می‌شوند.</p></Card><label className="block"><span className="field-label">یادداشت نهایی / علت تصمیم</span><textarea className="field min-h-24 resize-y" {...form.register("notes")} placeholder="اقدام فوری، محدوده محصول تحت تأثیر و علت احتمالی را ثبت کنید…"/></label></div> : null}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><Link href={`/jobs/${jobId}`} className="text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white">خروج از فرم</Link><div className="flex items-center gap-2">{step > 0 ? <Button type="button" variant="secondary" onClick={() => setStep((value) => Math.max(0,value-1))}><ArrowRight size={16}/> مرحله قبل</Button> : null}{step < 7 ? <Button type="button" onClick={goNext}>مرحله بعد <ArrowLeft size={16}/></Button> : <Button type="submit" disabled={submitting || !preview}><Check size={16}/>{submitting ? "در حال ثبت…" : "ثبت نهایی بازرسی"}</Button>}</div></div>
      </form>
    </div>
  );
}

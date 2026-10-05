"use client";

import Link from "next/link";
import { useEffect, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowRight, LoaderCircle, Save } from "lucide-react";
import { Button, Card, Input, Select } from "@/components/ui";
import { useRole } from "@/components/layout";
import { jobSchema } from "@/lib/domain";

type CustomerOption = { id: string; name: string };
type JobFormInput = z.input<typeof jobSchema>;
type JobFormValues = z.output<typeof jobSchema>;

export default function NewJobPage() {
  const router = useRouter();
  const role = useRole();
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const form = useForm<JobFormInput, undefined, JobFormValues>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      jobNumber: "",
      customerId: "",
      printType: "OFFSET",
      productName: "",
      dimensions: "",
      colorsCount: 4,
      substrate: "",
      ink: "",
      targetStandard: "",
      quantity: 1,
      dueDate: null,
      status: "DRAFT",
      referenceFileUrl: null,
      notes: "",
    },
  });

  useEffect(() => {
    fetch("/api/customers", { cache: "no-store" })
      .then(async (response) => {
        const result = (await response.json()) as { success: boolean; data: CustomerOption[]; error?: { message?: string } };
        if (!response.ok || !result.success) throw new Error(result.error?.message || "فهرست مشتریان دریافت نشد.");
        setCustomers(result.data);
      })
      .catch((error: unknown) => toast.error(error instanceof Error ? error.message : "دریافت مشتریان ناموفق بود."))
      .finally(() => setLoadingCustomers(false));
  }, []);

  async function uploadReference(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf" && !file.type.startsWith("image/")) {
      toast.error("فقط فایل PDF یا تصویر مجاز است.");
      event.target.value = "";
      return;
    }
    setUploading(true);
    try {
      const data = new FormData();
      data.append("file", file);
      const response = await fetch("/api/upload", { method: "POST", body: data });
      const result = (await response.json()) as { success: boolean; data?: { url: string }; error?: { message?: string } };
      if (!response.ok || !result.success || !result.data) throw new Error(result.error?.message || "بارگذاری فایل انجام نشد.");
      form.setValue("referenceFileUrl", result.data.url, { shouldDirty: true });
      toast.success("فایل مرجع بارگذاری شد.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "بارگذاری فایل ناموفق بود.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function submit(values: JobFormValues) {
    setSaving(true);
    try {
      const response = await fetch("/api/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, dueDate: values.dueDate || null }) });
      const result = (await response.json()) as { success: boolean; data?: { id: string }; error?: { message?: string } };
      if (!response.ok || !result.success || !result.data) throw new Error(result.error?.message || "ذخیره سفارش انجام نشد.");
      toast.success("سفارش جدید ثبت شد.");
      router.push(`/jobs/${result.data.id}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ثبت سفارش ناموفق بود.");
    } finally {
      setSaving(false);
    }
  }

  if (!["ADMIN", "MANAGER"].includes(role)) {
    return <Card className="p-8 text-center"><h1 className="text-xl font-bold">دسترسی لازم وجود ندارد</h1><p className="mt-2 text-sm text-slate-500">ایجاد سفارش فقط برای مدیر سامانه یا سرپرست کیفیت فعال است.</p><Link href="/jobs" className="mt-5 inline-block text-sm font-bold text-blue-700">بازگشت به سفارش‌ها</Link></Card>;
  }

  return <div className="mx-auto max-w-4xl">
    <Link href="/jobs" className="mb-5 inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-blue-700"><ArrowRight size={15}/> بازگشت به سفارش‌ها</Link>
    <div className="mb-6"><h1 className="page-heading">تعریف سفارش چاپ</h1><p className="mt-1.5 text-sm text-slate-500">اطلاعات را از job ticket و فایل تأییدشده مشتری وارد کنید.</p></div>
    <form onSubmit={form.handleSubmit(submit)} className="space-y-5">
      <Card className="p-5 sm:p-7"><h2 className="mb-5 font-bold">اطلاعات کار</h2><div className="grid gap-4 sm:grid-cols-2">
        <label><span className="field-label">شماره سفارش *</span><Input {...form.register("jobNumber")} placeholder="QP-2026-001" dir="ltr"/>{form.formState.errors.jobNumber ? <span className="text-xs text-red-600">شماره سفارش الزامی است.</span> : null}</label>
        <label><span className="field-label">مشتری *</span><Select {...form.register("customerId")} disabled={loadingCustomers || customers.length === 0}><option value="">{loadingCustomers ? "در حال بارگذاری…" : customers.length ? "انتخاب مشتری" : "ابتدا مشتری ثبت کنید"}</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</Select>{customers.length === 0 && !loadingCustomers ? <Link href="/customers" className="mt-1 inline-block text-[11px] text-blue-700">رفتن به مدیریت مشتریان</Link> : null}</label>
        <label><span className="field-label">نوع چاپ *</span><Select {...form.register("printType")}><option value="OFFSET">افست</option><option value="FLEXO">فلکسو</option><option value="GRAVURE">گراور</option><option value="DIGITAL">دیجیتال</option><option value="SCREEN">اسکرین</option><option value="HYBRID">هیبرید</option></Select></label>
        <label><span className="field-label">نام محصول *</span><Input {...form.register("productName")} placeholder="جعبه، لیبل، لفاف…"/></label>
        <label><span className="field-label">ابعاد / ساختار *</span><Input {...form.register("dimensions")} placeholder="عرض × ارتفاع × عمق (mm)"/></label>
        <label><span className="field-label">تعداد رنگ *</span><Input type="number" min="1" max="20" {...form.register("colorsCount",{valueAsNumber:true})}/></label>
        <label><span className="field-label">بستر چاپ *</span><Input {...form.register("substrate")} placeholder="کاغذ، PET، BOPP…"/></label>
        <label><span className="field-label">مرکب / پوشش</span><Input {...form.register("ink")} placeholder="پایه آب، UV، حلال…"/></label>
        <label><span className="field-label">استاندارد یا مرجع پذیرش</span><Input {...form.register("targetStandard")} placeholder="پروف تأییدشده / نسخه استاندارد"/></label>
        <label><span className="field-label">تیراژ *</span><Input type="number" min="1" {...form.register("quantity",{valueAsNumber:true})}/></label>
        <label><span className="field-label">تاریخ تحویل</span><Input type="date" {...form.register("dueDate")}/></label>
        <label><span className="field-label">وضعیت اولیه</span><Select {...form.register("status")}><option value="DRAFT">پیش‌نویس</option><option value="IN_PROGRESS">در حال تولید</option></Select></label>
      </div></Card>
      <Card className="p-5 sm:p-7"><h2 className="mb-1 font-bold">مواد و مرجع فایل</h2><p className="mb-4 text-xs leading-5 text-slate-500">نسخه تأییدشده مشتری، بستر و سیستم مرکب را با نام نسخه/تاریخ ثبت کنید.</p><label><span className="field-label">فایل مرجع PDF یا تصویر</span><input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" onChange={uploadReference} className="block w-full text-sm text-slate-500 file:ml-3 file:rounded-xl file:border-0 file:bg-blue-50 file:px-4 file:py-2.5 file:text-xs file:font-bold file:text-blue-700 hover:file:bg-blue-100"/><span className="mt-1 block text-[10px] text-slate-400">حداکثر ۴ مگابایت؛ فایل Vercel Blob در تنظیمات فعال شود.</span></label>{form.watch("referenceFileUrl") ? <p className="mt-3 break-all text-xs text-emerald-700 dark:text-emerald-300">فایل ثبت شد: {form.watch("referenceFileUrl")}</p> : null}<label className="mt-4 block"><span className="field-label">یادداشت</span><textarea className="field min-h-24 resize-y" {...form.register("notes")} placeholder="مرجع رنگ، سطح بازرسی، ملاحظات خاص و…"/></label></Card>
      <div className="flex justify-end gap-2"><Link href="/jobs" className="inline-flex min-h-10 items-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600">انصراف</Link><Button type="submit" disabled={saving || uploading || customers.length === 0}><Save size={16}/>{saving ? <LoaderCircle size={16} className="animate-spin"/> : null}ثبت سفارش</Button></div>
    </form>
  </div>;
}

"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, LoaderCircle, ShieldCheck } from "lucide-react";
import { Button, Input } from "@/components/ui";

type AuthMode = "login" | "register" | "forgot-password" | "reset-password";

export function AuthForm({ mode, token }: { mode: AuthMode; token?: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isLogin = mode === "login";
  const isRegister = mode === "register";
  const isForgot = mode === "forgot-password";
  const isReset = mode === "reset-password";

  const title = isLogin ? "خوش برگشتید" : isRegister ? "ساخت حساب کاربری" : isForgot ? "بازیابی رمز عبور" : "انتخاب رمز جدید";
  const subtitle = isLogin
    ? "برای مشاهده سفارش‌ها و گزارش‌های کنترل کیفیت وارد شوید."
    : isRegister
      ? "حساب جدید با نقش مشاهده‌گر ساخته می‌شود؛ مدیر سامانه می‌تواند نقش را تغییر دهد."
      : isForgot
        ? "ایمیل حساب را وارد کنید تا لینک یک‌بارمصرف برایتان ارسال شود."
        : "رمز جدید باید حداقل ۱۲ نویسه داشته باشد.";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      if (isLogin) {
        const result = await signIn("credentials", { email: email.trim().toLowerCase(), password, redirect: false });
        if (result?.error) throw new Error("ایمیل یا رمز عبور صحیح نیست، یا حساب غیرفعال شده است.");
        toast.success("با موفقیت وارد شدید.");
        router.replace("/dashboard");
        router.refresh();
        return;
      }
      if (isRegister) {
        if (password !== confirmPassword) throw new Error("تکرار رمز عبور یکسان نیست.");
        const response = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email: email.trim().toLowerCase(), password }) });
        const payload = (await response.json()) as { success: boolean; error?: { message?: string } };
        if (!response.ok || !payload.success) throw new Error(payload.error?.message || "ثبت‌نام انجام نشد.");
        toast.success("حساب ساخته شد؛ اکنون وارد شوید.");
        router.replace("/login");
        return;
      }
      if (isForgot) {
        const response = await fetch("/api/password/forgot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim().toLowerCase() }) });
        const payload = (await response.json()) as { success: boolean; data?: { message?: string }; error?: { message?: string } };
        if (!response.ok || !payload.success) throw new Error(payload.error?.message || "درخواست ارسال نشد.");
        toast.success(payload.data?.message || "در صورت وجود حساب، ایمیل راهنما ارسال می‌شود.");
        return;
      }
      if (!token) throw new Error("لینک بازیابی ناقص است.");
      if (password !== confirmPassword) throw new Error("تکرار رمز عبور یکسان نیست.");
      const response = await fetch("/api/password/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) });
      const payload = (await response.json()) as { success: boolean; data?: { message?: string }; error?: { message?: string } };
      if (!response.ok || !payload.success) throw new Error(payload.error?.message || "تغییر رمز انجام نشد.");
      toast.success(payload.data?.message || "رمز عبور تغییر کرد.");
      router.replace("/login");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "خطای نامشخص رخ داد.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen bg-white dark:bg-slate-950">
      <aside className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-[#10264f] px-12 py-10 text-white lg:flex xl:w-[48%]">
        <div className="absolute inset-0 bg-hero-grid bg-[size:34px_34px] opacity-20" />
        <div className="absolute -right-24 top-40 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="relative z-10 flex items-center gap-3"><Image src="/logo.svg" alt="" width={46} height={46}/><span className="text-lg font-extrabold">QC Print Inspector</span></div>
        <div className="relative z-10 max-w-xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-blue-100"><ShieldCheck size={15} /> کیفیت قابل ردیابی، تصمیم مستند</div>
          <h1 className="text-4xl font-bold leading-[1.55] xl:text-[42px]">کنترل دقیق‌تر،<br/><span className="text-orange-300">ضایعات کمتر.</span></h1>
          <p className="mt-5 max-w-md text-sm leading-7 text-blue-100/75">از کنترل رنگ و رجیستر تا CAPA و گزارش نهایی، همه داده‌های کیفیت چاپ را در یک مسیر روشن و امن ثبت کنید.</p>
          <div className="mt-9 grid grid-cols-2 gap-3">
            {[["ΔE00", "محاسبه CIEDE2000"], ["۸ مرحله", "بازرسی ساختاریافته"], ["PDF · XLSX", "گزارش مستند"], ["Audit log", "ردیابی عملیات"]].map(([key, value]) => <div key={key} className="rounded-2xl border border-white/10 bg-white/[.06] p-4"><div className="text-lg font-bold text-white">{key}</div><div className="mt-1 text-[11px] text-blue-100/70">{value}</div></div>)}
          </div>
        </div>
        <p className="relative z-10 text-xs text-blue-100/50">© {new Date().getFullYear()} QC Print Inspector · برای استفاده سازمانی</p>
      </aside>

      <section className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-[440px]">
          <Link href="/" className="mb-9 inline-flex items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-blue-700 lg:hidden"><ArrowLeft size={15}/> بازگشت به صفحه اصلی</Link>
          <div className="mb-8">
            <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300"><CheckCircle2 size={23}/></div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{subtitle}</p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            {isRegister ? <div><label className="field-label" htmlFor="name">نام و نام خانوادگی</label><Input id="name" autoComplete="name" required minLength={2} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} placeholder="مثلاً سارا احمدی" /></div> : null}
            {!isReset ? <div><label className="field-label" htmlFor="email">ایمیل سازمانی</label><Input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.com" dir="ltr" /></div> : null}
            {!isForgot ? <div><label className="field-label" htmlFor="password">{isReset ? "رمز عبور جدید" : "رمز عبور"}</label><div className="relative"><Input id="password" type={showPassword ? "text" : "password"} required minLength={isLogin ? 1 : 12} maxLength={200} autoComplete={isLogin ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={isLogin ? "رمز عبور خود را وارد کنید" : "حداقل ۱۲ نویسه"} className="pl-11" dir="ltr"/><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-label={showPassword ? "پنهان‌کردن رمز" : "نمایش رمز"}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></div> : null}
            {isRegister || isReset ? <div><label className="field-label" htmlFor="confirm">تکرار رمز عبور</label><Input id="confirm" type={showPassword ? "text" : "password"} required minLength={12} maxLength={200} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="رمز عبور را دوباره وارد کنید" dir="ltr" /></div> : null}
            <Button type="submit" disabled={busy} className="mt-2 w-full">
              {busy ? <LoaderCircle size={17} className="animate-spin"/> : null}
              {busy ? "در حال پردازش…" : isLogin ? "ورود به سامانه" : isRegister ? "ساخت حساب مشاهده‌گر" : isForgot ? "ارسال لینک بازیابی" : "ذخیره رمز جدید"}
            </Button>
          </form>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
            {isLogin ? <><button type="button" className="font-semibold text-blue-700 hover:underline dark:text-blue-300" onClick={() => router.push("/forgot-password")}>رمز را فراموش کرده‌اید؟</button><span>حساب ندارید؟ <Link className="font-bold text-blue-700 hover:underline dark:text-blue-300" href="/register">ثبت‌نام</Link></span></> : null}
            {isRegister ? <span className="mx-auto">حساب دارید؟ <Link className="font-bold text-blue-700 hover:underline dark:text-blue-300" href="/login">ورود</Link></span> : null}
            {isForgot || isReset ? <Link className="mx-auto font-bold text-blue-700 hover:underline dark:text-blue-300" href="/login">بازگشت به ورود</Link> : null}
          </div>
          <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] leading-5 text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">حساب‌های تازه با نقش مشاهده‌گر ساخته می‌شوند. دسترسی مدیریتی فقط توسط مدیر سامانه اعطا می‌شود. رمز عبور هرگز در گزارش‌ها ذخیره یا نمایش داده نمی‌شود.</div>
        </div>
      </section>
    </main>
  );
}

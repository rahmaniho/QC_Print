import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpLeft,
  BarChart3,
  Barcode,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Crosshair,
  FileSpreadsheet,
  FlaskConical,
  Layers3,
  Palette,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Waves,
} from "lucide-react";

const printMethods = [
  { title: "افست", caption: "کارتن، لیبل و بسته‌بندی دارویی", icon: Layers3, accent: "blue" },
  { title: "فلکسو", caption: "لفاف انعطاف‌پذیر و فیلم", icon: Waves, accent: "orange" },
  { title: "گراور", caption: "چاپ یکنواخت در تیراژهای بالا", icon: Crosshair, accent: "violet" },
  { title: "دیجیتال", caption: "نمونه‌سازی و داده متغیر", icon: Sparkles, accent: "cyan" },
  { title: "اسکرین", caption: "بطری، درپوش و سطوح منحنی", icon: Palette, accent: "pink" },
  { title: "هیبرید", caption: "هم‌راستایی بین چند فرایند", icon: ClipboardCheck, accent: "green" },
];
const features = [
  { icon: Palette, title: "دقت رنگ با ΔE00", detail: "محاسبه سمت سرور و مرورگر بر مبنای CIEDE2000؛ همراه با هدف Lab و تلورانس اختصاصی هر پچ." },
  { icon: BarChart3, title: "پایش دانسیته و TVI", detail: "ثبت کانال‌های CMYK، مقایسه با هدف سفارش و مشاهده روند انحراف در یک نمای واحد." },
  { icon: ShieldCheck, title: "تحلیل عیب و CAPA", detail: "طبقه‌بندی شدت، ثبت علت ریشه‌ای و پیگیری اقدامات اصلاحی و پیشگیرانه تا بسته‌شدن." },
  { icon: FileSpreadsheet, title: "گزارش PDF و Excel", detail: "گزارش ساختاریافته با نتایج، عیوب، امتیاز، شرایط اندازه‌گیری و ضمیمه‌های بازرسی." },
];

export default function HomePage() {
  return (
    <main className="overflow-hidden bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-8">
        <Link href="/" className="flex items-center gap-3"><Image src="/logo.svg" alt="QC Print" width={42} height={42}/><span className="text-base font-extrabold tracking-tight">QC Print <span className="text-blue-700">Inspector</span></span></Link>
        <nav className="hidden items-center gap-8 text-sm text-slate-500 md:flex"><a href="#features" className="hover:text-blue-700">قابلیت‌ها</a><a href="#processes" className="hover:text-blue-700">فرایندهای چاپ</a><a href="#workflow" className="hover:text-blue-700">مسیر کنترل</a></nav>
        <div className="flex items-center gap-2"><Link href="/login" className="hidden px-3 py-2 text-sm font-semibold text-slate-600 hover:text-blue-700 sm:inline">ورود</Link><Link href="/register" className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-900/15 transition hover:bg-blue-800 sm:text-sm">شروع کار <ArrowUpLeft size={16}/></Link></div>
      </header>

      <section className="relative isolate border-b border-slate-100 bg-hero-grid bg-[size:34px_34px] dark:border-slate-800">
        <div className="pointer-events-none absolute -right-32 top-12 h-[500px] w-[500px] rounded-full bg-blue-300/25 blur-[100px] dark:bg-blue-900/30" />
        <div className="pointer-events-none absolute -left-20 bottom-0 h-72 w-72 rounded-full bg-orange-200/40 blur-[90px] dark:bg-orange-900/10" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 py-16 md:px-8 md:py-24 lg:grid-cols-[1.02fr_.98fr] lg:py-28">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-3 py-1.5 text-xs font-bold text-blue-800 shadow-sm dark:border-blue-900 dark:bg-slate-900/80 dark:text-blue-200"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-60"/><span className="relative inline-flex h-2 w-2 rounded-full bg-blue-600"/></span> مدیریت کیفیت، از پیش‌ازچاپ تا محصول نهایی</div>
            <h1 className="max-w-2xl text-[2.55rem] font-extrabold leading-[1.38] tracking-tight text-slate-950 dark:text-white sm:text-5xl lg:text-[3.8rem]">کنترل کیفی حرفه‌ای <span className="relative inline-block text-blue-700 dark:text-blue-400">چاپ<span className="absolute -bottom-1 right-0 h-2 w-full rounded-full bg-orange-200/75 dark:bg-orange-700/30"/></span></h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-slate-600 dark:text-slate-300 md:text-lg">داده‌های چاپ را به تصمیم‌های روشن و قابل پیگیری تبدیل کنید. اندازه‌گیری رنگ، رجیستر، چسبندگی، بارکد و CAPA در یک فضای کاری فارسی و یکپارچه.</p>
            <div className="mt-8 flex flex-wrap gap-3"><Link href="/register" className="inline-flex h-12 items-center gap-3 rounded-xl bg-blue-700 px-5 text-sm font-bold text-white shadow-xl shadow-blue-900/20 transition hover:-translate-y-0.5 hover:bg-blue-800">ساخت فضای کاری <ArrowLeft size={17}/></Link><Link href="/login" className="inline-flex h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">ورود کاربران</Link></div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs font-medium text-slate-500 dark:text-slate-400"><span className="flex items-center gap-2"><CheckCircle2 size={15} className="text-emerald-600"/> RTL و فارسی</span><span className="flex items-center gap-2"><CheckCircle2 size={15} className="text-emerald-600"/> ثبت Audit trail</span><span className="flex items-center gap-2"><CheckCircle2 size={15} className="text-emerald-600"/> PDF و Excel</span></div>
          </div>

          <div className="relative mx-auto w-full max-w-[580px] lg:mr-auto">
            <div className="absolute -inset-4 rounded-[34px] bg-gradient-to-br from-blue-200/60 via-white to-orange-100/70 blur-xl dark:from-blue-950/50 dark:via-slate-950 dark:to-orange-950/20" />
            <div className="relative overflow-hidden rounded-[27px] border border-slate-200 bg-white p-4 shadow-floating dark:border-slate-700 dark:bg-slate-900 sm:p-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800"><div className="flex items-center gap-2.5"><div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"><ClipboardCheck size={18}/></div><div><p className="text-xs font-bold">نمای کیفیت تولید</p><p className="mt-0.5 text-[10px] text-slate-400">پیش‌نمایش رابط · بدون داده واقعی</p></div></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">پیش‌نمایش · بدون داده واقعی</span></div>
              <div className="mt-4 grid grid-cols-3 gap-2.5 sm:gap-3"><div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/80"><p className="text-[10px] text-slate-500">نرخ پذیرش</p><p className="mt-2 text-xl font-extrabold">—</p><p className="mt-1 flex items-center gap-1 text-[9px] text-emerald-600"><TrendingUp size={12}/> پس از ثبت بازرسی</p></div><div className="rounded-2xl bg-blue-50 p-3 dark:bg-blue-950/60"><p className="text-[10px] text-blue-700 dark:text-blue-300">میانگین ΔE00</p><p className="mt-2 text-xl font-extrabold text-blue-900 dark:text-blue-100">—</p><p className="mt-1 text-[9px] text-blue-700/70 dark:text-blue-300/70">هدف از مرجع سفارش تعیین می‌شود</p></div><div className="rounded-2xl bg-orange-50 p-3 dark:bg-orange-950/40"><p className="text-[10px] text-orange-700 dark:text-orange-300">عیب بحرانی</p><p className="mt-2 text-xl font-extrabold text-orange-900 dark:text-orange-100">—</p><p className="mt-1 text-[9px] text-orange-700/70 dark:text-orange-300/70">پس از ثبت عیب بحرانی</p></div></div>
              <div className="mt-4 rounded-2xl border border-slate-100 p-3 dark:border-slate-800 sm:p-4"><div className="mb-3 flex items-center justify-between"><p className="text-xs font-bold">روند دقت رنگ</p><div className="flex items-center gap-1.5 text-[10px] text-slate-400"><span className="h-2 w-2 rounded-full bg-blue-600"/>میانگین ΔE00</div></div><svg viewBox="0 0 440 132" className="h-32 w-full" role="img" aria-label="نمودار بدون داده واقعی"><path d="M0 36H440M0 68H440M0 100H440" stroke="#e8edf4" strokeDasharray="4 5" className="dark:opacity-20"/><text x="220" y="72" textAnchor="middle" fill="#94a3b8" fontSize="12">برای نمایش روند، بازرسی ثبت کنید</text></svg><p className="text-center text-[9px] text-slate-400">بدون داده واقعی</p></div>
              <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/80"><div className="flex items-center gap-2.5"><div className="grid h-8 w-8 place-items-center rounded-lg bg-white text-blue-700 dark:bg-slate-700 dark:text-blue-300"><Barcode size={16}/></div><div><p className="text-[11px] font-bold">پیش‌نمایش سفارش</p><p className="mt-0.5 text-[9px] text-slate-500">اطلاعات پس از ثبت سفارش نمایش داده می‌شود</p></div></div><span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[9px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><Check size={12}/> بدون نتیجه</span></div>
              <div className="absolute -left-5 top-24 hidden items-center gap-2 rounded-xl border border-white bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-xl dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 sm:flex"><div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950"><ShieldCheck size={17}/></div> کیفیت، قابل سنجش</div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-24">
        <div className="mx-auto mb-12 max-w-2xl text-center"><span className="text-xs font-bold tracking-widest text-blue-700">یک گردش‌کار کامل</span><h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">داده دقیق؛ تصمیم مطمئن</h2><p className="mt-4 text-sm leading-7 text-slate-500 dark:text-slate-400">ابزارهای اصلی کنترل کیفیت را کنار هم ببینید؛ از اولین نمونه تا گزارش نهایی و اقدام اصلاحی.</p></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{features.map((feature, index) => { const Icon = feature.icon; return <article key={feature.title} className="group rounded-2xl border border-slate-200 bg-white p-5 transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-card dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-900"><div className={`grid h-11 w-11 place-items-center rounded-xl ${index === 1 ? "bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300" : "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"}`}><Icon size={20}/></div><h3 className="mt-5 font-bold">{feature.title}</h3><p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">{feature.detail}</p></article>; })}</div>
      </section>

      <section id="processes" className="border-y border-slate-100 bg-slate-50 py-20 dark:border-slate-800 dark:bg-slate-900/40 md:py-24"><div className="mx-auto max-w-7xl px-5 md:px-8"><div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><span className="text-xs font-bold tracking-widest text-orange-600">برای خطوط چاپ صنعتی</span><h2 className="mt-3 text-3xl font-extrabold">یک چارچوب، شش فرایند</h2></div><p className="max-w-xl text-sm leading-7 text-slate-500 dark:text-slate-400">پارامترهای بازرسی را متناسب با تکنولوژی چاپ، ماده اولیه و توافق مشتری ثبت کنید. تلورانس‌ها برای هر سفارش باید بازبینی شوند.</p></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{printMethods.map((method) => { const Icon = method.icon; return <div key={method.title} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-slate-50 text-blue-700 dark:bg-slate-800 dark:text-blue-300"><Icon size={21}/></div><div><h3 className="text-sm font-bold">چاپ {method.title}</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{method.caption}</p></div><CheckCircle2 size={17} className="mr-auto text-emerald-500"/></div>; })}</div></div></section>

      <section id="workflow" className="mx-auto grid max-w-7xl gap-12 px-5 py-20 md:px-8 md:py-24 lg:grid-cols-2 lg:items-center"><div><div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300"><FlaskConical size={22}/></div><h2 className="text-3xl font-extrabold leading-[1.5]">از مشاهده عیب تا <span className="text-blue-700 dark:text-blue-400">پیشگیری از تکرار</span></h2><p className="mt-4 text-sm leading-7 text-slate-500 dark:text-slate-400">هر بازرسی به سفارش، معیار پذیرش و شخص مسئول پیوند می‌خورد. امتیاز نهایی همراه با پوشش معیارها و علت تصمیم نگهداری می‌شود.</p><div className="mt-6 space-y-3">{["مرجع و مواد اولیه سفارش را مستند کنید", "اندازه‌گیری‌ها را در مراحل چاپ ثبت کنید", "عیب بحرانی را برجسته و محصول را متوقف کنید", "اقدام اصلاحی را تا بسته‌شدن پیگیری کنید"].map((item) => <div key={item} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300"><CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-600"/>{item}</div>)}</div></div><div className="rounded-[28px] border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900"><div className="mb-5 flex items-center justify-between"><div><p className="text-sm font-bold">چرخه کنترل کیفیت</p><p className="mt-1 text-xs text-slate-500">قابل پیگیری از سفارش تا CAPA</p></div><span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-blue-700 shadow-sm dark:bg-slate-800 dark:text-blue-300"><GaugeIcon/></span></div><div className="space-y-3">{[{n:"01",title:"تعریف سفارش",tag:"مرجع · بستر · تلورانس"},{n:"02",title:"نمونه‌برداری و اندازه‌گیری",tag:"Lab · دانسیته · رجیستر"},{n:"03",title:"تصمیم و گزارش",tag:"بدون نتیجه · مشروط · رد"},{n:"04",title:"CAPA و بهبود مستمر",tag:"علت ریشه‌ای · اقدام"}].map((step,index)=><div key={step.n} className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"><div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xs font-extrabold ${index === 3 ? "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300" : "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"}`}>{step.n}</div><div className="min-w-0"><p className="text-sm font-bold">{step.title}</p><p className="mt-1 truncate text-[10px] text-slate-400">{step.tag}</p></div><span className="mr-auto text-blue-500"><CheckCircle2 size={17}/></span></div>)}</div></div></section>

      <section className="px-5 pb-20 md:px-8 md:pb-24"><div className="relative mx-auto max-w-7xl overflow-hidden rounded-[30px] bg-[#10264f] px-7 py-12 text-white md:px-12 md:py-14"><div className="absolute inset-0 bg-hero-grid bg-[size:34px_34px] opacity-10"/><div className="absolute -left-20 -top-32 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl"/><div className="relative flex flex-col justify-between gap-8 md:flex-row md:items-center"><div><div className="mb-3 flex items-center gap-2 text-xs font-bold text-orange-300"><Sparkles size={15}/> شروع کنید</div><h2 className="max-w-2xl text-2xl font-extrabold leading-relaxed md:text-3xl">کیفیت چاپ را به یک فرایند قابل‌اندازه‌گیری تبدیل کنید.</h2><p className="mt-3 text-sm text-blue-100/70">فضای کاری شما با نقش‌های امن و داده‌های نمونه شروع می‌شود.</p></div><Link href="/register" className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-blue-900 transition hover:bg-blue-50">ایجاد حساب <ArrowLeft size={17}/></Link></div></div></section>

      <footer className="border-t border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50"><div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 py-7 text-xs text-slate-400 sm:flex-row md:px-8"><Link href="/" className="flex items-center gap-2 font-bold text-slate-600 dark:text-slate-300"><Image src="/logo.svg" alt="" width={25} height={25}/> QC Print Inspector</Link><p>گزارش‌ها بر پایه داده‌های واردشده‌اند؛ تأیید انطباق قانونی نیازمند مدارک آزمون معتبر است.</p><Link href="/login" className="inline-flex items-center gap-1 font-bold text-blue-700 hover:underline dark:text-blue-300">ورود به سامانه <ChevronDown size={13} className="rotate-90"/></Link></div></footer>
    </main>
  );
}

function GaugeIcon() {
  return <div className="relative grid h-5 w-5 place-items-center"><div className="absolute bottom-0 h-2.5 w-5 rounded-t-full border-[2px] border-b-0 border-blue-700 dark:border-blue-300"/><span className="absolute bottom-[2px] h-1.5 w-[2px] origin-bottom rotate-[-42deg] rounded-full bg-orange-500"/></div>;
}

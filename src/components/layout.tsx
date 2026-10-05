"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  Boxes,
  ClipboardCheck,
  FileBarChart2,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PackageCheck,
  Printer,
  Settings2,
  ShieldCheck,
  Sun,
  Users,
  X,
} from "lucide-react";
import { ROLE_LABEL, type AppRole } from "@/lib/domain";

const AccessContext = createContext<AppRole>("VIEWER");
export const useRole = () => useContext(AccessContext);

const navigation = [
  { label: "نمای کلی", href: "/dashboard", icon: LayoutDashboard, group: "کارگاه" },
  { label: "سفارش‌های چاپ", href: "/jobs", icon: Printer, group: "کارگاه" },
  { label: "بازرسی‌ها", href: "/inspections", icon: ClipboardCheck, group: "کارگاه" },
  { label: "عیوب و هشدارها", href: "/defects", icon: AlertTriangle, group: "کیفیت" },
  { label: "اقدامات CAPA", href: "/capa", icon: Activity, group: "کیفیت" },
  { label: "گزارش‌ها", href: "/reports", icon: FileBarChart2, group: "کیفیت" },
  { label: "استانداردها", href: "/standards", icon: ShieldCheck, group: "مدیریت" },
  { label: "مشتریان", href: "/customers", icon: Users, group: "مدیریت" },
  { label: "مواد اولیه", href: "/materials", icon: Boxes, group: "مدیریت" },
  { label: "کاربران", href: "/users", icon: Users, group: "مدیریت", admin: true },
  { label: "تنظیمات", href: "/settings", icon: Settings2, group: "سیستم" },
];

function Sidebar({ role, onNavigate }: { role: AppRole; onNavigate?: () => void }) {
  const pathname = usePathname();
  const groups = Array.from(new Set(navigation.map((item) => item.group)));
  return (
    <>
      <div className="flex h-[76px] items-center gap-3 border-b border-slate-100 px-6 dark:border-slate-800">
        <Image src="/logo.svg" alt="QC Print" width={42} height={42} priority />
        <div className="min-w-0">
          <div className="truncate text-base font-extrabold tracking-tight text-slate-900 dark:text-white">QC Print</div>
          <div className="mt-0.5 text-[10px] font-semibold tracking-[.14em] text-slate-400">QUALITY INSPECTOR</div>
        </div>
      </div>
      <div className="px-4 py-5">
        {groups.map((group) => (
          <div key={group} className="mb-5">
            <p className="mb-2 px-3 text-[10px] font-bold tracking-widest text-slate-400">{group}</p>
            <nav className="space-y-1" aria-label={group}>
              {navigation.filter((item) => item.group === group && (!item.admin || role === "ADMIN")).map((item) => {
                const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} onClick={onNavigate} className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? "bg-blue-50 text-blue-800 dark:bg-blue-950/70 dark:text-blue-200" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"}`} aria-current={active ? "page" : undefined}>
                    <Icon size={17} strokeWidth={active ? 2.4 : 1.9} />
                    <span>{item.label}</span>
                    {item.href === "/defects" ? <span className="mr-auto h-1.5 w-1.5 rounded-full bg-orange-500" aria-label="نیازمند بررسی" /> : null}
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>
      <div className="mx-4 mt-auto mb-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/80">
        <div className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200"><PackageCheck size={15} className="text-blue-600" /> کنترل پیشگیرانه</div>
        <p className="text-[11px] leading-5 text-slate-500 dark:text-slate-400">اندازه‌گیری‌ها و مستندات را پیش از تأیید هر سفارش ثبت کنید.</p>
      </div>
    </>
  );
}

function ThemeButton() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <button type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-blue-200 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300" aria-label={theme === "dark" ? "فعال‌کردن تم روشن" : "فعال‌کردن تم تیره"}>
      {mounted && theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}

function Header({ user, onMenu }: { user: { name: string; role: AppRole; email: string }; onMenu: () => void }) {
  const pathname = usePathname();
  const active = navigation.find((item) => pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`)));
  const title = active?.label ?? "کنترل کیفیت";
  return (
    <header className="sticky top-0 z-30 flex min-h-[76px] items-center justify-between gap-4 border-b border-slate-200/70 bg-slate-50/90 px-4 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/80 md:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 lg:hidden" onClick={onMenu} aria-label="بازکردن منو"><Menu size={19} /></button>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{title}</p>
          <p className="mt-0.5 hidden text-xs text-slate-500 dark:text-slate-400 sm:block">سامانه کنترل کیفیت محصولات چاپی</p>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        {["ADMIN", "MANAGER"].includes(user.role) ? <Link href="/jobs/new" className="hidden min-h-10 items-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800 sm:inline-flex"><Printer size={16} /> سفارش جدید</Link> : null}
        <ThemeButton />
        <div className="hidden items-center gap-2.5 border-r border-slate-200 pr-3 dark:border-slate-700 sm:flex">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-blue-100 text-sm font-bold text-blue-800 dark:bg-blue-900 dark:text-blue-200">{user.name.trim().slice(0, 1) || "ک"}</div>
          <div className="max-w-36">
            <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-100">{user.name}</p>
            <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">{ROLE_LABEL[user.role]}</p>
          </div>
        </div>
        <button onClick={() => signOut({ callbackUrl: "/login" })} className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 transition hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950/50" aria-label="خروج"><LogOut size={17} /></button>
      </div>
    </header>
  );
}

export function AppShell({ children, user }: { children: ReactNode; user: { id: string; name: string; email: string; role: AppRole } }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <AccessContext.Provider value={user.role}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <aside className="fixed inset-y-0 right-0 z-40 hidden w-[258px] flex-col border-l border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:flex"><Sidebar role={user.role} /></aside>
        {mobileOpen ? <div className="fixed inset-0 z-50 flex lg:hidden"><button aria-label="بستن منو" className="absolute inset-0 bg-slate-950/50" onClick={() => setMobileOpen(false)} /><aside className="relative flex w-[290px] max-w-[85vw] flex-col bg-white shadow-2xl dark:bg-slate-900"><div className="absolute left-3 top-5 z-10"><button className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="بستن" onClick={() => setMobileOpen(false)}><X size={18} /></button></div><Sidebar role={user.role} onNavigate={() => setMobileOpen(false)} /></aside></div> : null}
        <div className="min-h-screen lg:mr-[258px]">
          <Header user={user} onMenu={() => setMobileOpen(true)} />
          <main className="mx-auto w-full max-w-[1600px] px-4 py-6 md:px-8 md:py-8">{children}</main>
          <footer className="mx-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/80 py-5 text-[11px] text-slate-400 dark:border-slate-800 md:mx-8"><span>QC Print Inspector · کنترل کیفیت مستند و قابل پیگیری</span><span>نسخه ۱.۰ · معیارهای پذیرش را با قرارداد سفارش تطبیق دهید</span></footer>
        </div>
      </div>
    </AccessContext.Provider>
  );
}

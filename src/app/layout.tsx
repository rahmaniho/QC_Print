import type { Metadata } from "next";
import "@fontsource/vazirmatn/400.css";
import "@fontsource/vazirmatn/500.css";
import "@fontsource/vazirmatn/600.css";
import "@fontsource/vazirmatn/700.css";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: { default: "QC Print Inspector | کنترل کیفیت چاپ", template: "%s | QC Print Inspector" },
  description: "سامانه حرفه‌ای ثبت و تحلیل کنترل کیفیت محصولات چاپی صنعتی",
  applicationName: "QC Print Inspector",
  icons: { icon: "/logo.svg" },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          {children}
          <Toaster position="top-left" richColors closeButton dir="rtl" />
        </ThemeProvider>
      </body>
    </html>
  );
}

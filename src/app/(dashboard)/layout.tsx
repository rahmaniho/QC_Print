import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/layout";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return (
    <AppShell user={{ id: session.user.id, name: session.user.name || "کاربر", email: session.user.email || "", role: session.user.role }}>
      {children}
    </AppShell>
  );
}

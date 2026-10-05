import { notFound, redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { AppShell } from "@/components/layout";
import { Workspace } from "@/components/data-views";
import { auth } from "@/lib/auth";
import type { AppRole } from "@/lib/domain";

const authModes = ["login", "register", "forgot-password", "reset-password"] as const;
const sections = ["dashboard", "jobs", "inspections", "defects", "capa", "reports", "standards", "users", "customers", "materials", "settings"];
type AuthMode = (typeof authModes)[number];

type Props = {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ token?: string | string[] }>;
};

export default async function SectionPage({ params, searchParams }: Props) {
  const [{ section }, query] = await Promise.all([params, searchParams]);
  if (authModes.includes(section as AuthMode)) {
    return <AuthForm mode={section as AuthMode} token={Array.isArray(query.token) ? query.token[0] : query.token} />;
  }
  if (!sections.includes(section)) notFound();

  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return (
    <AppShell user={{ id: session.user.id, name: session.user.name || "کاربر", email: session.user.email || "", role: session.user.role as AppRole }}>
      <Workspace section={section} />
    </AppShell>
  );
}

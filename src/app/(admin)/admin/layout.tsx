import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

const ADMIN_ROLES = new Set(["admin", "support_agent", "content_editor"]);

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!ADMIN_ROLES.has(session.user.role)) redirect("/dashboard");

  return (
    <div className="flex min-h-screen">
      <AdminSidebar role={session.user.role} />
      <main className="flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}

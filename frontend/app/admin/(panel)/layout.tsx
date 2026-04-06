import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/Sidebar";
import { AdminTopbar } from "@/components/admin/Topbar";

export const metadata = { title: "Admin — Overfitted.io" };

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div
      style={{ background: "var(--admin-bg)", minHeight: "100vh" }}
      className="flex"
    >
      <AdminSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <AdminTopbar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { DashboardSidebar, DashboardMobileTopBar } from "@/components/dashboard/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
      <div className="min-h-svh flex pt-16 bg-background">
        <DashboardSidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

        <div className="flex-1 lg:ml-64">
          <DashboardMobileTopBar onMenuClick={() => setMobileOpen(true)} />

          <main className="p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
  );
}

import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useEffect } from "react";
import { Outlet } from "react-router-dom";

export function DashboardLayout() {
  // Apply theme settings
  useEffect(() => {
    document.documentElement.classList.add("dark");
    document.documentElement.style.setProperty("--sidebar-width", "255px");
    document.documentElement.style.setProperty("--sidebar-width-icon", "3rem");

    return () => {
      document.documentElement.classList.remove("dark");
      document.documentElement.style.removeProperty("--sidebar-width");
      document.documentElement.style.removeProperty("--sidebar-width-icon");
    };
  }, []);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset
        style={{ marginLeft: "255px" }}
        className="transition-[margin-left] duration-200 ease-linear"
      >
        <DashboardHeader />
        <main className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <Outlet /> {/* This renders the current route's component */}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

import {
  Briefcase,
  Home,
  Settings2,
  Users,
} from "lucide-react";
import * as React from "react";

import { NavMain } from "@/components/NavMain";
import { NavUser } from "@/components/NavUser";
import {
  Sidebar,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import type { RootState } from "@/store";
import { useSelector } from "react-redux";

const kubrickNavigation = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: Home,
    },
    {
      title: "Jobs",
      url: "/jobs",
      icon: Briefcase,
    },
    {
      title: "Candidates",
      url: "/candidates",
      icon: Users,
    },
    {
      title: "Settings",
      url: "/settings/profile",
      icon: Settings2,
      items: [
        {
          title: "Profile",
          url: "/settings/profile",
        },
        {
          title: "Organization",
          url: "/settings/organization",
        },
        {
          title: "Career Page",
          url: "/settings/career-page",
        },
      ],
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useSelector((state: RootState) => state.auth);

  const userData = {
    name:
      user?.first_name && user?.last_name
        ? `${user.first_name} ${user.last_name}`
        : user?.email?.split("@")[0] || "User",
    email: user?.email || "No email",
    avatar: "",
  };

  const organizationName = user?.organization?.name || "My Organization";
  const orgInitial =
    organizationName.trim().slice(0, 1).toUpperCase() || "O";

  // backend serves uploaded org logos from `/uploads/*`
  // and `VITE_API_URL` in dev typically ends with `/api`.
  const apiBase = (import.meta.env.VITE_API_URL || "").replace(/\/api\/?$/, "");
  const logoUrl = user?.organization?.logo_url;
  const logoSrc = logoUrl ? `${apiBase}/${logoUrl}` : null;

  const OrganizationHeader = (
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg overflow-hidden">
              {logoSrc ? (
                <img
                  src={logoSrc}
                  alt={organizationName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-sm font-semibold">{orgInitial}</span>
              )}
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">{organizationName}</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
  );

  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      {OrganizationHeader}
      <SidebarContent>
        <NavMain items={kubrickNavigation.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

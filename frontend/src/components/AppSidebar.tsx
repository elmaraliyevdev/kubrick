import {
  BarChart3,
  Briefcase,
  Building2,
  Frame,
  Home,
  Map,
  PieChart,
  Settings2,
  Users,
} from "lucide-react";
import * as React from "react";

import { NavMain } from "@/components/NavMain";
import { NavProjects } from "@/components/NavProjects";
import { NavUser } from "@/components/NavUser";
import { TeamSwitcher } from "@/components/TeamSwitcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import type { RootState } from "@/store";
import { useSelector } from "react-redux";

// Navigation data for Kubrick
const kubrickNavigation = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: Home,
      isActive: true,
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
      // items: [
      //   {
      //     title: "All Candidates",
      //     url: "/candidates",
      //   },
      //   {
      //     title: "Shortlisted",
      //     url: "/candidates/shortlisted",
      //   },
      //   {
      //     title: "Archive",
      //     url: "/candidates/archive",
      //   },
      // ],
    },
    {
      title: "Analytics",
      url: "/analytics",
      icon: BarChart3,
      items: [
        {
          title: "Overview",
          url: "/analytics",
        },
        {
          title: "Reports",
          url: "/analytics/reports",
        },
        {
          title: "Exports",
          url: "/analytics/exports",
        },
      ],
    },
    {
      title: "Settings",
      url: "/settings",
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
          title: "Billing",
          url: "/settings/billing",
        },
        {
          title: "API Keys",
          url: "/settings/api",
        },
      ],
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useSelector((state: RootState) => state.auth);

  // Debug: Check what user data we have
  React.useEffect(() => {
    console.log("App Sidebar - User data:", user);
    console.log("Organization:", user?.organization);
  }, [user]);

  // Create user data from Redux state
  const userData = {
    name:
      user?.first_name && user?.last_name
        ? `${user.first_name} ${user.last_name}`
        : user?.email?.split("@")[0] || "User",
    email: user?.email || "No email",
    avatar: "", // We can add avatars later
  };

  // Create teams data - for now just show the user's organization
  const teamsData = [
    {
      name: user?.organization?.name || "My Organization",
      logo: Building2,
      plan: "Pro", // We can make this dynamic later based on subscription
    },
  ];

  // Projects data for Kubrick
  const projectsData = [
    {
      name: "Recent Jobs",
      url: "/jobs/recent",
      icon: Frame,
    },
    {
      name: "Analytics & Reports",
      url: "/analytics/reports",
      icon: PieChart,
    },
    {
      name: "Candidate Pipeline",
      url: "/candidates/pipeline",
      icon: Map,
    },
  ];

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={teamsData} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={kubrickNavigation.navMain} />
        <NavProjects projects={projectsData} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

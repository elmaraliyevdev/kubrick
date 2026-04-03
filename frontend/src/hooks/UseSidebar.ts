/**
 * Re-exports the sidebar hook from the same module as `SidebarProvider`.
 * Keeps a single React context instance (important when tooling still resolves old paths).
 */
export { useSidebar } from "@/components/ui/sidebar";

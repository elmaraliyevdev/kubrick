import { Toaster } from "@/components/ui/sonner";
import CareerLayout from "@/layouts/CareerLayout";
import CareerPage from "@/pages/careers/CareerPage";
import CareerJobDetail from "@/pages/careers/CareerJobDetail";
import NotFound from "@/pages/NotFound";
import { BrowserRouter, Route, Routes } from "react-router-dom";

/**
 * Minimal app shell for career page subdomains.
 * Rendered when the hostname is {slug}.kubrick.app (or {slug}.localhost in dev).
 * No auth, no sidebar, no dashboard — just the public career pages.
 */
export default function CareerApp({ orgSlug }: { orgSlug: string }) {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<CareerLayout orgSlug={orgSlug} />}>
          <Route index element={<CareerPage orgSlug={orgSlug} />} />
          <Route path=":jobSlug" element={<CareerJobDetail orgSlug={orgSlug} />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}

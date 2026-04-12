import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Toaster } from "@/components/ui/sonner";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import CandidateDetail from "@/pages/CandidateDetail";
import Candidates from "@/pages/Candidates";
import CompleteProfile from "@/pages/CompleteProfile";
import ForgotPassword from "@/pages/ForgotPassword";
import CreateJob from "@/pages/CreateJob";
import JobDetail from "@/pages/JobDetail";
import Jobs from "@/pages/Jobs";
import Login from "@/pages/Login";
import Dashboard from "@/pages/NewDashboard";
import Pipeline from "@/pages/Pipeline";
import NotFound from "@/pages/NotFound";
import Register from "@/pages/Register";
import ResetPassword from "@/pages/ResetPassword";
import SignUp from "@/pages/SignUp";
import VerifyEmail from "@/pages/VerifyEmail";
import VerifyEmailChange from "@/pages/VerifyEmailChange";
import SettingsOrganization from "@/pages/settings/SettingsOrganization";
import SettingsProfile from "@/pages/settings/SettingsProfile";
import SettingsCareerPage from "@/pages/settings/SettingsCareerPage";
import SettingsMatching from "@/pages/settings/SettingsMatching";
import CareerLayout from "@/layouts/CareerLayout";
import CareerPage from "@/pages/careers/CareerPage";
import CareerJobDetail from "@/pages/careers/CareerJobDetail";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfUse from "@/pages/TermsOfUse";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

/**
 * Main application — dashboard, auth, settings, and path-based career pages.
 * Rendered on app.kubrick.app / localhost (no career subdomain detected).
 */
export default function MainApp() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/register" element={<Register />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/login" element={<Login />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route
          path="/settings/verify-email-change"
          element={
            <ProtectedRoute>
              <VerifyEmailChange />
            </ProtectedRoute>
          }
        />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfUse />} />

        {/* Protected routes with layout */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="jobs" element={<Jobs />} />
          <Route path="jobs/new" element={<CreateJob />} />
          <Route path="jobs/:jobId" element={<JobDetail />} />
          <Route path="pipeline" element={<Pipeline />} />
          <Route path="candidates" element={<Candidates />} />
          <Route path="candidates/:candidateId" element={<CandidateDetail />} />
          <Route path="settings" element={<Navigate to="/settings/profile" replace />} />
          <Route path="settings/profile" element={<SettingsProfile />} />
          <Route path="settings/organization" element={<SettingsOrganization />} />
          <Route path="settings/career-page" element={<SettingsCareerPage />} />
          <Route path="settings/matching" element={<SettingsMatching />} />
        </Route>

        {/* Special protected route without layout */}
        <Route
          path="/complete-profile"
          element={
            <ProtectedRoute>
              <CompleteProfile />
            </ProtectedRoute>
          }
        />

        {/* Path-based career pages (fallback for non-subdomain access) */}
        <Route path="/:orgSlug" element={<CareerLayout />}>
          <Route index element={<CareerPage />} />
          <Route path=":jobSlug" element={<CareerJobDetail />} />
        </Route>

        {/* 404 catch-all */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}

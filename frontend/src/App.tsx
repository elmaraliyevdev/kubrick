import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Toaster } from "@/components/ui/sonner";
import { SimpleLayout } from "@/layouts/SimpleLayout";
import CandidateDetail from "@/pages/CandidateDetail";
import Candidates from "@/pages/Candidates";
import CompleteProfile from "@/pages/CompleteProfile";
import ForgotPassword from "@/pages/ForgotPassword";
import JobDetail from "@/pages/JobDetail";
import Jobs from "@/pages/Jobs";
import Login from "@/pages/Login";
import Dashboard from "@/pages/NewDashboard";
import NotFound from "@/pages/NotFound";
import Register from "@/pages/Register";
import ResetPassword from "@/pages/ResetPassword";
import SignUp from "@/pages/SignUp";
import VerifyEmail from "@/pages/VerifyEmail";
import AnalyticsExports from "@/pages/analytics/AnalyticsExports";
import AnalyticsOverview from "@/pages/analytics/AnalyticsOverview";
import AnalyticsReports from "@/pages/analytics/AnalyticsReports";
import SettingsBilling from "@/pages/settings/SettingsBilling";
import SettingsOrganization from "@/pages/settings/SettingsOrganization";
import SettingsProfile from "@/pages/settings/SettingsProfile";
import CareerLayout from "@/layouts/CareerLayout";
import CareerPage from "@/pages/careers/CareerPage";
import CareerJobDetail from "@/pages/careers/CareerJobDetail";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/register" element={<Register />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/login" element={<Login />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Protected routes with layout */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <SimpleLayout />
            </ProtectedRoute>
          }
        >
          {/* Nested routes - DashboardLayout will render these via Outlet */}
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="jobs" element={<Jobs />} />
          <Route path="jobs/:jobId" element={<JobDetail />} />
          <Route path="candidates" element={<Candidates />} />
          <Route path="candidates/:candidateId" element={<CandidateDetail />} />
          <Route path="analytics" element={<AnalyticsOverview />} />
          <Route path="analytics/reports" element={<AnalyticsReports />} />
          <Route path="analytics/exports" element={<AnalyticsExports />} />
          <Route path="settings/profile" element={<SettingsProfile />} />
          <Route path="settings/organization" element={<SettingsOrganization />} />
          <Route path="settings/billing" element={<SettingsBilling />} />
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

        {/* Public career pages */}
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

export default App;

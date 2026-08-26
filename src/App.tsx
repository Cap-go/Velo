import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { isConsoleHost, isLandingHost } from "./lib/constants";
import { AuthProvider } from "./lib/auth";
import { DashboardPage } from "./pages/Dashboard";
import { LandingPage } from "./pages/Landing";
import { LoginPage } from "./pages/Login";
import { SignupPage } from "./pages/Signup";

function DevRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/app" element={<DashboardPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function LandingRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function ConsoleRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/app" element={<DashboardPage />} />
      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}

function HostRoutes() {
  if (isLandingHost()) return <LandingRoutes />;
  if (isConsoleHost()) return <ConsoleRoutes />;
  return <DevRoutes />;
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <HostRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

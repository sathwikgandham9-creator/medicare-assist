import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AccessibilityProvider } from './context/AccessibilityContext';
import { ReminderProvider } from './context/ReminderContext';

import { Header } from './components/Header';
import { ElderlyNavBar } from './components/ElderlyNavBar';
import { ReminderModal } from './components/ReminderModal';
import { RefillNoticeModal } from './components/RefillNoticeModal';

import { Login } from './pages/Login';
import { Register } from './pages/Register';

// Elderly Pages
import { TodayDoses } from './pages/elderly/TodayDoses';
import { MyMedicines } from './pages/elderly/MyMedicines';
import { MedicineWizard } from './pages/elderly/MedicineWizard';
import { ElderlyHistory } from './pages/elderly/History';
import { HelpAccessibility } from './pages/elderly/HelpAccessibility';

// Caregiver Pages
import { CaregiverDashboard } from './pages/caregiver/Dashboard';
import { AlertsFeed } from './pages/caregiver/AlertsFeed';
import { CaregiverPatients } from './pages/caregiver/Patients';
import { CaregiverMedicines } from './pages/caregiver/Medicines';
import { CaregiverHistory } from './pages/caregiver/History';
import { CaregiverAnalytics } from './pages/caregiver/Analytics';
import { CaregiverSettingsPage } from './pages/caregiver/Settings';

const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredRole?: 'elderly' | 'caregiver' }> = ({
  children,
  requiredRole,
}) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <img src="/pill-logo.svg" alt="Loading" className="w-16 h-16 animate-pulse" />
          <p className="text-xl font-bold text-slate-700">Loading MediCare Assist...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to={user.role === 'caregiver' ? '/caregiver/dashboard' : '/elderly/today'} replace />;
  }

  return <>{children}</>;
};

const RootRedirect: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <img src="/pill-logo.svg" alt="Loading" className="w-16 h-16 animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={user.role === 'caregiver' ? '/caregiver/dashboard' : '/elderly/today'} replace />;
};

const AppLayout: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();

  const isElderly = user?.role === 'elderly';
  const isAuthPage = ['/login', '/register'].includes(location.pathname);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 selection:bg-blue-200">
      <Header />

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Elderly Routes */}
          <Route
            path="/elderly/today"
            element={
              <ProtectedRoute requiredRole="elderly">
                <TodayDoses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/elderly/medicines"
            element={
              <ProtectedRoute requiredRole="elderly">
                <MyMedicines />
              </ProtectedRoute>
            }
          />
          <Route
            path="/elderly/medicines/new"
            element={
              <ProtectedRoute>
                <MedicineWizard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/elderly/history"
            element={
              <ProtectedRoute requiredRole="elderly">
                <ElderlyHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/elderly/help"
            element={
              <ProtectedRoute requiredRole="elderly">
                <HelpAccessibility />
              </ProtectedRoute>
            }
          />

          {/* Caregiver Routes */}
          <Route
            path="/caregiver/dashboard"
            element={
              <ProtectedRoute requiredRole="caregiver">
                <CaregiverDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/caregiver/alerts"
            element={
              <ProtectedRoute requiredRole="caregiver">
                <AlertsFeed />
              </ProtectedRoute>
            }
          />
          <Route
            path="/caregiver/patients"
            element={
              <ProtectedRoute requiredRole="caregiver">
                <CaregiverPatients />
              </ProtectedRoute>
            }
          />
          <Route
            path="/caregiver/medicines"
            element={
              <ProtectedRoute requiredRole="caregiver">
                <CaregiverMedicines />
              </ProtectedRoute>
            }
          />
          <Route
            path="/caregiver/history"
            element={
              <ProtectedRoute requiredRole="caregiver">
                <CaregiverHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/caregiver/analytics"
            element={
              <ProtectedRoute requiredRole="caregiver">
                <CaregiverAnalytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/caregiver/settings"
            element={
              <ProtectedRoute requiredRole="caregiver">
                <CaregiverSettingsPage />
              </ProtectedRoute>
            }
          />

          {/* 404 fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Persistent Full Screen Reminder & Refill Notice Modals */}
      {isElderly && (
        <>
          <ReminderModal />
          <RefillNoticeModal />
        </>
      )}

      {/* Elderly bottom navigation bar */}
      {isElderly && !isAuthPage && <ElderlyNavBar />}
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AccessibilityProvider>
        <AuthProvider>
          <ReminderProvider>
            <AppLayout />
          </ReminderProvider>
        </AuthProvider>
      </AccessibilityProvider>
    </BrowserRouter>
  );
}


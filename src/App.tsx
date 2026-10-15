import { useEffect } from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { ProfileProvider } from './context/ProfileContext';
import { AppShell } from './components/layout/AppShell';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { initDataVersioning } from './utils/safeStorage';

import { LandingPage } from './pages/LandingPage';
import { InternalCalculatorPage } from './pages/InternalCalculatorPage';
import { GPACalculatorPage } from './pages/GPACalculatorPage';
import { CGPACalculatorPage } from './pages/CGPACalculatorPage';
import { AttendancePage } from './pages/AttendancePage';
import { CreditsPlannerPage } from './pages/CreditsPlannerPage';
import { ProfilePage } from './pages/ProfilePage';
import { AmsConnectPage } from './pages/AmsConnectPage';
import { AmsImportPage } from './pages/AmsImportPage';
import { AmsDevelopmentNotice } from './components/ams/AmsDevelopmentNotice';
import { AMS_FEATURE_ENABLED } from './config/features';
import { SemesterPlannerPage } from './pages/SemesterPlannerPage';
import { MarksForecasterPage } from './pages/MarksForecasterPage';
import { AcademicReportsPage } from './pages/AcademicReportsPage';

export function App() {
  useEffect(() => {
    initDataVersioning();
  }, []);

  const RouterComponent = typeof window !== 'undefined' ? HashRouter : BrowserRouter;

  return (
    <ThemeProvider>
      <ProfileProvider>
        <RouterComponent>
          <ErrorBoundary>
            <Routes>
              <Route element={<AppShell />}>
                <Route path="/" element={<LandingPage />} />
                <Route path="/internals" element={<InternalCalculatorPage />} />
                <Route path="/gpa" element={<GPACalculatorPage />} />
                <Route path="/sgpa" element={<GPACalculatorPage />} />
                <Route path="/cgpa" element={<CGPACalculatorPage />} />
                <Route path="/attendance" element={<AttendancePage />} />
                <Route path="/credits" element={<CreditsPlannerPage />} />
                <Route path="/planner" element={<SemesterPlannerPage />} />
                <Route path="/forecaster" element={<MarksForecasterPage />} />
                <Route path="/reports" element={<AcademicReportsPage />} />
                <Route path="/catalogue" element={<Navigate to="/credits?tab=catalogue" replace />} />
                <Route path="/profile" element={<ProfilePage />} />
                {AMS_FEATURE_ENABLED ? (
                  <>
                    <Route path="/ams-portal" element={<AmsConnectPage />} />
                    <Route path="/ams-connect" element={<AmsConnectPage />} />
                    <Route path="/ams" element={<AmsConnectPage />} />
                    <Route path="/ams-import" element={<AmsImportPage />} />
                  </>
                ) : (
                  <>
                    <Route path="/ams-portal" element={<AmsDevelopmentNotice />} />
                    <Route path="/ams-connect" element={<AmsDevelopmentNotice />} />
                    <Route path="/ams" element={<AmsDevelopmentNotice />} />
                    <Route path="/ams-import" element={<AmsDevelopmentNotice />} />
                  </>
                )}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </ErrorBoundary>
        </RouterComponent>
      </ProfileProvider>
    </ThemeProvider>
  );
}

export default App;

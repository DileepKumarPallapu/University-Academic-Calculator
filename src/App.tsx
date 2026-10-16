import { useEffect } from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { ProfileProvider } from './context/ProfileContext';
import { AppShell } from './components/layout/AppShell';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { initDataVersioning } from './utils/safeStorage';

import { lazy } from 'react';
import { AMS_FEATURE_ENABLED } from './config/features';

// Primary Core Routes (eagerly loaded for instantaneous critical-path hydration)
import { LandingPage } from './pages/LandingPage';
import { InternalCalculatorPage } from './pages/InternalCalculatorPage';
import { GPACalculatorPage } from './pages/GPACalculatorPage';
import { CGPACalculatorPage } from './pages/CGPACalculatorPage';
import { AttendancePage } from './pages/AttendancePage';

// Secondary Routes (lazily loaded to optimize initial bundle size)
const CreditsPlannerPage = lazy(() =>
  import('./pages/CreditsPlannerPage').then((m) => ({ default: m.CreditsPlannerPage }))
);
const ProfilePage = lazy(() =>
  import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage }))
);
const DataManagementPage = lazy(() =>
  import('./pages/DataManagementPage').then((m) => ({ default: m.DataManagementPage }))
);
const AmsConnectPage = lazy(() =>
  import('./pages/AmsConnectPage').then((m) => ({ default: m.AmsConnectPage }))
);
const AmsImportPage = lazy(() =>
  import('./pages/AmsImportPage').then((m) => ({ default: m.AmsImportPage }))
);
const AmsDevelopmentNotice = lazy(() =>
  import('./components/ams/AmsDevelopmentNotice').then((m) => ({ default: m.AmsDevelopmentNotice }))
);
const SemesterPlannerPage = lazy(() =>
  import('./pages/SemesterPlannerPage').then((m) => ({ default: m.SemesterPlannerPage }))
);
const MarksForecasterPage = lazy(() =>
  import('./pages/MarksForecasterPage').then((m) => ({ default: m.MarksForecasterPage }))
);
const AcademicReportsPage = lazy(() =>
  import('./pages/AcademicReportsPage').then((m) => ({ default: m.AcademicReportsPage }))
);
const AcademicIntelligencePage = lazy(() =>
  import('./pages/AcademicIntelligencePage').then((m) => ({ default: m.AcademicIntelligencePage }))
);
const WhatIfPage = lazy(() =>
  import('./pages/WhatIfPage').then((m) => ({ default: m.WhatIfPage }))
);
const AttendancePlannerPage = lazy(() =>
  import('./pages/AttendancePlannerPage').then((m) => ({ default: m.AttendancePlannerPage }))
);
const ExamPrepPage = lazy(() =>
  import('./pages/ExamPrepPage').then((m) => ({ default: m.ExamPrepPage }))
);
const MockExamCenterPage = lazy(() =>
  import('./pages/MockExamCenterPage').then((m) => ({ default: m.MockExamCenterPage }))
);
const AcademicVaultPage = lazy(() =>
  import('./pages/AcademicVaultPage').then((m) => ({ default: m.AcademicVaultPage }))
);
const AchievementCenterPage = lazy(() =>
  import('./pages/AchievementCenterPage').then((m) => ({ default: m.AchievementCenterPage }))
);

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
                <Route path="/intelligence" element={<AcademicIntelligencePage />} />
                <Route path="/academic-intelligence" element={<AcademicIntelligencePage />} />
                <Route path="/analytics" element={<AcademicIntelligencePage />} />
                <Route path="/what-if" element={<WhatIfPage />} />
                <Route path="/simulator" element={<WhatIfPage />} />
                <Route path="/attendance-planner" element={<AttendancePlannerPage />} />
                <Route path="/planner" element={<SemesterPlannerPage />} />
                <Route path="/exam-prep" element={<ExamPrepPage />} />
                <Route path="/exams" element={<ExamPrepPage />} />
                <Route path="/revision-planner" element={<ExamPrepPage />} />
                <Route path="/mock-exams" element={<MockExamCenterPage />} />
                <Route path="/question-bank" element={<MockExamCenterPage />} />
                <Route path="/exam-center" element={<MockExamCenterPage />} />
                <Route path="/vault" element={<AcademicVaultPage />} />
                <Route path="/academic-vault" element={<AcademicVaultPage />} />
                <Route path="/documents" element={<AcademicVaultPage />} />
                <Route path="/achievements" element={<AchievementCenterPage />} />
                <Route path="/achievement-center" element={<AchievementCenterPage />} />
                <Route path="/rewards" element={<AchievementCenterPage />} />
                <Route path="/forecaster" element={<MarksForecasterPage />} />
                <Route path="/reports" element={<AcademicReportsPage />} />
                <Route path="/catalogue" element={<Navigate to="/credits?tab=catalogue" replace />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/settings" element={<DataManagementPage />} />
                <Route path="/settings/data" element={<DataManagementPage />} />
                <Route path="/data-management" element={<DataManagementPage />} />
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

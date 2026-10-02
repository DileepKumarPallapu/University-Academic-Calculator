import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AppShell } from './components/layout/AppShell';

import { LandingPage } from './pages/LandingPage';
import { InternalCalculatorPage } from './pages/InternalCalculatorPage';
import { GPACalculatorPage } from './pages/GPACalculatorPage';
import { CGPACalculatorPage } from './pages/CGPACalculatorPage';
import { AttendancePage } from './pages/AttendancePage';

export function App() {
  const RouterComponent = typeof window !== 'undefined' ? HashRouter : BrowserRouter;

  return (
    <ThemeProvider>
      <RouterComponent>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/internals" element={<InternalCalculatorPage />} />
            <Route path="/gpa" element={<GPACalculatorPage />} />
            <Route path="/cgpa" element={<CGPACalculatorPage />} />
            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </RouterComponent>
    </ThemeProvider>
  );
}

export default App;

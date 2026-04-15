import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/landingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import Heatmap from './pages/Heatmap';
import StudentDashboard from './pages/StudentDashboard';
import ProfessorDashboard from './pages/ProfessorDashboard';
import BookingDiscovery from './pages/BookingDiscovery';
import BookingProfessor from './pages/BookingProfessor';
import AppShellLayout from './layouts/AppShellLayout';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        <Route element={<AppShellLayout variant="student" />}>
          <Route path="/dashboard/student" element={<StudentDashboard />} />
          <Route path="/booking/search" element={<BookingDiscovery />} />
          <Route path="/booking/search/:userId" element={<Navigate to="/booking/search" replace />} />
          <Route path="/booking/professor/:professorId" element={<BookingProfessor />} />
        </Route>

        <Route element={<AppShellLayout variant="any" />}>
          <Route path="/heatmap/student/:eventId" element={<Heatmap />} />
        </Route>

        <Route element={<AppShellLayout variant="professor" />}>
          <Route path="/dashboard/professor" element={<ProfessorDashboard />} />
          <Route path="/heatmap/professor/:eventId" element={<Heatmap />} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;

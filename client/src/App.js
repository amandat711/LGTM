// AMANDA TRAN (41% contribution)
// JOCELYNE LI (4% estimated contribution) => Feature implementation, integration work, and quality refinements
import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/landingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import StudentHeatmap from './pages/StudentHeatmap';
import ProfessorHeatmap from './pages/ProfessorHeatmap';
import StudentDashboard from './pages/StudentDashboard';
import ProfessorDashboard from './pages/ProfessorDashboard';
import BookingDiscovery from './pages/BookingDiscovery';
import BookingProfessor from './pages/BookingProfessor';
import CoursesListPage from './pages/CoursesListPage';
import CourseDetailPage from './pages/CourseDetailPage';
import CourseJoinPage from './pages/CourseJoinPage';
import AppShellLayout from './layouts/AppShellLayout';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route element={<AppShellLayout variant="student" />}>
          <Route path="/dashboard/student" element={<StudentDashboard />} />
        </Route>

        <Route element={<AppShellLayout variant="any" />}>
          <Route path="/booking/search" element={<BookingDiscovery />} />
          <Route path="/booking/search/:userId" element={<Navigate to="/booking/search" replace />} />
          <Route path="/booking/professor/:professorId" element={<BookingProfessor />} />
          <Route path="/heatmap/student/:eventId" element={<StudentHeatmap />} />
          <Route path="/courses" element={<CoursesListPage />} />
          <Route path="/courses/:courseId" element={<CourseDetailPage />} />
          <Route path="/join" element={<CourseJoinPage />} />
        </Route>

        <Route element={<AppShellLayout variant="professor" />}>
          <Route path="/dashboard/professor" element={<ProfessorDashboard />} />
          <Route path="/heatmap/professor/:eventId" element={<ProfessorHeatmap />} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;

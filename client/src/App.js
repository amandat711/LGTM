import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/landingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import Heatmap from './pages/Heatmap';
import StudentDashboard   from './pages/StudentDashboard';
import ProfessorDashboard from './pages/ProfessorDashboard';
import BookingDiscovery from './pages/BookingDiscovery';
import BookingProfessor from './pages/BookingProfessor';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/dashboard/student/:userId" element={<StudentDashboard />} />
        <Route path="/dashboard/professor/:userId" element={<ProfessorDashboard />} />
        <Route path="/booking/search/:userId" element={<BookingDiscovery />} />
        <Route path="/booking/professor/:professorId" element={<BookingProfessor />} />
        <Route path="/heatmap/:eventId" element={<Heatmap />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

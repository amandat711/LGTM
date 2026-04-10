import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/landingPage';
import Heatmap from './pages/Heatmap';
import StudentDashboard   from './pages/StudentDashboard';
import ProfessorDashboard from './pages/ProfessorDashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard/student/:userId" element={<StudentDashboard />} />
        <Route path="/dashboard/professor/:userId" element={<ProfessorDashboard />} />
        <Route path="/heatmap/:eventId" element={<Heatmap />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
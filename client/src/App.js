import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/landingPage';
import HomePage from './pages/homePage';
import Heatmap from './pages/Heatmap';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/heatmap/:eventId" element={<Heatmap />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
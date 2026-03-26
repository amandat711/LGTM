import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './landingpage';
import HomePage from './homepage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/home" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
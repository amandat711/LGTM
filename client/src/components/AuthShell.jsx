import '../styles/AuthShell.css';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import LGTMLogo2 from '../assets/LGTMLogo2.png';

export default function AuthShell({ children }) {
  const navigate = useNavigate();

  return (
    <div className="auth-shell">
      <div className="auth-top-bar">
        <Navbar logo={LGTMLogo2} onLeftClick={() => navigate('/')} />
      </div>
      <main className="auth-main">
        {children}
      </main>
    </div>
  );
}

import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import LGTMLogo2 from '../assets/LGTMLogo2.png';
import '../styles/AuthShell.css';

export default function AuthShell({ children }) {
  const navigate = useNavigate();

  return (
    <div className="auth-shell">
      <header className="auth-header">
        <Navbar logo={LGTMLogo2} onLeftClick={() => navigate('/')} actions={[{ label: 'Back', onClick: () => navigate('/') }]} />
      </header>

      <main className="auth-main">
        {children}
      </main>
    </div>
  );
}

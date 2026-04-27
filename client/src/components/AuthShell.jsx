// SHIRLEY DING, 64.7% contribution
import '../styles/AuthShell.css';
import Navbar from './Navbar';
import LGTMLogo2 from '../assets/LGTMLogo2.png';

export default function AuthShell({ children }) {
  return (
    <div className="auth-shell">
      <div className="auth-top-bar">
        <Navbar logo={LGTMLogo2} />
      </div>
      <main className="auth-main">
        {children}
      </main>
    </div>
  );
}

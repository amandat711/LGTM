import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import logo1 from '../assets/logo1.png';

export default function AuthShell({ children }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white font-sans text-[#0f0f0f] antialiased">
      <header className="sticky top-0 z-[100] bg-white/95 shadow-nav backdrop-blur-[8px]">
        <div className="mx-auto max-w-[1100px]">
          <Navbar
            logo={logo1}
            onLeftClick={() => navigate('/')}
            actions={[{ label: 'Back', onClick: () => navigate('/') }]}
          />
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-54px)] max-w-[1100px] flex-col justify-center px-4 py-12 sm:px-10">
        {children}
      </main>
    </div>
  );
}

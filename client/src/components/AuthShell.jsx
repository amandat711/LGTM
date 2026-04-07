import { Link } from 'react-router-dom';
import logo1 from '../assets/logo1.png';

export default function AuthShell({ children }) {
  return (
    <div className="min-h-screen bg-white font-sans text-[#0f0f0f] antialiased">
      <header className="sticky top-0 z-[100] border-b border-[#e4e4e4] bg-white/95 shadow-nav backdrop-blur-[8px]">
        <div className="mx-auto flex h-[54px] max-w-[1100px] items-center justify-between px-4 sm:px-10">
          <Link to="/" className="flex items-center" aria-label="Home">
            <img src={logo1} alt="" className="h-9 w-auto sm:h-10" />
          </Link>
          <Link
            to="/"
            className="rounded-[5px] border border-[#e4e4e4] px-3.5 py-1.5 text-[13px] font-medium text-[#0f0f0f] transition-colors hover:border-mcgill-red hover:text-mcgill-red"
          >
            Back
          </Link>
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-54px)] max-w-[1100px] flex-col justify-center px-4 py-12 sm:px-10">
        {children}
      </main>
    </div>
  );
}

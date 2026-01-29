import { Link, Outlet, useLocation } from 'react-router-dom';

export default function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen min-h-[100dvh]">
      <nav className="fixed top-0 left-0 right-0 z-40 bg-neutral-950/90 backdrop-blur-sm border-b border-neutral-800 safe-top">
        <div className="max-w-7xl mx-auto px-4 safe-left safe-right py-3 sm:py-4 flex gap-6 sm:gap-8">
          <Link
            to="/"
            className={`text-sm tracking-wider uppercase py-1 touch-target flex items-center ${
              location.pathname === '/' ? 'text-white' : 'text-neutral-500 hover:text-white active:text-white'
            } transition-colors`}
          >
            Portfolio
          </Link>
          <Link
            to="/albums"
            className={`text-sm tracking-wider uppercase py-1 touch-target flex items-center ${
              location.pathname.startsWith('/albums') ? 'text-white' : 'text-neutral-500 hover:text-white active:text-white'
            } transition-colors`}
          >
            Albums
          </Link>
        </div>
      </nav>
      <main className="pt-14 sm:pt-16 safe-bottom">
        <Outlet />
      </main>
    </div>
  );
}

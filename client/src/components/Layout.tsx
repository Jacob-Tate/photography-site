import { Link, Outlet, useLocation } from 'react-router-dom';

export default function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen">
      <nav className="fixed top-0 left-0 right-0 z-40 bg-neutral-950/90 backdrop-blur-sm border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex gap-8">
          <Link
            to="/"
            className={`text-sm tracking-wider uppercase ${
              location.pathname === '/' ? 'text-white' : 'text-neutral-500 hover:text-white'
            } transition-colors`}
          >
            Portfolio
          </Link>
          <Link
            to="/albums"
            className={`text-sm tracking-wider uppercase ${
              location.pathname.startsWith('/albums') ? 'text-white' : 'text-neutral-500 hover:text-white'
            } transition-colors`}
          >
            Albums
          </Link>
        </div>
      </nav>
      <main className="pt-16">
        <Outlet />
      </main>
    </div>
  );
}

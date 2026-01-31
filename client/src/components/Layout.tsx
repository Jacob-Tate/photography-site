import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh]">
      <nav className="fixed top-0 left-0 right-0 z-40 bg-neutral-950/90 backdrop-blur-sm border-b border-neutral-800 safe-top">
        <div className="max-w-7xl mx-auto px-4 safe-left safe-right py-3 sm:py-4 flex items-center gap-6 sm:gap-8">
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
          <Link
            to="/map"
            className={`text-sm tracking-wider uppercase py-1 touch-target flex items-center ${
              location.pathname === '/map' ? 'text-white' : 'text-neutral-500 hover:text-white active:text-white'
            } transition-colors`}
          >
            Map
          </Link>
          <Link
            to="/tags"
            className={`text-sm tracking-wider uppercase py-1 touch-target flex items-center ${
              location.pathname === '/tags' ? 'text-white' : 'text-neutral-500 hover:text-white active:text-white'
            } transition-colors`}
          >
            Tags
          </Link>

          {/* Search */}
          <div className="ml-auto flex items-center">
            {searchOpen ? (
              <form onSubmit={handleSearch} className="flex items-center">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search keywords..."
                  autoFocus
                  className="bg-neutral-800 text-white text-sm rounded-lg px-3 py-1.5 w-40 sm:w-56 outline-none focus:ring-1 focus:ring-neutral-600 placeholder-neutral-500"
                  onBlur={() => {
                    if (!searchQuery) setSearchOpen(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setSearchQuery('');
                      setSearchOpen(false);
                    }
                  }}
                />
              </form>
            ) : (
              <button
                onClick={() => setSearchOpen(true)}
                className="p-1 text-neutral-500 hover:text-white transition-colors touch-target flex items-center"
                aria-label="Search"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </nav>
      <main className="pt-[calc(3.5rem+var(--safe-area-top))] sm:pt-[calc(4rem+var(--safe-area-top))] safe-bottom">
        <Outlet />
      </main>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Plus, Sun, Moon, Heart, User } from 'lucide-react';
import { navigationCategories } from '../../config/navigation';

export const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [favoritesCount, setFavoritesCount] = useState(0);

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark');
    setIsDark(isDarkMode);

    const savedFavorites = JSON.parse(localStorage.getItem('vozila_favs') || '[]');
    setFavoritesCount(savedFavorites.length);
  }, []);

  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark');
    setIsDark(!isDark);
  };

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-background/80 border-b border-border/40 transition-colors duration-500 relative">
      <div className="container mx-auto px-4">
        <div className="flex h-20 items-center justify-between gap-2 overflow-hidden">
          
          {/* 1. Stacked Aston Martin Logo (No dot, Muted Dark text) */}
          <Link to="/" className="flex flex-col items-center justify-center flex-shrink-0 hover:opacity-90 transition-opacity duration-300 group mt-1">
            <img 
              src="/vozilahrlogo-light.svg" 
              alt="Vozila hr logo" 
              className="h-5 lg:h-6 w-auto object-contain transform group-hover:scale-105 transition-transform duration-300 block dark:hidden"
            />
            <img 
              src="/vozilahrlogo-dark.svg" 
              alt="Vozila hr logo dark" 
              className="h-5 lg:h-6 w-auto object-contain transform group-hover:scale-105 transition-transform duration-300 hidden dark:block"
            />
            <span className="text-[10px] lg:text-[11px] font-bold uppercase tracking-[0.3em] mt-1.5 text-slate-900 dark:text-slate-300 transition-colors duration-300">
              VOZILA HR
            </span>
          </Link>

          {/* 2. Middle Navigation (Desktop Only) */}
          <nav className="hidden lg:flex flex-1 justify-center items-center gap-2 xl:gap-4 min-w-0 px-2">
            {navigationCategories.map((category) => {
              const Icon = category.icon;
              return (
                <Link key={category.id} to={`/${category.slug}`} className="flex flex-shrink items-center gap-1.5 text-[10px] xl:text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-slate-900 dark:hover:text-slate-100 transition-all duration-300 min-w-0 group truncate">
                  <Icon className="h-4 w-4 group-hover:scale-110 transition-transform duration-300 flex-shrink-0" />
                  <span className="truncate">{category.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* 3. The Right Side Group - Restored Mobile Icons & Tablet Centering */}
          <div className="flex items-center gap-1 sm:gap-2 ml-auto md:ml-0 md:flex-1 md:justify-center lg:flex-none lg:justify-end">
            
            <button onClick={toggleTheme} className="p-1.5 lg:p-2 rounded-full hover:bg-accent text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all duration-300">
              {isDark ? <Sun className="h-4 w-4 lg:h-5 lg:w-5" /> : <Moon className="h-4 w-4 lg:h-5 lg:w-5" />}
            </button>

            <Link to="/favorites" className="relative p-1.5 lg:p-2 rounded-full hover:bg-accent text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all duration-300">
              <Heart className="h-4 w-4 lg:h-5 lg:w-5" />
              {favoritesCount > 0 && (
                <span className="absolute top-0 right-0 h-3 w-3 lg:h-4 lg:w-4 bg-primary text-primary-foreground text-[8px] lg:text-[10px] font-bold flex items-center justify-center rounded-full shadow-md animate-pulse">
                  {favoritesCount}
                </span>
              )}
            </Link>

            <button className="p-1.5 lg:p-2 rounded-full hover:bg-accent text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all duration-300">
              <User className="h-4 w-4 lg:h-5 lg:w-5" />
            </button>

            {/* Post Ad Button - Hidden on mobile, visible on tablet+ */}
            <button className="hidden md:flex items-center gap-1.5 xl:gap-2 ml-1 px-3 xl:px-5 py-2 bg-primary text-primary-foreground rounded-lg font-bold uppercase tracking-widest text-[9px] xl:text-xs hover:scale-105 transition-all duration-500 shadow-lg whitespace-nowrap flex-shrink-0">
              <Plus className="h-3 w-3 lg:h-4 lg:w-4 flex-shrink-0" />
              Predaj oglas
            </button>
          </div>

          {/* Hamburger Toggle - Pinned to the far right */}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden flex-shrink-0 p-1 text-foreground hover:text-primary transition-colors ml-1">
            {mobileMenuOpen ? (
              <X className="h-6 w-6 lg:h-7 lg:w-7 transition-transform duration-300" />
            ) : (
              <Menu className="h-6 w-6 lg:h-7 lg:w-7 transition-transform duration-300" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown - Cleaned up since utilities are in the header */}
      {mobileMenuOpen && (
        <div className="lg:hidden absolute top-20 left-0 w-full border-b border-border/40 bg-background/95 backdrop-blur-xl shadow-2xl transition-all duration-500">
          <nav className="container mx-auto px-4 py-6 flex flex-col gap-2">
            {navigationCategories.map((category) => {
              const Icon = category.icon;
              return (
                <Link
                  key={category.id}
                  to={`/${category.slug}`}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-foreground hover:bg-accent hover:text-primary transition-all duration-300 group"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="font-bold uppercase tracking-widest text-sm">{category.label}</span>
                </Link>
              );
            })}
            
            <button className="flex md:hidden items-center justify-center gap-2 px-6 py-4 mt-4 bg-primary text-primary-foreground rounded-lg font-bold uppercase tracking-widest text-sm hover:scale-105 transition-all duration-500 shadow-lg">
              <Plus className="h-5 w-5" />
              Predaj oglas
            </button>
          </nav>
        </div>
      )}
    </header>
  );
};
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
        <div className="flex h-20 items-center justify-between gap-4 overflow-hidden">
          
          {/* 1. Stacked Aston Martin Classy Logo */}
          <Link to="/" className="flex flex-col items-center justify-center flex-shrink-0 hover:opacity-90 transition-opacity duration-300 group mt-1">
            <img 
              src="/vozilahrlogo-light.svg" 
              alt="Vozila.hr logo" 
              className="h-5 lg:h-6 w-auto object-contain transform group-hover:scale-105 transition-transform duration-300 block dark:hidden"
            />
            <img 
              src="/vozilahrlogo-dark.svg" 
              alt="Vozila.hr logo dark" 
              className="h-5 lg:h-6 w-auto object-contain transform group-hover:scale-105 transition-transform duration-300 hidden dark:block"
            />
            {/* Upright, bold, wide-tracked text. No slant. */}
            <span className="text-[10px] lg:text-[11px] font-bold uppercase tracking-[0.3em] mt-1.5 text-slate-900 dark:text-slate-100 transition-colors duration-300">
              VOZILA.HR
            </span>
          </Link>

          {/* 2. Middle Navigation */}
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

          {/* 3. The Right Side Group */}
          <div className="flex items-center gap-2 xl:gap-4 ml-auto">
            <div className="hidden md:flex flex-shrink-0 items-center gap-1 xl:gap-2">
              <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-accent text-muted-foreground hover:text-slate-900 dark:hover:text-slate-100 transition-all duration-300">
                {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>

              <Link to="/favorites" className="relative p-2 rounded-full hover:bg-accent text-muted-foreground hover:text-slate-900 dark:hover:text-slate-100 transition-all duration-300">
                <Heart className="h-5 w-5 sm:h-5 sm:w-5" />
                {favoritesCount > 0 && (
                  <span className="absolute top-0 right-0 h-4 w-4 bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center rounded-full shadow-md animate-pulse">
                    {favoritesCount}
                  </span>
                )}
              </Link>

              <button className="p-2 rounded-full hover:bg-accent text-muted-foreground hover:text-slate-900 dark:hover:text-slate-100 transition-all duration-300">
                <User className="h-5 w-5" />
              </button>

              <button className="flex items-center gap-1.5 xl:gap-2 ml-1 px-4 xl:px-5 py-2 xl:py-2.5 bg-primary text-primary-foreground rounded-lg font-bold uppercase tracking-widest text-[10px] xl:text-xs hover:scale-105 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] shadow-lg shadow-primary/20 whitespace-nowrap flex-shrink-0">
                <Plus className="h-4 w-4 flex-shrink-0" />
                Predaj oglas
              </button>
            </div>

            {/* Hamburger Toggle */}
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden flex-shrink-0 p-2 text-foreground hover:text-primary transition-colors">
              {mobileMenuOpen ? (
                <X className="h-7 w-7 transition-transform duration-300" />
              ) : (
                <Menu className="h-7 w-7 transition-transform duration-300" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden absolute top-20 left-0 w-full border-b border-border/40 bg-background/95 backdrop-blur-xl shadow-2xl transition-all duration-500">
          <nav className="container mx-auto px-4 py-6 flex flex-col gap-4">
            
            <div className="flex sm:hidden justify-between items-center pb-4 mb-2 border-b border-border/40">
              <button onClick={toggleTheme} className="flex items-center gap-2 text-muted-foreground hover:text-slate-900 dark:hover:text-slate-100 font-bold uppercase tracking-widest text-xs transition-colors">
                {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                {isDark ? 'Svijetla tema' : 'Tamna tema'}
              </button>
              <div className="flex gap-4">
                <Link to="/favorites" className="relative text-muted-foreground hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                  <Heart className="h-6 w-6" />
                  {favoritesCount > 0 && (
                    <span className="absolute -top-1 -right-2 h-4 w-4 bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center rounded-full shadow-md">
                      {favoritesCount}
                    </span>
                  )}
                </Link>
                <button className="text-muted-foreground hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                  <User className="h-6 w-6" />
                </button>
              </div>
            </div>

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
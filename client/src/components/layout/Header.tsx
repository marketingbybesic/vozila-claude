import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Plus, Sun, Moon, Heart, User, ChevronDown } from 'lucide-react';
import * as NavigationMenu from '@radix-ui/react-navigation-menu';
import { navigationMenu } from '../../config/taxonomy';

export const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [openMobileCategory, setOpenMobileCategory] = useState<string | null>(null);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const activeCategory = searchParams.get('category');

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
        <div className="flex h-20 items-center justify-between gap-2">
          
          {/* 1. Stacked Aston Martin Logo */}
          <Link to="/" className="flex flex-col items-center justify-center flex-shrink-0 hover:opacity-90 transition-opacity duration-300 group mt-1">
            <img 
              src="/vozilahrlogo-light.svg" 
              alt="Vozila hr logo" 
              className="h-5 lg:h-6 w-auto object-contain transition-all duration-500 ease-premium group-hover:drop-shadow-[0_0_8px_rgba(0,130,210,0.4)] group-hover:opacity-90 block dark:hidden"
            />
            <img 
              src="/vozilahrlogo-dark.svg" 
              alt="Vozila hr logo dark" 
              className="h-5 lg:h-6 w-auto object-contain transition-all duration-500 ease-premium group-hover:drop-shadow-[0_0_8px_rgba(255,40,0,0.4)] group-hover:opacity-90 hidden dark:block"
            />
            <span className="text-[10px] lg:text-[11px] font-bold uppercase tracking-[0.3em] mt-1.5 text-slate-900 dark:text-slate-300 transition-colors duration-300">
              VOZILA HR
            </span>
          </Link>

          {/* 2. Middle Navigation (Desktop Only) - Radix Mega Menu */}
          <NavigationMenu.Root className="relative hidden lg:flex flex-1 justify-center items-center min-w-0 px-2 z-50">
            <NavigationMenu.List className="flex items-center gap-1 xl:gap-2">
              {navigationMenu.map((category) => {
                const Icon = category.icon;
                const isActive = activeCategory === category.slug;
                
                return (
                  <NavigationMenu.Item key={category.slug}>
                    <NavigationMenu.Trigger className={`group flex items-center gap-1.5 px-2 xl:px-3 py-2 text-[10px] xl:text-xs font-bold uppercase tracking-widest rounded-lg transition-all duration-300 ${
                      isActive 
                        ? 'text-primary bg-primary/10' 
                        : 'text-muted-foreground hover:text-slate-900 dark:hover:text-slate-100 hover:bg-accent/50'
                    }`}>
                      {Icon && <Icon className="h-4 w-4 group-hover:scale-110 transition-transform duration-300 flex-shrink-0" />}
                      <span className="truncate">{category.name}</span>
                      <ChevronDown className="h-3 w-3 transition-transform duration-300 group-data-[state=open]:rotate-180" />
                    </NavigationMenu.Trigger>
                    
                    <NavigationMenu.Content className="w-[300px] sm:w-[400px] md:w-[500px] p-4 absolute left-0 top-0">
                      <ul className="grid gap-2">
                        <li>
                          <NavigationMenu.Link asChild>
                            <Link
                              to={`/?category=${category.slug}`}
                              className="block px-4 py-2.5 text-sm font-bold text-slate-900 dark:text-white hover:bg-accent/80 hover:text-primary rounded-lg transition-all duration-200"
                            >
                              Sve {category.name}
                            </Link>
                          </NavigationMenu.Link>
                        </li>
                        <li className="h-px bg-slate-200 dark:bg-slate-700 my-1" />
                        {category.sub.map((subcat) => (
                          <li key={subcat}>
                            <NavigationMenu.Link asChild>
                              <Link
                                to={`/?category=${category.slug}&subcategory=${subcat.toLowerCase().replace(/\s+/g, '-').replace(/\//g, '-')}`}
                                className="block px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-accent/50 rounded-lg transition-all duration-200"
                              >
                                {subcat}
                              </Link>
                            </NavigationMenu.Link>
                          </li>
                        ))}
                      </ul>
                    </NavigationMenu.Content>
                  </NavigationMenu.Item>
                );
              })}
            </NavigationMenu.List>
            
            <div className="absolute left-0 top-full flex w-full justify-center perspective-[2000px]">
              <NavigationMenu.Viewport className="relative mt-2 h-[var(--radix-navigation-menu-viewport-height)] w-auto origin-top-center overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 backdrop-blur-xl shadow-2xl transition-all duration-300 data-[state=open]:animate-scaleIn data-[state=closed]:animate-scaleOut" />
            </div>
          </NavigationMenu.Root>

          {/* 3. The Right Side Group - Restored Mobile Icons & Tablet Centering */}
          <div className="flex items-center gap-1 sm:gap-2 ml-auto md:ml-0 md:flex-1 md:justify-center lg:flex-none lg:justify-end">
            
            <button onClick={toggleTheme} className="p-1.5 lg:p-2 rounded-full hover:bg-accent text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all duration-300">
              {isDark ? <Sun className="h-4 w-4 lg:h-5 lg:w-5" strokeWidth={2.5} /> : <Moon className="h-4 w-4 lg:h-5 lg:w-5" strokeWidth={2.5} />}
            </button>

            <Link to="/favorites" className="relative p-1.5 lg:p-2 rounded-full hover:bg-accent text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all duration-300">
              <Heart className="h-4 w-4 lg:h-5 lg:w-5" strokeWidth={2.5} />
              {favoritesCount > 0 && (
                <span className="absolute top-0 right-0 h-3 w-3 lg:h-4 lg:w-4 bg-primary text-primary-foreground text-[8px] lg:text-[10px] font-bold flex items-center justify-center rounded-full shadow-md animate-pulse">
                  {favoritesCount}
                </span>
              )}
            </Link>

            <button className="p-1.5 lg:p-2 rounded-full hover:bg-accent text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all duration-300">
              <User className="h-4 w-4 lg:h-5 lg:w-5" strokeWidth={2.5} />
            </button>

            {/* Post Ad Button - Hidden on mobile, visible on tablet+ */}
            <button className="hidden md:flex items-center gap-1.5 xl:gap-2 ml-1 px-3 xl:px-5 py-2 bg-primary text-primary-foreground rounded-lg font-bold uppercase tracking-widest text-[9px] xl:text-xs hover:scale-105 transition-all duration-500 shadow-lg whitespace-nowrap flex-shrink-0">
              <Plus className="h-3 w-3 lg:h-4 lg:w-4 flex-shrink-0" />
              Predaj oglas
            </button>
          </div>

          {/* Hamburger Toggle - Custom Dynamic Staggered Icon */}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden flex-shrink-0 p-1 text-foreground hover:text-primary transition-colors ml-1 focus:outline-none">
            {mobileMenuOpen ? (
              <X className="h-6 w-6 lg:h-7 lg:w-7 transition-transform duration-300" />
            ) : (
              <svg className="h-6 w-6 lg:h-7 lg:w-7 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h10" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown - Accordion Style */}
      {mobileMenuOpen && (
        <div className="lg:hidden absolute top-20 left-0 w-full border-b border-border/40 bg-background/95 backdrop-blur-xl shadow-2xl transition-all duration-500 max-h-[calc(100vh-5rem)] overflow-y-auto">
          <nav className="container mx-auto px-4 py-6 flex flex-col gap-2">
            {navigationMenu.map((category) => {
              const Icon = category.icon;
              const isOpen = openMobileCategory === category.slug;
              const isActive = activeCategory === category.slug;
              
              return (
                <div key={category.slug} className="rounded-lg overflow-hidden">
                  <button
                    onClick={() => setOpenMobileCategory(isOpen ? null : category.slug)}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-all duration-300 group ${
                      isActive ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-accent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {Icon && <Icon className="h-5 w-5 flex-shrink-0 transition-colors" />}
                      <span className="font-bold uppercase tracking-widest text-sm">{category.name}</span>
                    </div>
                    <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {isOpen && (
                    <div className="mt-1 ml-4 pl-8 pr-4 py-2 space-y-1 border-l-2 border-border/40 animate-slideDown">
                      <Link
                        to={`/?category=${category.slug}`}
                        className="block px-3 py-2 text-sm font-semibold text-foreground hover:text-primary hover:bg-accent/50 rounded-lg transition-all duration-200"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Sve {category.name}
                      </Link>
                      {category.sub.map((subcat) => (
                        <Link
                          key={subcat}
                          to={`/?category=${category.slug}&subcategory=${subcat.toLowerCase().replace(/\s+/g, '-').replace(/\//g, '-')}`}
                          className="block px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-lg transition-all duration-200"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          {subcat}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
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
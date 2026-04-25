import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { X, Plus, Sun, Moon, Heart, User, ChevronDown, Search, ChevronRight, LayoutDashboard, Settings as SettingsIcon, LogOut, LogIn } from 'lucide-react';
import * as NavigationMenu from '@radix-ui/react-navigation-menu';
import { navigationMenu } from '../../config/taxonomy';
import { supabase } from '../../lib/supabase';
import { SuperSearchModal } from '../search/SuperSearchModal';

export const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileDrillLevel, setMobileDrillLevel] = useState<'categories' | string>('categories');
  const [isDark, setIsDark] = useState(false);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [authUser, setAuthUser] = useState<any>(null);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const activeCategory = searchParams.get('category');

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark');
    setIsDark(isDarkMode);

    const savedFavorites = JSON.parse(localStorage.getItem('vozila_favs') || '[]');
    setFavoritesCount(savedFavorites.length);

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setAuthUser(session?.user ?? null);
    };
    checkSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null);
    });
    return () => { listener?.subscription.unsubscribe(); };
  }, []);

  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark');
    setIsDark(!isDark);
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-background">
      {/* TIER 1: TOP BAR */}
      <div className="max-w-7xl mx-auto h-16 border-b border-border bg-background bg-gradient-to-b from-transparent to-white/[0.03] flex items-center px-4 relative">
        {/* Header Sheen - subtle accent gradient at bottom edge */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent pointer-events-none" />
        {/* Logo */}
        <Link to="/" className="flex items-center flex-shrink-0 hover:opacity-90 transition-opacity duration-300 group">
          <img 
            src="/vozilahrlogo-light.svg" 
            alt="Vozila hr logo" 
            className="h-6 w-auto object-contain transition-all duration-500 group-hover:drop-shadow-[0_0_8px_rgba(0,130,210,0.4)] block dark:hidden"
          />
          <img 
            src="/vozilahrlogo-dark.svg" 
            alt="Vozila hr logo dark" 
            className="h-6 w-auto object-contain transition-all duration-500 group-hover:drop-shadow-[0_0_8px_rgba(255,40,0,0.4)] hidden dark:block"
          />
        </Link>

        {/* Center: Desktop Utility Icons */}
        <div className="hidden lg:flex items-center justify-center flex-1 gap-0">
          <button onClick={() => setSearchModalOpen(true)} className="px-3 py-2 hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-300">
            <Search className="h-5 w-5" strokeWidth={1.5} />
          </button>
          <button onClick={toggleTheme} className="px-3 py-2 hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-300">
            {isDark ? <Sun className="h-5 w-5" strokeWidth={1.5} /> : <Moon className="h-5 w-5" strokeWidth={1.5} />}
          </button>
          <Link to="/favorites" className="relative px-3 py-2 hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-300">
            <Heart className="h-5 w-5" strokeWidth={1.5} />
            {favoritesCount > 0 && (
              <span className="absolute top-0 right-0 h-4 w-4 bg-primary text-primary-foreground text-[10px] font-light flex items-center justify-center shadow-sm">{favoritesCount}</span>
            )}
          </Link>
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="px-3 py-2 hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-300"
            >
              <User className="h-5 w-5" strokeWidth={1.5} />
            </button>
            {userMenuOpen && (
              <div className="absolute top-full right-0 mt-1 w-56 bg-background border border-border shadow-2xl z-[60] animate-in fade-in slide-in-from-top-2 duration-200">
                {authUser ? (
                  <>
                    <Link to="/profil" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-xs font-light text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200 uppercase tracking-widest">
                      <User className="h-4 w-4" strokeWidth={1.5} /> Profil
                    </Link>
                    <Link to="/dashboard" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-xs font-light text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200 uppercase tracking-widest">
                      <LayoutDashboard className="h-4 w-4" strokeWidth={1.5} /> Moji oglasi
                    </Link>
                    <Link to="/favoriti" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-xs font-light text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200 uppercase tracking-widest">
                      <Heart className="h-4 w-4" strokeWidth={1.5} /> Favoriti
                    </Link>
                    <Link to="/postavke" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-xs font-light text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200 uppercase tracking-widest">
                      <SettingsIcon className="h-4 w-4" strokeWidth={1.5} /> Postavke
                    </Link>
                    <div className="border-t border-border" />
                    <button
                      onClick={async () => { await supabase.auth.signOut(); setUserMenuOpen(false); window.location.reload(); }}
                      className="flex items-center gap-3 w-full px-4 py-3 text-xs font-light text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-all duration-200 uppercase tracking-widest"
                    >
                      <LogOut className="h-4 w-4" strokeWidth={1.5} /> Odjava
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/profil" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-xs font-light text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200 uppercase tracking-widest">
                      <LogIn className="h-4 w-4" strokeWidth={1.5} /> Prijava / Registracija
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Predaj oglas + Mobile Search + Hamburger */}
        <div className="flex items-center gap-2 ml-auto">
          <Link to="/predaj-oglas" className="hidden md:flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-light uppercase tracking-widest text-xs hover:bg-primary/90 transition-all duration-300 shadow-lg whitespace-nowrap">
            <Plus className="h-4 w-4" strokeWidth={1.5} /> Predaj oglas
          </Link>
          <Link to="/predaj-oglas" className="flex md:hidden items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground font-light uppercase tracking-widest text-[10px] hover:bg-primary/90 transition-all duration-300 shadow-lg whitespace-nowrap">
            <Plus className="h-3.5 w-3.5" strokeWidth={1.5} /> Oglas
          </Link>
          <button onClick={() => setSearchModalOpen(true)} className="lg:hidden p-1 text-muted-foreground hover:text-foreground transition-colors">
            <Search className="h-5 w-5" strokeWidth={1.5} />
          </button>
          <button onClick={() => { setMobileMenuOpen(!mobileMenuOpen); if (mobileMenuOpen) setMobileDrillLevel('categories'); }} className="lg:hidden p-1 text-muted-foreground hover:text-foreground transition-colors">
            {mobileMenuOpen ? (
              <X className="h-6 w-6" strokeWidth={1.5} />
            ) : (
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* TIER 2: CATEGORY BAR - Desktop Only */}
      <div className="max-w-7xl mx-auto h-10 hidden lg:flex items-center relative z-50 bg-background border-t border-border">
        <NavigationMenu.Root className="relative flex-1">
          <NavigationMenu.List className="flex items-center gap-0 h-full">
            {navigationMenu.map((category) => {
              const Icon = category.icon;
              const isActive = activeCategory === category.slug;
              return (
                <NavigationMenu.Item key={category.slug} className="relative">
                  <NavigationMenu.Trigger className={`group flex items-center gap-1.5 px-4 h-full text-[10px] font-light uppercase tracking-widest text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-300 ${isActive ? 'bg-muted text-foreground' : ''}`}>
                    {Icon && <Icon className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={1.5} />}
                    <span>{category.name}</span>
                    <ChevronDown className="h-3 w-3 transition-transform duration-300 group-data-[state=open]:rotate-180" strokeWidth={1.5} />
                  </NavigationMenu.Trigger>
                  <NavigationMenu.Content className="absolute top-full left-0 mt-2 min-w-[320px] p-3 z-[60] bg-background border border-border shadow-2xl">
                    <Link to={`/?category=${category.slug}`} className="block px-3 py-2 text-xs font-light uppercase tracking-widest text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200 mb-1">Prikaži sve: {category.name}</Link>
                    <div className="border-t border-border my-1" />
                    <ul className="flex flex-col gap-0">
                      {category.sub.map((subcat) => {
                        const SubIcon = subcat.icon;
                        return (
                          <li key={subcat.slug}>
                            <Link to={`/?category=${category.slug}&subcategory=${subcat.slug}`} className="flex items-center justify-between px-3 py-2 text-xs font-light text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200 group">
                              <div className="flex items-center gap-2">
                                {SubIcon && <SubIcon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" strokeWidth={1.5} />}
                                <span className="uppercase tracking-widest">{subcat.name}</span>
                              </div>
                              <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" strokeWidth={1.5} />
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </NavigationMenu.Content>
                </NavigationMenu.Item>
              );
            })}
          </NavigationMenu.List>
        </NavigationMenu.Root>
      </div>

      {/* MOBILE FULL-SCREEN MENU */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[100] bg-background">
          <div className="max-w-7xl mx-auto h-full flex flex-col relative overflow-hidden">
            {/* Branding Header */}
            <div className="flex flex-col items-center pt-12 pb-6 border-b border-white/10">
              <img
                src="/vozilahrlogo-light.svg"
                alt="Vozila.hr"
                className="h-8 w-auto object-contain block dark:hidden"
              />
              <img
                src="/vozilahrlogo-dark.svg"
                alt="Vozila.hr"
                className="h-8 w-auto object-contain hidden dark:block"
              />
              <span className="text-xs font-light tracking-[0.3em] uppercase text-foreground mt-4">
                VOZILA.HR
              </span>
            </div>

            {/* Categories Panel */}
            <div
              className="absolute inset-0 top-[140px] transition-transform duration-300 ease-out"
              style={{
                transform: mobileDrillLevel === 'categories' ? 'translateX(0)' : 'translateX(-100%)',
              }}
            >
              <nav className="flex-1 overflow-y-auto px-4 py-4 h-full">
                {navigationMenu.map((category) => {
                  const Icon = category.icon;
                  const isActive = activeCategory === category.slug;
                  return (
                    <div key={category.slug}>
                      <div className={`flex items-center justify-between px-4 py-4 border-b border-white/10 transition-all duration-200 ${isActive ? 'bg-white/5 text-white' : 'text-white/50'}`}>
                        <Link
                          to={`/?category=${category.slug}`}
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 flex-1 hover:text-white transition-colors"
                        >
                          {Icon && <Icon className="h-5 w-5 flex-shrink-0" strokeWidth={1.5} />}
                          <span className="font-light uppercase tracking-widest text-sm">{category.name}</span>
                        </Link>
                        {category.sub.length > 0 && (
                          <button
                            onClick={() => setMobileDrillLevel(category.slug)}
                            className="p-2 hover:text-white transition-colors"
                          >
                            <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </nav>
            </div>

            {/* Subcategory Panel - slides in from right */}
            {mobileDrillLevel !== 'categories' && (
              <div
                className="absolute inset-0 top-[140px] transition-transform duration-300 ease-out bg-background"
                style={{
                  transform: mobileDrillLevel !== 'categories' ? 'translateX(0)' : 'translateX(100%)',
                }}
              >
                {(() => {
                  const cat = navigationMenu.find((c) => c.slug === mobileDrillLevel);
                  if (!cat) return null;
                  return (
                    <div className="flex flex-col h-full">
                      <div className="flex items-center px-4 py-3 border-b border-white/10">
                        <button onClick={() => setMobileDrillLevel('categories')} className="flex items-center gap-2 text-white/50 hover:text-white text-xs font-light uppercase tracking-widest transition-colors duration-200">
                          <ChevronRight className="h-4 w-4 rotate-180" strokeWidth={1.5} /> Natrag
                        </button>
                      </div>
                      <nav className="flex-1 overflow-y-auto px-4 py-4">
                        <Link to={`/?category=${cat.slug}`} onClick={() => setMobileMenuOpen(false)} className="block px-4 py-3 text-sm font-light uppercase tracking-widest text-white/50 hover:bg-white/5 hover:text-white transition-all duration-200">{cat.name}</Link>
                        <div className="border-t border-white/10 my-1" />
                        {cat.sub.map((subcat) => (
                          <Link key={subcat.slug} to={`/?category=${cat.slug}&subcategory=${subcat.slug}`} onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm font-light text-white/50 hover:text-white hover:bg-white/5 transition-all duration-200">
                            {subcat.icon && <subcat.icon className="h-4 w-4 text-white/40" strokeWidth={1.5} />}
                            <span className="uppercase tracking-widest">{subcat.name}</span>
                          </Link>
                        ))}
                      </nav>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Super Search Modal */}
      <SuperSearchModal open={searchModalOpen} onOpenChange={setSearchModalOpen} />
    </header>
  );
};

import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react'; // Added Mail icon for the elegant email link

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-border/40 bg-slate-50 dark:bg-card mt-auto transition-colors duration-500">
      <div className="container mx-auto px-6 py-12 md:py-16">
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-12 text-center md:text-left">
          
          {/* Column 1: Logo, Tagline, and Contact */}
          <div className="flex flex-col items-center md:items-start space-y-5 h-full">
            
            {/* Logo - EXACT 1:1 match with the Header (No dot, identical size/weight) */}
            <Link to="/" className="flex flex-col items-center hover:opacity-90 transition-opacity duration-300 group mt-1">
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
            
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed max-w-[260px] mx-auto md:mx-0 flex-grow">
              Najveća platforma za kupnju i prodaju vozila u Hrvatskoj.
            </p>
            
            {/* Elegant, softened email link with icon, pushed to the bottom */}
            <a href="mailto:info@vozila.hr" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-white transition-colors duration-300 mt-auto pt-2">
              <Mail className="h-4 w-4" />
              info@vozila.hr
            </a>
          </div>

          {/* Column 2: KATEGORIJE */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-widest">
              Kategorije
            </h4>
            <ul className="space-y-3">
              {['Osobni automobili', 'Motocikli', 'Gospodarska vozila', 'Auto dijelovi', 'Brodovi', 'Strojevi'].map((item) => (
                <li key={item}>
                  <Link to={`/${item.toLowerCase().replace(' ', '-')}`} className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-white transition-colors duration-300">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: ZA TRGOVCE */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-widest">
              Za Trgovce
            </h4>
            <ul className="space-y-3">
              <li>
                <Link to="/postani-trgovac" className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-white transition-colors duration-300">
                  Postani trgovac
                </Link>
              </li>
              <li>
                <Link to="/cjenik" className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-white transition-colors duration-300">
                  Cjenik
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* The Premium Bottom Bar */}
        <div className="pt-8 border-t border-border/40 flex flex-col xl:flex-row justify-between items-center gap-6">
          <p className="text-[10px] lg:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center">
            © {currentYear} VOZILA HR. SVA PRAVA PRIDRŽANA.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4 lg:gap-8">
            <Link to="/faq" className="text-[10px] lg:text-xs font-bold text-slate-900 dark:text-slate-300 hover:text-primary dark:hover:text-white uppercase tracking-widest transition-colors duration-300">
              Česta pitanja
            </Link>
            <Link to="/help" className="text-[10px] lg:text-xs font-bold text-slate-900 dark:text-slate-300 hover:text-primary dark:hover:text-white uppercase tracking-widest transition-colors duration-300">
              Centar za pomoć
            </Link>
            <Link to="/terms" className="text-[10px] lg:text-xs font-bold text-slate-900 dark:text-slate-300 hover:text-primary dark:hover:text-white uppercase tracking-widest transition-colors duration-300">
              Uvjeti korištenja
            </Link>
            <Link to="/privacy" className="text-[10px] lg:text-xs font-bold text-slate-900 dark:text-slate-300 hover:text-primary dark:hover:text-white uppercase tracking-widest transition-colors duration-300">
              Privatnost
            </Link>
            <Link to="/impressum" className="text-[10px] lg:text-xs font-bold text-slate-900 dark:text-slate-300 hover:text-primary dark:hover:text-white uppercase tracking-widest transition-colors duration-300">
              Impressum
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
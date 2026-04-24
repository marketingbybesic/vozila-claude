import { Link } from 'react-router-dom';
import { footerSections } from '../../config/navigation';

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-border/40 bg-card mt-auto">
      <div className="container mx-auto px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          <div className="space-y-6">
       {/* Stacked Aston Martin Classy Logo */}
            <Link to="/" className="flex flex-col items-start hover:opacity-90 transition-opacity duration-300 group">
              <img 
                src="/vozilahrlogo-light.svg" 
                alt="Vozila.hr logo" 
                className="h-6 lg:h-8 w-auto object-contain transform group-hover:scale-105 transition-transform duration-300 block dark:hidden"
              />
              <img 
                src="/vozilahrlogo-dark.svg" 
                alt="Vozila.hr logo dark" 
                className="h-6 lg:h-8 w-auto object-contain transform group-hover:scale-105 transition-transform duration-300 hidden dark:block"
              />
              {/* Upright, bold, wide-tracked text. No slant. */}
              <span className="text-xs lg:text-sm font-bold uppercase tracking-[0.3em] mt-2 text-slate-900 dark:text-slate-100 transition-colors duration-300">
                VOZILA.HR
              </span>
            </Link>
            <p className="text-sm font-medium text-muted-foreground leading-relaxed">
              Najveća platforma za kupnju i prodaju vozila u Hrvatskoj.
            </p>
          </div>

          {footerSections.map((section, index) => (
            <div key={index} className="space-y-4">
              {/* Aggressive Slanted Headings */}
              <h4 className="text-sm font-black italic text-foreground uppercase tracking-widest">
                {section.title}
              </h4>
              <ul className="space-y-2">
                {section.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <Link to={link.href} className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors duration-300">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-border/40">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              © {currentYear} VOZILA.HR. SVA PRAVA PRIDRŽANA.
            </p>
            
            <div className="flex gap-6">
              <Link to="/terms" className="text-xs font-bold text-muted-foreground hover:text-primary uppercase tracking-wider transition-colors duration-300">
                Uvjeti korištenja
              </Link>
              <Link to="/privacy" className="text-xs font-bold text-muted-foreground hover:text-primary uppercase tracking-wider transition-colors duration-300">
                Privatnost
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
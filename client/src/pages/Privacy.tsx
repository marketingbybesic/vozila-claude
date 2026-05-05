import { Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';

export const Privacy = () => (
  <div className="max-w-3xl mx-auto px-4 py-16">
    <Link to="/" className="inline-flex items-center gap-2 text-[10px] font-light uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground transition-colors mb-8">
      <ArrowLeft className="w-4 h-4" strokeWidth={1.5} /> Natrag
    </Link>

    <div className="border border-border bg-muted/30 backdrop-blur-md p-8 md:p-12">
      <div className="flex items-center gap-3 mb-8">
        <Shield className="w-6 h-6 text-muted-foreground" strokeWidth={1.5} />
        <h1 className="text-xl font-light uppercase tracking-[0.2em] text-foreground">Pravila privatnosti</h1>
      </div>

      <div className="space-y-6 text-sm font-light text-muted-foreground leading-relaxed">
        <p>
          Vozila.hr (dalje: „Mi”, „Platforma”) poštuje Vašu privatnost i zalaže se za zaštitu osobnih podataka u skladu s GDPR-om i relevantnim hrvatskim zakonima.
        </p>

        <h2 className="text-[10px] font-light uppercase tracking-[0.2em] text-foreground/80 mt-8 mb-3">1. Prikupljanje podataka</h2>
        <p>Prikupljamo samo podatke neophodne za funkcioniranje usluge: email adresu, ime, broj telefona, lokaciju oglasa i tehničke podatke o uređaju.</p>

        <h2 className="text-[10px] font-light uppercase tracking-[0.2em] text-foreground/80 mt-8 mb-3">2. Svrha obrade</h2>
        <p>Podaci se koriste isključivo za objavljivanje oglasa, komunikaciju s potencijalnim kupcima i unapređenje sigurnosti platforme. Nikada ne prodajemo podatke trećim stranama.</p>

        <h2 className="text-[10px] font-light uppercase tracking-[0.2em] text-foreground/80 mt-8 mb-3">3. Prava korisnika (GDPR)</h2>
        <p>
          Imate pravo na pristup, ispravak, brisanje („pravo na zaborav”), ograničenje obrade i prigovor. Zahtjeve možete podnijeti putem stranice <Link to="/postavke" className="text-foreground/80 hover:text-foreground underline underline-offset-4">Postavke</Link> ili na <span className="text-foreground/80">info@vozila.hr</span>.
        </p>

        <h2 className="text-[10px] font-light uppercase tracking-[0.2em] text-foreground/80 mt-8 mb-3">4. Sigurnost i zadržavanje</h2>
        <p>Podaci se pohranjuju na šifriranim serverima unutar EU. Nakon brisanja računa, svi osobni podaci i oglasi se trajno uklanjaju u roku od 30 dana.</p>

        <h2 className="text-[10px] font-light uppercase tracking-[0.2em] text-foreground/80 mt-8 mb-3">5. Kontakt</h2>
        <p>Za pitanja o privatnosti pišite na <span className="text-foreground/80">info@vozila.hr</span>.</p>

        <p className="text-[10px] text-muted-foreground/60 pt-6 border-t border-border mt-8">
          Zadnja izmjena: 25. travnja 2026.
        </p>
      </div>
    </div>
  </div>
);

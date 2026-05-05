import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';

export const Terms = () => (
  <div className="max-w-3xl mx-auto px-4 py-16">
    <Link to="/" className="inline-flex items-center gap-2 text-[10px] font-light uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground transition-colors mb-8">
      <ArrowLeft className="w-4 h-4" strokeWidth={1.5} /> Natrag
    </Link>

    <div className="border border-border bg-muted/30 backdrop-blur-md p-8 md:p-12">
      <div className="flex items-center gap-3 mb-8">
        <FileText className="w-6 h-6 text-muted-foreground" strokeWidth={1.5} />
        <h1 className="text-xl font-light uppercase tracking-[0.2em] text-foreground">Uvjeti korištenja</h1>
      </div>

      <div className="space-y-6 text-sm font-light text-muted-foreground leading-relaxed">
        <p>
          Korištenjem platforme Vozila.hr (dalje: „Platforma”) pristajete na sljedeće uvjete. Ako se ne slažete, nemojte koristiti usluge Platforme.
        </p>

        <h2 className="text-[10px] font-light uppercase tracking-[0.2em] text-foreground/80 mt-8 mb-3">1. Opis usluge</h2>
        <p>
          Vozila.hr je online oglasnik za vozila, plovila, strojeve i pripadajuću opremu. Platforma omogućuje objavljivanje oglasa, pregledavanje sadržaja i kontakt između kupaca i prodavatelja. <strong className="text-foreground/80">Platforma nije direktni prodavatelj vozila niti pružatelj financijskih usluga.</strong>
        </p>

        <h2 className="text-[10px] font-light uppercase tracking-[0.2em] text-foreground/80 mt-8 mb-3">2. Usluge i digitalna roba (Stripe)</h2>
        <p>
          U skladu s uvjetima procesora plaćanja Stripe, Platforma može nuditi premium usluge poput istaknutih oglasa, promicanja sadržaja i pretplate na poslovne profile (dalje: „<strong className="text-foreground/80">Usluge i digitalna roba</strong>”).
        </p>
        <ul className="list-disc list-inside space-y-1 ml-4">
          <li>Sva plaćanja obrađuju se preko Stripe-a u skladu s <a href="https://stripe.com/legal" target="_blank" rel="noopener noreferrer" className="text-foreground/80 hover:text-foreground underline underline-offset-4">Stripeovim uvjetima</a>.</li>
          <li>Digitalna roba se isporučuje odmah nakon uspješne transakcije i nije podložna povratu, osim u slučajevima predviđenim zakonom.</li>
          <li>U slučaju tehničkih problema, kontaktirajte nas na <span className="text-foreground/80">info@vozila.hr</span> u roku od 14 dana.</li>
        </ul>

        <h2 className="text-[10px] font-light uppercase tracking-[0.2em] text-foreground/80 mt-8 mb-3">3. Korisničke obveze</h2>
        <ul className="list-disc list-inside space-y-1 ml-4">
          <li>Informacije u oglasima moraju biti točne i istinite.</li>
          <li>Zabranjeno je objavljivanje lažnih, obmanjujućih ili ilegalnih oglasa.</li>
          <li>Korisnik je odgovoran za sadržaj kojeg objavi i eventualne sporove s trećim stranama.</li>
        </ul>

        <h2 className="text-[10px] font-light uppercase tracking-[0.2em] text-foreground/80 mt-8 mb-3">4. Ograničenje odgovornosti</h2>
        <p>
          Platforma funkcionira kao posrednik i ne provjerava točnost svakog oglasa. Ne snosimo odgovornost za kvalitetu vozila, ispravnost tehničkih podataka ni financijske transakcije između korisnika.
        </p>

        <h2 className="text-[10px] font-light uppercase tracking-[0.2em] text-foreground/80 mt-8 mb-3">5. Privatnost</h2>
        <p>
          Detalji o obradi osobnih podataka dostupni su u <Link to="/privatnost" className="text-foreground/80 hover:text-foreground underline underline-offset-4">Pravilima privatnosti</Link>.
        </p>

        <h2 className="text-[10px] font-light uppercase tracking-[0.2em] text-foreground/80 mt-8 mb-3">6. Završne odredbe</h2>
        <p>
          Platforma zadržava pravo suspenzije ili uklanjanja korisničkih računa koji krše ove uvjete. Sporovi rješavaju se u skladu s hrvatskim zakonodavstvom.
        </p>

        <p className="text-[10px] text-muted-foreground/60 pt-6 border-t border-border mt-8">
          Zadnja izmjena: 25. travnja 2026.
        </p>
      </div>
    </div>
  </div>
);

import { 
  Car, Bike, Truck, Tractor, Tent, Wrench, CarFront, Sparkles, History, 
  Leaf, Key, Zap, Anchor, Settings2, ShieldCheck, Box, Compass
} from 'lucide-react';

export interface NavigationSubItem { name: string; slug: string; icon: any; }
export interface NavigationMenuItem { slug: string; name: string; icon: any; sub: NavigationSubItem[]; }

export const navigationMenu: NavigationMenuItem[] = [
  { 
    slug: 'osobni-automobili', name: 'Automobili', icon: Car,
    sub: [
      { name: 'Rabljeni automobili', slug: 'rabljeni', icon: CarFront },
      { name: 'Novi automobili', slug: 'novi', icon: Sparkles },
      { name: 'Luksuzna vozila', slug: 'luksuzna', icon: ShieldCheck },
      { name: 'Oldtimeri', slug: 'oldtimeri', icon: History },
      { name: 'Eko vozila (EV/Hibrid)', slug: 'eko-vozila', icon: Leaf },
      { name: 'Karambolirana', slug: 'karambolirana', icon: Wrench },
      { name: 'Najam automobila', slug: 'najam', icon: Key }
    ]
  },
  { 
    slug: 'motocikli', name: 'Motocikli', icon: Bike,
    sub: [
      { name: 'Motocikli', slug: 'motocikli', icon: Bike },
      { name: 'Skuteri i Mopedi', slug: 'skuteri', icon: Zap },
      { name: 'Četverocikli (ATV)', slug: 'atv', icon: Box },
      { name: 'Bicikli (MTB, Cestovni)', slug: 'bicikli', icon: Bike },
      { name: 'E-Bicikli', slug: 'e-bicikli', icon: Zap },
      { name: 'Električni romobili', slug: 'e-romobili', icon: Zap },
      { name: 'Moto Oldtimeri', slug: 'oldtimeri-moto', icon: History },
      { name: 'Najam', slug: 'najam-moto', icon: Key }
    ]
  },
  { 
    slug: 'gospodarska-vozila', name: 'Gospodarska', icon: Truck,
    sub: [
      { name: 'Dostavna vozila', slug: 'dostavna', icon: Box },
      { name: 'Kamioni', slug: 'kamioni', icon: Truck },
      { name: 'Autobusi', slug: 'autobusi', icon: CarFront },
      { name: 'Prikolice', slug: 'prikolice', icon: Settings2 },
      { name: 'Mehanizacija', slug: 'mehanizacija', icon: Tractor },
      { name: 'Najam', slug: 'najam-gospodarska', icon: Key }
    ]
  },
  { 
    slug: 'strojevi', name: 'Strojevi', icon: Tractor,
    sub: [
      { name: 'Građevinski strojevi', slug: 'gradevinski-strojevi', icon: Truck },
      { name: 'Poljoprivredni strojevi', slug: 'poljoprivredni-strojevi', icon: Tractor },
      { name: 'Industrijski strojevi', slug: 'industrijski-strojevi', icon: Settings2 },
      { name: 'Alati i oprema', slug: 'alati-oprema', icon: Wrench },
      { name: 'Najam strojeva', slug: 'najam-strojeva', icon: Key }
    ]
  },
  { 
    slug: 'slobodno-vrijeme', name: 'Slobodno vrijeme', icon: Tent,
    sub: [
      { name: 'Kamperi', slug: 'kamperi', icon: Tent },
      { name: 'Plovila i Nautika', slug: 'nautika', icon: Anchor },
      { name: 'Iskustva i Izleti (Ture)', slug: 'iskustva-izleti', icon: Compass },
      { name: 'Najam i Charter', slug: 'najam-slobodno-vrijeme', icon: Key }
    ]
  },
  { 
    slug: 'dijelovi-oprema', name: 'Dijelovi i oprema', icon: Wrench,
    sub: [
      { name: 'Auto dijelovi', slug: 'auto-dijelovi', icon: Settings2 },
      { name: 'Gume i felge', slug: 'gume-felge', icon: Box },
      { name: 'Moto oprema', slug: 'moto-oprema', icon: ShieldCheck },
      { name: 'Auto-moto usluge', slug: 'usluge', icon: Wrench }
    ]
  }
];

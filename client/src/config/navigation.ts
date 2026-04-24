import { Car, Bike, Truck, Wrench, Anchor, Tractor, LucideIcon } from 'lucide-react';

export interface NavigationCategory {
  id: string;
  slug: string;        // Croatian SEO-friendly URL slug
  dbSlug: string;      // English database slug
  label: string;       
  icon: LucideIcon;
}

export const navigationCategories: NavigationCategory[] = [
  { id: '1', slug: 'osobni-automobili', dbSlug: 'cars', label: 'Osobni automobili', icon: Car },
  { id: '2', slug: 'motocikli', dbSlug: 'motorcycles', label: 'Motocikli', icon: Bike },
  { id: '3', slug: 'gospodarska-vozila', dbSlug: 'trucks', label: 'Gospodarska vozila', icon: Truck },
  { id: '4', slug: 'auto-dijelovi', dbSlug: 'parts', label: 'Auto dijelovi', icon: Wrench },
  { id: '5', slug: 'brodovi', dbSlug: 'boats', label: 'Brodovi', icon: Anchor },
  { id: '6', slug: 'strojevi', dbSlug: 'machinery', label: 'Strojevi', icon: Tractor }
];

export const footerSections = [
  {
    title: 'Kategorije',
    links: navigationCategories.map(cat => ({ label: cat.label, href: `/${cat.slug}` }))
  },
  {
    title: 'Za trgovce',
    links: [
      { label: 'Postani trgovac', href: '/dealer/register' },
      { label: 'Cjenik', href: '/dealer/pricing' }
    ]
  },
  {
    title: 'Pravno',
    links: [
      { label: 'Uvjeti korištenja', href: '/terms' },
      { label: 'Politika privatnosti', href: '/privacy' }
    ]
  }
];
// client/src/config/filters.ts

export type FilterType = 'select' | 'range' | 'boolean' | 'radio';

export interface FilterDefinition {
  id: string; // The exact key stored in the Supabase JSONB attributes column
  label: string; // Croatian UI label
  type: FilterType;
  options?: { label: string; value: string | number }[]; // For selects/radios
  unit?: string; // e.g., 'km', 'KS', 'ccm'
}

// GLOBAL FILTERS (Apply to almost everything)
export const globalFilters: FilterDefinition[] = [
  { id: 'price', label: 'Cijena', type: 'range', unit: '€' },
  { id: 'year', label: 'Godište', type: 'range' },
  { id: 'listing_type', label: 'Tip oglasa', type: 'radio', options: [
    { label: 'Oglasi za prodaju', value: 'prodaja' },
    { label: 'Oglasi za najam', value: 'najam' }
  ]},
];

// CATEGORY SPECIFIC FILTERS (JSONB Attributes)
export const categoryFilters: Record<string, FilterDefinition[]> = {
  'osobni-automobili': [
    { id: 'mileage', label: 'Kilometraža', type: 'range', unit: 'km' },
    { id: 'power', label: 'Snaga motora', type: 'range', unit: 'KS' },
    { id: 'fuel', label: 'Gorivo', type: 'select', options: [
      { label: 'Benzin', value: 'Benzin' },
      { label: 'Diesel', value: 'Diesel' },
      { label: 'Hibrid', value: 'Hibrid' },
      { label: 'Struja', value: 'Struja' }
    ]},
    { id: 'transmission', label: 'Mjenjač', type: 'radio', options: [
      { label: 'Ručni', value: 'Ručni' },
      { label: 'Automatik', value: 'Automatik' }
    ]},
    { id: 'bodyType', label: 'Karoserija', type: 'select', options: [
      { label: 'Limuzina', value: 'Limuzina' }, { label: 'Karavan', value: 'Karavan' },
      { label: 'SUV', value: 'SUV' }, { label: 'Coupe', value: 'Coupe' }
    ]},
    { id: 'drivetrain', label: 'Pogon', type: 'select', options: [
      { label: 'Prednji', value: 'Prednji' }, { label: 'Stražnji', value: 'Stražnji' }, { label: '4x4', value: '4x4' }
    ]}
  ],
  'motocikli-atv': [
    { id: 'mileage', label: 'Kilometraža', type: 'range', unit: 'km' },
    { id: 'engineSize', label: 'Radni obujam', type: 'range', unit: 'ccm' },
    { id: 'power', label: 'Snaga', type: 'range', unit: 'kW' },
    { id: 'engineType', label: 'Tip motora', type: 'radio', options: [
      { label: '2-taktni', value: '2-taktni' }, { label: '4-taktni', value: '4-taktni' }
    ]}
  ],
  'slobodno-vrijeme': [
    { id: 'hours', label: 'Radni sati (Brodovi)', type: 'range', unit: 'h' },
    { id: 'length', label: 'Dužina', type: 'range', unit: 'm' },
    { id: 'beds', label: 'Broj ležajeva (Kamperi)', type: 'range' }
  ],
  'gospodarska-vozila': [
    { id: 'payload', label: 'Nosivost', type: 'range', unit: 'kg' },
    { id: 'axles', label: 'Broj osovina', type: 'select', options: [
      { label: '2', value: 2 }, { label: '3', value: 3 }, { label: '4+', value: 4 }
    ]}
  ],
  'dijelovi-usluge': [
    { id: 'condition', label: 'Stanje', type: 'radio', options: [
      { label: 'Novo', value: 'Novo' }, { label: 'Rabljeno', value: 'Rabljeno' }
    ]}
  ],
  'strojevi': [
    { id: 'operatingHours', label: 'Radni sati', type: 'range', unit: 'h' },
    { id: 'loadCapacity', label: 'Nosivost', type: 'range', unit: 'kg' },
    { id: 'driveType', label: 'Vrsta pogona', type: 'radio', options: [
      { label: 'Gusjeničar', value: 'Gusjeničar' },
      { label: 'Kotač', value: 'Kotač' }
    ]},
    { id: 'power', label: 'Snaga motora', type: 'range', unit: 'kW' },
    { id: 'condition', label: 'Stanje', type: 'radio', options: [
      { label: 'Novo', value: 'Novo' },
      { label: 'Rabljeno', value: 'Rabljeno' },
      { label: 'Restaurirano', value: 'Restaurirano' }
    ]}
  ]
};

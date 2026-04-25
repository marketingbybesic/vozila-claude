# Component Polish Guide - High-Density Luxury

## Overview
This guide provides specific instructions for polishing all components to achieve a high-density, luxury aesthetic.

## Global CSS
All global styles are defined in `src/styles/global.css`. This file should be imported in your main app file:

```typescript
import './styles/global.css';
```

## Header/Navbar Specifications

### Height Reduction
- **Current**: Typically `h-16` (64px)
- **Target**: `h-12` (48px) - 25% reduction
- **Implementation**: Change `h-16` to `h-12` in Header.tsx

### Navigation Text
```typescript
// BEFORE
<span className="text-sm font-semibold">Početna</span>

// AFTER
<span className="text-xs font-black uppercase tracking-[0.2em]">Početna</span>
```

### Icon Sizing in Header
```typescript
// BEFORE
<Menu className="w-6 h-6" />

// AFTER
<Menu className="w-5 h-5" strokeWidth={1.5} />
```

### Header Structure
```typescript
export const Header = () => {
  return (
    <header className="h-12 bg-black border-b border-white/5 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-8 h-full flex items-center justify-between">
        {/* Logo */}
        <div className="text-lg font-black tracking-[0.2em]">VOZILA</div>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <a href="/" className="text-xs font-black uppercase tracking-[0.2em] text-white/80 hover:text-white transition-colors">
            Početna
          </a>
          <a href="/listings" className="text-xs font-black uppercase tracking-[0.2em] text-white/80 hover:text-white transition-colors">
            Oglasi
          </a>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <button className="text-xs font-black uppercase tracking-[0.2em] text-white/80 hover:text-white transition-colors">
            Prijava
          </button>
          <Menu className="w-5 h-5 text-white/60" strokeWidth={1.5} />
        </div>
      </div>
    </header>
  );
};
```

## Icon Standardization

### Standard Sizes
- **Large**: `w-6 h-6` (24px) - Page headers, hero sections
- **Medium**: `w-5 h-5` (20px) - Buttons, navigation
- **Small**: `w-4 h-4` (16px) - Inline icons, compact spaces
- **Extra Small**: `w-3 h-3` (12px) - Badges, tiny indicators

### Stroke Width
- **Thin**: `strokeWidth={1.5}` - Default for luxury aesthetic
- **Normal**: `strokeWidth={2}` - For emphasis
- **Bold**: `strokeWidth={2.5}` - For critical elements

### Icon Usage Examples

```typescript
// Navigation icon
<Home className="w-5 h-5" strokeWidth={1.5} />

// Button icon
<Search className="w-4 h-4" strokeWidth={2} />

// Badge icon
<Check className="w-3 h-3" strokeWidth={2} />

// Large hero icon
<Zap className="w-6 h-6" strokeWidth={1.5} />
```

## Border Standardization

### Border Colors
```typescript
// Very subtle - default for most elements
border-white/5

// Subtle - for hover states
border-white/10

// Visible - for focus states
border-white/20

// Prominent - for active states
border-white/30
```

### Border Implementation

```typescript
// BEFORE
<div className="border border-white">

// AFTER
<div className="border border-white/10 hover:border-white/20 transition-all">
```

### Divider Examples

```typescript
// Horizontal divider
<div className="border-t border-white/5" />

// Vertical divider
<div className="border-l border-white/5" />

// Card border
<div className="border border-white/10 rounded-none">

// Input border
<input className="border border-white/10 focus:border-white/30" />
```

## Typography Standardization

### Font Weights
- **Light (300)**: Body text, descriptions, secondary content
- **Normal (400)**: Default text
- **Semibold (600)**: Emphasized text
- **Bold (700)**: Important text
- **Black (900)**: Headings, labels, buttons

### Letter Spacing
```typescript
// Standard labels
className="text-xs font-black uppercase tracking-[0.2em]"

// Body text
className="text-sm font-light"

// Headings
className="text-2xl font-black tracking-[0.2em]"
```

### Text Examples

```typescript
// Label
<label className="block text-xs font-black uppercase tracking-[0.2em] text-white/60 mb-2">
  Cijena
</label>

// Body
<p className="text-sm font-light text-neutral-400">
  Opis proizvoda...
</p>

// Heading
<h1 className="text-3xl font-black tracking-[0.2em] text-white">
  Pronađi vozilo
</h1>

// Button
<button className="text-xs font-black uppercase tracking-[0.2em]">
  Pretraži
</button>
```

## Component Checklist

### Header
- [ ] Height reduced to `h-12`
- [ ] Navigation text is `text-xs font-black uppercase tracking-[0.2em]`
- [ ] All icons are `w-5 h-5` with `strokeWidth={1.5}`
- [ ] Border is `border-white/5`

### Buttons
- [ ] All buttons use `text-xs font-black uppercase tracking-[0.2em]`
- [ ] Hover states transition smoothly
- [ ] Icons inside buttons are `w-4 h-4`
- [ ] Borders are `border-white/10` (secondary buttons)

### Forms
- [ ] Labels are `text-xs font-black uppercase tracking-[0.2em]`
- [ ] Inputs have `border-white/10` default
- [ ] Inputs have `focus:border-white/30` on focus
- [ ] Placeholder text is `text-white/20`
- [ ] Body text is `font-light`

### Cards
- [ ] Border is `border-white/10`
- [ ] Hover border is `hover:border-white/20`
- [ ] All text is `font-light` except labels
- [ ] Icons are appropriately sized

### Modals
- [ ] Border is `border-white/10`
- [ ] Header text is `text-2xl font-black tracking-[0.2em]`
- [ ] Body text is `font-light`
- [ ] Close button icon is `w-5 h-5`

### Navigation
- [ ] All nav items are `text-xs font-black uppercase tracking-[0.2em]`
- [ ] Icons are `w-5 h-5` with `strokeWidth={1.5}`
- [ ] Hover states are smooth transitions

## Implementation Priority

### Phase 1 (Critical)
1. Global CSS import
2. Header/Navbar polish
3. Button standardization
4. Border colors

### Phase 2 (Important)
1. Icon sizing throughout
2. Typography weights
3. Form styling
4. Card styling

### Phase 3 (Polish)
1. Spacing refinements
2. Animation smoothness
3. Hover state consistency
4. Focus state visibility

## Testing Checklist

- [ ] All text appears light and elegant
- [ ] Borders are subtle but visible
- [ ] Icons are consistently sized
- [ ] Hover states are smooth
- [ ] Focus states are accessible
- [ ] Mobile layout is tight and professional
- [ ] Desktop layout feels spacious and luxury
- [ ] Dark mode is consistent
- [ ] Print styles work correctly

## Performance Notes

- Global CSS is optimized for performance
- Transitions use `cubic-bezier(0.4, 0, 0.2, 1)` for smooth motion
- Border colors use CSS variables for consistency
- Icon sizing is standardized via CSS

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Full support

## Accessibility

- Focus states are visible (2px outline)
- Color contrast meets WCAG AA standards
- All interactive elements are keyboard accessible
- Icons have proper stroke widths for visibility

## Future Enhancements

- [ ] Add dark mode toggle
- [ ] Implement theme customization
- [ ] Add animation prefers-reduced-motion support
- [ ] Create component library documentation

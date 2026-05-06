import { Toaster as Sonner } from 'sonner';

export const Toaster = (props: React.ComponentProps<typeof Sonner>) => (
  <Sonner
    position="top-right"
    toastOptions={{
      classNames: {
        toast:
          'rounded-none border border-foreground/10 bg-background text-foreground font-light tracking-wide',
        title: 'uppercase tracking-widest text-sm',
        description: 'text-foreground/70 text-sm',
        actionButton: 'bg-primary text-primary-foreground rounded-none',
        cancelButton: 'bg-secondary text-secondary-foreground rounded-none',
      },
    }}
    {...props}
  />
);

export { toast } from 'sonner';

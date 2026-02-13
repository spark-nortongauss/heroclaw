import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva('inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold', {
  variants: {
    variant: {
      done: 'border-emerald-600/20 bg-emerald-100 text-emerald-800',
      ongoing: 'border-amber-600/20 bg-amber-100 text-amber-800',
      not_done: 'border-zinc-500/20 bg-zinc-100 text-zinc-700',
      default: 'border-transparent bg-primary text-brandDark'
    }
  },
  defaultVariants: {
    variant: 'default'
  }
});

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

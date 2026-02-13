import { cn } from '@/lib/utils';
import { ComponentPropsWithoutRef, ReactNode } from 'react';

export function Table({ children, className, ...props }: { children: ReactNode } & ComponentPropsWithoutRef<'table'>) {
  return (
    <table className={cn('w-full text-sm', className)} {...props}>
      {children}
    </table>
  );
}

export function TableHead({ children, className, ...props }: { children: ReactNode } & ComponentPropsWithoutRef<'thead'>) {
  return (
    <thead className={cn('bg-muted text-left text-mutedForeground', className)} {...props}>
      {children}
    </thead>
  );
}

export function TableBody({ children, className, ...props }: { children: ReactNode } & ComponentPropsWithoutRef<'tbody'>) {
  return (
    <tbody className={className} {...props}>
      {children}
    </tbody>
  );
}

export function TableRow({ children, className, ...props }: { children: ReactNode } & ComponentPropsWithoutRef<'tr'>) {
  return (
    <tr className={cn('border-t transition-colors', className)} {...props}>
      {children}
    </tr>
  );
}

export function TableCell({ children, className, colSpan, ...props }: { children: ReactNode; className?: string; colSpan?: number } & ComponentPropsWithoutRef<'td'>) {
  return (
    <td className={cn('px-4 py-3', className)} colSpan={colSpan} {...props}>
      {children}
    </td>
  );
}

export function TableHeaderCell({ children, className, ...props }: { children: ReactNode } & ComponentPropsWithoutRef<'th'>) {
  return (
    <th className={cn('px-4 py-3 font-medium', className)} {...props}>
      {children}
    </th>
  );
}

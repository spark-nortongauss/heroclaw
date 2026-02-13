import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

export function Table({ children }: { children: ReactNode }) {
  return <table className="w-full text-sm">{children}</table>;
}

export function TableHead({ children }: { children: ReactNode }) {
  return <thead className="bg-muted text-left text-mutedForeground">{children}</thead>;
}

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function TableRow({ children, className }: { children: ReactNode; className?: string }) {
  return <tr className={cn('border-t transition-colors', className)}>{children}</tr>;
}

export function TableCell({ children, className, colSpan }: { children: ReactNode; className?: string; colSpan?: number }) {
  return (
    <td className={cn('px-4 py-3', className)} colSpan={colSpan}>
      {children}
    </td>
  );
}

export function TableHeaderCell({ children }: { children: ReactNode }) {
  return <th className="px-4 py-3 font-medium">{children}</th>;
}

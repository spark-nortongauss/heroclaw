'use client';

import {
  ReactElement,
  ReactNode,
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

type DropdownContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  wrapperRef: React.RefObject<HTMLDivElement>;
};

const DropdownContext = createContext<DropdownContextValue | null>(null);

type TriggerProps = {
  asChild?: boolean;
  children: ReactNode;
};

type RadioGroupContextValue = {
  value: string;
  onValueChange: (value: string) => void;
};

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

export function DropdownMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (wrapperRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onEscape);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  const value = useMemo(() => ({ open, setOpen, wrapperRef }), [open]);

  return (
    <DropdownContext.Provider value={value}>
      <div ref={wrapperRef} className="relative inline-flex">
        {children}
      </div>
    </DropdownContext.Provider>
  );
}

export function DropdownMenuTrigger({ asChild = false, children }: TriggerProps) {
  const context = useContext(DropdownContext);
  if (!context) return <>{children}</>;

  const onClick = () => context.setOpen(!context.open);
  const commonProps = {
    'aria-expanded': context.open,
    'aria-haspopup': 'menu' as const,
    onClick
  };

  if (asChild && isValidElement(children)) {
    return cloneElement(children as ReactElement, commonProps);
  }

  return (
    <button type="button" {...commonProps}>
      {children}
    </button>
  );
}

export function DropdownMenuContent({ className, children }: { className?: string; align?: 'end' | 'start'; sideOffset?: number; children: ReactNode }) {
  const context = useContext(DropdownContext);
  if (!context?.open) return null;

  return (
    <div className={cn('absolute right-0 top-full z-50 mt-2 min-w-[11rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-soft', className)} role="menu">
      {children}
    </div>
  );
}

export function DropdownMenuPortal({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function DropdownMenuItem({ className, children, onSelect }: { className?: string; children: ReactNode; onSelect?: () => void }) {
  const context = useContext(DropdownContext);
  return (
    <button
      type="button"
      role="menuitem"
      className={cn('flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-left text-sm outline-none transition hover:bg-muted focus:bg-muted', className)}
      onClick={() => {
        onSelect?.();
        context?.setOpen(false);
      }}
    >
      {children}
    </button>
  );
}

export function DropdownMenuRadioGroup({ value, onValueChange, children }: { value: string; onValueChange: (value: string) => void; children: ReactNode }) {
  return <RadioGroupContext.Provider value={{ value, onValueChange }}>{children}</RadioGroupContext.Provider>;
}

export function DropdownMenuRadioItem({ className, value, children }: { className?: string; value: string; children: ReactNode }) {
  const radioGroup = useContext(RadioGroupContext);
  const dropdown = useContext(DropdownContext);
  const selected = radioGroup?.value === value;

  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={selected}
      className={cn('relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-left text-sm outline-none transition hover:bg-muted focus:bg-muted', className)}
      onClick={() => {
        radioGroup?.onValueChange(value);
        dropdown?.setOpen(false);
      }}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">{selected ? <Check className="h-3.5 w-3.5" /> : null}</span>
      {children}
    </button>
  );
}

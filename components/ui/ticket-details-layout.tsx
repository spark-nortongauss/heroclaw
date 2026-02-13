import { ReactNode } from 'react';

export function TicketDetailsLayout({ main, side }: { main: ReactNode; side: ReactNode }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(260px,3fr)]">
      <section className="space-y-4">{main}</section>
      <aside className="space-y-3">{side}</aside>
    </div>
  );
}

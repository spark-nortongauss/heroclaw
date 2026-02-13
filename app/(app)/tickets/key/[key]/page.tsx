import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function TicketKeyRedirectPage({ params }: { params: { key: string } }) {
  const key = decodeURIComponent(params.key).toUpperCase();
  const supabase = createClient();

  const { data } = await supabase
    .from('mc_tickets')
    .select('id, title')
    .ilike('title', `%${key}%`)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (data?.id) {
    redirect(`/tickets/${data.id}`);
  }

  redirect('/tickets');
}

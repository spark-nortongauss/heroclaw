'use client';

import { FormEvent, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const requestTypes = ['create_ticket', 'update_ticket', 'comment', 'status_change', 'general'];

export default function NewRequestPage() {
  const [requestType, setRequestType] = useState('general');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ticketId, setTicketId] = useState('');
  const [ownerAgentId, setOwnerAgentId] = useState('');
  const [priority, setPriority] = useState('');
  const [status, setStatus] = useState('');

  const payload = useMemo(
    () => ({
      channel: 'allan',
      request_type: requestType,
      title: title || null,
      body: description,
      ticket_id: ticketId || null,
      owner_agent_id: ownerAgentId || null,
      priority: priority || null,
      source: 'mission_control_ui',
      version: 1
    }),
    [description, ownerAgentId, priority, requestType, ticketId, title]
  );

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();

    const { error } = await supabase.from('mc_requests').insert({
      request_type: requestType,
      payload,
      created_by: data.user!.id
    });

    if (error) {
      setStatus(error.message);
      return;
    }

    await fetch('/api/allan/request', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ request_type: requestType, payload })
    });

    setStatus('Request queued successfully.');
    setTitle('');
    setDescription('');
    setTicketId('');
    setOwnerAgentId('');
    setPriority('');
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h2 className="text-2xl font-semibold">New Allan Request</h2>
      <form onSubmit={onSubmit} className="space-y-4 rounded-md border p-4">
        <div>
          <Label>Request Type</Label>
          <Select value={requestType} onValueChange={setRequestType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {requestTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Title (optional)</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label>Description / Body</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} required />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <Label>Ticket ID (optional)</Label>
            <Input value={ticketId} onChange={(e) => setTicketId(e.target.value)} />
          </div>
          <div>
            <Label>Owner Agent ID (optional)</Label>
            <Input value={ownerAgentId} onChange={(e) => setOwnerAgentId(e.target.value)} />
          </div>
          <div>
            <Label>Priority (optional)</Label>
            <Input value={priority} onChange={(e) => setPriority(e.target.value)} />
          </div>
        </div>
        <div className="rounded-md bg-muted p-3 text-xs">
          <p className="mb-1 font-medium">Command Preview</p>
          <pre>{JSON.stringify(payload, null, 2)}</pre>
        </div>
        <Button type="submit">Queue Request</Button>
        {status && <p className="text-sm text-muted-foreground">{status}</p>}
      </form>
    </div>
  );
}

'use client';

import { FormEvent, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';

const requestTypes = ['create_ticket', 'update_ticket', 'comment', 'status_change', 'general'];

export default function NewRequestPage() {
  const { notify } = useToast();
  const [requestType, setRequestType] = useState('general');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ticketId, setTicketId] = useState('');
  const [ownerAgentId, setOwnerAgentId] = useState('');
  const [priority, setPriority] = useState('');
  const [loading, setLoading] = useState(false);

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
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();

    const { error } = await supabase.from('mc_requests').insert({
      request_type: requestType,
      payload,
      created_by: data.user!.id
    });

    if (error) {
      notify(error.message, 'error');
      setLoading(false);
      return;
    }

    await fetch('/api/allan/request', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ request_type: requestType, payload })
    });

    notify('Request queued successfully.');
    setTitle('');
    setDescription('');
    setTicketId('');
    setOwnerAgentId('');
    setPriority('');
    setLoading(false);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="h1 font-[var(--font-heading)]">New Request</h1>
        <p className="text-body">Create a structured request for Allan workflows.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Request Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
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
            <Button type="submit" disabled={loading}>{loading ? 'Submitting...' : 'Create Request'}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

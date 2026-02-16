'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';

type VmResponse = {
  ok: boolean;
  configured?: boolean;
  status?: 'Running' | 'Stopped' | 'Unknown';
  error?: string;
};

async function fetchVmStatus() {
  const response = await fetch('/api/vm/status', { method: 'GET', cache: 'no-store' });
  const body = (await response.json()) as VmResponse;

  if (!response.ok) {
    throw new Error(body.error ?? 'Unable to load VM status');
  }

  return body;
}

export function VmStatusCard() {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const [pendingRestart, setPendingRestart] = useState(false);

  const statusQuery = useQuery({ queryKey: ['vm-status'], queryFn: fetchVmStatus, refetchInterval: 60_000 });

  const restartMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/vm/restart', { method: 'POST' });
      const body = (await response.json()) as VmResponse;
      if (!response.ok || !body.ok) {
        throw new Error(body.error ?? 'VM restart failed');
      }
      return body;
    },
    onSuccess: async () => {
      notify('VM restart request submitted.');
      await queryClient.invalidateQueries({ queryKey: ['vm-status'] });
    },
    onError: (error) => {
      notify(error instanceof Error ? error.message : 'Unable to restart VM', 'error');
    },
    onSettled: () => {
      setPendingRestart(false);
    }
  });

  const configured = Boolean(statusQuery.data?.configured);
  const status = statusQuery.data?.status ?? 'Unknown';

  return (
    <Card data-card>
      <CardHeader>
        <CardTitle>VM Status</CardTitle>
        <CardDescription>
          {configured ? 'Azure VM health from server-side API' : 'VM integration not configured'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {statusQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading VM status…</p>
        ) : statusQuery.isError ? (
          <p className="text-sm text-destructive">{(statusQuery.error as Error).message}</p>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Current status</span>
            <Badge variant={status === 'Running' ? 'default' : status === 'Stopped' ? 'not_done' : 'ongoing'}>{status}</Badge>
          </div>
        )}

        {configured ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={restartMutation.isPending || pendingRestart}
            onClick={() => {
              setPendingRestart(true);
              restartMutation.mutate();
            }}
          >
            {restartMutation.isPending || pendingRestart ? 'Restarting…' : 'Restart VM'}
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">Set AZURE_* environment variables to enable VM actions.</p>
        )}
      </CardContent>
    </Card>
  );
}

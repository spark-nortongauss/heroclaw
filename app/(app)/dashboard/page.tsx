'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchRecentActivity, fetchTicketCounts } from '@/lib/query-client';

export default function DashboardPage() {
  const countsQuery = useQuery({ queryKey: ['ticket-counts'], queryFn: fetchTicketCounts });
  const activityQuery = useQuery({ queryKey: ['recent-activity'], queryFn: fetchRecentActivity });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Open Projects</CardTitle>
            <CardDescription>Placeholder until projects table exists.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">0</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Inbox Items</CardTitle>
            <CardDescription>Placeholder until inbox table exists.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">0</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tickets</CardTitle>
            <CardDescription>done / ongoing / not_done</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-lg">
              {countsQuery.isLoading
                ? 'Loading...'
                : `${countsQuery.data?.done ?? 0} / ${countsQuery.data?.ongoing ?? 0} / ${countsQuery.data?.not_done ?? 0}`}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {activityQuery.isLoading && <p>Loading...</p>}
          {activityQuery.data?.comments.map((comment) => (
            <div key={comment.id} className="rounded-md border p-3 text-sm">
              <p className="font-medium">Comment</p>
              <p>{comment.body}</p>
            </div>
          ))}
          {activityQuery.data?.requests.map((request) => (
            <div key={request.id} className="rounded-md border p-3 text-sm">
              <p className="font-medium">Request: {request.request_type}</p>
              <p>Status: {request.status}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

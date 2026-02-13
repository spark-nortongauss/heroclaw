'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchRecentActivity, fetchTicketCounts } from '@/lib/query-client';

const HeroCanvas = dynamic(() => import('@/components/dashboard/hero-canvas'), { ssr: false });

export default function DashboardPage() {
  const headerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const countsQuery = useQuery({ queryKey: ['ticket-counts'], queryFn: fetchTicketCounts });
  const activityQuery = useQuery({ queryKey: ['recent-activity'], queryFn: fetchRecentActivity });

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    headerRef.current?.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0px)' }], {
      duration: 300,
      easing: 'ease-out',
      fill: 'both'
    });

    cardsRef.current?.querySelectorAll('[data-card]').forEach((el, index) => {
      (el as HTMLElement).animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0px)' }], {
        duration: 380,
        delay: index * 70,
        easing: 'ease-out',
        fill: 'both'
      });
    });
  }, []);

  const ticketSummary = useMemo(
    () => ({
      done: countsQuery.data?.done ?? 0,
      ongoing: countsQuery.data?.ongoing ?? 0,
      not_done: countsQuery.data?.not_done ?? 0
    }),
    [countsQuery.data]
  );

  return (
    <div className="space-y-6">
      <div ref={headerRef} className="space-y-4 rounded-xl border bg-white p-5 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="h1 font-[var(--font-heading)]">Dashboard</h1>
            <p className="text-body">A clean operational view for Norton-Gauss missions.</p>
          </div>
          <Badge variant="default">Live</Badge>
        </div>
        <HeroCanvas />
      </div>

      <div ref={cardsRef} className="grid gap-4 md:grid-cols-3">
        <Card data-card>
          <CardHeader>
            <CardTitle>Open Projects</CardTitle>
            <CardDescription>Placeholder until projects table exists.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">0</p>
          </CardContent>
        </Card>
        <Card data-card>
          <CardHeader>
            <CardTitle>Inbox Items</CardTitle>
            <CardDescription>Placeholder until inbox table exists.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">0</p>
          </CardContent>
        </Card>
        <Card data-card>
          <CardHeader>
            <CardTitle>Tickets</CardTitle>
            <CardDescription>done / ongoing / not_done</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2 text-sm">
            <Badge variant="done">{ticketSummary.done} done</Badge>
            <Badge variant="ongoing">{ticketSummary.ongoing} ongoing</Badge>
            <Badge variant="not_done">{ticketSummary.not_done} not done</Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {activityQuery.isLoading && <Skeleton className="h-16 w-full" />}
          {activityQuery.data?.comments.map((comment) => (
            <div key={comment.id} className="rounded-md border p-3 text-sm">
              <p className="font-medium">Comment</p>
              <p>{comment.body}</p>
            </div>
          ))}
          {activityQuery.data?.requests.map((request) => (
            <div key={request.id} className="rounded-md border p-3 text-sm">
              <p className="font-medium">Request: {request.request_type}</p>
              <p className="text-mutedForeground">Status: {request.status}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

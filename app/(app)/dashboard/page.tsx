'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { VmStatusCard } from '@/components/dashboard/vm-status-card';
import { fetchDashboardMetrics, fetchRecentActivity } from '@/lib/query-client';

const HeroCanvas = dynamic(() => import('@/components/dashboard/hero-canvas'), { ssr: false });

export default function DashboardPage() {
  const headerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const metricsQuery = useQuery({ queryKey: ['dashboard-metrics'], queryFn: fetchDashboardMetrics });
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

  return (
    <div className="space-y-6">
      <div ref={headerRef} className="space-y-4 rounded-xl border bg-card p-5 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="h1 font-[var(--font-heading)]">Dashboard</h1>
            <p className="text-body">A clean operational view for Norton-Gauss missions.</p>
          </div>
          <Badge variant="default">Live</Badge>
        </div>
        <HeroCanvas />
      </div>

      {metricsQuery.data?.noAccess ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Metrics unavailable</CardTitle>
              <CardDescription>No access</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-mutedForeground">Your role cannot read one or more tables used by dashboard metrics.</CardContent>
          </Card>
          <VmStatusCard />
        </div>
      ) : (
        <div ref={cardsRef} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card data-card>
            <CardHeader>
              <CardTitle>Total projects</CardTitle>
              <CardDescription>All projects in mc_projects</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-3xl font-semibold">{metricsQuery.data?.totalProjects ?? '—'}</p>
              <p className="text-xs text-mutedForeground">Active: {metricsQuery.data?.activeProjects ?? '—'}</p>
            </CardContent>
          </Card>
          <Card data-card>
            <CardHeader>
              <CardTitle>Total tickets</CardTitle>
              <CardDescription>Open and closed coverage</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-3xl font-semibold">{metricsQuery.data?.totalTickets ?? '—'}</p>
              <p className="text-xs text-mutedForeground">Open: {metricsQuery.data?.openTickets ?? '—'} · Done/Closed: {metricsQuery.data?.doneTickets ?? '—'}</p>
            </CardContent>
          </Card>
          <Card data-card>
            <CardHeader>
              <CardTitle>Due soon</CardTitle>
              <CardDescription>Next 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{metricsQuery.data?.dueSoon ?? '—'}</p>
            </CardContent>
          </Card>
          <VmStatusCard />
        </div>
      )}

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

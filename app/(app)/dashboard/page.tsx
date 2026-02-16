'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { VmStatusCard } from '@/components/dashboard/vm-status-card';
import { fetchAgentsOverview, fetchDashboardMetrics } from '@/lib/query-client';

const HeroCanvas = dynamic(() => import('@/components/dashboard/hero-canvas'), { ssr: false });

export default function DashboardPage() {
  const headerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const metricsQuery = useQuery({ queryKey: ['dashboard-metrics'], queryFn: fetchDashboardMetrics });
  const agentsQuery = useQuery({ queryKey: ['dashboard-agents'], queryFn: fetchAgentsOverview });

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
          <CardTitle>Agents</CardTitle>
          <CardDescription>Identity and latest operator activity.</CardDescription>
        </CardHeader>
        <CardContent>
          {agentsQuery.isLoading && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-36 w-full" />
              ))}
            </div>
          )}

          {agentsQuery.error && <p className="text-sm text-destructive">Failed to load agents: {(agentsQuery.error as Error).message}</p>}

          {!agentsQuery.isLoading && !agentsQuery.error && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {agentsQuery.data?.map((agent) => (
                <div key={agent.id} className="rounded-xl border border-border bg-background p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-lg font-semibold text-foreground">{agent.name}</p>
                      <p className="text-xs text-mutedForeground">Last sign-in: {agent.lastSignInLabel}</p>
                    </div>
                    <Badge variant="default" className={agent.isActive ? '' : 'opacity-70'}>{agent.isActive ? 'Active' : 'Inactive'}</Badge>
                  </div>
                  <p className="mt-3 text-sm text-foreground">{agent.lastActivityLabel}</p>
                  <div className="mt-3 space-y-1 text-xs text-mutedForeground">
                    <p>Department: {agent.department || '—'}</p>
                    <p>Role: {agent.role || '—'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

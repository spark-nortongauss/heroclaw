import { NextResponse } from 'next/server';
import { isVmConfigured, requireAuthenticatedUser, restartVm } from '@/lib/server/azure-vm';

export async function POST() {
  const auth = await requireAuthenticatedUser(true);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  if (!isVmConfigured()) {
    return NextResponse.json({ ok: false, error: 'VM integration not configured' }, { status: 503 });
  }

  try {
    const result = await restartVm();
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
    }

    return NextResponse.json({ ok: true, accepted: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unable to restart VM'
      },
      { status: 500 }
    );
  }
}

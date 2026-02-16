import { NextResponse } from 'next/server';
import { getVmStatus, isVmConfigured, requireAuthenticatedUser } from '@/lib/server/azure-vm';

export async function GET() {
  const auth = await requireAuthenticatedUser(false);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  if (!isVmConfigured()) {
    return NextResponse.json({ ok: true, configured: false, status: 'Unknown' });
  }

  try {
    const result = await getVmStatus();
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
    }

    return NextResponse.json({ ok: true, configured: true, status: result.status });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unable to fetch VM status'
      },
      { status: 500 }
    );
  }
}

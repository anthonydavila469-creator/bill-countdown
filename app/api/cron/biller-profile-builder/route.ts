import { NextResponse } from 'next/server';

import { cronAuthGuard } from '@/lib/auth/cron-auth';
import { runBillerProfileBuilder } from '@/app/cron/biller-profile-builder';

export async function GET(request: Request) {
  const denied = cronAuthGuard(request);
  if (denied) return denied;

  const result = await runBillerProfileBuilder();

  return NextResponse.json(result, {
    status: result.exitCode === 0 ? 200 : 500,
  });
}

import { NextResponse } from 'next/server';

import { runBillerProfileBuilder } from '@/app/cron/biller-profile-builder';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`;

  if (!authHeader || authHeader !== expectedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await runBillerProfileBuilder();

  return NextResponse.json(result, {
    status: result.exitCode === 0 ? 200 : 500,
  });
}

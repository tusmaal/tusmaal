import { NextResponse } from 'next/server';
import { run } from '../../../../scripts/sendReminders';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization') || '';
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const sent = await run();
    return NextResponse.json({ success: true, sent });
  } catch (error) {
    console.error('Reminder cron failed:', error);
    return NextResponse.json({ success: false, message: 'Reminder run failed' }, { status: 500 });
  }
}

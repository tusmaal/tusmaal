import { handleExpress } from '../../lib/expressHandler';
import app from '../../server/app';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request) {
  try {
    return await handleExpress(app, request);
  } catch (error) {
    console.error('Health handler error:', error);
    return Response.json({ status: 'error' }, { status: 500 });
  }
}

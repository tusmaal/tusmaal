import { handleExpress } from '../../../lib/expressHandler';
import app from '../../../server/app';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function handle(request) {
  try {
    return await handleExpress(app, request);
  } catch (error) {
    console.error('API handler error:', error);
    return Response.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const OPTIONS = handle;

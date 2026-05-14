import { authGetHandler, authPostHandler } from '@/lib/auth/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = authGetHandler;
export const POST = authPostHandler;

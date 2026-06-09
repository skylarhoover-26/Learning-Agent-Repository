import { handlers } from '@/auth';

export async function GET(req, ctx) {
  try {
    return await handlers.GET(req, ctx);
  } catch {
    return Response.json({});
  }
}

export async function POST(req, ctx) {
  try {
    return await handlers.POST(req, ctx);
  } catch {
    return Response.json({});
  }
}

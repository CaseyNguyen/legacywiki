import { demoAvatarSvg } from '@/lib/sleeper/demo';

/** Logos for the fictional demo league. */
export async function GET(_req: Request, { params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  const svg = demoAvatarSvg(Number(n));
  if (!svg) return new Response('Not found', { status: 404 });
  return new Response(svg, {
    headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=31536000, immutable' },
  });
}

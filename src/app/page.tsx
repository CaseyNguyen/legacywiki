import Link from 'next/link';
import { BrandMark } from '@/components/bits';
import { Landing } from '@/components/client/Landing';
import { ThemeToggle } from '@/components/client/Shell';
import { aiEnabled } from '@/lib/story';

export const dynamic = 'force-dynamic';

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  return (
    <>
      <header className="masthead">
        <div className="masthead__inner">
          <Link className="brand" href="/?new=1">
            <BrandMark />
            LegacyWiki
          </Link>
          <span className="masthead__spacer" />
          <div className="masthead__tools">
            <ThemeToggle />
          </div>
        </div>
      </header>
      <Landing forceNew={sp.new === '1'} aiEnabled={aiEnabled()} />
    </>
  );
}

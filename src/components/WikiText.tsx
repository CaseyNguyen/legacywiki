import Link from 'next/link';
import { Fragment, type ReactNode } from 'react';
import { Section } from './Section';

/** Shared by server and client: renders [[Wiki links]] from story text as internal links. */

export type LinkTable = Record<string, string>;

const LINK_RE = /(\[\[[^\]]+\]\])/g;

function boldFirst(text: string, bold: { done: boolean; term?: string }, key: string): ReactNode {
  if (!bold.term || bold.done) return <Fragment key={key}>{text}</Fragment>;
  const i = text.indexOf(bold.term);
  if (i < 0) return <Fragment key={key}>{text}</Fragment>;
  bold.done = true;
  return (
    <Fragment key={key}>
      {text.slice(0, i)}
      <b>{bold.term}</b>
      {text.slice(i + bold.term.length)}
    </Fragment>
  );
}

export function WikiText({ text, links, boldTerm }: { text: string; links: LinkTable; boldTerm?: string }) {
  const bold = { done: false, term: boldTerm };
  const parts = text.split(LINK_RE);
  return (
    <>
      {parts.map((part, i) => {
        const m = part.match(/^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]$/);
        if (!m) return boldFirst(part, bold, `t${i}`);
        const target = m[1].trim();
        const label = (m[2] ?? m[1]).trim();
        const href = links[target.toLowerCase()];
        return href ? (
          <Link key={i} href={href} prefetch={false}>
            {label}
          </Link>
        ) : (
          <Fragment key={i}>{label}</Fragment>
        );
      })}
    </>
  );
}

export function plainText(text: string) {
  return text.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_m, a: string, b?: string) => (b ?? a).trim());
}

export function excerpt(text: string, max = 230) {
  const plain = plainText(text);
  if (plain.length <= max) return plain;
  const cut = plain.slice(0, max);
  const stop = cut.lastIndexOf('. ');
  return stop > 80 ? cut.slice(0, stop + 1) : `${cut.trimEnd()}…`;
}

export const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'section';

export interface StoryArticleData {
  lede: string;
  sections: Array<{ heading: string; paragraphs: string[] }>;
}

export function StoryLede({ article, links, teamName }: { article: StoryArticleData; links: LinkTable; teamName: string }) {
  return (
    <p className="lede">
      <WikiText text={article.lede} links={links} boldTerm={teamName} />
    </p>
  );
}

export function StorySections({ article, links }: { article: StoryArticleData; links: LinkTable }) {
  return (
    <>
      {article.sections.map((s) => (
        <Section key={s.heading} id={`story-${slug(s.heading)}`} title={s.heading}>
          {s.paragraphs.map((p, i) => (
            <p key={i}>
              <WikiText text={p} links={links} />
            </p>
          ))}
        </Section>
      ))}
    </>
  );
}
